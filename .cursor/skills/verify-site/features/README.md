# robansuini.com verification map

Read this index before driving the site. Each feature file is a recipe for agents.

## Baseline preconditions

- Repository root is the site root (`index.html` at top level).
- `npm run verify` passes from a clean checkout.
- Local preview uses `127.0.0.1` and a disposable port (`VERIFY_SITE_PORT`, default `8765`).
- Run `node scripts/verify-site-local.mjs` or follow [../SKILL.md](../SKILL.md) launch steps.

## Features

- [Homepage loads](./homepage.md) — title, canonical URL, projects section.
- [External link safety](./external-links.md) — `target="_blank"` links include `noopener` and `noreferrer`.
