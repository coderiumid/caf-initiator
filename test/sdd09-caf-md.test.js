// CAF-SDD-09 — CAF.md matches the SDD behavior that exists. Guards terms only, not the whole text.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const caf = fs.readFileSync(path.join(ROOT, 'CAF.md'), 'utf8');

function section(from, to) {
  const a = caf.indexOf(from);
  const b = caf.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, `section ${from} .. ${to} not found`);
  return caf.slice(a, b);
}

test('AC-8: CAF.md names the current SDD terms', () => {
  for (const term of [
    'design.md', 'breakdown.md', 'caf-design', 'caf-breakdown', 'caf-traceability', '/caf-plan', '/caf-run',
  ]) {
    assert.ok(caf.includes(term), `missing ${term}`);
  }
});

test('AC-8: CAF.md has none of the stale claims', () => {
  for (const stale of ['8 Specialist Agents', 'caf-design-ticket.md', 'caf-qa-check.md', 'caf-review-ticket.md']) {
    assert.ok(!caf.includes(stale), `still contains ${stale}`);
  }
});

test('AC-8: headings that templates refer to are kept', () => {
  for (const heading of [
    '### Layer 3 — Artifact Handoff',
    '### Layer 2 — Agent Definitions',
    '### Cluster 1 — Discovery',
    '### Cluster 4 — Audit',
  ]) {
    assert.ok(caf.split('\n').includes(heading), `missing heading ${heading}`);
  }
});

test('AC-3: the final roster is in the agents table', () => {
  const table = section('| Agent | Phase | Output Artifact |', '**Recognizing an agent file');
  for (const agent of ['Planner', 'Validator', 'Reviewer', 'Architect', 'QA', 'Documentation', 'DevOps']) {
    assert.ok(table.includes(`| ${agent}`), `missing row ${agent}`);
  }
  const intro = section('**Specialist agents.**', '| Agent | Phase');
  for (const name of ['caf-planner', 'caf-frontend', 'caf-backend', 'caf-validator', 'caf-reviewer']) {
    assert.ok(intro.includes(name), `missing ${name}`);
  }
});

test('AC-5: Layer 3 lists design.md and breakdown.md without a Status line', () => {
  const layer3 = section('### Layer 3 — Artifact Handoff', '**Different in nature');
  const design = layer3.split('\n').find((l) => l.includes('design.md'));
  const breakdown = layer3.split('\n').find((l) => l.includes('breakdown.md'));
  assert.match(design, /Planner Agent/);
  assert.match(design, /no Status: line/);
  assert.match(breakdown, /no Status: line/);
});

test('AC-6: folder structure draws the five final commands and no removed one', () => {
  const tree = section('## Recommended Full Folder Structure', '## Recommended Implementation Order');
  for (const cmd of ['caf-plan.md', 'caf-run.md', 'caf-review.md', 'caf-fix-review.md', 'caf-complete-drafts.md']) {
    assert.ok(tree.includes(`├── ${cmd}`) || tree.includes(`└── ${cmd}`), `missing ${cmd}`);
  }
  for (const agent of ['caf-planner.md', 'caf-validator.md', 'caf-reviewer.md']) {
    assert.ok(tree.includes(agent), `missing ${agent}`);
  }
  const drawn = tree.split('\n').filter((l) => /[├└]──/.test(l)).join('\n');
  for (const gone of ['caf-architect.md', 'caf-documentation.md', 'caf-qa.md', 'design-ticket', 'qa-check', 'review-ticket']) {
    assert.ok(!drawn.includes(gone), `${gone} still drawn as scaffolded`);
  }
});
