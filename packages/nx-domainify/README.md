# nx-domainify

Nx plugin that scaffolds Angular libraries using a domain-driven layout and ESLint module-boundary tags.

Requires an Nx workspace with `@nx/angular` (Nx 23).

## Install

```sh
npm install -D nx-domainify
npx nx g nx-domainify:init
```

`init` writes DDD ESLint module-boundary rules and installs an AI skill (`.cursor/skills/nx-domainify-generate` and `.claude/skills/nx-domainify-generate`) so agents use `nx-domainify:*` commands and `--help` when they are unsure.

## Generators

```sh
npx nx g nx-domainify:domain booking
npx nx g nx-domainify:domain booking --directory=sales

npx nx g nx-domainify:feature shell --domain=booking
npx nx g nx-domainify:feature admin/users --domain=booking

npx nx g nx-domainify:api gateway --domain=booking
npx nx g nx-domainify:api gateway --domain=booking --directory=public --skipPrefix
npx nx g nx-domainify:api gateway

npx nx g nx-domainify:ui button --domain=booking
npx nx g nx-domainify:ui button --domain=booking --directory=forms --skipPrefix
npx nx g nx-domainify:ui button
npx nx g nx-domainify:ui button --domain=shared --directory=ui --skipPrefix
npx nx g @nx/angular:component --path=libs/shared/ui/button/src/lib/button --export --no-interactive

npx nx g nx-domainify:util dates --domain=booking
npx nx g nx-domainify:util dates --domain=booking --directory=time --skipPrefix
npx nx g nx-domainify:util dates
npx nx g nx-domainify:util format --domain=shared --directory=util --skipPrefix

npx nx g nx-domainify:init --skipFormat
```

| Generator | Options |
| --- | --- |
| `init` | `--skipFormat` |
| `domain` | `name`, `--directory` |
| `feature` | `directory`, `--domain` (`--domainName`) |
| `api` | `name`, `--domain`, `--directory`, `--skipPrefix` |
| `ui` | `name`, `--domain`, `--directory`, `--skipPrefix` |
| `util` | `name`, `--domain`, `--directory`, `--skipPrefix` |

Omit `--domain` on `api`, `ui`, and `util` to place the library in `shared`. Libraries follow the `@nx/angular:library` defaults in `nx.json`, including `buildable`.

See the [repository README](https://github.com/wizardnet972/nx-domainify) for full option tables, tag rules, and more examples.
