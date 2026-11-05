import { createHmac } from "node:crypto";
import { expo } from "@better-auth/expo";
import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { PostgresDialect } from "kysely";
import type { Pool } from "pg";
import { createSuperadminPolicy } from "./superadmin";

type EmailCodeAuthOptions = {
  pool: Pool;
  schema?: string;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  sendCode: (email: string, code: string) => Promise<void>;
  dashboardKey?: string;
  vercel?: boolean;
  superadminEmail?: string;
  google?: { clientId: string; clientSecret: string };
};

export function createEmailCodeAuth(options: EmailCodeAuthOptions) {
  const schema = options.schema ?? "auth";
  if (!/^[a-z][a-z0-9_]*$/.test(schema))
    throw new Error("Invalid auth schema.");
  const pendingDelivery = new WeakMap<
    Request,
    { email: string; code: string }
  >();
  const adminPolicy = createSuperadminPolicy({
    pool: options.pool,
    schema,
    email: options.superadminEmail,
    secret: options.secret,
  });

  return betterAuth({
    appName: "Jungle Tribe",
    baseURL: options.baseURL,
    secret: options.secret,
    database: {
      dialect: new PostgresDialect({ pool: options.pool }),
      type: "postgres",
      schemaName: schema,
    },
    emailAndPassword: { enabled: false },
    socialProviders: options.google
      ? {
          google: {
            ...options.google,
            prompt: "select_account",
            accessType: "online",
            includeGrantedScopes: false,
          },
        }
      : {},
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: Boolean(options.google),
        disableImplicitLinking: true,
        trustedProviders: [],
        allowDifferentEmails: false,
      },
    },
    user: {
      validateUserInfo({ user, source }) {
        if (source.method === "oauth" && user.emailVerified !== true)
          throw new APIError("UNAUTHORIZED", {
            code: "GOOGLE_EMAIL_UNVERIFIED",
            message: "Use a verified Google email address.",
          });
      },
    },
    trustedOrigins: options.trustedOrigins,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: options.baseURL.startsWith("https://"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: {
        // Vercel replaces this header. Direct/local requests share a counter.
        ipAddressHeaders: options.vercel ? ["x-vercel-forwarded-for"] : [],
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/email-otp/send-verification-otp": { window: 60, max: 5 },
        "/sign-in/email-otp": { window: 60, max: 10 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        await adminPolicy.before(ctx);
        if (
          (ctx.path === "/sign-in/social" || ctx.path === "/link-social") &&
          ctx.body?.provider === "google"
        ) {
          const scopes = ctx.body.scopes;
          if (
            ctx.body.additionalParams &&
            Object.keys(ctx.body.additionalParams).length
          )
            throw new APIError("FORBIDDEN", {
              message:
                "Custom Google authorization parameters are unavailable.",
            });
          if (
            scopes !== undefined &&
            (!Array.isArray(scopes) ||
              scopes.some(
                (scope: unknown) =>
                  typeof scope !== "string" ||
                  !["openid", "email", "profile"].includes(scope),
              ))
          )
            throw new APIError("FORBIDDEN", {
              message: "Only basic Google sign-in is available.",
            });
        }
        if (ctx.path !== "/email-otp/send-verification-otp") return;
        if (ctx.body?.type !== "sign-in") {
          throw new APIError("BAD_REQUEST", {
            message: "Unsupported code type.",
          });
        }
        const email = ctx.body.email;
        if (typeof email !== "string" || !email.includes("@")) return;
        const key = createHmac("sha256", options.secret)
          .update(email.toLowerCase())
          .digest("hex");
        // Atomic reservation, before Better Auth rotates the code. This survives
        // cold starts and protects a recipient even when request IPs change.
        const result = await options.pool.query(
          `INSERT INTO "${schema}"."emailCodeDelivery" AS delivery
            ("recipient", "lastSentAt", "windowStartedAt", "count")
            VALUES ($1, now(), now(), 1)
           ON CONFLICT ("recipient") DO UPDATE SET
             "lastSentAt" = now(),
             "windowStartedAt" = CASE WHEN delivery."windowStartedAt" <= now() - interval '1 hour'
               THEN now() ELSE delivery."windowStartedAt" END,
             "count" = CASE WHEN delivery."windowStartedAt" <= now() - interval '1 hour'
               THEN 1 ELSE delivery."count" + 1 END
           WHERE delivery."lastSentAt" <= now() - interval '60 seconds'
             AND (delivery."count" < 5 OR delivery."windowStartedAt" <= now() - interval '1 hour')
           RETURNING "recipient"`,
          [key],
        );
        if (result.rowCount !== 1) {
          throw new APIError("TOO_MANY_REQUESTS", {
            message: "Please wait before requesting another code.",
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        await adminPolicy.after(ctx);
        if (!ctx.request) return;
        const delivery = pendingDelivery.get(ctx.request);
        if (!delivery) return;
        pendingDelivery.delete(ctx.request);
        // Better Auth's background-task helper swallows sender failures. Await
        // delivery in the request hook so an outage produces an honest error.
        try {
          await options.sendCode(delivery.email, delivery.code);
        } catch {
          throw new APIError("SERVICE_UNAVAILABLE", {
            message:
              "We couldn't send your code. Please try again in a minute.",
          });
        }
      }),
    },
    disabledPaths: [
      "/unlink-account",
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-password-reset",
      "/email-otp/reset-password",
      "/forget-password/email-otp",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
    ],
    telemetry: { enabled: false },
    plugins: [
      expo(),
      twoFactor({
        issuer: "Jungle Tribe",
        allowPasswordless: true,
        backupCodeOptions: { storeBackupCodes: "encrypted" },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: "hashed",
        resendStrategy: "rotate",
        async sendVerificationOTP({ email, otp }, ctx) {
          if (!ctx?.request)
            throw new Error("Email codes require an HTTP request.");
          pendingDelivery.set(ctx.request, { email, code: otp });
        },
      }),
      ...(options.dashboardKey
        ? [
            dash({
              apiKey: options.dashboardKey,
              activityTracking: { enabled: false },
            }),
          ]
        : []),
    ],
  });
}
