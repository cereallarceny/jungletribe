import assert from "node:assert/strict";
import { test } from "node:test";
import { runGoogleFlow } from "../src/auth/google-flow";

const silentBrowserResult = {
  signIn: async () => ({ error: null }),
  link: async () => ({ error: null }),
  session: async () => ({ data: null }),
  accounts: async () => ({ data: [] }),
};
const options = { callbackURL: "jungletribe:///", native: true, link: false };

test("native cancel/dismiss cannot masquerade as Google sign-in or linking success", async () => {
  await assert.rejects(
    runGoogleFlow(silentBrowserResult, options),
    /cancelled or didn't finish/,
  );
  await assert.rejects(
    runGoogleFlow(silentBrowserResult, { ...options, link: true }),
    /connection didn't finish/,
  );
});

test("native completion requires a real session or linked Google account", async () => {
  await runGoogleFlow(
    { ...silentBrowserResult, session: async () => ({ data: { user: {} } }) },
    options,
  );
  await runGoogleFlow(
    {
      ...silentBrowserResult,
      accounts: async () => ({ data: [{ providerId: "google" }] }),
    },
    { ...options, link: true },
  );
  await assert.rejects(
    runGoogleFlow(
      {
        ...silentBrowserResult,
        session: async () => ({ error: { message: "offline" } }),
      },
      options,
    ),
    /didn't finish/,
  );
});

test("web redirect starts without pretending a completed browser callback", async () => {
  let checkedSession = false;
  await runGoogleFlow(
    {
      ...silentBrowserResult,
      session: async () => {
        checkedSession = true;
        return { data: null };
      },
    },
    { ...options, native: false },
  );
  assert.equal(checkedSession, false);
  await assert.rejects(
    runGoogleFlow(
      {
        ...silentBrowserResult,
        signIn: async () => ({ error: { message: "Provider unavailable" } }),
      },
      options,
    ),
    /Provider unavailable/,
  );
});
