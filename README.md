# nx-domainify

Nx plugin that scaffolds Angular libraries using a domain-driven layout and ESLint module-boundary tags.

Requires an [Nx](https://nx.dev) workspace with `@nx/angular` (Nx 20, 21, 22, or 23).

Example app: [wizardnet972/jira](https://github.com/wizardnet972/jira) — a Jira-style Angular Nx workspace generated with `nx-domainify`.

## Install

```sh
npm install -D nx-domainify
npx nx g nx-domainify:init
```

`init` writes DDD dependency constraints into your workspace ESLint config (`@nx/enforce-module-boundaries`) and installs an AI skill at `.cursor/skills/nx-domainify-generate` and `.claude/skills/nx-domainify-generate`. That skill tells agents to use `nx-domainify:*` commands and to run `--help` when an option is unknown or a generator fails.

Create a domain first, then APIs, features, UI, and utils under it. Omit `--domain` on `api`, `ui`, and `util` to place the library in `shared`. Use `--help` on a generator if you want to see every option. Libraries follow the `@nx/angular:library` defaults in `nx.json`, including `buildable`.

## Generators

### `nx-domainify:init`

Adds DDD ESLint module-boundary constraints and an AI skill that instructs agents to use `nx-domainify` generators.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--skipFormat` | boolean | `false` | Skip formatting files after the generator runs. |

```sh
npx nx g nx-domainify:init
npx nx g nx-domainify:init --skipFormat
```

### `nx-domainify:domain`

Creates an Angular domain library with `application`, `entities`, and `infrastructure` folders.

Tags: `domain:<name>`, `type:domain-logic`

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Domain name, for example `booking`. Do not include path segments; use `--directory` to nest the domain. Positional argument. |
| `--directory` | string | no | Nested path under the workspace libs directory, for example `sales`. Creates `libs/<directory>/<name>/domain`. |

```sh
npx nx g nx-domainify:domain booking
npx nx g nx-domainify:domain booking --directory=sales
npx nx g nx-domainify:domain shared
```

### `nx-domainify:feature`

Creates an Angular feature library, a feature component, and a domain facade.

Tags: `domain:<name>`, `type:feature`

The domain library must already exist.

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `directory` | string | yes | Feature name, or a nested path whose last segment is the feature name, for example `search` or `admin/users`. Positional argument. |
| `--domain` | string | yes | Existing domain name, for example `booking`. Alias: `--domainName`. |

```sh
npx nx g nx-domainify:feature shell --domain=booking
npx nx g nx-domainify:feature admin/users --domain=booking
npx nx g nx-domainify:feature search --domainName=booking
```

### `nx-domainify:api`

Creates an Angular API library inside an existing domain, or in `shared` when `--domain` is omitted.

Tags: `domain:<name|shared>`, `type:api`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | — | API library name, for example `gateway`. Positional argument. |
| `--domain` | string | no | `shared` | Existing domain name, for example `booking`. Omit this to place the library in `shared`. Alias: `--domainName`. |
| `--directory` | string | no | — | Nested path under the domain folder where the API library is created. |
| `--skipPrefix` | boolean | no | `false` | Skip the `api-` prefix in the project name and folder. |

```sh
npx nx g nx-domainify:api gateway --domain=booking
npx nx g nx-domainify:api availability --domain=booking --directory=public
npx nx g nx-domainify:api gateway --domain=booking --skipPrefix
npx nx g nx-domainify:api gateway --domain=booking --directory=public --skipPrefix
npx nx g nx-domainify:api gateway
npx nx g nx-domainify:api gateway --directory=http --skipPrefix
```

### `nx-domainify:ui`

Creates an Angular UI library inside an existing domain, or in `shared` when `--domain` is omitted.

Tags: `domain:<name|shared>`, `type:ui`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | — | UI library name, for example `button`. Positional argument. |
| `--domain` | string | no | `shared` | Existing domain name, for example `booking`. Omit this to place the library in `shared`. Alias: `--domainName`. |
| `--directory` | string | no | — | Nested path under the domain folder where the UI library is created. |
| `--skipPrefix` | boolean | no | `false` | Skip the `ui-` prefix in the project name and folder. |

`ui` creates the library only. It does not add a component. After the library exists, generate one with `@nx/angular:component`.

```sh
npx nx g nx-domainify:ui button --domain=booking
npx nx g nx-domainify:ui card --domain=booking --directory=forms
npx nx g nx-domainify:ui button --domain=booking --skipPrefix
npx nx g nx-domainify:ui button --domain=booking --directory=forms --skipPrefix
npx nx g nx-domainify:ui button
npx nx g nx-domainify:ui button --directory=kit --skipPrefix

npx nx g nx-domainify:domain shared
npx nx g nx-domainify:ui button --domain=shared --directory=ui --skipPrefix
npx nx g @nx/angular:component --path=libs/shared/ui/button/src/lib/button --export --no-interactive
```

`--domain=shared --directory=ui --skipPrefix` creates `libs/shared/ui/button` (not `ui-button`).

### `nx-domainify:util`

Creates an Angular util library inside an existing domain, or in `shared` when `--domain` is omitted.

Tags: `domain:<name|shared>`, `type:util`

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `name` | string | yes | — | Util library name, for example `date`. Positional argument. |
| `--domain` | string | no | `shared` | Existing domain name, for example `booking`. Omit this to place the library in `shared`. Alias: `--domainName`. |
| `--directory` | string | no | — | Nested path under the domain folder where the util library is created. |
| `--skipPrefix` | boolean | no | `false` | Skip the `util-` prefix in the project name and folder. |

```sh
npx nx g nx-domainify:util dates --domain=booking
npx nx g nx-domainify:util dates --domain=booking --directory=time
npx nx g nx-domainify:util dates --domain=booking --skipPrefix
npx nx g nx-domainify:util dates --domain=booking --directory=time --skipPrefix
npx nx g nx-domainify:util dates
npx nx g nx-domainify:util dates --directory=time --skipPrefix
npx nx g nx-domainify:util format --domain=shared --directory=util --skipPrefix
```

`--domain=shared --directory=util --skipPrefix` creates `libs/shared/util/format` (not `util-format`).

## Module boundaries

`init` encodes this dependency direction:

- `type:app` → api, feature, ui, domain-logic, util
- `type:api` / `type:feature` → ui, domain-logic, util
- `type:ui` → domain-logic, util
- `type:domain-logic` → util
- `domain:shared` → `domain:shared` only
- each domain may also depend on itself and `domain:shared`

Creating a domain also appends a constraint so `domain:<name>` may only depend on `domain:<name>` and `domain:shared`.

## Develop this repo

```sh
pnpm install
pnpm exec nx build nx-domainify
pnpm exec nx test nx-domainify
pnpm exec nx lint nx-domainify
```

The publishable package lives in `packages/nx-domainify`. Release with `pnpm exec nx release`.
