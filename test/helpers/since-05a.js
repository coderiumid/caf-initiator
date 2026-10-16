// What a golden recorded before CAF-SDD-05a becomes under it (the goldens are never edited): the
// planner's `### 3. Plan` step, the Architect stage of `/caf-run` (both branches) and the
// `design.md` line of `.caf/tasks/README.md`. The new texts are written out here, not imported
// from `src/`, so a test that compares through this helper still fails if the template drifts.
// test/sdd05a-caf-design.test.js holds those changes themselves.
export const PLAN_OLD = [
  '- Decide the approach at the level of work, not code: which agents and apps are involved, in',
  '  what order, and what depends on what. A change that needs a technical design goes to the',
  '  Architect (`design.md`); do not design it here.',
].join('\n');

export const PLAN_NEW = [
  '- Decide the approach at the level of work, not code: which agents and apps are involved, in',
  '  what order, and what depends on what.',
  '- A change that touches more than one app or service, adds or changes a schema or a migration,',
  '  or changes a contract between layers needs a technical design: write `design.md` in the task',
  '  folder before `tasks.md`, following the `caf-design` skill when `## Skills` lists it.',
  '  Otherwise write none. Do not design inside `requirements.md` or `tasks.md`.',
].join('\n');

const NO_ARCHITECT_OLD =
  "`design.md` yourself in the main thread. STOP and report to the user that this ticket should\n" +
  'go through Architect first — they can run `caf-init scaffold agents` to add that role, or\n' +
  'decide to proceed without a formal design.';
const NO_ARCHITECT_NEW =
  '`design.md` yourself in the main thread. `design.md` is written by the Planner. If the ticket\n' +
  'meets those criteria and `.caf/tasks/{TICKET-ID}/design.md` does not exist, STOP and report that\n' +
  'to the user so the Planner can be run again.';
const SKIP_NEW =
  'If `design.md` already exists in the ticket folder (`.caf/tasks/{TICKET-ID}/design.md`, written by\n' +
  'Planner), **skip** this stage and note the reason in the final summary.\n\n';

const README_OLD = '  design.md          ← Architect Agent: technical approach (if needed)';
const README_NEW = '  design.md          ← Planner Agent (skill caf-design): technical approach, only when the change meets the design criteria';

/** `text` as the code renders it now, when it was rendered before CAF-SDD-05a. */
export function sinceSdd05a(text) {
  return text
    .replace(PLAN_OLD, PLAN_NEW)
    .replace(NO_ARCHITECT_OLD, NO_ARCHITECT_NEW)
    .replace(/Spawn Architect \(`/, `${SKIP_NEW}Spawn Architect (\``)
    .replace(README_OLD, README_NEW);
}

/** `{ [path]: content }` put through sinceSdd05a. */
export const sinceSdd05aFiles = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd05a(c)]));
