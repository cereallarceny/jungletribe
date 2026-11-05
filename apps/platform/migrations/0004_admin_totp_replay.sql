-- A successful authenticator code cannot authorize another session in its
-- acceptance window. Store an HMAC, never the code or authenticator secret.
CREATE TABLE "auth"."adminFactorUse" (
  "userId" text NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "codeHash" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  PRIMARY KEY ("userId", "codeHash")
);
