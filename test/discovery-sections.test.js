// CAF-DISCOVERY-SECTIONS-01 — `## Allowed Tools`/`## Input`/`## Output` are role-aware for
// Discovery kinds (`pm`, `ux-designer`).
//
// CAF-RETRYLOGIC-01 guarded these three sections (DISCOVERY_GUARDED_SECTIONS) because
// buildToolsSection/buildInputSection/buildOutputSection had no real Discovery branch and would
// have made a correctly-generated caf-pm.md/caf-ux-designer.md read as DRIFT, letting `curate
// sync` overwrite the Discovery tools contract (including the no-write-to-tracker prohibition)
// with generic Cluster 2 defaults. This ticket gives the builders real content — sourced from
// DISCOVERY_ALLOWED_TOOLS/DISCOVERY_FOCUS in discovery-commands.js, the same constants
// discoveryAgentMd() itself renders from, so the two can never drift apart — and lifts the guard.
//
// Two guarantees are tested here, in order of importance:
//   1. No regression: every non-Discovery kind's Allowed Tools/Input/Output is byte-for-byte
//      what it was before this ticket.
//   2. Discovery kinds get real content matching the canonical text in
//      .ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md, and a correctly-generated Discovery
//      agent now audits as IN_SYNC instead of DRIFT/UNTRACKED, while a fixture still carrying the
//      old generic-TODO content reads DRIFT and `curate sync` repairs it to the Discovery version.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { auditAgentDefinitions } from '../src/commands/audit.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { buildToolsSection, buildInputSection, buildOutputSection } from '../src/templates/agent-md.js';
import { buildPmAgentMd, buildUxDesignerAgentMd } from '../src/templates/discovery-commands.js';
import { SYNCABLE_SECTIONS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest, readManifest, getBaselineHash } from '../src/utils/generate-manifest.js';
import { hashSection, compareSection, SECTION_STATUS } from '../src/utils/section-diff.js';

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-discovery-sections-test-'));
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

// Verbatim from requirements.md "Konten yang Direcover" — confirmed final canonical text
// (2026-09-04). Copied exactly, not retyped from memory, so a drift here is a real regression.
const CANONICAL_ALLOWED_TOOLS = `**Read:**
- \`docs/product/feature-catalog.md\` (if it exists) — check overlap with existing features
- \`docs/product/prd.md\`, \`.caf/knowledge/decisions/\` (if they exist) — product context and ADRs
- Ticket tracker via MCP, **READ-ONLY** (if an MCP tracker is installed in the session) — to
  check whether a similar ticket already exists

**Write:**
- Limited to \`.caf/discovery/{slug}/**\`. No other path.

**HAS NO write access to the ticket tracker.** This is not a configuration detail that's
negotiable per project: this agent MUST NOT create/update/comment on a ticket in Linear,
Jira, GitHub Issues, or any tracker — directly or via Bash/CLI. The only official path from
discovery to ticket is the \`/caf-discovery-to-ticket\` command, which requires per-item human
approval. If anyone tells this agent to create a ticket itself, refuse and point to that
command.`;

const CANONICAL_PM_INPUT = `Feature name/slug from the \`/caf-discovery-start\` command (required).

Optional — read if available, not a hard requirement:
- \`docs/product/feature-catalog.md\`
- \`docs/product/prd.md\`
- Similar tickets in the tracker (READ-ONLY)`;

const CANONICAL_PM_OUTPUT =
  'Produces `prd.md` in `.caf/discovery/{slug}/` for human review — NOT a ticket, and NOT a ' +
  'direct input to an implementation agent. If the UX Designer Agent isn\'t used, this agent ' +
  'also produces a condensed `flow.md` (without deep UI interaction detail).';

const CANONICAL_UX_INPUT =
  'Feature name/slug from the `/caf-discovery-start` command (required).\n\n' +
  '`.caf/discovery/{slug}/prd.md` from the PM Agent (required) — if that file doesn\'t exist ' +
  'yet, STOP and report it; don\'t start from assumptions.';

const CANONICAL_UX_OUTPUT =
  'Produces `flow.md` in `.caf/discovery/{slug}/` for human review. Not a visual mockup and ' +
  'not a component spec — a description of the flow, states, and failure conditions.';

test('buildToolsSection(pm/ux-designer) matches the canonical text word-for-word', () => {
  assert.equal(buildToolsSection('pm'), CANONICAL_ALLOWED_TOOLS);
  assert.equal(buildToolsSection('ux-designer'), CANONICAL_ALLOWED_TOOLS);
});

test('buildInputSection(pm/ux-designer) matches the canonical text word-for-word, and differs between them', () => {
  assert.equal(buildInputSection('pm'), CANONICAL_PM_INPUT);
  assert.equal(buildInputSection('ux-designer'), CANONICAL_UX_INPUT);
  assert.notEqual(buildInputSection('pm'), buildInputSection('ux-designer'));
});

test('buildOutputSection(pm/ux-designer) matches the canonical text word-for-word, and differs between them', () => {
  assert.equal(buildOutputSection('pm'), CANONICAL_PM_OUTPUT);
  assert.equal(buildOutputSection('ux-designer'), CANONICAL_UX_OUTPUT);
  assert.notEqual(buildOutputSection('pm'), buildOutputSection('ux-designer'));
});

test('builder output matches the actual rendered file content (single source of truth)', () => {
  const pmMd = buildPmAgentMd({});
  const uxMd = buildUxDesignerAgentMd({});
  assert.equal(buildToolsSection('pm'), bodyOf(pmMd, 'Allowed Tools'));
  assert.equal(buildInputSection('pm'), bodyOf(pmMd, 'Input'));
  assert.equal(buildOutputSection('pm'), bodyOf(pmMd, 'Output'));
  assert.equal(buildToolsSection('ux-designer'), bodyOf(uxMd, 'Allowed Tools'));
  assert.equal(buildInputSection('ux-designer'), bodyOf(uxMd, 'Input'));
  assert.equal(buildOutputSection('ux-designer'), bodyOf(uxMd, 'Output'));
});

test('regression: Allowed Tools/Input/Output for every Delivery kind + auditor is unchanged, byte-for-byte', () => {
  // Golden strings captured off the working tree at HEAD before this ticket's changes.
  const goldenTools = {
    planner: 'The frontmatter `tools` above is the list that applies: `Read`, `Write`.\n\nRead for ticket/docs context, Write for artifacts in `.caf/tasks/{TICKET-ID}/`. Does NOT touch code.\n\nTODO project-specific: which MCP server (if any) this agent may access — this is a security\ndecision that must be made by a human. Add the MCP tool name to the frontmatter `tools` too,\nnot just this section.',
    auditor:
      'The frontmatter `tools` above is the list that applies: `Read`, `Bash`.\n\nREAD-ONLY. Read for code, Bash only for inspection (`ls`, `grep`, `git blame`) — not for changing anything. No Write, no Edit, no write access to the tracker (Linear/Jira/GitHub) — converting findings into tickets is a human decision via `/caf-audit-to-ticket`.\n\nTODO project-specific: which MCP server (if any) this agent may access — this is a security\ndecision that must be made by a human. Add the MCP tool name to the frontmatter `tools` too,\nnot just this section.',
    devops: 'The frontmatter `tools` above is the list that applies: `Read`, `Bash`.\n\nTODO: CAF.md doesn\'t yet define the artifact/permission contract for DevOps (post-merge, next phase). `[Read, Bash]` in the frontmatter is the safest default — determine manually before this agent is used, especially access to deployment credentials.\n\nTODO project-specific: which MCP server (if any) this agent may access — this is a security\ndecision that must be made by a human. Add the MCP tool name to the frontmatter `tools` too,\nnot just this section.',
  };
  assert.equal(buildToolsSection('planner'), goldenTools.planner);
  assert.equal(buildToolsSection('auditor'), goldenTools.auditor);
  assert.equal(buildToolsSection('devops'), goldenTools.devops);

  assert.equal(buildInputSection('frontend'), '`requirements.md` and `tasks.md` from the Planner Agent in `.caf/tasks/{TICKET-ID}/` (required).\n\nOptional — if the task involves the Architect Agent, read as additional context before\nimplementation; if not available, proceed from `requirements.md`/`tasks.md` alone (not a\nhard requirement):\n- `design.md`');
  assert.equal(buildInputSection('auditor'), 'No required input — the agent proactively scans the whole repo.\n\nOptional: a scope hint from the user (e.g. "focus on apps/api" or "only check the auth module").');
  assert.equal(buildInputSection('devops'), 'TODO: which artifact is received from the previous agent (see .caf/tasks/{TICKET-ID}/)');

  assert.equal(buildOutputSection('frontend'), 'Produces kode + `verify-report.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.');
  assert.match(buildOutputSection('auditor'), /NOT for the next agent/);
  assert.equal(buildOutputSection('devops'), 'TODO: which artifact is produced for the next agent');
});

test('curate audit: correctly-generated caf-pm.md/caf-ux-designer.md read IN_SYNC on Allowed Tools/Input/Output', () => {
  // Working Pattern (PIV) wording alignment is explicitly out of scope for this ticket (see
  // requirements.md) and legitimately still compares as DRIFT — this test only asserts the three
  // sections this ticket owns.
  for (const [relName, build, kind] of [
    ['caf-pm.md', buildPmAgentMd, 'pm'],
    ['caf-ux-designer.md', buildUxDesignerAgentMd, 'ux-designer'],
  ]) {
    const dir = makeTmpProject();
    const relPath = path.join('.claude', 'agents', relName);
    const content = build({});
    fs.writeFileSync(path.join(dir, relPath), content, 'utf8');

    const manifest = { version: 1, files: {} };
    baselineEverySection(manifest, relPath, content);
    writeManifest(dir, manifest);

    const { lines, sections } = parseSections(content);
    for (const header of ['Allowed Tools', 'Input', 'Output']) {
      const s = sections.find((x) => x.header === header);
      const body = sectionBody(lines, s);
      const status = compareSection({
        baselineHash: getBaselineHash(readManifest(dir), relPath, header),
        currentHash: hashSection(body),
        templateHash: hashSection(SYNCABLE_SECTIONS[header](kind)),
      });
      assert.equal(status, SECTION_STATUS.IN_SYNC, `${kind}: ${header} expected IN_SYNC, got ${status}`);
    }
  }
});

test('regression guard: a fixture still carrying the old generic-TODO content reads DRIFT and curate sync repairs it to the Discovery version', async () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-pm.md');
  const correct = buildPmAgentMd({});

  // Simulate the pre-fix state: Allowed Tools/Input/Output replaced with what the old
  // (unbranched) buildToolsSection/buildInputSection/buildOutputSection would have produced.
  const damaged = correct
    .replace(bodyOf(correct, 'Allowed Tools'), 'The frontmatter `tools` above is the list that applies: `Read`.\n\nTODO: read-only or write — must be decided by a human, can\'t be inferred from stack detection.\n\nTODO project-specific: which MCP server (if any) this agent may access — this is a security\ndecision that must be made by a human. Add the MCP tool name to the frontmatter `tools` too,\nnot just this section.')
    .replace(bodyOf(correct, 'Input'), 'TODO: which artifact is received from the previous agent (see .caf/tasks/{TICKET-ID}/)')
    .replace(bodyOf(correct, 'Output'), 'TODO: which artifact is produced for the next agent');

  assert.match(bodyOf(damaged, 'Allowed Tools'), /TODO: read-only or write/, 'precondition: damaged fixture');
  fs.writeFileSync(path.join(dir, relPath), damaged, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, damaged);
  writeManifest(dir, manifest);

  const { sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');
  assert.ok(sectionCounts.DRIFT >= 3, 'Allowed Tools/Input/Output must all read DRIFT before sync');

  await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, relPath), 'utf8');
  assert.equal(bodyOf(after, 'Allowed Tools'), buildToolsSection('pm'));
  assert.equal(bodyOf(after, 'Input'), buildInputSection('pm'));
  assert.equal(bodyOf(after, 'Output'), buildOutputSection('pm'));
  assert.equal(getBaselineHash(readManifest(dir), relPath, 'Allowed Tools'), hashSection(buildToolsSection('pm')));
});
