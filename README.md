# Jungle Tribe

A free plant collection manager and a marketplace for in-home plant care. The initial community is Nashville; the intended product supports nationwide access.

This repository contains the application foundation and the product planning documents. The public landing page and consumer app shell are runnable. Accounts, collections, sitter onboarding, bookings, payments, and provider integrations are not implemented yet. The interfaces identify the product as coming soon.

## Workspace

| Location        | Purpose                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/mobile`   | Expo application for iOS, Android, and React Native Web                                                              |
| `apps/platform` | Next.js App Router application for public pages and the first-party API; administration follows authorization design |
| `packages/ui`   | Shared color tokens; native and browser components remain in their applications                                      |
| `docs`          | Product requirements, commercial hypotheses, architecture intent, and agent conventions                              |

`GET /api/health` reports process liveness only. It does not claim that the database, authentication, payments, or other providers are configured or healthy.

## Install and verify

Use Node.js 24 (the verified local version is in `.nvmrc`) and pnpm 11.17.0. With Corepack installed, `corepack enable` activates the package manager declared in `package.json`.

```sh
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs Biome, strict TypeScript checks, a production Next.js build, and Expo exports for web, iOS, and Android. Native exports verify JavaScript bundling; they are not simulator tests or signed native application builds. CI runs the same checks plus Expo dependency validation. Domain and end-to-end acceptance tests should arrive with each real feature slice; there is no placeholder test suite.

```sh
pnpm lint
pnpm typecheck
pnpm --filter @jungle-tribe/mobile check:dependencies
pnpm build
```

## Local development and provider setup

The shells and builds do not need secrets. Before starting provider-backed development or database commands, link the correct Vercel project, provision the agreed integrations, pull the development environment into the consuming application, and verify required key names without printing their values.

After project linkage and environment verification:

```sh
pnpm dev:platform   # Next.js, usually http://localhost:3000
pnpm dev:web        # Consumer web through Expo, usually http://localhost:8081
pnpm dev:mobile     # Expo for a device or simulator
```

`pnpm dev` starts both application development processes. Platform secrets belong in `apps/platform/.env.local`; any `EXPO_PUBLIC_` or `NEXT_PUBLIC_` value is public. `.env.example` intentionally has no speculative credentials. No database schema, migration, authentication provider, or payment connection has been selected by this scaffold.

For a future Vercel deployment, the Next.js project root is `apps/platform`; Expo's web export is in `apps/mobile/dist`. Domain routing, project linkage, environment provisioning, deployment settings, and native application identifiers still need configuration. CI does not deploy.

## Product context

Start with [the documentation index](docs/README.md). The [Jungle Tribe MVP delivery roadmap](https://github.com/cereallarceny/jungletribe/issues/2) tracks implementation epics, and the [MVP decision map](https://github.com/cereallarceny/jungletribe/issues/1) tracks questions that need resolving before the corresponding features can be built. Commercial demand, sitter eligibility thresholds, commission, and insurance coverage remain hypotheses or unresolved policies.

Dependency versions follow the [Expo SDK compatibility table](https://docs.expo.dev/versions/latest/), [Expo monorepo guidance](https://docs.expo.dev/guides/monorepos/), [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation), and [Turborepo task configuration](https://turborepo.com/docs/crafting-your-repository/configuring-tasks). Both applications declare the same React version to avoid duplicate React runtimes.
