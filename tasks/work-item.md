# Work item: Declare the canonical homepage URL

## Goal

Tell search engines which homepage URL should be indexed when the site is reached through alternate GitHub Pages URLs.

## Acceptance criteria

- Declare `https://robansuini.com/` as the homepage canonical URL.
- Add regression coverage that detects a missing or changed canonical URL.

## Validation

- `node scripts/check-external-links.js`
- `node --test scripts/check-external-links.test.js`
