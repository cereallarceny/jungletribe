# Delivery workflow

Create feature branches from `staging` and target their pull requests at `staging`, the repository's default integration branch. Promote tested releases with a pull request from `staging` to `main`.

```text
feature branch → staging → main
```

CI checks pull requests and pushes to both long-lived branches. Vercel's production branch remains `main`, independently of GitHub's default branch. The `staging` branch has stable preview-domain assignments; other feature previews must not take over those domains.

| Environment | Website                         | API                                 | Git branch |
| ----------- | ------------------------------- | ----------------------------------- | ---------- |
| Production  | https://jungletribe.app         | https://api.jungletribe.app         | `main`     |
| Staging     | https://staging.jungletribe.app | https://staging-api.jungletribe.app | `staging`  |

Vercel projects in the Personal team:
- `jungletribe-web`: Expo web, root `apps/mobile`, build `pnpm exec expo export --platform web`, output `dist`.
- `jungletribe-api`: Next.js platform/API, root `apps/platform`, build `pnpm build`, Functions region `iad1` near Neon US East 1.
- Both use Node.js 24 and workspace installation with the frozen lockfile.

Production configuration uses production-scoped variables. Staging configuration uses preview variables scoped specifically to Git branch `staging`; feature previews do not inherit staging-specific values. `BETTER_AUTH_URL` is the API origin, `BETTER_AUTH_TRUSTED_ORIGINS` contains the corresponding website origin, and the website's `EXPO_PUBLIC_API_URL` is its matching API origin. The consumer client still needs to consume that API setting when implemented.

Database credentials, auth secrets, OAuth callbacks, CORS/session behavior and dashboard connection must be configured and verified independently for each deployed environment. Development bootstrap credentials must not become production runtime credentials. Domain assignment and DNS verification do not prove that an application is deployed or that authentication works.
