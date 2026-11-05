create schema if not exists "auth";

alter table "auth"."user" add column "twoFactorEnabled" boolean default false;

create table "auth"."twoFactor" ("id" text not null primary key, "secret" text not null, "backupCodes" text not null, "userId" text not null references "auth"."user" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create index "twoFactor_secret_idx" on "auth"."twoFactor" ("secret");

create index "twoFactor_userId_idx" on "auth"."twoFactor" ("userId");

-- Application-owned grants and short-lived second-factor proofs.
CREATE TABLE "auth"."superadmin" (
  "userId" text PRIMARY KEY REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "auth"."adminSession" (
  "sessionId" text PRIMARY KEY REFERENCES "auth"."session" ("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "verifiedAt" timestamptz NOT NULL
);

CREATE TABLE "auth"."adminFactorAttempt" (
  "userId" text PRIMARY KEY REFERENCES "auth"."user" ("id") ON DELETE CASCADE,
  "startedAt" timestamptz NOT NULL,
  "count" integer NOT NULL CHECK ("count" > 0)
);
