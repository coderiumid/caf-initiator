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
- Facts read from the code go in section 3 as short bullets: cite the file path, no line numbers, no full inventories unless an AC depends on the list.

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
- Finding: ... (the ticket says X, the code or repo shows Y)

## 4. Decisions Already Made
- ... (link the ADR if any: .caf/knowledge/decisions/adr-NNN-*.md)

## 5. Open Questions
- Q-1 [BLOCKING|NON-BLOCKING] <question> — Answer: <empty until answered>

## 6. Acceptance Criteria
- AC-1: When <condition>, then <observable result>. Verify: <automated test | command | manual>
- AC-2: ...
```

## Acceptance Criteria rules
- The marker must be exactly `AC-<number>:` at the start of the item (read by regex; do not change the format).
- One behavior per AC. Observable and testable; no subjective words ("fast", "clean", "intuitive") unless given a measurable threshold.
- Describe behavior, not location: no line numbers or function names. Exception: a ticket that is itself a refactor or config change may name the artifact, still without line numbers.
- Always write `Verify:` with one of three forms; never leave it empty (the validator uses it to flag ACs without tests):
  - `automated test` — name the test file or suite when known.
  - `command: <command> | expect: <exit code or output>` — a deterministic command from the repo's verify checklist; the validator runs it.
  - `manual: <short steps>` — only when neither of the above is possible.
- Include failure paths and relevant edge cases (empty input, unauthorized, network error), not only the happy path.
- Ticket touches UI: screen flow and states go in `flow.md`; the ACs stay here.

## Open Questions rules
- First check the ticket, the code, the ADRs and `CLAUDE.md`. Whatever you can answer by reading is a fact (section 3) or a `Finding:`, never a question.
- Ask only for decisions a human must make. At most 5 questions in the file, most decisive first. One question = one decision, with options and a recommendation when you have one.
- BLOCKING = the answer changes scope or ACs; work stops until answered. NON-BLOCKING = a safe assumption is written explicitly in section 3.
- Chat: ask the user directly. Ticket via orchestrator: write the questions in a ticket comment and stop.
- Once answered: fill in `Answer:`, move the result to section 4 (Decisions) or change the ACs. Keep the question and its original tag; do not delete or retag it.

## An approved spec is a contract
- Once `Status: APPROVED`, do not change goal, scope, or ACs, even when the user asks in chat.
- Spec wrong, impossible, or the request changes scope: write the proposed change in `verify-report.md`; a human decides.

## Check before finishing
1. All six sections present and filled (or `-`).
2. Every AC has a unique, sequential number and a `Verify:`.
3. No implementation details; no guess that is not labeled as an assumption or an open question.
4. No more than 5 questions, none answerable from the code.
5. ACs contradict each other or are impossible: set `Status: NEEDS_CLARIFICATION` and do not continue to tasks.