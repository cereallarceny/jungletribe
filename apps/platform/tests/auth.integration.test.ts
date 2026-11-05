import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { createAdminHandler } from "../src/lib/admin-handler";
import { createAuthHandler } from "../src/lib/auth-handler";
import { createEmailCodeAuth } from "../src/lib/email-code-auth";

const connectionString =
  process.env.AUTH_TEST_DATABASE_URL ??
  (process.env.AUTH_TEST_USE_DEVELOPMENT === "1"
    ? process.env.DATABASE_URL_UNPOOLED
    : undefined);
if (!connectionString) throw new Error("AUTH_TEST_DATABASE_URL is required.");
const pool = new Pool({ connectionString, max: 5 });
const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
const origin = "https://app.test.invalid";
const baseURL = "https://api.test.invalid";
const deliveries: { email: string; code: string }[] = [];
let rejectDelivery = false;
let ip = 1;

let currentAuth: ReturnType<typeof createEmailCodeAuth>;
function server(superadminEmail = "owner@example.com") {
  currentAuth = createEmailCodeAuth({
    pool,
    schema,
    secret: "test-only-secret-with-at-least-thirty-two-characters",
    baseURL,
    trustedOrigins: [origin, baseURL],
    vercel: true,
    superadminEmail,
    async sendCode(email, code) {
      if (rejectDelivery) throw new Error("Test delivery failure.");
      deliveries.push({ email, code });
    },
  });
  return createAuthHandler(currentAuth, [origin, baseURL]);
}
let handle = server();

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
});

after(async () => {
  try {
    await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await pool.end();
  }
});

function request(
  path: string,
  body?: object,
  cookie?: string,
  clientIP?: string,
) {
  return new Request(`${baseURL}/api/auth${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": clientIP ?? `192.0.2.${ip++}`,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
function send(email: string) {
  return handle(
    request("/email-otp/send-verification-otp", { email, type: "sign-in" }),
  );
}
function verify(email: string, otp: string) {
  return handle(request("/sign-in/email-otp", { email, otp }));
}
function codeFor(email: string) {
  const delivery = deliveries.findLast((item) => item.email === email);
  assert.ok(delivery);
  assert.match(delivery.code, /^\d{6}$/);
  return delivery.code;
}
function sessionCookie(response: Response) {
  const value = response.headers
    .getSetCookie()
    .find((cookie) => cookie.includes("session_token="));
  assert.ok(value);
  assert.match(value, /HttpOnly/i);
  assert.match(value, /Secure/i);
  assert.match(value, /SameSite=Lax/i);
  assert.doesNotMatch(value, /Domain=/i);
  return value.split(";")[0] as string;
}

test("email code proves ownership, starts a secure session, and cannot be replayed", async () => {
  const email = "collector@example.com";
  assert.equal((await send(email)).status, 200);
  const code = codeFor(email);
  const response = await verify(email, code);
  assert.equal(response.status, 200);
  const cookie = sessionCookie(response);
  const session = await (
    await handle(request("/get-session", undefined, cookie))
  ).json();
  assert.equal(session.user.email, email);
  assert.equal(session.user.emailVerified, true);
  assert.equal(session.user.role, undefined);
  assert.equal((await verify(email, code)).status, 400);
  assert.equal((await handle(request("/sign-out", {}, cookie))).status, 200);
  assert.equal(
    await (await handle(request("/get-session", undefined, cookie))).json(),
    null,
  );
});

test("resend cooldown is atomic across instances and does not invalidate the first code", async () => {
  const email = "cooldown@example.com";
  const results = await Promise.all([send(email), send(email)]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [200, 429],
  );
  const code = codeFor(email);
  handle = server();
  assert.equal((await send("COOLDOWN@example.com")).status, 429);
  assert.equal(deliveries.filter((item) => item.email === email).length, 1);
  assert.equal((await verify(email, code)).status, 200);
});

test("five wrong attempts exhaust a code", async () => {
  const email = "attempts@example.com";
  await send(email);
  const code = codeFor(email);
  const wrong = code === "000000" ? "999999" : "000000";
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await verify(email, wrong)).status, 400);
  }
  assert.notEqual((await verify(email, code)).status, 200);
});

test("expired codes cannot authenticate", async () => {
  const email = "expired@example.com";
  await send(email);
  const code = codeFor(email);
  // Arrange time-expired persisted state without a ten-minute test delay.
  await pool.query(
    `UPDATE "${schema}"."verification" SET "expiresAt" = now() - interval '1 minute'`,
  );
  assert.equal((await verify(email, code)).status, 400);
});

test("sign out everywhere revokes two independent sessions", async () => {
  const email = "sessions@example.com";
  await send(email);
  const first = sessionCookie(await verify(email, codeFor(email)));
  await pool.query(
    `UPDATE "${schema}"."emailCodeDelivery" SET "lastSentAt" = now() - interval '61 seconds'`,
  );
  await send(email);
  const second = sessionCookie(await verify(email, codeFor(email)));
  assert.equal(
    (await handle(request("/revoke-sessions", {}, second))).status,
    200,
  );
  for (const cookie of [first, second]) {
    assert.equal(
      await (await handle(request("/get-session", undefined, cookie))).json(),
      null,
    );
  }
});

test("exact website origins receive credentialed CORS; untrusted origins cannot request codes", async () => {
  const response = await handle(
    new Request(`${baseURL}/api/auth/get-session`, {
      method: "OPTIONS",
      headers: { Origin: origin },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(
    response.headers.get("Access-Control-Allow-Credentials"),
    "true",
  );
  const malicious = request("/email-otp/send-verification-otp", {
    email: "blocked@example.com",
    type: "sign-in",
  });
  malicious.headers.set("Origin", "https://app.test.invalid.evil.example");
  assert.equal((await handle(malicious)).status, 403);
  assert.ok(!deliveries.some((item) => item.email === "blocked@example.com"));
});

test("per-IP send limits persist across server instances", async () => {
  const clientIP = "198.51.100.1";
  for (let i = 0; i < 5; i++) {
    const response = await handle(
      request(
        "/email-otp/send-verification-otp",
        {
          email: `iplimit${i}@example.com`,
          type: "sign-in",
        },
        undefined,
        clientIP,
      ),
    );
    assert.equal(response.status, 200);
  }
  handle = server();
  const response = await handle(
    request(
      "/email-otp/send-verification-otp",
      {
        email: "iplimitblocked@example.com",
        type: "sign-in",
      },
      undefined,
      clientIP,
    ),
  );
  assert.equal(response.status, 429);
});

test("provider failure does not report successful delivery", async () => {
  rejectDelivery = true;
  try {
    assert.equal((await send("delivery-failure@example.com")).status, 503);
  } finally {
    rejectDelivery = false;
  }
});

test("only one concurrent verification can consume the same code", async () => {
  const email = "concurrent@example.com";
  await send(email);
  const code = codeFor(email);
  const results = await Promise.all([verify(email, code), verify(email, code)]);
  assert.equal(results.filter((response) => response.status === 200).length, 1);
});

test("recipient hourly quota survives a new server instance", async () => {
  const email = "hourly@example.com";
  for (let count = 0; count < 5; count++) {
    assert.equal((await send(email)).status, 200);
    await pool.query(
      `UPDATE "${schema}"."emailCodeDelivery" SET "lastSentAt" = now() - interval '61 seconds'`,
    );
  }
  handle = server();
  assert.equal((await send(email)).status, 429);
  assert.equal(deliveries.filter((item) => item.email === email).length, 5);
});

test("password and unimplemented code purposes cannot create usable login paths", async () => {
  assert.equal(
    (
      await handle(
        request("/email-otp/send-verification-otp", {
          email: "purposes@example.com",
          type: "forget-password",
        }),
      )
    ).status,
    400,
  );
  assert.notEqual(
    (
      await handle(
        request("/sign-up/email", {
          email: "password@example.com",
          password: "password1234",
          name: "Collector",
        }),
      )
    ).status,
    200,
  );
});

function adminRequest(
  cookie?: string,
  email = "owner@example.com",
  protectedResource = true,
) {
  return createAdminHandler(
    {
      getSession: (headers) => currentAuth.api.getSession({ headers }),
      pool,
      schema,
      email,
      origins: [origin],
    },
    protectedResource,
  )(
    new Request(`${baseURL}/api/admin/access`, {
      headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    }),
  );
}

// Independent RFC 6238 client fixture, not the server's TOTP generator.
function authenticatorCode(uri: string) {
  const secret = new URL(uri).searchParams.get("secret");
  assert.ok(secret);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "")]
    .map((character) =>
      alphabet.indexOf(character).toString(2).padStart(5, "0"),
    )
    .join("");
  const bytes = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 15;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
}

test("superadmin requires a verified second factor bound to the session, with one-use recovery", async () => {
  handle = server();
  const email = "owner@example.com";
  assert.equal((await adminRequest()).status, 401);
  await send(email);
  let cookie = sessionCookie(await verify(email, codeFor(email)));
  assert.equal((await adminRequest(cookie)).status, 403);
  const enrollment = await handle(
    request("/two-factor/enable", { method: "totp" }, cookie),
  );
  assert.equal(enrollment.status, 200);
  const setup = await enrollment.json();
  assert.equal((await adminRequest(cookie)).status, 403);
  const usedTotp = authenticatorCode(setup.totpURI);
  const factor = await handle(
    request("/two-factor/verify-totp", { code: usedTotp }, cookie),
  );
  assert.equal(factor.status, 200);
  cookie = sessionCookie(factor);
  assert.equal((await adminRequest(cookie)).status, 200);
  assert.equal((await (await adminRequest(cookie)).json()).role, "superadmin");
  await pool.query(
    `UPDATE "${schema}"."adminSession" SET "verifiedAt" = now() - interval '16 minutes'`,
  );
  assert.equal((await adminRequest(cookie)).status, 403);
  assert.equal(
    (await handle(request("/two-factor/get-totp-uri", {}, cookie))).status,
    403,
  );
  assert.equal(
    (await handle(request("/two-factor/disable", {}, cookie))).status,
    403,
  );
  assert.equal(
    (await handle(request("/two-factor/generate-backup-codes", {}, cookie)))
      .status,
    403,
  );
  await pool.query(
    `UPDATE "${schema}"."emailCodeDelivery" SET "lastSentAt" = now() - interval '61 seconds'`,
  );
  await send(email);
  const newCookie = sessionCookie(await verify(email, codeFor(email)));
  assert.equal((await adminRequest(newCookie)).status, 403);
  assert.equal(
    (
      await handle(
        request("/two-factor/verify-totp", { code: usedTotp }, newCookie),
      )
    ).status,
    401,
  );
  assert.equal((await adminRequest(newCookie)).status, 403);
  assert.equal(
    (
      await handle(
        request(
          "/two-factor/verify-backup-code",
          { code: setup.backupCodes[0] },
          newCookie,
        ),
      )
    ).status,
    200,
  );
  assert.equal((await adminRequest(newCookie)).status, 200);
  assert.notEqual(
    (
      await handle(
        request(
          "/two-factor/verify-backup-code",
          { code: setup.backupCodes[0] },
          newCookie,
        ),
      )
    ).status,
    200,
  );
  await handle(request("/sign-out", {}, newCookie));
  assert.equal((await adminRequest(newCookie)).status, 401);
});

test("a regular collector cannot enroll admin MFA or self-assign the grant", async () => {
  handle = server();
  const email = "regular@example.com";
  await send(email);
  const response = await handle(
    request("/sign-in/email-otp", {
      email,
      otp: codeFor(email),
      role: "superadmin",
      twoFactorEnabled: true,
    }),
  );
  const cookie = sessionCookie(response);
  assert.equal((await adminRequest(cookie)).status, 403);
  assert.equal(
    (await handle(request("/two-factor/enable", { method: "totp" }, cookie)))
      .status,
    403,
  );
});

test("factor guesses are bounded across sessions and changing IP addresses", async () => {
  const email = "attempt-owner@example.com";
  handle = server(email);
  await send(email);
  const cookie = sessionCookie(await verify(email, codeFor(email)));
  const enrollment = await handle(
    request("/two-factor/enable", { method: "totp" }, cookie),
  );
  assert.equal(enrollment.status, 200);
  for (let i = 0; i < 5; i++) {
    assert.notEqual(
      (
        await handle(
          request("/two-factor/verify-totp", { code: "invalid" }, cookie),
        )
      ).status,
      200,
    );
  }
  handle = server(email);
  assert.equal(
    (
      await handle(
        request("/two-factor/verify-totp", { code: "123456" }, cookie),
      )
    ).status,
    429,
  );
  assert.equal((await adminRequest(cookie, email)).status, 403);
});

test("native-style origin and cookie requests authenticate without a web cookie jar", async () => {
  handle = server();
  const email = "native@example.com";
  const sendRequest = request("/email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
  sendRequest.headers.delete("Origin");
  sendRequest.headers.set("expo-origin", "jungletribe://");
  // The factory trusts only the explicitly registered app scheme.
  const nativeAuth = createEmailCodeAuth({
    pool,
    schema,
    secret: "native-test-secret-at-least-thirty-two-characters",
    baseURL,
    trustedOrigins: ["jungletribe://"],
    sendCode: async (to, code) => {
      deliveries.push({ email: to, code });
    },
    vercel: true,
  });
  const nativeHandler = createAuthHandler(nativeAuth, ["jungletribe://"]);
  assert.equal((await nativeHandler(sendRequest)).status, 200);
  const verifyRequest = request("/sign-in/email-otp", {
    email,
    otp: codeFor(email),
  });
  verifyRequest.headers.delete("Origin");
  verifyRequest.headers.set("expo-origin", "jungletribe://");
  const cookie = sessionCookie(await nativeHandler(verifyRequest));
  const readRequest = request("/get-session", undefined, cookie);
  readRequest.headers.delete("Origin");
  readRequest.headers.set("expo-origin", "jungletribe://");
  assert.equal(
    (await (await nativeHandler(readRequest)).json()).user.email,
    email,
  );
});
