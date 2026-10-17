// What a golden recorded before CAF-SDD-11 becomes under it (the goldens are never edited): the
// language rule the planner's `### 1. Specify` gained, right after the `Status:` bullet. The new
// text is written out here, not imported from `src/`, so a test that compares through this helper
// still fails if the template drifts. test/sdd11-planner-language.test.js holds the rule itself. A
// golden older than 07 goes through `sinceSdd07`/`sinceSdd06` first.
export const LANGUAGE_ANCHOR = '  no open `BLOCKING` question is `Status: DRAFT`.\n';
export const LANGUAGE_LINES = [
  '- Write the prose of `requirements.md`, `tasks.md`, `design.md` and `breakdown.md` in the',
  '  language of the ticket description (of the request, when it comes from chat), and the open',
  '  questions too. The words the templates and other agents read stay exactly as the templates',
  '  show them, in every language: section headings, `Status:` and its values, `AC-n:`,',
  '  `Verify:` and its three forms, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`,',
  '  `NON-BLOCKING`, `Answer:` and `Tidak ada`. File paths, symbol names, commands and text',
  '  quoted from the ticket are written as they are.',
];

/** `text` as the code renders it now, when it was rendered before CAF-SDD-11. */
export function sinceSdd11(text) {
  let out = text;
  if (out.includes(LANGUAGE_ANCHOR) && !out.includes(LANGUAGE_LINES[0])) {
    out = out.replace(LANGUAGE_ANCHOR, LANGUAGE_ANCHOR + LANGUAGE_LINES.join('\n') + '\n');
  }
  return out;
}

/** `{ [path]: content }` put through sinceSdd11. */
export const sinceSdd11Files = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd11(c)]));
