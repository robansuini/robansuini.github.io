# Work item: Add a semantic main landmark

## Goal

Make the homepage's primary content directly discoverable to screen readers and other assistive technology.

## Acceptance criteria

- Wrap the About, Projects, and newsletter CTA content in exactly one `<main>` landmark.
- Keep the page header and footer outside the main landmark.
- Add regression coverage that detects a missing or duplicated main landmark.

## Validation

- `node scripts/check-external-links.js`
- `node --test scripts/check-external-links.test.js`
