import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createAuthClient } from "better-auth/react";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { SessionLoadingBoundary } from "../src/auth/SessionLoadingBoundary";

const dom = new JSDOM("<!doctype html><div id='root'></div>", {
  pretendToBeVisual: true,
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});

Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});

function CodeEntry() {
  const [step, setStep] = useState("email");
  return createElement(
    "button",
    { type: "button", onClick: () => setStep("code") },
    step,
  );
}

function screen(pending: boolean, signedIn = false) {
  return createElement(
    SessionLoadingBoundary,
    {
      pending,
      fallback: createElement("span", null, "Checking your session"),
    },
    signedIn
      ? createElement("span", null, "Signed in")
      : createElement(CodeEntry),
  );
}

test("returning from email preserves code entry through background session checks", async () => {
  const container = document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(screen(true));
    });
    assert.equal(container.textContent, "Checking your session");
    await act(async () => {
      root.render(screen(false));
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    assert.equal(container.textContent, "code");
    for (let refresh = 0; refresh < 3; refresh++) {
      await act(async () => {
        root.render(screen(true));
      });
      assert.equal(
        container.textContent,
        "code",
        "background refresh removed code entry",
      );
      await act(async () => {
        root.render(screen(false));
      });
      assert.equal(
        container.textContent,
        "code",
        "returning from email reset the form",
      );
    }
    // Preserving the form must not preserve stale authentication decisions.
    await act(async () => {
      root.render(screen(false, true));
    });
    assert.equal(container.textContent, "Signed in");
    await act(async () => {
      root.render(screen(false));
    });
    assert.equal(container.textContent, "email");
  } finally {
    await act(async () => {
      root.unmount();
    });
  }
});

after(() => dom.window.close());

function RealSession({
  client,
}: {
  client: ReturnType<typeof createAuthClient>;
}) {
  const session = client.useSession();
  return screen(session.isPending);
}

test("Better Auth visibility refetch keeps the pending email-code form mounted", {
  timeout: 2000,
}, async () => {
  let requested = Promise.withResolvers<void>();
  let respond: ((response: Response) => void) | undefined;
  const client = createAuthClient({
    baseURL: "http://localhost:3001",
    fetchOptions: {
      customFetchImpl: async () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
          requested.resolve();
        }),
    },
  });
  const container = document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(createElement(RealSession, { client }));
    });
    await act(async () => {
      await requested.promise;
    });
    await act(async () => {
      respond?.(Response.json(null));
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    assert.equal(container.textContent, "code");
    requested = Promise.withResolvers<void>();
    await act(async () => {
      document.dispatchEvent(new dom.window.Event("visibilitychange"));
      await requested.promise;
    });
    assert.equal(
      container.textContent,
      "code",
      "focus-triggered session request removed code entry",
    );
    await act(async () => {
      respond?.(Response.json(null));
    });
    assert.equal(
      container.textContent,
      "code",
      "returning from email reset the code step",
    );
  } finally {
    respond?.(Response.json(null));
    await act(async () => {
      root.unmount();
    });
  }
});
