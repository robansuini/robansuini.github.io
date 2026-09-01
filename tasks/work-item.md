# Work item: Pin third-party stylesheet content

## Goal

Prevent an unexpected CDN response from executing as trusted Font Awesome CSS on the site.

## Acceptance criteria

- Pin the Font Awesome 6.5.1 stylesheet with a SHA-512 Subresource Integrity digest.
- Fetch the stylesheet anonymously without sending referrer data.
- Add regression coverage for the URL, digest, and cross-origin attributes.

## Validation

- `node scripts/check-external-links.js`
- `node --test scripts/check-external-links.test.js`
