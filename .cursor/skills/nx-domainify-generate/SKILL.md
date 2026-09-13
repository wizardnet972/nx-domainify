---
name: nx-domainify-generate
description: >-
  Scaffold Angular domain, feature, api, ui, and util libraries with
  nx-domainify generators. Use when creating domains, features, shared UI/util
  kits, DDD libs, or when the user mentions nx-domainify, domainify, or
  module-boundary tags. Prefer nx-domainify:* over @nx/angular:library for
  these artifacts. Do not hand-create folders or edit generated files to place
  projects. If a flag, path, or error is unknown, run that generator with --help.
---

# nx-domainify generate

Scaffold with `nx-domainify:*` only. Do not `mkdir` or edit generated files to fix placement.

Always pass `--no-interactive`. Dry-run once when the target path is uncertain.

## Help first

If you do not know an option, a default, or a path a generator will create, or a generator fails, do **not** guess and do **not** edit files to compensate. Run `--help` and use that output:

```sh
npx nx g nx-domainify:init --help
npx nx g nx-domainify:domain --help
npx nx g nx-domainify:feature --help
npx nx g nx-domainify:api --help
npx nx g nx-domainify:ui --help
npx nx g nx-domainify:util --help
```

Re-run `--help` after an unexpected error. Trust the live help over memory.

## Order

1. `nx-domainify:init` once per workspace (writes ESLint `depConstraints` and this skill).
2. `nx-domainify:domain` before any feature/api/ui/util that uses `--domain`.
3. Then feature, api, ui, util.

If the first library would land at the workspace root, pass `--directory=libs` on that first `domain` only. Later domains inherit `libsDir`.

Do not pass `--buildable` unless the user asks or `nx.json` already sets `@nx/angular:library.buildable`.

## Commands

```sh
npx nx g nx-domainify:init --no-interactive
npx nx g nx-domainify:domain booking --no-interactive
npx nx g nx-domainify:feature shell --domain=booking --no-interactive
npx nx g nx-domainify:api gateway --domain=booking --no-interactive
npx nx g nx-domainify:ui search-box --domain=booking --no-interactive
npx nx g nx-domainify:util dates --domain=booking --no-interactive
```

Nested feature path (last segment is the feature name):

```sh
npx nx g nx-domainify:feature admin/users --domain=booking --no-interactive
```

Omit `--domain` on api/ui/util to use `shared`. Prefer `--domain=shared` after a `shared` domain exists.

## Shared UI / util kit

Creates `libs/shared/ui/<name>` and `libs/shared/util/<name>` (no `ui-` / `util-` folder prefix):

```sh
npx nx g nx-domainify:domain shared --no-interactive
npx nx g nx-domainify:ui button --domain=shared --directory=ui --skipPrefix --no-interactive
npx nx g nx-domainify:util format --domain=shared --directory=util --skipPrefix --no-interactive
```

Without `--skipPrefix` you get `libs/shared/ui/ui-button`.

## Components

- `feature` generates a component and a domain facade. Do not also run `@nx/angular:component` unless asked.
- `ui` does **not** generate a component. After the library exists:

```sh
npx nx g @nx/angular:component --path=libs/shared/ui/button/src/lib/button --export --no-interactive
```

Adjust `--path` to the library `src/lib/<name>`. If the component generator options are unclear, run `npx nx g @nx/angular:component --help`.

## Tags

| Generator | Tags |
| --- | --- |
| domain | `domain:<name>`, `type:domain-logic` |
| feature | `domain:<name>`, `type:feature` |
| api | `domain:<name\|shared>`, `type:api` |
| ui | `domain:<name\|shared>`, `type:ui` |
| util | `domain:<name\|shared>`, `type:util` |

## Remove / recreate

```sh
npx nx g @nx/workspace:remove <projectName> --no-interactive
```

Then regenerate with `nx-domainify:*`. Do not delete library folders by hand.

## Verify

```sh
npx nx run-many -t lint
```

Empty generated libs often have no spec files; their `test` target fails with "No test files found". That is expected until tests or a component spec exist. Feature and UI components that have specs should pass `test`.
