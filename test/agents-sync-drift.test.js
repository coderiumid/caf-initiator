import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildAgentMd, buildRetryLogicSection } from '../src/templates/agent-md.js';
import { setSectionBaseline, writeManifest, readManifest, getBaselineHash } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';

const REL = path.join('.claude', 'agents', 'caf-frontend.md');

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-sync-test-'));
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

function baselineEverySection(manifest, relPath, content) {
  const { lines, sections } = parseSections(content);
  for (const s of sections) {
    setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
}

function bodyOf(content, header) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
}

// The pre-fix Retry Logic wording from the real CDR-38 incident: no `SUCCESS` literal.
const OLD_RETRY_LOGIC = [
  'Verify passes → write `verify-report.md` with Status: PASS.',
  'Verify fails → fix, retry up to 3x → if still failing, stop and write',
  '`verify-report.md` with Status: NEEDS_HUMAN',
].join('\n');

function withRetryLogic(content, body) {
  return content.replace(/## Retry Logic\n[\s\S]*?(?=\n## |$)/, `## Retry Logic\n${body}\n`);
}

test('DRIFT is synced: CDR-38 scenario auto-fixed, SUCCESS literal restored, manifest re-baselined', async () => {
  const dir = makeTmpProject();
  const oldContent = withRetryLogic(frontendMd(), OLD_RETRY_LOGIC);
  fs.writeFileSync(path.join(dir, REL), oldContent, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, REL, oldContent); // file untouched since generate → DRIFT, not CONFLICT
  writeManifest(dir, manifest);

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, REL), 'utf8');
  assert.ok(!oldContent.includes('SUCCESS'), 'precondition: pre-fix content has no SUCCESS literal');
  assert.match(bodyOf(after, 'Retry Logic'), /\bSUCCESS\b/);
  assert.equal(hashSection(bodyOf(after, 'Retry Logic')), hashSection(buildRetryLogicSection()));
  assert.deepEqual(result.drifted, [`${REL}#Retry Logic`]);
  assert.equal(result.needsAttention.length, 0);

  // Manifest baseline advanced to the newly written content, so a re-run is a no-op.
  const reloaded = readManifest(dir);
  assert.equal(getBaselineHash(reloaded, REL, 'Retry Logic'), hashSection(buildRetryLogicSection()));
  const second = await agentsSync({ dir, agentDir: '.claude/agents' });
  assert.deepEqual(second.drifted, []);
  assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), after, 're-run must be a no-op');
});

test('CUSTOMIZATION is NEVER overwritten: file is byte-for-byte identical after sync', async () => {
  const dir = makeTmpProject();
  const generated = frontendMd();

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, REL, generated);
  writeManifest(dir, manifest);

  // User hand-edits Retry Logic AFTER the baseline. Template is unchanged relative to baseline,
  // so this is pure CUSTOMIZATION.
  const CUSTOM_BODY = 'MY OWN retry rules. Do not touch this, caf-init.';
  const customized = withRetryLogic(generated, CUSTOM_BODY);
  fs.writeFileSync(path.join(dir, REL), customized, 'utf8');
  const before = fs.readFileSync(path.join(dir, REL), 'utf8');

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, REL), 'utf8');
  // THE critical assertion for this ticket: not "no test failed", but the exact bytes.
  assert.equal(after, before, 'a CUSTOMIZATION section must leave the file byte-for-byte unchanged');
  assert.equal(bodyOf(after, 'Retry Logic'), CUSTOM_BODY);
  assert.ok(!after.includes('caf-orchestrator greps for'), 'template content must not have been written in');
  assert.deepEqual(result.drifted, []);
  assert.deepEqual(result.updated, []);
  // Reported, not silently skipped.
  assert.deepEqual(
    result.needsAttention.map((n) => `${n.status}:${n.header}`),
    ['CUSTOMIZATION:Retry Logic']
  );
});

test('CONFLICT is NEVER overwritten: file is byte-for-byte identical after sync', async () => {
  const dir = makeTmpProject();
  const generated = frontendMd();

  // Baseline records the OLD template wording...
  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, REL, withRetryLogic(generated, OLD_RETRY_LOGIC));
  writeManifest(dir, manifest);

  // ...and the user independently wrote their own version since. Template also moved on
  // (current template !== the OLD baseline wording) → both sides changed → CONFLICT.
  const CUSTOM_BODY = 'Our team uses a totally different retry policy, documented in Notion.';
  const customized = withRetryLogic(generated, CUSTOM_BODY);
  fs.writeFileSync(path.join(dir, REL), customized, 'utf8');
  const before = fs.readFileSync(path.join(dir, REL), 'utf8');

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, REL), 'utf8');
  assert.equal(after, before, 'a CONFLICT section must leave the file byte-for-byte unchanged');
  assert.equal(bodyOf(after, 'Retry Logic'), CUSTOM_BODY);
  assert.deepEqual(result.drifted, []);
  assert.deepEqual(result.updated, []);
  assert.deepEqual(
    result.needsAttention.map((n) => `${n.status}:${n.header}`),
    ['CONFLICT:Retry Logic']
  );
});

test('UNTRACKED is skipped, file untouched, and the user is pointed at `curate baseline`', async () => {
  const dir = makeTmpProject();
  // Pre-feature project: content differs from the current template but there is NO manifest,
  // so curate cannot know whether that difference is drift or a deliberate edit. It must not guess.
  const oldContent = withRetryLogic(frontendMd(), OLD_RETRY_LOGIC);
  fs.writeFileSync(path.join(dir, REL), oldContent, 'utf8');
  const before = fs.readFileSync(path.join(dir, REL), 'utf8');

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });

  assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), before, 'UNTRACKED must not be written');
  assert.deepEqual(result.drifted, []);
  assert.ok(result.needsAttention.every((n) => n.status === 'UNTRACKED'));
  assert.ok(result.needsAttention.some((n) => n.header === 'Retry Logic'));
  assert.equal(fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), false, 'sync must not write a baseline itself');
});

test('dry-run reports DRIFT but writes nothing — neither the file nor the manifest', async () => {
  const dir = makeTmpProject();
  const oldContent = withRetryLogic(frontendMd(), OLD_RETRY_LOGIC);
  fs.writeFileSync(path.join(dir, REL), oldContent, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, REL, oldContent);
  writeManifest(dir, manifest);
  const manifestBefore = fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8');

  const result = await agentsSync({ dir, agentDir: '.claude/agents', dryRun: true });

  assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), oldContent, 'dry-run must not touch the file');
  assert.equal(fs.readFileSync(path.join(dir, '.caf', '.generate-manifest.json'), 'utf8'), manifestBefore);
  assert.deepEqual(result.drifted, [`${REL}#Retry Logic`]);
  assert.deepEqual(result.updated, []);
});

test('syncing a DRIFT section leaves every other section in the file untouched', async () => {
  const dir = makeTmpProject();
  const generated = frontendMd();
  const oldContent = withRetryLogic(generated, OLD_RETRY_LOGIC);
  fs.writeFileSync(path.join(dir, REL), oldContent, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, REL, oldContent);
  writeManifest(dir, manifest);

  await agentsSync({ dir, agentDir: '.claude/agents' });
  const after = fs.readFileSync(path.join(dir, REL), 'utf8');

  for (const header of ['Role', 'Scope', 'Allowed Tools', 'Input', 'Output', 'Working Pattern (PIV)', 'Verify Checklist']) {
    assert.equal(bodyOf(after, header), bodyOf(oldContent, header), `section "## ${header}" must be unchanged`);
  }
  // Frontmatter and title survive too.
  assert.equal(after.split('## Role')[0], oldContent.split('## Role')[0]);
});
