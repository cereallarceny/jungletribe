import { createHmac } from "node:crypto";
import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
  isAPIError,
} from "better-auth/api";
import type { Pool } from "pg";

type Session = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    twoFactorEnabled?: boolean | null;
  };
  session: { id: string; createdAt: Date; expiresAt: Date };
};
type PolicyOptions = { pool: Pool; schema: string; email?: string };

export async function getSuperadminStatus(
  options: PolicyOptions,
  session: Session | null,
) {
  const candidate = Boolean(
    options.email &&
      session?.user.emailVerified &&
      session.user.email.toLowerCase() === options.email.toLowerCase(),
  );
  if (!candidate || !session)
    return { candidate: false, enrolled: false, verified: false };
  const result = await options.pool.query(
    `SELECT EXISTS (SELECT 1 FROM "${options.schema}"."superadmin" grant_record
      JOIN "${options.schema}"."adminSession" proof ON proof."userId" = grant_record."userId"
      JOIN "${options.schema}"."twoFactor" factor ON factor."userId" = grant_record."userId"
      WHERE grant_record."userId" = $1 AND proof."sessionId" = $2
        AND proof."verifiedAt" > now() - interval '15 minutes' AND factor."verified" = true) AS verified`,
    [session.user.id, session.session.id],
  );
  return {
    candidate: true,
    enrolled: session.user.twoFactorEnabled === true,
    verified:
      session.user.twoFactorEnabled === true &&
      result.rows[0]?.verified === true,
  };
}

export function createSuperadminPolicy(
  options: PolicyOptions & { secret: string },
) {
  return {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/two-factor/")) return;
      const session = await getAuthoritativeSessionFromCtx(ctx);
      if (
        !session ||
        !options.email ||
        !session.user.emailVerified ||
        session.user.email.toLowerCase() !== options.email.toLowerCase()
      ) {
        throw new APIError("FORBIDDEN", {
          message: "Administrator verification is required.",
        });
      }
      if (
        ![
          "/two-factor/enable",
          "/two-factor/verify-totp",
          "/two-factor/verify-backup-code",
          "/two-factor/generate-backup-codes",
        ].includes(ctx.path)
      ) {
        // Email access alone must never reveal an enrolled secret, replace the
        // second factor, or turn mandatory MFA off.
        throw new APIError("FORBIDDEN", {
          message: "This security action is unavailable.",
        });
      }
      if (ctx.path === "/two-factor/generate-backup-codes") {
        if (!(await getSuperadminStatus(options, session)).verified) {
          throw new APIError("FORBIDDEN", {
            message: "Verify your authenticator or a recovery code first.",
          });
        }
      }
      if (
        ctx.path === "/two-factor/enable" &&
        (ctx.body?.method === "otp" ||
          Date.now() - session.session.createdAt.getTime() > 600_000)
      ) {
        throw new APIError("FORBIDDEN", {
          message: "Sign in again to set up your authenticator.",
        });
      }
      if (
        ctx.path === "/two-factor/verify-totp" ||
        ctx.path === "/two-factor/verify-backup-code"
      ) {
        const result = await options.pool.query(
          `INSERT INTO "${options.schema}"."adminFactorAttempt" AS attempt ("userId", "startedAt", "count")
            VALUES ($1, now(), 1) ON CONFLICT ("userId") DO UPDATE SET
              "startedAt" = CASE WHEN attempt."startedAt" <= now() - interval '5 minutes' THEN now() ELSE attempt."startedAt" END,
              "count" = CASE WHEN attempt."startedAt" <= now() - interval '5 minutes' THEN 1 ELSE attempt."count" + 1 END
            WHERE attempt."count" < 5 OR attempt."startedAt" <= now() - interval '5 minutes'
            RETURNING "userId"`,
          [session.user.id],
        );
        if (result.rowCount !== 1)
          throw new APIError("TOO_MANY_REQUESTS", {
            message:
              "Too many verification attempts. Try again in five minutes.",
          });
        if (ctx.body) ctx.body.trustDevice = false;
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (
        !["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(
          ctx.path,
        ) ||
        isAPIError(ctx.context.returned)
      )
        return;
      const current =
        ctx.context.newSession ?? (await getAuthoritativeSessionFromCtx(ctx));
      if (
        !current ||
        !options.email ||
        !current.user.emailVerified ||
        current.user.email.toLowerCase() !== options.email.toLowerCase()
      )
        return;
      if (ctx.path === "/two-factor/verify-totp") {
        const codeHash = createHmac("sha256", options.secret)
          .update(`admin-totp:${current.user.id}:${ctx.body.code}`)
          .digest("hex");
        await options.pool.query(
          `DELETE FROM "${options.schema}"."adminFactorUse" WHERE "userId" = $1 AND "expiresAt" <= now()`,
          [current.user.id],
        );
        const consumed = await options.pool.query(
          `INSERT INTO "${options.schema}"."adminFactorUse" ("userId", "codeHash", "expiresAt")
            VALUES ($1, $2, now() + interval '2 minutes')
            ON CONFLICT ("userId", "codeHash") DO NOTHING RETURNING "userId"`,
          [current.user.id, codeHash],
        );
        if (consumed.rowCount !== 1)
          throw new APIError("UNAUTHORIZED", {
            message:
              "This authenticator code was already used. Wait for the next code.",
          });
      }
      // The grant is server-owned, created only after a real second-factor
      // verification. The proof is bound to this session and expires in 15 min.
      await options.pool.query(
        `WITH granted AS (
          INSERT INTO "${options.schema}"."superadmin" ("userId")
          SELECT u."id" FROM "${options.schema}"."user" u
          JOIN "${options.schema}"."twoFactor" f ON f."userId" = u."id"
          WHERE u."id" = $1 AND u."emailVerified" = true AND u."twoFactorEnabled" = true AND f."verified" = true
          ON CONFLICT ("userId") DO UPDATE SET "userId" = EXCLUDED."userId" RETURNING "userId"
        ) INSERT INTO "${options.schema}"."adminSession" ("sessionId", "userId", "verifiedAt")
          SELECT s."id", g."userId", now() FROM granted g
          JOIN "${options.schema}"."session" s ON s."userId" = g."userId" AND s."id" = $2
          ON CONFLICT ("sessionId") DO UPDATE SET "verifiedAt" = now()`,
        [current.user.id, current.session.id],
      );
    }),
  };
}
