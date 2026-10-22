# External link safety

Any live `<a target="_blank">` in HTML must include `rel` with both `noopener` and `noreferrer` (reverse-tabnabbing protection).

## Sub-features

- **scan** — All `*.html` files in the repo are scanned.
- **comments** — Anchors inside HTML comments are ignored.

## How to get to it (user POV)

- Not user-visible as a page; enforced on build/PR via CI and local `npm run verify`.

## Driving it with npm

Preconditions: none beyond repo checkout.

- **Action:** Run link safety checker  
  **Command:** `npm run check:links`  
  **Result:** `External link safety check passed`.

- **Action:** Run regression suite  
  **Command:** `npm test`  
  **Result:** All tests pass (including quoted attributes, comment skipping, social labels).

## Gotchas

- Adding a new external tab without exact `rel` tokens fails CI — copy an existing safe social link pattern from `index.html`.
- Single-quoted attributes are validated; do not assume double quotes only.
