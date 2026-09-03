import test from 'node:test';
import assert from 'node:assert/strict';

import { extractSection, hashSection, compareSection, SECTION_STATUS } from '../src/utils/section-diff.js';

test('extractSection returns body between heading and next heading', () => {
  const content = ['# Title', '', '## Role', 'You are an agent.', '', '## Scope', 'Do things.', ''].join('\n');
  assert.equal(extractSection(content, 'Role'), 'You are an agent.');
  assert.equal(extractSection(content, 'Scope'), 'Do things.');
});

test('extractSection returns null when header is absent', () => {
  const content = '## Role\nbody\n';
  assert.equal(extractSection(content, 'Missing'), null);
});

test('hashSection is consistent for identical content', () => {
  assert.equal(hashSection('same content'), hashSection('same content'));
});

test('hashSection differs for different content', () => {
  assert.notEqual(hashSection('content A'), hashSection('content B'));
});

test('hashSection is stable across CRLF/LF and trailing-whitespace-only differences', () => {
  const a = 'line one\nline two\n';
  const b = 'line one  \r\nline two\r\n'; // trailing spaces + CRLF, same semantic content
  assert.equal(hashSection(a), hashSection(b));
});

test('hashSection is stable across leading/trailing blank line differences', () => {
  const a = 'body text';
  const b = '\n\nbody text\n\n';
  assert.equal(hashSection(a), hashSection(b));
});

test('compareSection: UNTRACKED when no baseline exists', () => {
  const status = compareSection({ baselineHash: null, currentHash: hashSection('x'), templateHash: hashSection('x') });
  assert.equal(status, SECTION_STATUS.UNTRACKED);
});

test('compareSection: IN_SYNC when current and template both match baseline', () => {
  const h = hashSection('stable content');
  const status = compareSection({ baselineHash: h, currentHash: h, templateHash: h });
  assert.equal(status, SECTION_STATUS.IN_SYNC);
});

test('compareSection: DRIFT when only template changed (safe to auto-sync)', () => {
  const baseline = hashSection('old content');
  const status = compareSection({ baselineHash: baseline, currentHash: baseline, templateHash: hashSection('new content') });
  assert.equal(status, SECTION_STATUS.DRIFT);
});

test('compareSection: CUSTOMIZATION when only the file changed (never auto-sync)', () => {
  const baseline = hashSection('original content');
  const status = compareSection({ baselineHash: baseline, currentHash: hashSection('user-edited content'), templateHash: baseline });
  assert.equal(status, SECTION_STATUS.CUSTOMIZATION);
});

test('compareSection: CONFLICT when both file and template changed', () => {
  const baseline = hashSection('original content');
  const status = compareSection({
    baselineHash: baseline,
    currentHash: hashSection('user-edited content'),
    templateHash: hashSection('template-updated content'),
  });
  assert.equal(status, SECTION_STATUS.CONFLICT);
});

test('compareSection: whitespace-only edit against baseline stays IN_SYNC, not CUSTOMIZATION', () => {
  const baseline = hashSection('some content\nsecond line');
  // Simulates re-hashing the file after a cosmetic-only edit (trailing spaces, CRLF) —
  // hashSection normalization means this hash equals baseline even though the raw bytes differ.
  const current = hashSection('some content  \r\nsecond line\r\n');
  const status = compareSection({ baselineHash: baseline, currentHash: current, templateHash: baseline });
  assert.equal(status, SECTION_STATUS.IN_SYNC);
});
