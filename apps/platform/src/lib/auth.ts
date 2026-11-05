import { Pool } from "pg";
import { sendSignInCode } from "./email-code";
import { createEmailCodeAuth } from "./email-code-auth";

let pool: Pool | undefined;
export function getAuthPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Auth database is not configured.");
  pool ??= new Pool({ connectionString, max: 5 });
  return pool;
}

function createAuth() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!connectionString || !secret || !baseURL) {
    throw new Error("Better Auth server environment is incomplete.");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (Boolean(clientId) !== Boolean(clientSecret))
    throw new Error("Google authentication environment is incomplete.");

  return createEmailCodeAuth({
    baseURL,
    secret,
    pool: getAuthPool(),
    sendCode: sendSignInCode,
    dashboardKey: process.env.BETTER_AUTH_API_KEY,
    vercel: process.env.VERCEL === "1",
    superadminEmail: process.env.SUPERADMIN_EMAIL,
    google: clientId && clientSecret ? { clientId, clientSecret } : undefined,
    trustedOrigins: [
      new URL(baseURL).origin,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => new URL(origin).origin),
      "jungletribe://",
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Keep provider credentials out of build-time route discovery.
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
