// CAF-RETRYLOGIC-01 — `## Retry Logic` is role-aware.
//
// Incident being closed: `curate sync` overwrote the Retry Logic of caf-pm.md/caf-ux-designer.md
// in two production repos with the Delivery wording (write `verify-report.md` with
// `Status: SUCCESS`), which is nonsense for a Discovery agent — it produces prd.md/flow.md for a
// human and never enters the pipeline that greps that file.
//
// Two guarantees are tested here, in this order of importance:
//   1. No regression: every non-Discovery kind's Retry Logic is byte-for-byte what it was before
//      the fix (DELIVERY_RETRY_LOGIC_PRE_FIX below is a golden copy of the pre-fix output).
//   2. Discovery kinds get the Open-Questions wording, and a correctly-generated Discovery agent
//      now audits as IN_SYNC instead of DRIFT.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildAgentMd, buildRetryLogicSection, DISCOVERY_KINDS } from '../src/templates/agent-md.js';
import { buildPmAgentMd, buildUxDesignerAgentMd } from '../src/templates/discovery-commands.js';
import {
  SYNCABLE_SECTIONS,
  KNOWN_KINDS,
  detectKind,
  parseSections,
  sectionBody,
} from '../src/utils/agent-sections.js';
import { hashSection, compareSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { setSectionBaseline, writeManifest, readManifest, getBaselineHash } from '../src/utils/generate-manifest.js';

// Verbatim capture of buildRetryLogicSection()'s output from before this ticket, taken off the
// working tree at HEAD. Every Delivery kind must still produce exactly this string — this literal
// is the regression oracle, so do NOT regenerate it from the builder.
const DELIVERY_RETRY_LOGIC_PRE_FIX = [
  'Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —',
  'caf-orchestrator greps for `\\bSUCCESS\\b` and treats anything else, including "PASS"/"DONE"/"OK",',
  'as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).',
  'Verify fails → fix, retry up to 3x → if still failing, stop and write',
  '`verify-report.md` with Status: NEEDS_HUMAN',
].join('\n');

const DELIVERY_KINDS = [
  ...KNOWN_KINDS.filter((k) => !DISCOVERY_KINDS.includes(k)),
  'implementation',
  'devops',
  undefined,
];

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-retry-test-'));
  fs.mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  return dir;
}

function bodyOf(content, header) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
}

function baselineEverySection(manifest, relPath, content) {
  const { lines, sections } = parseSections(content);
  for (const s of sections) {
    setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
}

test('no regression: every Delivery kind renders the pre-fix Retry Logic byte-for-byte', () => {
  for (const kind of DELIVERY_KINDS) {
    assert.equal(
      buildRetryLogicSection(kind),
      DELIVERY_RETRY_LOGIC_PRE_FIX,
      `kind=${kind} must be byte-identical to the pre-fix output`
    );
  }
});

test('no regression: a full Delivery agent file is byte-identical to the pre-fix render', () => {
  // Independent of the builder-level check above: proves the buildAgentMd() call-site change
  // (buildRetryLogicSection() → buildRetryLogicSection(kind)) is inert for these kinds.
  for (const kind of DELIVERY_KINDS) {
    const md = buildAgentMd({
      kind,
      name: 'X',
      role: 'r',
      scope: 's',
      scripts: { lint: 'lint', typecheck: 'tc', test: 't', build: 'b' },
      packageManager: 'npm',
      packageName: 'p',
      slug: 'sl',
    });
    assert.equal(bodyOf(md, 'Retry Logic'), DELIVERY_RETRY_LOGIC_PRE_FIX, `kind=${kind}`);
  }
});

test('Discovery kinds get Open-Questions retry logic, never the verify-report contract', () => {
  for (const kind of DISCOVERY_KINDS) {
    const body = buildRetryLogicSection(kind);
    assert.match(body, /## Open Questions/, `kind=${kind} must direct the agent to Open Questions`);
    assert.doesNotMatch(body, /verify-report\.md/, `kind=${kind} must not mention verify-report.md`);
    assert.doesNotMatch(body, /\bSUCCESS\b/, `kind=${kind} must not mention the SUCCESS literal`);
    assert.doesNotMatch(body, /NEEDS_HUMAN/, `kind=${kind} must not mention NEEDS_HUMAN`);
    assert.notEqual(body, DELIVERY_RETRY_LOGIC_PRE_FIX);
  }
});

test('the generated Discovery agent files carry exactly the template Retry Logic', () => {
  // The literal that closes the loop: these files come from discovery-commands.js, but curate
  // regenerates the section via buildRetryLogicSection(kind). If the two strings ever diverge,
  // a freshly generated Discovery agent reads as DRIFT again.
  assert.equal(bodyOf(buildPmAgentMd({}), 'Retry Logic'), buildRetryLogicSection('pm'));
  assert.equal(
    bodyOf(buildUxDesignerAgentMd({}), 'Retry Logic'),
    buildRetryLogicSection('ux-designer')
  );
});

test('curate audit: a correctly-generated Discovery agent reads IN_SYNC, not DRIFT', () => {
  // Direct proof the reported gap is closed. Baseline is taken from the file's own content, which
  // is the `curate baseline` path that turned the incident destructive: current === baseline, so
  // any template mismatch would surface as DRIFT and be written by sync.
  for (const [file, build, kind] of [
    ['caf-pm.md', buildPmAgentMd, 'pm'],
    ['caf-ux-designer.md', buildUxDesignerAgentMd, 'ux-designer'],
  ]) {
    const content = build({});
    assert.equal(detectKind(file), kind);
    const body = bodyOf(content, 'Retry Logic');
    const status = compareSection({
      baselineHash: hashSection(body),
      currentHash: hashSection(body),
      templateHash: hashSection(SYNCABLE_SECTIONS['Retry Logic'](kind)),
    });
    assert.equal(status, SECTION_STATUS.IN_SYNC, `${file} Retry Logic should be IN_SYNC`);
  }
});

test('curate sync leaves a correctly-generated Discovery agent unchanged on every guarded/role-aware section', async () => {
  // "Working Pattern (PIV)" is deliberately excluded from this byte-for-byte check: its heading
  // now matches the canonical template (the header-mismatch fix), but its BODY is still
  // Discovery-specific wording that buildWorkingPatternSection() doesn't produce — see the
  // "Working Pattern (PIV) content still differs..." test below for that section's own coverage.
  // Every other section (guarded, or role-aware like Retry Logic) must be a true no-op.
  const dir = makeTmpProject();
  const rel = path.join('.claude', 'agents', 'caf-pm.md');
  const content = buildPmAgentMd({});
  fs.writeFileSync(path.join(dir, rel), content, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, rel, content);
  writeManifest(dir, manifest);

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, rel), 'utf8');
  for (const header of ['Retry Logic', 'Verify Checklist', 'Role', 'Scope', 'Reference']) {
    assert.equal(bodyOf(after, header), bodyOf(content, header), `${header} must not change`);
  }
  assert.deepEqual(result.drifted, [`${rel}#Working Pattern (PIV)`]);
  assert.deepEqual(
    result.needsAttention.map((n) => `${n.status}:${n.header}`),
    []
  );
});

test('Working Pattern (PIV) content still differs from the generic template — tracked, not guarded, and drift-syncs to the generic wording', async () => {
  // Documents the known, accepted consequence of un-guarding this section (see open-items.md and
  // CAF-DISCOVERY-SECTIONS-01): the header mismatch is fixed, so the section is now compared for
  // real, but nothing gave it Discovery-specific body content yet — a first `curate sync` after
  // baselining normalizes it to the Cluster 2 generic wording. That is a wording change, not a
  // corrupted contract (unlike Allowed Tools), so it stays out of this ticket's fix.
  const dir = makeTmpProject();
  const rel = path.join('.claude', 'agents', 'caf-pm.md');
  const content = buildPmAgentMd({});
  fs.writeFileSync(path.join(dir, rel), content, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, rel, content);
  writeManifest(dir, manifest);

  await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, rel), 'utf8');
  assert.notEqual(bodyOf(after, 'Working Pattern (PIV)'), bodyOf(content, 'Working Pattern (PIV)'));
  assert.equal(bodyOf(after, 'Working Pattern (PIV)'), SYNCABLE_SECTIONS['Working Pattern (PIV)']('pm'));
});

test('curate audit: a freshly-renamed Discovery fixture with no prior baseline reads Working Pattern (PIV) as UNTRACKED, not IN_SYNC', () => {
  // The header fix only changes what caf-initiator generates going forward. A real repo's already
  // -generated caf-pm.md/caf-ux-designer.md (old heading, never manually renamed) has no baseline
  // for this section under the new heading either way, so the correct status for both is
  // UNTRACKED — never assume it comes back IN_SYNC just because the heading now matches.
  const content = buildPmAgentMd({});
  const body = bodyOf(content, 'Working Pattern (PIV)');
  assert.notEqual(body, null, 'heading fix must make the section visible to the parser');
  const status = compareSection({
    baselineHash: null, // no manifest entry recorded yet
    currentHash: hashSection(body),
    templateHash: hashSection(SYNCABLE_SECTIONS['Working Pattern (PIV)']('pm')),
  });
  assert.equal(status, SECTION_STATUS.UNTRACKED);
});

test('regression guard: sync would have rewritten the Discovery file under the old generic template', async () => {
  // Same fixture as above, but the Retry Logic is forced to the Delivery text — i.e. the state
  // the two production repos were left in. It must come back as DRIFT and be repaired to the
  // Discovery wording, confirming the audit above is a real comparison and not a section that
  // was silently skipped.
  const dir = makeTmpProject();
  const rel = path.join('.claude', 'agents', 'caf-pm.md');
  const damaged = buildPmAgentMd({}).replace(
    /## Retry Logic\n[\s\S]*?(?=\n## |$)/,
    `## Retry Logic\n${DELIVERY_RETRY_LOGIC_PRE_FIX}\n`
  );
  assert.match(bodyOf(damaged, 'Retry Logic'), /verify-report\.md/, 'precondition: damaged fixture');
  fs.writeFileSync(path.join(dir, rel), damaged, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, rel, damaged);
  writeManifest(dir, manifest);

  await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, rel), 'utf8');
  assert.equal(bodyOf(after, 'Retry Logic'), buildRetryLogicSection('pm'));
  assert.equal(getBaselineHash(readManifest(dir), rel, 'Retry Logic'), hashSection(buildRetryLogicSection('pm')));
});

test('Discovery-guarded sections are held back for Discovery kinds only', () => {
  // The sections whose builders still answer for pm/ux-designer with generic Cluster 2
  // defaults (see DISCOVERY_GUARDED_SECTIONS in utils/agent-sections.js). Returning null keeps
  // curate from reporting or writing them; CAF-DISCOVERY-SECTIONS-01 gives them real content.
  const guarded = ['Allowed Tools', 'Input', 'Output'];
  for (const header of guarded) {
    for (const kind of DISCOVERY_KINDS) {
      assert.equal(SYNCABLE_SECTIONS[header](kind), null, `${header} must be null for kind=${kind}`);
    }
    assert.notEqual(SYNCABLE_SECTIONS[header]('frontend'), null, `${header} must stay live for Delivery`);
  }
  // Retry Logic and Working Pattern (PIV) are explicitly NOT guarded — Retry Logic has a real
  // Discovery branch, and Working Pattern (PIV)'s guard was only ever about the header mismatch
  // (now fixed), not content correctness.
  for (const header of ['Retry Logic', 'Working Pattern (PIV)']) {
    for (const kind of DISCOVERY_KINDS) {
      assert.notEqual(SYNCABLE_SECTIONS[header](kind), null, `${header} must stay live for kind=${kind}`);
    }
  }
});
