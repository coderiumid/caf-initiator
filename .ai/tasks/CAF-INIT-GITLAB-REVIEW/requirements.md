Status: DRAFT

# CAF-INIT-GITLAB-REVIEW — GitLab version of the PR-bound commands (backlog)

Raised by CAF-INIT-SMART-01. Not started; no AC yet.

## Why

`/caf-review`, `/caf-fix-review` and the PR step of `/caf-run` use the `gh` CLI and the GitHub REST API. With a non-GitHub remote `caf-init` neither offers nor writes them (`githubCommandsOffered`, `src/utils/recommend.js`).

## Scope to decide

- A GitLab MR variant of each: `glab`/REST GitLab, MR terms, notes/discussions in place of a PR Review with an event verdict (no one-to-one equivalent), approvals.
- Permission mapping for the access check: `write|maintain|admin` -> Developer / Maintainer / Owner.
- `/caf-run` PR step: `gh repo view`, `gh pr list`, `gh pr create` -> MR equivalents.
- The caf-orchestrator side: the webhook contract for review/fix-review (`report-reader.ts`, permission threshold kept in sync with `PERMISSION_THRESHOLD`).

## Out of scope

Any change to the GitHub commands.
