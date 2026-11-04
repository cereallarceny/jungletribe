import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";

function createAuth() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!connectionString || !secret || !baseURL) {
    throw new Error("Better Auth server environment is incomplete.");
  }

  return betterAuth({
    appName: "Jungle Tribe",
    baseURL,
    secret,
    database: {
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString, max: 5 }),
      }),
      type: "postgres",
      schemaName: "auth",
    },
    emailAndPassword: { enabled: false },
    trustedOrigins: [new URL(baseURL).origin],
    telemetry: { enabled: false },
    plugins: process.env.BETTER_AUTH_API_KEY
      ? [
          dash({
            apiKey: process.env.BETTER_AUTH_API_KEY,
            activityTracking: { enabled: false },
          }),
        ]
      : [],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

// Keep provider credentials out of build-time route discovery.
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
