Status: NEEDS_HUMAN

# CAF-CHORE-01 verify report

## Changes per file
- scripts/release.sh: removed `npm publish`; head comment and final message say the npm-publish workflow publishes. Version untouched, script not run.
- .github/workflows/npm-publish.yml: head comment only ("GitHub Packages" -> npm registry). Job steps unchanged.
- README.md: (B1) Agents on offer: SINGLE_REPO = whole-repo Frontend + Backend, `--role` for one, Implementer not offered. (B2) "No npm release carries this yet" replaced: no caf-documentation in new repos, shipped in 0.1.10, orchestrator skip is "meant to" (SDD-04a). (B3) "No npm release yet" bullet -> "Released" bullet, same weak claim. (B4) "Agent filenames": "has to handle that before released" -> "is meant to skip its documentation stage (SDD-04a)".
- CAF.md: (1) Step 2b SINGLE_REPO: caf-frontend + caf-backend, `--role` for one, roster planner/frontend/backend/validator/reviewer, caf-validator replaces caf-qa; scope line no longer names caf-implementer; orchestrator caveat and "default implementer" removed (reason: false since 03c3/03c2). (2) Agent table intro (was "single caf-implementer") now names frontend/backend + validator. (3) File tree `caf-qa.md` -> `caf-validator.md`. Left alone: 4-cluster structure, Discovery/Audit clusters (spec of the full design, not a claim about defaults), QA row in the 8-agent table, caf-documentation/devops in tree.
- Not touched: src/, templates, snapshots, goldens, tests, CLAUDE.md, version.

## Verification
- `npm test`: 880 pass, 0 fail, no test changed.
- git grep for "one Implementer|No npm release|before this version is released" in README.md CAF.md CLAUDE.md: empty.
- `bash -n scripts/release.sh`: ok.

## Could not prove
- /home/claude/coderiumid/caf-orchestrator does not exist here. Claim that the orchestrator skips documentation when the agent is missing (SDD-04a) is taken from the task text, not code; README worded "is meant to". Please confirm in the orchestrator repo.
- That 0.1.10 is actually on npm not checked (git log has commit "0.1.10"). README says "version in package.json ... already ships this".

## CLAUDE.md conflicts (not changed)
- CLAUDE.md ~line 645: "Do not publish a `caf-init` release with this change before caf-orchestrator handles a repo without `caf-documentation` (CAF-SDD-04)." Stale vs README now; needs human decision.
- CLAUDE.md has no text on release.sh / npm publish, so no conflict with A.
