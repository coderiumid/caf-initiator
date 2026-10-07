// CAF-SKILLS-01 — `## Skills` in agent definitions that already exist.
// Part 1 (this file's first half): registering `Skills` in TEMPLATE_SECTION_ORDER without making
// it syncable must not change anything `curate` reports, with or without a manifest.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildAgentMd, buildSkillsBody } from '../src/templates/agent-md.js';
import { buildPmAgentMd, buildUxDesignerAgentMd } from '../src/templates/discovery-commands.js';
import {
  TEMPLATE_SECTION_ORDER,
  SYNCABLE_SECTIONS,
  KNOWN_KINDS,
  parseSections,
  insertSection,
} from '../src/utils/agent-sections.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { curateBaseline } from '../src/commands/curate-baseline.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, snapshotTree } from './helpers/make-repo.js';

const AGENT_DIR = '.claude/agents';
const BODY = buildSkillsBody(['.claude/skills/caf-no-guess/SKILL.md']);

// Every kind as a pre-CAF-SKILLS-01 version would have generated it: buildAgentMd without
// `skills` (byte-identical to the old output — see skills-section.test.js), plus the two
// Discovery agents from their own builders.
export function oldVersionAgents() {
  const files = {};
  for (const kind of KNOWN_KINDS) {
    if (kind === 'pm' || kind === 'ux-designer') continue;
    files[`${AGENT_DIR}/caf-${kind}.md`] = buildAgentMd({
      name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind,
      appNames: kind === 'qa' || kind === 'reviewer' ? ['apps/web', 'apps/api'] : [],
      slug: `caf-${kind}`,
    });
  }
  files[`${AGENT_DIR}/caf-pm.md`] = buildPmAgentMd({ agentDir: AGENT_DIR, slug: 'caf-pm' });
  files[`${AGENT_DIR}/caf-ux-designer.md`] = buildUxDesignerAgentMd({ agentDir: AGENT_DIR, slug: 'caf-ux-designer' });
  return files;
}

function insertEverywhere(dir) {
  const agentDir = path.join(dir, AGENT_DIR);
  for (const file of fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'))) {
    const abs = path.join(agentDir, file);
    const { lines, sections } = parseSections(fs.readFileSync(abs, 'utf8'));
    fs.writeFileSync(abs, insertSection(lines, sections, 'Skills', BODY));
  }
}

async function curateView(dir) {
  const audit = auditAgentDefinitions(dir, AGENT_DIR);
  const sync = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
  return { entries: audit.entries, sectionCounts: audit.sectionCounts, sync };
}

test('Skills is registered for placement only — never syncable, Report Format still last', () => {
  assert.ok(TEMPLATE_SECTION_ORDER.includes('Skills'));
  assert.ok(!Object.keys(SYNCABLE_SECTIONS).includes('Skills'));
  assert.equal(TEMPLATE_SECTION_ORDER.indexOf('Skills'), TEMPLATE_SECTION_ORDER.indexOf('Output') + 1);
  assert.equal(TEMPLATE_SECTION_ORDER.at(-1), 'Report Format');
});

test('insertSection: Skills lands right after Output and changes nothing else', () => {
  for (const [rel, raw] of Object.entries(oldVersionAgents())) {
    const { lines, sections } = parseSections(raw);
    const next = insertSection(lines, sections, 'Skills', BODY);
    const headers = parseSections(next).sections.map((s) => s.header);
    assert.equal(headers[headers.indexOf('Skills') - 1], 'Output', rel);
    assert.deepEqual(headers.filter((h) => h !== 'Skills'), sections.map((s) => s.header), rel);

    // insertSection() adds four lines: blank, heading, body, blank.
    const block = `\n## Skills\n${BODY}\n\n`;
    assert.equal(next.split(block).length, 2, rel);
    assert.equal(next.replace(block, ''), raw, `${rel}: removing the block must restore the original bytes`);
  }
});

for (const withManifest of [false, true]) {
  const label = withManifest ? 'with a manifest baseline' : 'without a manifest (repo scaffolded by an older version)';

  test(`AC-4/AC-7: audit and sync dry-run report the same before and after ## Skills is inserted — ${label}`, async () => {
    const dir = makeRepo(oldVersionAgents(), 'caf-skills-q1-');
    if (withManifest) await silenced(() => curateBaseline({ dir, agentDir: AGENT_DIR, yes: true }));

    const before = await curateView(dir);
    const pmBefore = fs.readFileSync(path.join(dir, AGENT_DIR, 'caf-pm.md'), 'utf8');
    insertEverywhere(dir);
    const tree = snapshotTree(dir);
    const after = await curateView(dir);

    assert.deepEqual(after.entries, before.entries);
    assert.deepEqual(after.sectionCounts, before.sectionCounts);
    assert.deepEqual(after.sync, before.sync);
    assert.deepEqual(snapshotTree(dir), tree, 'audit + sync --dry-run must not write');
    assert.ok(!after.entries.some((e) => /## Skills/.test(e.message)), 'Skills must never be reported');
    // pm/ux-designer are never asked to have the section.
    assert.notEqual(fs.readFileSync(path.join(dir, AGENT_DIR, 'caf-pm.md'), 'utf8'), pmBefore);
    assert.ok(!after.entries.some((e) => /caf-(pm|ux-designer)\.md/.test(e.filePath) && /missing/.test(e.message)));
  });
}
