---
name: caf-spec
description: Format and rules for writing requirements.md (the spec) for a CAF ticket. Use during Specify/Clarify, before writing the plan or tasks.
---

> DRAFT: this skill has not been tested with real agent dispatches yet.
> Remove this banner only after that test is done.
> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.

# caf-spec — writing requirements.md

The spec is the contract between human and agent: short, testable, no guessing.
If the agent definition conflicts with this skill, the agent definition wins.
Write the spec content in the language the ticket is written in.

## Size
- Depth follows ticket size. Small ticket: half a page. Do not add empty sections; write `-` when there is genuinely nothing.
- The spec answers WHAT and WHY. How (files, functions, libraries) belongs to `design.md` and `tasks.md`, not here.

## Template `.caf/tasks/<ID-or-slug>/requirements.md`

```markdown
# <short title>
Status: DRAFT | NEEDS_CLARIFICATION | APPROVED
Source: <ticket ID or "chat">

## 1. Outcome
<1-3 sentences: what is different for the user/business when this is done>

## 2. Scope
In:
- ...
Out:
- ...

## 3. Constraints and Assumptions
- Constraint: ...
- Assumption: ... (label every assumption; a risky assumption becomes an open question)

## 4. Decisions Already Made
- ... (link the ADR if any: .caf/knowledge/decisions/adr-NNN-*.md)

## 5. Open Questions
- Q-1 [BLOCKING|NON-BLOCKING] <question> — Answer: <empty until answered>

## 6. Acceptance Criteria
- AC-1: When <condition>, then <observable result>. Verify: <automated test | manual: short steps>
- AC-2: ...
```

## Acceptance Criteria rules
- The marker must be exactly `AC-<number>:` at the start of the item (read by regex; do not change the format).
- One behavior per AC. Observable and testable; no subjective words ("fast", "clean", "intuitive") unless given a measurable threshold.
- Always write `Verify:`. If no automated test is possible, write `manual:` and the steps. Never leave it empty; the validator uses it to flag ACs without tests.
- Include failure paths and relevant edge cases (empty input, unauthorized, network error), not only the happy path.
- Ticket touches UI: screen flow and states go in `flow.md`; the ACs stay here.

## Open Questions rules
- First check the ticket, the code, the ADRs and `CLAUDE.md`. Do not ask what is already answered there.
- At most 5 questions, most decisive first. One question = one decision, with options and a recommendation when you have one.
- BLOCKING = the answer changes scope or ACs; work stops until answered. NON-BLOCKING = a safe assumption is written explicitly in section 3.
- Chat: ask the user directly. Ticket via orchestrator: write the questions in a ticket comment and stop.
- Once answered: fill in `Answer:`, move the result to section 4 (Decisions) or change the ACs. Do not delete the question.

## An approved spec is a contract
- Once `Status: APPROVED`, do not change goal, scope, or ACs.
- Spec wrong or impossible to satisfy: write the proposed change in `verify-report.md`; a human decides.

## Check before finishing
1. All six sections present and filled (or `-`).
2. Every AC has a unique, sequential number and a `Verify:`.
3. No implementation details.
4. No guess that is not labeled as an assumption or an open question.
5. ACs contradict each other or are impossible: set `Status: NEEDS_CLARIFICATION` and do not continue to tasks.