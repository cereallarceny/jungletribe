import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before, mock, test } from "node:test";
import { Pool } from "pg";
import { createAdminHandler } from "../src/lib/admin-handler";
import { createAuthHandler } from "../src/lib/auth-handler";
import { createEmailCodeAuth } from "../src/lib/email-code-auth";
import { authenticatorCode } from "./totp-fixture";

const connectionString =
  process.env.AUTH_TEST_DATABASE_URL ??
  (process.env.AUTH_TEST_USE_DEVELOPMENT === "1"
    ? process.env.DATABASE_URL_UNPOOLED
    : undefined);
if (!connectionString) throw new Error("AUTH_TEST_DATABASE_URL is required.");
const pool = new Pool({ connectionString, max: 5 });
const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
const baseURL = "https://google-api.test.invalid";
const origin = "https://google-app.test.invalid";
const deliveries = new Map<string, string>();
const owner = "google-owner@example.test";
const auth = createEmailCodeAuth({
  pool,
  schema,
  baseURL,
  trustedOrigins: [origin, baseURL],
  secret: "google-fixture-secret-with-more-than-thirty-two-characters",
  superadminEmail: owner,
  vercel: true,
  google: {
    clientId: "fixture.apps.googleusercontent.com",
    clientSecret: "fixture-only-secret",
  },
  sendCode: async (email, code) => {
    deliveries.set(email, code);
  },
});
const handle = createAuthHandler(auth, [origin, baseURL]);
const admin = createAdminHandler(
  {
    getSession: (headers) => auth.api.getSession({ headers }),
    pool,
    schema,
    email: owner,
    origins: [origin, baseURL],
  },
  true,
);
let ip = 1;
let profile = {
  sub: "google-fixture",
  email: "google-collector@example.test",
  email_verified: true,
  name: "Fixture Collector",
};

before(async () => {
  for (const name of [
    "0001_auth.sql",
    "0002_email_code_limits.sql",
    "0003_superadmin_mfa.sql",
    "0004_admin_totp_replay.sql",
  ]) {
    const sql = await readFile(
      new URL(`../migrations/${name}`, import.meta.url),
      "utf8",
    );
    await pool.query(sql.replaceAll('"auth"', `"${schema}"`));
  }
  // Only Google's token-exchange transport is faked. State, PKCE, account
  // decisions, callback redirects, cookies and database writes use Better Auth.
  mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    assert.equal(url, "https://oauth2.googleapis.com/token");
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        ...profile,
        iss: "https://accounts.google.com",
        aud: "fixture.apps.googleusercontent.com",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    return Response.json({
      access_token: "fixture-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: `${header}.${payload}.fixture-signature`,
    });
  });
});

after(async () => {
  mock.restoreAll();
  try {
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await pool.end();
  }
});

function post(path: string, body: object, cookie = "") {
  return handle(
    new Request(`${baseURL}/api/auth${path}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": `192.0.2.${ip++}`,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function begin(path = "/sign-in/social", cookie = "") {
  const response = await post(
    path,
    { provider: "google", callbackURL: origin, errorCallbackURL: origin },
    cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  const url = new URL(body.url);
  return {
    url,
    cookie: [cookie, cookies(response)].filter(Boolean).join("; "),
  };
}
function callback(flow: { url: URL; cookie: string }, code = "fixture-code") {
  return handle(
    new Request(
      `${baseURL}/api/auth/callback/google?code=${code}&state=${flow.url.searchParams.get("state")}`,
      { headers: { Cookie: flow.cookie } },
    ),
  );
}
async function emailSession(email: string) {
  assert.equal(
    (await post("/email-otp/send-verification-otp", { email, type: "sign-in" }))
      .status,
    200,
  );
  const response = await post("/sign-in/email-otp", {
    email,
    otp: deliveries.get(email),
  });
  assert.equal(response.status, 200);
  return cookies(response);
}

test("Google authorization uses PKCE, exact callback and basic identity only", async () => {
  const flow = await begin();
  assert.equal(flow.url.origin, "https://accounts.google.com");
  assert.equal(
    flow.url.searchParams.get("client_id"),
    "fixture.apps.googleusercontent.com",
  );
  assert.equal(
    flow.url.searchParams.get("redirect_uri"),
    `${baseURL}/api/auth/callback/google`,
  );
  assert.deepEqual(flow.url.searchParams.get("scope")?.split(" ").sort(), [
    "email",
    "openid",
    "profile",
  ]);
  assert.equal(flow.url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(flow.url.searchParams.get("state"));
  assert.equal(flow.url.searchParams.get("access_type"), "online");
  assert.equal(flow.url.searchParams.get("include_granted_scopes"), null);
  assert.equal(
    (
      await post("/sign-in/social", {
        provider: "google",
        additionalParams: { access_type: "offline" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await post("/sign-in/social", {
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/drive"],
      })
    ).status,
    403,
  );
});

test("new verified Google identity creates an ordinary session and rejects replay", async () => {
  const flow = await begin();
  const response = await callback(flow);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), origin);
  const cookie = cookies(response);
  const session = await handle(
    new Request(`${baseURL}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    }),
  );
  const data = await session.json();
  assert.equal(data.user.email, profile.email);
  assert.equal(data.user.emailVerified, true);
  assert.equal(
    (
      await admin(
        new Request(`${baseURL}/api/admin/access`, {
          headers: { Cookie: cookie },
        }),
      )
    ).status,
    403,
  );
  const replay = await callback(flow);
  assert.match(replay.headers.get("location") ?? "", /error=/);
  const account = await pool.query(
    `SELECT "accessToken" FROM "${schema}"."account" WHERE "providerId"='google'`,
  );
  assert.equal(typeof account.rows[0].accessToken, "string");
  assert.notEqual(account.rows[0].accessToken, "fixture-access-token");
});

test("missing state and Google cancellation return safely without a session", async () => {
  const missing = await handle(
    new Request(`${baseURL}/api/auth/callback/google?code=fixture-code`),
  );
  assert.equal(missing.status, 302);
  assert.match(missing.headers.get("location") ?? "", /error=/);
  const flow = await begin();
  const cancelled = await handle(
    new Request(
      `${baseURL}/api/auth/callback/google?error=access_denied&state=${flow.url.searchParams.get("state")}`,
      { headers: { Cookie: flow.cookie } },
    ),
  );
  assert.match(cancelled.headers.get("location") ?? "", /access_denied/);
  assert.doesNotMatch(cookies(cancelled), /session_token/);
});

test("email collision never implicitly links; verified matching account can explicitly connect", async () => {
  profile = {
    ...profile,
    sub: "explicit-link",
    email: "explicit-link@example.test",
  };
  const cookie = await emailSession(profile.email);
  const implicit = await callback(await begin());
  assert.match(implicit.headers.get("location") ?? "", /error=/);
  const before = await pool.query(
    `SELECT count(*) FROM "${schema}"."account" a JOIN "${schema}"."user" u ON u.id=a."userId" WHERE u.email=$1 AND a."providerId"='google'`,
    [profile.email],
  );
  assert.equal(before.rows[0].count, "0");
  const linked = await callback(await begin("/link-social", cookie));
  assert.equal(linked.headers.get("location"), origin);
  const returning = await callback(await begin());
  assert.match(cookies(returning), /session_token/);
});

test("linking rejects other email identities, unverified Google email, stale or absent primary sessions", async () => {
  const cookie = await emailSession("link-policy@example.test");
  profile = {
    ...profile,
    sub: "wrong-email",
    email: "someone-else@example.test",
  };
  const mismatch = await callback(await begin("/link-social", cookie));
  assert.match(mismatch.headers.get("location") ?? "", /error=/);
  profile = {
    ...profile,
    sub: "unverified",
    email: "link-policy@example.test",
    email_verified: false,
  };
  const unverified = await callback(await begin("/link-social", cookie));
  assert.match(unverified.headers.get("location") ?? "", /error=/);
  profile = { ...profile, email: "unverified-new@example.test" };
  const freshSignup = await callback(await begin());
  assert.match(freshSignup.headers.get("location") ?? "", /error=/);
  await pool.query(
    `UPDATE "${schema}"."session" SET "createdAt"=now()-interval '11 minutes' WHERE "userId"=(SELECT id FROM "${schema}"."user" WHERE email='link-policy@example.test')`,
  );
  assert.equal(
    (
      await post(
        "/link-social",
        { provider: "google", callbackURL: origin },
        cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("/link-social", { provider: "google", callbackURL: origin }))
      .status,
    403,
  );
});

test("Google owner sign-in never grants admin access and email alone cannot connect a new method", async () => {
  profile = {
    ...profile,
    sub: "google-owner",
    email: owner,
    email_verified: true,
  };
  const response = await callback(await begin());
  const cookie = cookies(response);
  assert.match(cookie, /session_token/);
  assert.equal(
    (
      await admin(
        new Request(`${baseURL}/api/admin/access`, {
          headers: { Cookie: cookie },
        }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await post(
        "/link-social",
        { provider: "google", callbackURL: origin },
        cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (await post("/unlink-account", { providerId: "google" }, cookie)).status,
    404,
  );
  const enrollment = await post(
    "/two-factor/enable",
    { method: "totp" },
    cookie,
  );
  assert.equal(enrollment.status, 200);
  const setup = await enrollment.json();
  const factor = await post(
    "/two-factor/verify-totp",
    { code: authenticatorCode(setup.totpURI), trustDevice: false },
    cookie,
  );
  assert.equal(factor.status, 200);
  const verifiedCookie = cookies(factor);
  assert.equal(
    (
      await admin(
        new Request(`${baseURL}/api/admin/access`, {
          headers: { Cookie: verifiedCookie },
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await post(
        "/link-social",
        { provider: "google", callbackURL: origin },
        verifiedCookie,
      )
    ).status,
    200,
  );
  const returning = await callback(await begin());
  const newCookie = cookies(returning);
  assert.match(newCookie, /session_token/);
  assert.equal(
    (
      await admin(
        new Request(`${baseURL}/api/admin/access`, {
          headers: { Cookie: newCookie },
        }),
      )
    ).status,
    403,
  );
});
