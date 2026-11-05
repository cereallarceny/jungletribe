import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const action = process.argv[2];
if (!["generate", "check"].includes(action)) {
  throw new Error(
    "Expected generate or check; migrations are applied separately.",
  );
}
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED is required for schema commands.");
}
const output = process.argv[3] ?? "migrations/0001_auth.sql";
if (action === "generate" && existsSync(output)) {
  throw new Error("Migration already exists; supply a new migration filename.");
}
const args =
  action === "generate"
    ? ["generate", "--output", output, "--yes"]
    : ["check", "schema"];
const result = spawnSync("auth", [...args, "--config", "auth.config.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_UNPOOLED,
    BETTER_AUTH_API_KEY: "",
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
