// What a golden or a v3 render of `caf-spec` recorded before CAF-SDD-10 becomes under it (the
// goldens are never edited): the six replacements that make v4. They are written out here, not
// imported from `src/`, so a test that compares through this helper still fails if the template
// drifts. test/sdd10-spec-v4.test.js holds those changes themselves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The `caf-spec` skill as `scaffold skills` wrote it before CAF-SDD-10 (v3, 77 lines, no banner),
// recorded from the HEAD before the change. Never regenerated.
export const SPEC_V3 = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd10', 'caf-spec.v3.SKILL.md'),
  'utf8'
);

// [v3 text, v4 text], in the order they appear in the skill.
export const SPEC_V3_TO_V4 = [
  [
    'Do not add empty sections; write `-` when there is genuinely nothing.',
    'Do not add empty sections; write `Tidak ada` when there is genuinely nothing.',
  ],
  [
    'Status: DRAFT | NEEDS_CLARIFICATION | APPROVED\n',
    'Status: DRAFT | NEEDS_CLARIFICATION | APPROVED | NEEDS_HUMAN\n',
  ],
  [
    '- Assumption: ... (label every assumption; a risky assumption becomes an open question)',
    '- Assumption A-1: ... (number every assumption A-1, A-2, ... and write what it rests on; a risky assumption becomes an open question)',
  ],
  [
    'Exception: a ticket that is itself a refactor or config change may name the artifact, still without line numbers.',
    'Exception, on a refactor or config ticket only: the `When ... then` sentence may name the file path or symbol that is the subject of the ticket, and no other path or symbol.',
  ],
  [
    'not only the happy path.\n- Ticket touches UI: screen flow and states go in `flow.md`; the ACs stay here.\n',
    'not only the happy path.\n',
  ],
  ['1. All six sections present and filled (or `-`).', '1. All six sections present and filled (or `Tidak ada`).'],
];

function applyAll(md, pairs) {
  let out = md;
  for (const [from, to] of pairs) {
    if (out.split(from).length !== 2) throw new Error(`since-10: expected exactly one "${from.slice(0, 40)}"`);
    out = out.replace(from, () => to);
  }
  return out;
}

/** A v3 `caf-spec` file (or a golden holding it) as v4. */
export const sinceSdd10 = (md) => applyAll(md, SPEC_V3_TO_V4);

/** A v4 `caf-spec` file as v3, for a test that holds the v3 hash. */
export const specV4ToV3 = (md) => applyAll(md, SPEC_V3_TO_V4.map(([a, b]) => [b, a]));
