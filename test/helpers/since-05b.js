// What a golden recorded before CAF-SDD-05b becomes under it (the goldens are never edited): the
// two bullets the planner's `### 1. Specify` gained, the `breakdown.md` branch of step 5 and the
// relaxed `## Constraints` of `/caf-plan`, and the `breakdown.md` line of `.caf/tasks/README.md`. The new text is written out here, not
// imported from `src/`, so a test that compares through this helper still fails if the template
// drifts. test/sdd05b-caf-breakdown.test.js holds those changes themselves. A golden older than
// 05a goes through `sinceSdd05a` first.
export const BREAKDOWN_ANCHOR = '  never write over one you have not read in this run.';

export const BREAKDOWN_LINES = [
  '- Before specifying, check whether the request is one deliverable or several. A request with',
  '  more than one outcome that could ship and be used on its own is split: write `breakdown.md`',
  '  in the task folder, following the `caf-breakdown` skill when `## Skills` lists it. One outcome',
  '  reached in many steps is not split; its steps go to `tasks.md`.',
  '- When you split, write `requirements.md` for the request as a whole as an outline, with',
  '  `Status: NEEDS_CLARIFICATION` and one `BLOCKING` question: split as in `breakdown.md`, or',
  '  continue as one spec. Write no `tasks.md`. Once that question has an `Answer:`, do not split',
  '  again. Never create tickets: that is a human step.',
];

export const PLAN_STEP5_ANCHOR = '  to be worked from.\n- **`tasks.md` is written**';
export const PLAN_STEP5_NEW = [
  '  to be worked from.',
  '  - **`breakdown.md` exists in the folder** and the status is `NEEDS_CLARIFICATION` (the planner split the request) → also show the user',
  "    its items (id, title, outcome, dependencies) next to the planner's question. Only when a tracker",
  '    tool is connected in this session (an MCP Linear/Jira/GitHub Issues, as in step 1), offer to',
  '    create the tickets one at a time. For each item ask one question of its own, with three',
  '    answers: **yes** (create it), **edit** (the user changes the title or the description, then ask',
  '    again for that item) or **skip** (create nothing for it). A ticket is created only after an',
  '    explicit **yes** for that ticket: never several in one step, and never on silence. Report the ID',
  '    and title of each ticket created in chat. This command does not write them back into',
  '    `breakdown.md`. With no tracker tool connected, name the file and create nothing. Then',
  '    **STOP** as above.',
  '- **`tasks.md` is written**',
].join('\n');

export const PLAN_CONSTRAINT_OLD = [
  '- This command NEVER writes or edits application code, NEVER runs `git`, NEVER changes ticket',
  '  status in the tracker and NEVER posts to the tracker or to a PR.',
].join('\n');
export const PLAN_CONSTRAINT_NEW = [
  '- This command NEVER writes or edits application code, NEVER runs `git`, NEVER changes the status',
  '  of an existing ticket in the tracker and NEVER posts to a PR. It writes to the tracker only to',
  '  create a ticket from `breakdown.md`, and only after an explicit yes for that ticket (step 5).',
].join('\n');

export const README_ANCHOR = '  tasks.md           ← Planner Agent: concrete task breakdown';
export const README_LINE = '  breakdown.md       ← Planner Agent (skill caf-breakdown): proposed tickets, only for a request with several independent outcomes';

/** `text` as the code renders it now, when it was rendered before CAF-SDD-05b. */
export function sinceSdd05b(text) {
  let out = text;
  if (out.includes(BREAKDOWN_ANCHOR) && !out.includes(BREAKDOWN_LINES[0])) {
    out = out.replace(BREAKDOWN_ANCHOR, [BREAKDOWN_ANCHOR, ...BREAKDOWN_LINES].join('\n'));
  }
  if (out.includes(PLAN_STEP5_ANCHOR)) out = out.replace(PLAN_STEP5_ANCHOR, PLAN_STEP5_NEW).replace(PLAN_CONSTRAINT_OLD, PLAN_CONSTRAINT_NEW);
  if (out.includes(README_ANCHOR) && !out.includes(README_LINE)) out = out.replace(README_ANCHOR, `${README_LINE}\n${README_ANCHOR}`);
  return out;
}

/** `{ [path]: content }` put through sinceSdd05b. */
export const sinceSdd05bFiles = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd05b(c)]));
