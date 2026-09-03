import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { readManifest, writeManifest, getBaselineHash, setSectionBaseline } from '../src/utils/generate-manifest.js';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'caf-manifest-test-'));
}

test('readManifest on a project with no manifest file returns empty files, does not crash', () => {
  const dir = makeTmpDir();
  const manifest = readManifest(dir);
  assert.deepEqual(manifest, { version: 1, files: {} });
});

test('getBaselineHash on an empty manifest returns null for every section (UNTRACKED)', () => {
  const dir = makeTmpDir();
  const manifest = readManifest(dir);
  assert.equal(getBaselineHash(manifest, '.claude/agents/caf-frontend.md', 'Retry Logic'), null);
});

test('readManifest on a malformed manifest file does not crash, returns empty files', () => {
  const dir = makeTmpDir();
  fs.mkdirSync(path.join(dir, '.caf'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'not json{{{', 'utf8');
  const manifest = readManifest(dir);
  assert.deepEqual(manifest, { version: 1, files: {} });
});

test('setSectionBaseline + writeManifest + readManifest round-trips the hash', () => {
  const dir = makeTmpDir();
  const manifest = readManifest(dir);
  setSectionBaseline(manifest, '.claude/agents/caf-frontend.md', 'Retry Logic', 'abc123', { at: '2026-09-03T00:00:00.000Z' });
  writeManifest(dir, manifest);

  const reloaded = readManifest(dir);
  assert.equal(getBaselineHash(reloaded, '.claude/agents/caf-frontend.md', 'Retry Logic'), 'abc123');
  assert.equal(reloaded.files['.claude/agents/caf-frontend.md'].sections['Retry Logic'].lastSyncedAt, '2026-09-03T00:00:00.000Z');
  assert.match(reloaded.files['.claude/agents/caf-frontend.md'].sections['Retry Logic'].templateVersion, /^caf-initiator@/);
});

test('writeManifest with dryRun:true does not touch the filesystem', () => {
  const dir = makeTmpDir();
  const manifest = readManifest(dir);
  setSectionBaseline(manifest, 'file.md', 'Role', 'deadbeef');
  writeManifest(dir, manifest, { dryRun: true });

  assert.equal(fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), false);
});
