// CAF-DEVOPS-KIND-01 Task 6 — 'devops' is not offered in the interactive `caf-init scaffold
// agents` picker (role undefined yet), but its candidate definition must stay intact so
// kind-detection/section builders still work if a caf-devops.md exists via another path.
// There is no non-interactive `--agent <kind>` flag anywhere in this CLI (confirmed by reading
// agents.js's option handling), so hiding the candidate from the multiselect choices is the
// entire fix — no separate flag-blocking path is needed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCandidates, HIDDEN_CANDIDATE_KINDS } from '../src/commands/agents.js';

test('devops candidate still exists in buildCandidates() (definition preserved)', () => {
  const candidates = buildCandidates({}, []);
  assert.ok(candidates.some((c) => c.kind === 'devops'), 'devops candidate definition must not be deleted');
});

test('devops is listed in HIDDEN_CANDIDATE_KINDS and would be filtered from the multiselect choices', () => {
  assert.ok(HIDDEN_CANDIDATE_KINDS.includes('devops'));
  const candidates = buildCandidates({}, []);
  const offered = candidates.filter((c) => !HIDDEN_CANDIDATE_KINDS.includes(c.kind));
  assert.ok(!offered.some((c) => c.kind === 'devops'), 'devops must not appear in the offered choices');
  // Every other candidate stays offered — hiding devops must not affect anything else.
  assert.equal(offered.length, candidates.length - 1);
});
