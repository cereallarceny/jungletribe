// Local-only browser fixture: synthetic identities, fake delivery, isolated DB.
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Pool } from "pg";
import { createAdminHandler } from "../src/lib/admin-handler";
import { createAuthHandler } from "../src/lib/auth-handler";
import { createEmailCodeAuth } from "../src/lib/email-code-auth";

if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("The UI fixture must never run in a hosted environment.");
const connectionString =
  process.env.AUTH_TEST_DATABASE_URL ??
  (process.env.AUTH_TEST_USE_DEVELOPMENT === "1"
    ? process.env.DATABASE_URL_UNPOOLED
    : undefined);
if (!connectionString)
  throw new Error("Explicit test database configuration is required.");
const pool = new Pool({ connectionString, max: 5 });
const schema = `auth_ui_${randomUUID().replaceAll("-", "")}`;
const origin = "http://localhost:8081";
const codes = new Map<string, string>();
async function main() {
  for (const name of [
    "0001_auth.sql",
    "0002_email_code_limits.sql",
    "0003_superadmin_mfa.sql",
    "0004_admin_totp_replay.sql",
  ]) {
    await pool.query(
      (
        await readFile(
          new URL(`../migrations/${name}`, import.meta.url),
          "utf8",
        )
      ).replaceAll('"auth"', `"${schema}"`),
    );
  }
  const auth = createEmailCodeAuth({
    pool,
    schema,
    secret: randomBytes(32).toString("base64url"),
    baseURL: "http://localhost:3001",
    trustedOrigins: [origin],
    superadminEmail: "owner@example.test",
    async sendCode(email, code) {
      if (!email.endsWith("@example.test"))
        throw new Error("Synthetic fixture identities only.");
      codes.set(email, code);
    },
  });
  const handle = createAuthHandler(auth, [origin]);
  const admin = createAdminHandler({
    getSession: (headers) => auth.api.getSession({ headers }),
    pool,
    schema,
    email: "owner@example.test",
    origins: [origin],
  });
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.url === "/__fixture/inbox") {
        outgoing.setHeader("Content-Type", "application/json");
        outgoing.setHeader("Cache-Control", "no-store");
        outgoing.end(
          JSON.stringify([...codes].map(([email, code]) => ({ email, code }))),
        );
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      const request = new Request(`http://localhost:3001${incoming.url}`, {
        method: incoming.method,
        headers,
        ...(chunks.length
          ? { body: Buffer.concat(chunks).toString("utf8") }
          : {}),
      });
      const response = await (incoming.url?.startsWith("/api/admin/")
        ? admin
        : handle)(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") outgoing.setHeader(key, value);
      });
      if (response.headers.getSetCookie().length)
        outgoing.setHeader("set-cookie", response.headers.getSetCookie());
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.statusCode = 500;
      outgoing.end("Fixture request failed.");
    }
  });
  server.listen(3001, "127.0.0.1", () =>
    console.log(
      "Synthetic auth fixture ready at http://localhost:3001; inbox /__fixture/inbox",
    ),
  );
  async function stop() {
    server.close();
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await pool.end();
    process.exit(0);
  }
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
main().catch(async () => {
  console.error("UI fixture failed.");
  await pool.end();
  process.exit(1);
});
