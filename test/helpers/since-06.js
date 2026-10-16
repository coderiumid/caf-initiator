// What a golden recorded before CAF-SDD-06 becomes under it (the goldens are never edited): the
// planner's contract sentence and the Planner row of the `agent-handoff.md` roster table (one
// value, ARTIFACT_BY_ROLE.planner), and the line the planner's `### 1. Specify` gained for an
// outline. The new text is written out here, not imported from `src/`, so a test that compares
// through this helper still fails if the template drifts. test/sdd06-artifact-contract.test.js
// holds those changes themselves. A golden older than 05b goes through `sinceSdd05b` first.
export const CONTRACT_OLD = 'Produces `requirements.md`, `tasks.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.';
export const CONTRACT_NEW =
  'Produces `requirements.md`, `tasks.md` (and `design.md` or `breakdown.md` when the request needs one) in `.caf/tasks/{TICKET-ID}/` for the next agent to read.';

export const ROW_OLD = '| Planner | `requirements.md`, `tasks.md` |';
export const ROW_NEW = '| Planner | `requirements.md`, `tasks.md` (and `design.md` or `breakdown.md` when the request needs one) |';

export const OUTLINE_ANCHOR = '- An AC that holds more than one behavior is split into one AC per behavior.\n';
export const OUTLINE_LINES = [
  '- A `requirements.md` written as an outline for a split request has no acceptance criteria:',
  '  write `Tidak ada` under that section.',
];

/** `text` as the code renders it now, when it was rendered before CAF-SDD-06. */
export function sinceSdd06(text) {
  let out = text;
  if (out.includes(CONTRACT_OLD)) out = out.replace(CONTRACT_OLD, CONTRACT_NEW);
  if (out.includes(ROW_OLD)) out = out.replace(ROW_OLD, ROW_NEW);
  if (out.includes(OUTLINE_ANCHOR) && !out.includes(OUTLINE_LINES[0])) {
    out = out.replace(OUTLINE_ANCHOR, OUTLINE_ANCHOR + OUTLINE_LINES.join('\n') + '\n');
  }
  return out;
}

/** `{ [path]: content }` put through sinceSdd06. */
export const sinceSdd06Files = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd06(c)]));
