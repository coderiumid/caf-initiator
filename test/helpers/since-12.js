// What a golden recorded before CAF-SDD-12 becomes under it (the goldens are never edited): the
// language bullet of the planner's `### 1. Specify` (added at CAF-SDD-11, so a golden older than
// that goes through `sinceSdd11` first) gains the sentences about where the language comes from and
// the final message. The new text is written out here, not imported from `src/`, so a test that
// compares through this helper still fails if the template drifts. test/sdd12-planner-language.test.js
// holds the sentences themselves.
export const OLD_LANGUAGE_LINE = '  questions too. The words the templates and other agents read stay exactly as the templates\n';
export const NEW_LANGUAGE_LINES = [
  '  questions too. The language is the one the ticket author wrote in, judged from the title and',
  '  sentences of the ticket, not from UI text quoted in it, code, or files you read: an English',
  '  ticket that quotes an Indonesian label is still written in English, with the label quoted as',
  '  it is. Your final message to the user follows the same language.',
  '  The words the templates and other agents read stay exactly as the templates',
];

/** `text` as the code renders it now, when it was rendered with the SDD-11 language bullet. */
export function sinceSdd12(text) {
  if (!text.includes(OLD_LANGUAGE_LINE) || text.includes(NEW_LANGUAGE_LINES[0])) return text;
  return text.replace(OLD_LANGUAGE_LINE, `${NEW_LANGUAGE_LINES.join('\n')}\n`);
}

/** `{ [path]: content }` put through sinceSdd12. */
export const sinceSdd12Files = (files) => Object.fromEntries(Object.entries(files).map(([rel, c]) => [rel, sinceSdd12(c)]));
