---
name: caf-design
description: Rules for deciding when a ticket needs a technical design and for writing design.md. Use after requirements.md is written and before tasks.md, when the change spans more than one app, adds a schema or migration, or changes a contract between layers.
---

# caf-design — when and how to write design.md

design.md answers HOW, at the level of components, contracts and order. It does not repeat the WHAT (requirements.md) and it is not a task list (tasks.md).
If the agent definition conflicts with this skill, the agent definition wins.

## When to write one
Write design.md only when at least one of these is true:
- the change touches more than one app or service;
- it adds or changes a database schema or a migration;
- it adds or changes a contract between layers (an API shape, an event, a shared type, the props of a shared component).

If none is true, write no design.md and no empty file. Say in the final message that no design was needed and which of the three you checked. "It touches several files" is not a criterion.
Write it only when no BLOCKING question is open, after requirements.md and before tasks.md.

## Before writing
- Read requirements.md, then the code the change touches, then the files that exist among `docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md` and the ADRs whose name relates to the ticket.
- Only a file opened in this run is a source. A summary elsewhere is a pointer, not a fact.
- If design.md already exists, read it first. Keep its decisions; change only what the spec now requires.

## Format
Write these sections in this order. A section with nothing to say is written `Tidak ada`.
1. `## Context` — what exists today, as `Finding:` lines from files you read, and which of the three criteria applies.
2. `## Approach` — the components or layers involved and the flow between them, in order. Say which agent or app owns each part (Frontend or Backend).
3. `## Contracts` — each API, event, type or schema before and after. Names and shapes only, no function bodies.
4. `## Data and migration` — the schema change, compatibility with existing data, and the order of deploy.
5. `## Decisions` — `D-n:` the choice, the alternative you did not take, and why.
6. `## Risks` — what can break, and how a test or the validator would show it.
7. `## Order` — what must land first. tasks.md follows this order.

Rules:
- Every line under Contracts and Decisions ends with the AC ids it serves, for example `(AC-2, AC-4)`. A line that serves no AC is dropped.
- Paths and symbol names belong here, not in requirements.md.
- Do not copy ACs and do not add new ones. If the design shows that an AC cannot be met, write it as an open question in requirements.md and do not write tasks.md.
- design.md has no `Status:` line and defines no report.

## Check before finishing
1. One of the three criteria is named in Context.
2. All seven sections are present.
3. Every Contracts and Decisions line carries AC ids.
4. tasks.md follows the Order section.
5. No code bodies and no unlabeled guess.
