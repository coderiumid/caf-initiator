---
name: caf-traceability
description: Rules for linking each acceptance criterion (AC) to tasks, code and a named test, and for recording that evidence. Use when writing tasks.md, when implementing, and when writing verify-report.md.
---

> DRAFT: this skill has not been tested with real agent dispatches yet.
> Remove this banner only after that test is done.
> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.

# caf-traceability — AC → task → code → test

Every AC in requirements.md must be traceable to evidence. Evidence is a named test or an honest "manual" / "build-only" label, never a count of passing tests.
If the agent definition conflicts with this skill, the agent definition wins.

## In tasks.md (planner)
- Every task ends with the AC ids it serves, for example `(AC-1, AC-3)`. A task that serves no AC needs a one-line reason, or it is dropped.
- Every AC is served by at least one task. An AC with no task is a spec gap: report it, do not invent a task.
- For an AC with `Verify: automated test`, the test task comes before the implementation task.

## In code (implementer)
- Put the AC id in the test title, for example `it('AC-3: rejects an expired token', ...)`. One test may serve several ACs; name all of them.
- A test is evidence only if it imports and exercises the production code. A test that asserts only on mocks, constants or itself is not evidence.
- The number of passing tests is never evidence. Name the test.
- Do not add tests only to raise coverage.

## In verify-report.md
Write one line per AC, using exactly one of these forms:
- `AC-n: automated-test — <file>::<test name>`
- `AC-n: command — <command> | <exit code or output observed>`
- `AC-n: build-only — <command that passed>; no test exists for this behavior`
- `AC-n: manual — <steps a human must run, or steps already run>`
- `AC-n: none — <why>`

Rules:
- An AC with `Verify: manual` is reported as `manual`, never as `automated-test`. An AC with `Verify: command:` is reported as `command` with the observed result.
- If the touched area has no test runner, report `build-only` or `manual`. Do not create a fake gate or a fake test; record the gap.
- State what was proven and what was not. Do not claim more than the evidence shows.

## Check before finishing
1. Every AC id appears in both tasks.md and verify-report.md.
2. Every `automated-test` line names a file and a test that really exist.
3. No AC is reported as automated when its test never imports production code.