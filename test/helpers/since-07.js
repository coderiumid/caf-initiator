// What a golden recorded before CAF-SDD-07 becomes under it (the goldens are never edited): the
// two Coverage lines the implementation agents' `### 1. Read` gained, the reviewer's blocking
// finding bullet, and the validator's step 2 bullets and pipe bullet. The new text is written out
// here, not imported from `src/`, so a test that compares through this helper still fails if the
// template drifts. test/sdd07-agent-clarity.test.js holds those changes themselves. A golden older
// than 06 goes through `sinceSdd06` first.
export const COVERAGE_ANCHOR = '- `tasks.md`: the tasks of this agent and the AC ids each one serves.\n';
export const COVERAGE_LINES = [
  '- A `tasks.md` may end with `## Coverage`, which maps each AC id to the tasks that serve it. It',
  '  is a map, not a task: do not implement it. Use it to find the tasks behind an AC you report.',
];

export const REVIEWER_OLD = [
  '- A blocking finding rules out an approving verdict; give it as the reason under',
  '  `### Verdict Rationale`. The verdict values are the ones of the Report Format section.',
].join('\n');
export const REVIEWER_NEW = [
  '- A blocking finding means the verdict is not the approving one. A finding only a human can',
  '  settle (a spec changed after approval, a proposed spec change that blocks the work) takes the',
  '  value that Retry Logic gives for a review that is blocked. Any other blocking finding takes',
  '  the remaining value that is not approving. Give the reason under `### Verdict Rationale`.',
  '  The values themselves are the ones of the Report Format section.',
].join('\n');

export const VALIDATOR_STEP2_OLD = [
  '- Run every command of the Verify Checklist of this file, for the app(s) the change touches,',
  '  and record the exit code of each one.',
].join('\n');
export const VALIDATOR_STEP2_NEW = [
  '- Run the commands of the Verify Checklist of this file for the app(s) that the tasks of',
  '  `tasks.md` name, by path or by name. When they name none, use the app(s) the change touches.',
  '  Record the exit code of each command you run.',
  '- A checklist line of an app you did not run is not a gap of the gate.',
].join('\n');

export const PIPE_ANCHOR = '- What `verify-report.md` claims is never a reason for `PASS` on its own: only what you ran is.\n';
export const PIPE_LINES = [
  '- In the table of `validate-report.md`, a `|` that belongs to a command or to observed output is',
  '  written inside backticks. A bare `|` splits the cell and the row is misread.',
];

/** `text` as the code renders it now, when it was rendered before CAF-SDD-07. */
export function sinceSdd07(text) {
  let out = text;
  if (out.includes(COVERAGE_ANCHOR) && !out.includes(COVERAGE_LINES[0])) {
    out = out.replace(COVERAGE_ANCHOR, COVERAGE_ANCHOR + COVERAGE_LINES.join('\n') + '\n');
  }
  if (out.includes(REVIEWER_OLD)) out = out.replace(REVIEWER_OLD, REVIEWER_NEW);
  if (out.includes(VALIDATOR_STEP2_OLD)) out = out.replace(VALIDATOR_STEP2_OLD, VALIDATOR_STEP2_NEW);
  if (out.includes(PIPE_ANCHOR) && !out.includes(PIPE_LINES[0])) {
    out = out.replace(PIPE_ANCHOR, PIPE_ANCHOR + PIPE_LINES.join('\n') + '\n');
  }
  return out;
}

/** `{ [path]: content }` put through sinceSdd07. */
export const sinceSdd07Files = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd07(c)]));
