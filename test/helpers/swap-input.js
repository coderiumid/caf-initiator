// CAF-SDD-03c2 changed `## Input` of the planner and the reviewer. The goldens recorded by earlier
// tickets (test/fixtures/pre-sdd02e/, pre-sdd03e/, ...) hold the old Input and are never
// regenerated; a test of one of those tickets that compares a whole file to its golden, and is
// about some other section, puts the live Input into the golden first. The change to Input itself
// is held, against the untouched pre-ticket golden, by test/sdd03c2-validator-default.test.js.
import { parseSections, sectionBody } from '../../src/utils/agent-sections.js';

/** The body of `## Input` of an agent file. */
export function inputBody(content) {
  const { lines, sections } = parseSections(content);
  const input = sections.find((s) => s.header === 'Input');
  if (!input) throw new Error('no ## Input section');
  return sectionBody(lines, input);
}

/** `oldContent` with its `## Input` body replaced by the one of `liveContent`. */
export function swapInput(oldContent, liveContent) {
  return oldContent.replace(inputBody(oldContent), inputBody(liveContent));
}

/** A golden `{ content, sections, ... }` with its Input (in `content` and in `sections`) made live. */
export function withLiveInput(golden, liveContent) {
  const live = inputBody(liveContent);
  return { ...golden, content: swapInput(golden.content, liveContent), sections: { ...golden.sections, Input: live } };
}
