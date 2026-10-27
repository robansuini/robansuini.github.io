# Work item: Keyboard skip link

## Intent

Let keyboard users bypass the repeated header and social links to reach the homepage's primary content directly.

## Scope

- Add a first-focusable skip link targeting the existing main landmark.
- Reveal the link on keyboard focus without changing the unfocused layout.
- Make the destination programmatically focusable without adding a tab stop.
- Keep content, external links, analytics, and deployment configuration unchanged.

## Acceptance criteria

- [x] The first Tab reveals a readable, visible skip link on desktop and mobile.
- [x] Enter moves focus to the main landmark; the next Tab reaches its first project link.
- [x] The skip link is hidden again after focus leaves it.
- [x] Existing homepage and link-safety checks still pass.

## Risk and rollback

Low-risk, local HTML/CSS accessibility change. No security, architecture, cross-repo, or >1-day complexity trigger; no design.md required. Revert this commit to roll back.

## Execution plan

1. Add skip-link markup/styles and a focusable main target.
2. Add a structural regression assertion and exercise real keyboard navigation in a local browser.
3. Run repository validation and open one PR; leave merging to the designated authority after required review.

## Validation evidence

- `node scripts/check-external-links.js`: passed; one HTML file scanned.
- `node --test scripts/check-external-links.test.js`: 31 passed, zero failed.
- `git diff --check`: passed.
- Local Playwright/Chrome preview at 1280x900 and 375x812: first Tab reveals the link fully inside the viewport with a visible outline; Enter updates the fragment and focuses main; next Tab reaches the first project link. Link hides after activation; no horizontal overflow.
- Compared header/main/footer bounding boxes with origin/master: identical before focus at both sizes.
- Browser tooling and screenshots are temporary local artifacts outside the repository; remote requests were blocked during preview. No new runtime or repository dependencies.

## Status

- Owner: Dex (axos-ai)
- Reviewer: independent code owner
- State: implementation and validation complete; review required before merge.
- Live rules: one approving review, code-owner review, resolved review threads; do not bypass.
