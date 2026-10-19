Status: SUCCESS

# Verify report — CAF-CHORE-INIT-01

Branch `ai-agent/CAF-CHORE-INIT-01`, local commits only (no push, merge, bump, publish).
Tests: 1029 before, 1037 after (0 fail). No lint script in package.json.

## Acceptance Criteria
- AC-1: automated-test — test/chore-init-01.test.js (`AC-1/AC-2/AC-3` x2 fixtures): PASS. Grep: `git diff main -- src/templates/skill-md.js | grep '^-.*SPEC_DRAFT_BANNER}'` shows 2 removed lines; `grep -n 'SPEC_DRAFT_BANNER}' src/templates/skill-md.js` leaves only line 377 (caf-traceability).
- AC-2: automated-test — same test, regex `^---\nname: X\ndescription: ...\n---\n\n# X` and no `---\n\n\n`. Rendered builder output: no double blank line after the front-matter for both skills.
- AC-3: automated-test — same test: caf-traceability still has `> DRAFT` and the `NOT ready` line, and is in `result.drafts`.
- AC-4: automated-test — test/chore-init-01.test.js `AC-4`: planner `## Skills` holds `.claude/skills/caf-design/SKILL.md` and `.../caf-breakdown/SKILL.md`; check-drafts has no finding on either file. (No `skills check` command exists; check-drafts is the equivalent that reports DRAFT skills.)
- AC-5: automated-test — test/chore-init-01.test.js `AC-5`: after `agentsSync` (real write, temp copy) the three skill files are byte-identical, one with the old banner, one hand-edited.
- AC-6: command: npm test | expect: exit code 0 — observed 1037 pass, 0 fail. Pinned sha256 of `sdd05a`/`sdd05b` did not change: the builder output now equals `.ai/tasks/CAF-SDD-05{a,b}/*.skill.md` exactly. Convention kept: hash over the builder output as before.
- AC-7: automated-test — `AC-7`. Grep: `SUPERSEDED_CANDIDATE_KINDS = ['qa', 'implementer', 'architect']` at src/commands/agents.js:51; `isOfferedCandidate({kind:'architect'})` is false; `architect` still in `KNOWN_KINDS` and `buildCandidates`.
- AC-8: automated-test — `AC-8` x2 fixtures: `detectKind('caf-architect.md')` is `architect`, no `unknown-kind` warning, file byte-identical after `curate` audit and `agentsSync`.
- AC-9: command: real picker, `scaffold agents --dir <scratch copy of single-nuxt> --dry-run` | expect: no Architect — observed choices: Planner, Frontend, Backend, Validator, Reviewer. (MONOREPO CLI was not driven; covered by the `AC-7` unit test on `buildCandidates`.)
- AC-10: manual — README.md and CAF.md sentences updated; `grep -n "Architect stays" README.md CAF.md CLAUDE.md` finds nothing. README had no sentence about a DRAFT banner on caf-design/caf-breakdown (its DRAFT section names caf-traceability only), so nothing to change there.

## Side findings
- `/caf-run` for a roster without an architect still says "does NOT **yet** have an Architect Agent". Behavior is right (skip the stage; a missing `design.md` goes back to the Planner). The word "yet" is stale. Not changed: it would alter the pinned goldens of earlier tickets.
- Old tests compared whole scaffolds with goldens that include `caf-architect.md`. Instead of regenerating goldens, the three picker-mimicking helpers use `test/helpers/legacy-picker.js` (`offeredWithArchitect`). `mono-pnpm.json` and every `pre-*` fixture are untouched.
- Two older tests changed on purpose: sdd03c2 (architect removed from the "offered" list) and sdd05a AC-9 (now asserts architect is superseded). Skill-pointer tests (sdd02c, sdd02d AC-11, skills-pointer/scaffold/spec) now list caf-design and caf-breakdown in the planner pointers.
- Edited `CLAUDE.md` (appended one section) although the prompt named README/CAF.md only: its older sections still described architect as offered and caf-design as DRAFT. Older sections left as history.

## Follow-up (not done)
- Reword "does NOT yet have an Architect Agent" in `src/templates/run-command.js` (needs a golden-aware ticket).
- Planner `## Output` and `/caf-plan` do not mention `caf-architect`; nothing else depends on it besides `hasArchitect` in `/caf-run`. Removing the architect kind, builder and `hasArchitect` entirely is a later ticket.
- A repo scaffolded earlier keeps a bannered caf-design/caf-breakdown until the banner is removed by hand (umkm-pos already did). Not touched, per the rules.
