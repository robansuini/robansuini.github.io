# Agent guide

Static HTML/CSS personal site; no build step or package dependencies. Read [README.md](README.md) for structure and preview guidance.

## Delivery roles

The implementer validates and opens a PR; an independent reviewer approves; the designated merge authority merges only after approval and required checks pass. Escalate risky decisions to the project owner. Implementation agents never merge PRs, including their own.

- Work on a feature branch from current `origin/master`; never push directly to `master` and **never merge** PRs.
- Keep changes small and fix root causes. Structure PRs with: **goal, done criteria, proof (commands/results), constraints**. Do not claim done without evidence.
- GitHub Pages deploys from `master`; stop at the PR, with no agent-triggered production deploy.

## Preview

```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Verify

```bash
node scripts/check-external-links.js
node --test scripts/check-external-links.test.js
git diff --check
```

The link checker verifies `target="_blank"` links have `rel="noopener noreferrer"` across repository HTML; it does not test remote URL availability. For visual/content changes, inspect the local preview and include evidence in the PR.
