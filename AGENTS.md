# Agents

1. Run **`npm run verify`** before every PR (same bar as `.github/workflows/site-checks.yml`).
2. Scoped work: add or follow a file under **`tasks/`** (see `tasks/work-item.md`).
3. One work item → one branch → one PR; avoid parallel stacks that need `resolve-pr-*` merges.
4. HTML changes: extend **`scripts/check-external-links.test.js`** for new invariants.
5. End-to-end proof: **`.cursor/skills/verify-site/SKILL.md`** and `node scripts/verify-site-local.mjs`.
6. Roadmap: **`docs/agent-friendliness-plan.md`**.
