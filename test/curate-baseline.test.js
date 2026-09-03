import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { curateBaseline } from '../src/commands/curate-baseline.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { readManifest, getBaselineHash, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';

const REL = path.join('.claude', 'agents', 'caf-frontend.md');

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-baseline-test-'));
  fs.mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  return dir;
}

function frontendMd() {
  return buildAgentMd({
    kind: 'frontend',
    name: 'Frontend',
    role: 'Implements UI.',
    scope: 'apps/web/**',
    scripts: { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' },
    packageManager: 'pnpm',
    slug: 'caf-frontend',
  });
}

test('curate baseline on a fixture with no manifest: writes manifest exactly matching current content, file untouched', async () => {
  const dir = makeTmpProject();
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');
  const before = fs.readFileSync(path.join(dir, REL), 'utf8');

  const result = await curateBaseline({ dir, agentDir: '.claude/agents', yes: true });

  // File content is NEVER touched by this command.
  assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), before);
  assert.ok(result.baselined.length > 0);

  const manifest = readManifest(dir);
  const { lines, sections } = parseSections(content);
  for (const c of result.baselined) {
    const s = sections.find((x) => x.header === c.header);
    const expectedHash = hashSection(sectionBody(lines, s));
    assert.equal(getBaselineHash(manifest, REL, c.header), expectedHash, `baseline for "## ${c.header}" must equal its current content hash`);
  }
});

test('curate baseline never overwrites a section that already has a baseline', async () => {
  const dir = makeTmpProject();
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, 'Retry Logic', 'preexisting-hash-should-not-change');
  writeManifest(dir, manifest);

  await curateBaseline({ dir, agentDir: '.claude/agents', yes: true });

  const reloaded = readManifest(dir);
  assert.equal(getBaselineHash(reloaded, REL, 'Retry Logic'), 'preexisting-hash-should-not-change');
  // The other, still-untracked sections should have been baselined.
  assert.ok(getBaselineHash(reloaded, REL, 'Input') != null);
});

test('curate baseline with dryRun writes nothing', async () => {
  const dir = makeTmpProject();
  fs.writeFileSync(path.join(dir, REL), frontendMd(), 'utf8');

  const result = await curateBaseline({ dir, agentDir: '.claude/agents', dryRun: true });

  assert.equal(fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), false);
  assert.deepEqual(result.baselined, []);
});

test('curate baseline with no candidates left reports nothing to do and writes nothing new', async () => {
  const dir = makeTmpProject();
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  await curateBaseline({ dir, agentDir: '.claude/agents', yes: true });
  const manifestAfterFirst = fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8');

  const second = await curateBaseline({ dir, agentDir: '.claude/agents', yes: true });
  assert.deepEqual(second.baselined, []);
  assert.equal(fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8'), manifestAfterFirst);
});
