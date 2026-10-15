// CAF-SDD-03c2b changed `## Constraints` of the planner (it names `NEEDS_CLARIFICATION`, no
// longer a blocked `tasks.md`). The goldens recorded by earlier tickets hold the old text and are
// never regenerated; a test of one of those tickets that compares a whole planner file to its
// golden, and is about some other section, puts the live Constraints into the golden first.
// `curate sync` never writes `## Constraints`, so a test that syncs an old planner and compares
// the result with the live render puts the OLD Constraints into the live render instead. The
// change itself is held, against the untouched pre-ticket golden, by
// test/sdd03c2b-planner-clarify.test.js.
import { parseSections, sectionBody } from '../../src/utils/agent-sections.js';

/** The body of `## Constraints` of an agent file. */
export function constraintsBody(content) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === 'Constraints');
  if (!s) throw new Error('no ## Constraints section');
  return sectionBody(lines, s);
}

/** `text` with its `## Constraints` body replaced by the one of `fromContent`. */
export function swapConstraints(text, fromContent) {
  const replacement = constraintsBody(fromContent);
  return text.replace(constraintsBody(text), () => replacement);
}

/** A golden `{ content, ... }` with its Constraints made the ones of `liveContent`. */
export function withLiveConstraints(golden, liveContent) {
  return { ...golden, content: swapConstraints(golden.content, liveContent) };
}
