import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { curateForceRebaseline } from '../src/commands/curate-baseline.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { buildRetryLogicSection } from '../src/templates/agent-md.js';
import { readManifest, getBaselineHash, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, compareSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { parseSections, sectionBody, replaceSectionBody } from '../src/utils/agent-sections.js';

const REL = path.join('.claude', 'agents', 'caf-frontend.md');
const HEADER = 'Retry Logic';

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-force-rebaseline-test-'));
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

// Rewrites the "## Retry Logic" body to some custom text, so current content differs from
// the template. Combined with a fake/stale baseline hash, this produces a CONFLICT: both
// current and template diverge from the recorded baseline.
function withCustomRetryLogic(content, customBody) {
  const { lines, sections } = parseSections(content);
  const section = sections.find((s) => s.header === HEADER);
  return replaceSectionBody(lines, section, customBody);
}

function statusOf(dir, content) {
  const { lines, sections } = parseSections(content);
  const section = sections.find((s) => s.header === HEADER);
  const body = sectionBody(lines, section);
  const manifest = readManifest(dir);
  return compareSection({
    baselineHash: getBaselineHash(manifest, REL, HEADER),
    currentHash: hashSection(body),
    templateHash: hashSection(buildRetryLogicSection('frontend')),
  });
}

test('force-rebaseline on a CONFLICT section: manifest updated, file byte-for-byte unchanged, status becomes DRIFT when current still differs from template', async () => {
  const dir = makeTmpProject();
  const content = withCustomRetryLogic(frontendMd(), 'Custom retry text that differs from the template.');
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, HEADER, 'stale-hash-from-before-a-parser-bugfix');
  writeManifest(dir, manifest);

  assert.equal(statusOf(dir, content), SECTION_STATUS.CONFLICT);

  const before = fs.readFileSync(path.join(dir, REL), 'utf8');
  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, yes: true });

  assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), before, 'file content must be byte-for-byte unchanged');
  assert.equal(result.rebaselined, true);
  assert.equal(result.nextStatus, SECTION_STATUS.DRIFT);

  const { lines, sections } = parseSections(content);
  const body = sectionBody(lines, sections.find((s) => s.header === HEADER));
  const reloaded = readManifest(dir);
  assert.equal(getBaselineHash(reloaded, REL, HEADER), hashSection(body));

  assert.equal(statusOf(dir, content), SECTION_STATUS.DRIFT);
});

test('force-rebaseline on a CONFLICT section whose current content happens to match the template: status becomes IN_SYNC', async () => {
  const dir = makeTmpProject();
  const content = frontendMd(); // current === template for Retry Logic
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, HEADER, 'stale-hash-from-before-a-parser-bugfix');
  writeManifest(dir, manifest);

  assert.equal(statusOf(dir, content), SECTION_STATUS.CONFLICT);

  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, yes: true });

  assert.equal(result.rebaselined, true);
  assert.equal(result.nextStatus, SECTION_STATUS.IN_SYNC);
  assert.equal(statusOf(dir, content), SECTION_STATUS.IN_SYNC);
});

test('force-rebaseline refuses a DRIFT section and writes nothing', async () => {
  const dir = makeTmpProject();
  const content = withCustomRetryLogic(frontendMd(), 'Old body matching the recorded baseline.');
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const { lines, sections } = parseSections(content);
  const body = sectionBody(lines, sections.find((s) => s.header === HEADER));
  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, HEADER, hashSection(body)); // baseline === current, so DRIFT (template differs)
  writeManifest(dir, manifest);

  assert.equal(statusOf(dir, content), SECTION_STATUS.DRIFT);
  const manifestBefore = fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8');

  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, yes: true });

  assert.equal(result.rebaselined, false);
  assert.equal(fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8'), manifestBefore);
});

test('force-rebaseline refuses an IN_SYNC section and writes nothing', async () => {
  const dir = makeTmpProject();
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const { lines, sections } = parseSections(content);
  const body = sectionBody(lines, sections.find((s) => s.header === HEADER));
  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, HEADER, hashSection(body)); // baseline === current === template -> IN_SYNC
  writeManifest(dir, manifest);

  assert.equal(statusOf(dir, content), SECTION_STATUS.IN_SYNC);
  const manifestBefore = fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8');

  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, yes: true });

  assert.equal(result.rebaselined, false);
  assert.equal(fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8'), manifestBefore);
});

test('force-rebaseline refuses an UNTRACKED section (no manifest at all) and writes nothing', async () => {
  const dir = makeTmpProject();
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  assert.equal(fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), false);

  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, yes: true });

  assert.equal(result.rebaselined, false);
  assert.equal(fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), false);
});

test('force-rebaseline with dryRun on a CONFLICT section writes nothing', async () => {
  const dir = makeTmpProject();
  const content = withCustomRetryLogic(frontendMd(), 'Custom retry text that differs from the template.');
  fs.writeFileSync(path.join(dir, REL), content, 'utf8');

  const manifest = { version: 1, files: {} };
  setSectionBaseline(manifest, REL, HEADER, 'stale-hash-from-before-a-parser-bugfix');
  writeManifest(dir, manifest);
  const manifestBefore = fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8');

  const result = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, header: HEADER, dryRun: true });

  assert.equal(result.rebaselined, false);
  assert.equal(fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8'), manifestBefore);
});

test('force-rebaseline rejects missing --file/--section', async () => {
  const dir = makeTmpProject();
  const result1 = await curateForceRebaseline({ dir, agentDir: '.claude/agents', header: HEADER, yes: true });
  assert.equal(result1.rebaselined, false);

  const result2 = await curateForceRebaseline({ dir, agentDir: '.claude/agents', file: REL, yes: true });
  assert.equal(result2.rebaselined, false);
});
