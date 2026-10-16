# Homepage loads

The public homepage at `/` presents Roberto’s name, tagline, projects, and newsletter CTA without errors.

## Sub-features

- **title** — Document title includes “Roberto Ansuini”.
- **canonical** — `<link rel="canonical" href="https://robansuini.com/">` is present.

## How to get to it (user POV)

- Open `https://robansuini.com/` in a browser, or `http://127.0.0.1:$VERIFY_SITE_PORT/` locally.

## Driving it with HTTP + npm

Preconditions: server running per verify-site SKILL; `npm` available.

- **Action:** Fetch `/`  
  **Command:** `curl -s "http://127.0.0.1:$VERIFY_SITE_PORT/"`  
  **Result:** Body contains `<title>Roberto Ansuini` and `rel="canonical"`.

- **Action:** Run automated invariants  
  **Command:** `npm run verify`  
  **Result:** Exit 0; test `homepage declares its absolute canonical URL` passes.

## Gotchas

- GitHub Pages URL may differ from canonical; tests assert canonical href, not the request host.
- Do not verify only `curl` without `npm run verify` — HTML invariants are enforced in Node tests.
