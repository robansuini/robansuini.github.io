---
name: verify-site
description: "Drive robansuini.com static site locally — HTTP preview plus npm verify (link safety and regression tests). Use before opening PRs or when proving homepage behavior."
---

# Verify robansuini.com (static site)

## Launch

From the repository root:

```bash
export VERIFY_SITE_RUN_ID="agent-$(date +%s)"
export VERIFY_SITE_PORT=8765
python3 -m http.server "$VERIFY_SITE_PORT" --bind 127.0.0.1
```

Ready when `curl -sf "http://127.0.0.1:$VERIFY_SITE_PORT/"` returns HTTP 200 and HTML containing `<title>Roberto Ansuini`.

Teardown: stop only the server process you started (Ctrl+C or kill that PID). Do not `pkill python3`.

## Doctor

```bash
curl -sf -o /dev/null -w "%{http_code}" "http://127.0.0.1:${VERIFY_SITE_PORT:-8765}/" || echo "free"
```

If you get `200` before launching, the port is owned by something else — set `VERIFY_SITE_PORT` to a free port.

## Drive

**Automated path (preferred):**

```bash
export VERIFY_SITE_RUN_ID="agent-$(date +%s)"
export VERIFY_SITE_PORT=8765
node scripts/verify-site-local.mjs
```

**Manual path:**

1. `npm run verify` — must pass (link scan + all regression tests).
2. With the server running, `curl -s "http://127.0.0.1:$VERIFY_SITE_PORT/" | head` — confirm live HTML matches expectations.

Use stable checks from tests (canonical URL, `target="_blank"` + `rel`, social `aria-label`s) rather than visual guesswork.

## Evidence

Store under `/tmp/verify-site-$VERIFY_SITE_RUN_ID/`:

- `homepage-snippet.txt` — first 2KB of `/` response.
- `npm-verify.log` — full output of `npm run verify`.

Proof standard: show both **HTTP surface** (snippet) and **checker output** (log). Do not delete evidence during server teardown.

## Cleanup

Kill the `python3 -m http.server` child you started. Leave `/tmp/verify-site-*` artifacts for the PR description unless disk cleanup is required.

## Helpers

```bash
node scripts/verify-site-local.mjs
```

Runs doctor → server → homepage title check → `npm run verify` → writes evidence → stops server.

## Feature map

See [features/README.md](./features/README.md) for user-facing journeys.
