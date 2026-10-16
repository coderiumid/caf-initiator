---
name: caf-breakdown
description: Rules for deciding when a request is too big for one spec and for writing breakdown.md, a proposal of tickets. Use at the start of Specify, when a request holds more than one outcome that could ship and be used on its own.
---

# caf-breakdown — when and how to propose several tickets

breakdown.md is a proposal. It lists the tickets a large request should become, in order. It is not a spec (requirements.md) and not a task list (tasks.md).
If the agent definition conflicts with this skill, the agent definition wins.

## When to break a request down
Break it down only when the request holds more than one outcome that could be merged and used on its own.
Do not break it down when:
- it is one outcome reached in many steps. The steps go to tasks.md;
- it is long, or touches many files, but ships as one thing;
- a question about scope can settle it. Ask that question instead.

Do this check before writing the spec. Once the question that asks about the split has an `Answer:`, do not break the request down again.

## Before writing
- Read the request, then the code and the docs it points at. Only a file opened in this run is a source.
- If breakdown.md already exists, read it first and keep the items and order a human has already accepted.

## Format
Write these parts in this order.
1. `# Breakdown — <request title>` and one line saying where the request came from (ticket id or free text).
2. `## Why split` — two or three lines: which outcomes are independent, as `Finding:` lines.
3. `## Items` — one block per item, numbered `B-1`, `B-2`, and so on:
   - `Title:` a short title a tracker could use.
   - `Outcome:` one sentence a user could observe once this item alone is done.
   - `Apps:` the apps or services it touches.
   - `Depends on:` the B-ids it needs first, or `none`.
   - `AC outline:` two to five lines in the shape `When ..., then ...`. They are an outline for the future spec, not final acceptance criteria, and they carry no `Verify:`.
   - `Ticket:` `-` until a human creates it.
4. `## Order` — the order to build, and what can go in parallel.
5. `## Left out` — what the request mentioned that no item covers, and why.

Rules:
- Each item ships and is used on its own. Do not split by layer (one item for the API, another for the screen) unless each of them alone gives a user something.
- Dependencies point one way. No item depends on a later one, and none depends on itself.
- Every part of the request is in an item or in Left out.
- Keep the number of items small. Merge two items that cannot ship apart.
- Do not guess sizes, dates or owners.
- Do not create tickets, and do not write to a tracker. A human creates them, or the user is asked in chat, one ticket at a time.
- breakdown.md has no `Status:` line and defines no report.

## Check before finishing
1. Each item has Title, Outcome, Apps, Depends on, AC outline and Ticket.
2. No item depends on a later one.
3. Every part of the request is in an item or in Left out.
4. No item is only a layer or only a step.
5. No ticket was created.