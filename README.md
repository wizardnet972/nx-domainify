# nx-domainify

Nx plugin that scaffolds Angular libraries using a domain-driven layout and ESLint module-boundary tags.

Requires an [Nx](https://nx.dev) workspace with `@nx/angular` (Nx 23).

## Install

```sh
npm install -D nx-domainify
npx nx g nx-domainify:init
```

`init` writes DDD dependency constraints into your workspace ESLint config (`@nx/enforce-module-boundaries`).

## Generators

Create a domain first, then APIs, features, UI, and utils under it.

```sh
npx nx g nx-domainify:domain booking
npx nx g nx-domainify:feature shell --domain=booking
npx nx g nx-domainify:api availability --domain=booking
npx nx g nx-domainify:ui button --domain=booking
npx nx g nx-domainify:util dates --domain=booking
```

| Generator | What it creates | Tags |
| --- | --- | --- |
| `domain` | Buildable domain library with `application`, `entities`, and `infrastructure` folders | `domain:<name>`, `type:domain-logic` |
| `feature` | Feature library + component scoped to a domain | `domain:<name>`, `type:feature` |
| `api` | API library for a domain | `domain:<name>`, `type:api` |
| `ui` | UI library for a domain | `domain:<name>`, `type:ui` |
| `util` | Utility library for a domain | `domain:<name>`, `type:util` |
| `init` | Module-boundary rules for apps → features/api/ui → domain → util | — |

Pass `--directory` to nest libraries. `api` and `util` accept `--skipPrefix` to omit the `api-` / `util-` name prefix. `feature` takes a path whose last segment is the feature name (for example `shell` or `admin/users`).

## Module boundaries

`init` encodes this dependency direction:

- `type:app` → api, feature, ui, domain-logic, util
- `type:api` / `type:feature` → ui, domain-logic, util
- `type:ui` → domain-logic, util
- `type:domain-logic` → util
- `domain:shared` → `domain:shared` only
- each domain may also depend on itself and `domain:shared`

## Develop this repo

```sh
pnpm install
pnpm exec nx build nx-domainify
pnpm exec nx test nx-domainify
pnpm exec nx lint nx-domainify
```

The publishable package lives in `packages/nx-domainify`. Release with `pnpm exec nx release`.
