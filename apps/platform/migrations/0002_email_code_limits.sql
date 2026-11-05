CREATE TABLE "auth"."rateLimit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text UNIQUE NOT NULL,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);

CREATE TABLE "auth"."emailCodeDelivery" (
  "recipient" text PRIMARY KEY NOT NULL,
  "lastSentAt" timestamptz NOT NULL,
  "windowStartedAt" timestamptz NOT NULL,
  "count" integer NOT NULL CHECK ("count" > 0)
);
