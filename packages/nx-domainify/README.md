# nx-domainify

Nx plugin that scaffolds Angular libraries using a domain-driven layout and ESLint module-boundary tags.

Requires an Nx workspace with `@nx/angular` (Nx 23).

## Install

```sh
npm install -D nx-domainify
npx nx g nx-domainify:init
```

## Generators

```sh
npx nx g nx-domainify:domain booking
npx nx g nx-domainify:feature shell --domain=booking
npx nx g nx-domainify:api availability --domain=booking
npx nx g nx-domainify:ui button --domain=booking
npx nx g nx-domainify:util dates --domain=booking
```

| Generator | Purpose |
| --- | --- |
| `init` | DDD ESLint module-boundary rules |
| `domain` | Domain library (`type:domain-logic`) |
| `feature` | Feature library + component |
| `api` | API library |
| `ui` | UI library |
| `util` | Utility library |

See the [repository README](https://github.com/wizardnet972/nx-domainify) for options and tag rules.
