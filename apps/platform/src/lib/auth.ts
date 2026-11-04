import { Pool } from "pg";
import { sendSignInCode } from "./email-code";
import { createEmailCodeAuth } from "./email-code-auth";

function createAuth() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!connectionString || !secret || !baseURL) {
    throw new Error("Better Auth server environment is incomplete.");
  }

  return createEmailCodeAuth({
    baseURL,
    secret,
    pool: new Pool({ connectionString, max: 5 }),
    sendCode: sendSignInCode,
    dashboardKey: process.env.BETTER_AUTH_API_KEY,
    vercel: process.env.VERCEL === "1",
    trustedOrigins: [
      new URL(baseURL).origin,
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => new URL(origin).origin),
    ],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Keep provider credentials out of build-time route discovery.
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
