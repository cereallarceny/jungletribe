# Jungle Tribe - Technical handoff for Wayfinder / Two Spec

## Architectural intent
- TypeScript Turborepo monorepo.
- Expo + React Native + React Native Web for iOS, Android and primary consumer web experience.
- Next.js on Vercel for first-party API, administration UI and SEO-indexable public collection/profile pages as needed.
- Shared packages: API contracts, validation, domain models, UI tokens, test helpers, business rules.
- First-party authenticated API only in MVP. Design authorization model to accommodate future user-scoped tokens without exposing public developer token management now.
- Stripe Connect for marketplace payments and payouts; external providers for identity/liveness, optional background checks, AI plant recognition and potential insurance.

## Proposed repo structure (to refine with skill)
```
apps/
  mobile/          # Expo: iOS, Android, web
  platform/        # Next.js: API, admin, SEO landing/public pages
packages/
  contracts/       # schema, validation, generated client types
  domain/          # booking, pricing, collection, review rules
  ui/              # shared design tokens/components where appropriate
  config/          # lint, tsconfig, tooling
  test-utils/      # fixtures and integration helpers
```

## Engineering concerns to resolve before implementation
- Next.js API runtime and background jobs/webhooks; idempotent Stripe events and multi-visit payouts.
- Authentication, session management, admin RBAC and sitter/customer role combinations.
- Storage and privacy: addresses, verification artifacts, photos, consent, signed URLs, EXIF stripping, retention and deletion.
- Spatial matching and public distance obfuscation; timezone and daylight-saving behavior.
- SEO and deep-link strategy across React Native Web and Next.js public routes.
- Moderation and abuse handling, platform messaging safety, review fraud.
- Marketplace lifecycle state machine: draft, requested, counteroffer, accepted, charged, scheduled, visit completed, booking completed, reviewed, canceled, disputed, refunded.
- Testing: unit/domain rules, contract tests, web/mobile E2E, provider sandbox integration, CI on Turborepo.
- Operational requirements: observability, alerting, backups, privacy compliance, incident response.

## Suggested specification workflow
1. Feed `README.md`, `01-product-spec.md`, `02-commercial-research.md`, and this file into a fresh repository.
2. Use Wayfinder or Two Spec to resolve unanswered architecture choices and convert product flows into explicit acceptance criteria and implementation slices.
3. Prioritize vertical slices: authentication + collection CRUD; sitter onboarding; discovery + availability; booking + messaging; Stripe; reviews + admin.
4. Require runnable E2E acceptance tests for each slice before expanding scope.
5. Keep insurance feature-flagged until policy/legal/provider fit is validated.

## Important non-goals
Do not build a public third-party API, social forum, plant trading marketplace, automatic watering reminder engine, insurance underwriter, or premium collector plan for MVP.
