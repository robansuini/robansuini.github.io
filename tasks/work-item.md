# Work item: Add social sharing metadata

## Goal

Give social platforms explicit homepage metadata so shared links render with a useful title and description.

## Acceptance criteria

- Declare Open Graph type, URL, title, and description metadata.
- Declare a compact Twitter card type.
- Add regression coverage that detects missing or changed social metadata.

## Validation

- `node scripts/check-external-links.js`
- `node --test scripts/check-external-links.test.js`
