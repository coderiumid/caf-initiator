// Post-render guard (CAF-INIT-SINGLE-REPO): a generated file must never ship a `{{...}}`
// generate-time placeholder that nobody filled in (`{{APP_1}}`, `{{apps_dir}}`, `{{REPO_MODE}}`,
// ...). Those belong to CAF.md's "AI reads the document" flow; in CLI output they mean a template
// was rendered without the detection result it needed.
//
// RUNTIME_TOKENS are the deliberate exception: literal tokens the generated docs/agents keep on
// purpose because they are filled in per ticket/run, long after generation (the branch name
// `ai-agent/{{TICKET-ID}}`, `.caf/tasks/{{TICKET-ID}}/`, ...). Add a token here only when it is
// genuinely resolved at runtime — never to silence a real unfilled placeholder.
export const RUNTIME_TOKENS = ['TICKET-ID', 'feature-name', 'slug', 'DATE', 'NUMBER'];

const PLACEHOLDER_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;

/**
 * Every unresolved generate-time placeholder in `content`, de-duplicated, in order of first
 * appearance. Empty array means the content is clean.
 */
export function findUnresolvedPlaceholders(content) {
  const found = [];
  for (const match of String(content).matchAll(PLACEHOLDER_PATTERN)) {
    const token = match[1];
    if (RUNTIME_TOKENS.includes(token)) continue;
    const literal = `{{${token}}}`;
    if (!found.includes(literal)) found.push(literal);
  }
  return found;
}

/**
 * Throws a clear, actionable error when `content` still carries an unresolved placeholder.
 * `filePath` is only used for the message.
 */
export function assertNoUnresolvedPlaceholders(content, filePath) {
  const unresolved = findUnresolvedPlaceholders(content);
  if (unresolved.length === 0) return;
  throw new Error(
    `unresolved placeholder(s) ${unresolved.join(', ')} in ${filePath} — refusing to write. ` +
      'The value could not be determined from detection; this is a caf-initiator template bug or a ' +
      'detection gap, not something to fill in by guessing. Re-run with --mode single|mono if the ' +
      'repo mode was detected wrong, otherwise report it.'
  );
}
