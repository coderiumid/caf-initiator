import fs from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';

import { section, readFileSafe, exists, dirHasContent } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody } from '../utils/agent-sections.js';
import { readSyncState, contentHash, getDecision } from '../utils/sync-state.js';
import { canonicalHeaders } from '../utils/canonical-sections.js';
import { extractHeaders } from '../utils/section-headers.js';

const SYMBOL = { ok: '✓', gap: '✗', declined: '⊘' };
const COLOR = { ok: kleur.green, gap: kleur.red, declined: kleur.yellow };

// status: 'ok' | 'gap' | 'declined'. severity 'optional' never fails the exit code (Layer 1
// reference docs are human-owned and not required for the pipeline to run — same stance as
// reference-docs.js). syncCommand is the CLI command that would address this gap, or null
// when no apply command exists yet (report the gap as-is — not this command's job to add one).
function entry({ status, filePath, message, syncCommand = null, severity = 'required' }) {
  return { status, filePath, message, syncCommand, severity };
}

function normalizeHeader(h) {
  return h.trim().toLowerCase();
}

// Section-name matching is inherently unreliable once a file has been customized far from
// the template (renamed/merged/domain-specific headings) — a missing exact-name match does
// NOT mean the content is missing, only that we can't confirm it structurally. So a name
// miss is never reported as "missing" (gap); it's "manual review" (declined). The only
// real gap here is a file with zero `##` headings at all — nothing to defer review to.
// Mirrors the tolerant behavior agents-sync.js/auditAgentDefinitions already use for
// `.claude/agents/*.md`, which reads section bodies and reports mismatches as "different",
// never as "missing".
function headerGapEntries(filePath, content, kind, syncCommand) {
  const canonical = canonicalHeaders(kind);
  const existingHeaders = extractHeaders(content);

  if (existingHeaders.length === 0) {
    return canonical.map((header) =>
      entry({
        status: 'gap',
        filePath,
        message: `section \`## ${header}\` missing (file has no \`##\` headings at all)`,
        syncCommand,
      })
    );
  }

  const existingSet = new Set(existingHeaders.map(normalizeHeader));
  const missing = canonical.filter((h) => !existingSet.has(normalizeHeader(h)));

  if (missing.length === 0) {
    return [entry({ status: 'ok', filePath, message: 'already in sync' })];
  }

  const existingList = existingHeaders.map((h) => `\`## ${h}\``).join(', ');
  return missing.map((header) =>
    entry({
      status: 'declined',
      filePath,
      message: `section \`## ${header}\` not found; file has ${existingList} — manual review, section may have a different name`,
    })
  );
}

function auditSingleFile(dir, relPath, kind, { createCommand, partialSyncCommand }) {
  const filePath = path.join(dir, relPath);
  const content = readFileSafe(filePath);
  if (content == null) {
    return [entry({ status: 'gap', filePath: relPath, message: 'missing', syncCommand: createCommand })];
  }
  return headerGapEntries(relPath, content, kind, partialSyncCommand);
}

function auditKnowledgeBase(dir, stack) {
  const entries = [];

  entries.push(
    ...auditSingleFile(dir, 'CLAUDE.md', 'claude-md', { createCommand: 'caf-init scaffold', partialSyncCommand: null })
  );
  entries.push(
    ...auditSingleFile(dir, 'AGENTS.md', 'agents-md', { createCommand: 'caf-init scaffold', partialSyncCommand: null })
  );
  entries.push(
    ...auditSingleFile(dir, path.join('.caf', 'knowledge', 'INDEX.md'), 'knowledge-index-md', {
      createCommand: 'caf-init scaffold',
      partialSyncCommand: null,
    })
  );

  // RULES.md is a mandatory pair for every non-empty .caf/knowledge/golden-examples/{{app}}/
  // folder (CAF.md Layer 1) — same rule golden-examples.js already enforces.
  for (const app of stack.apps) {
    const appFolder = path.join(dir, '.caf', 'knowledge', 'golden-examples', app.path === '.' ? '' : app.path);
    const rulesPath = path.join(appFolder, 'RULES.md');
    if (dirHasContent(appFolder) && !exists(rulesPath)) {
      entries.push(
        entry({
          status: 'gap',
          filePath: path.join('.caf', 'knowledge', 'golden-examples', app.path, 'RULES.md'),
          message: 'missing, golden example folder already has content',
          syncCommand: 'caf-init scaffold golden-examples',
        })
      );
    }
  }

  // Optional Layer 1 reference docs — never required, existence-only (content is human-owned
  // prose, not something to structurally diff — see reference-docs.js).
  const OPTIONAL_DOCS = [
    'docs/product/prd.md',
    'docs/architecture/system-overview.md',
    'docs/schema/erd.md',
    'docs/testing-strategy.md',
    'docs/api-contract.md',
  ];
  for (const relPath of OPTIONAL_DOCS) {
    if (!exists(path.join(dir, relPath))) {
      entries.push(
        entry({
          status: 'gap',
          filePath: relPath,
          message: 'missing (optional)',
          syncCommand: 'caf-init docs',
          severity: 'optional',
        })
      );
    }
  }

  // The /caf-feature-catalog-sync slash command — optional like the reference docs,
  // existence-only. The command dir is hardcoded to the default here: `caf-init curate` has no
  // --command-dir, and a repo that moved its commands elsewhere will just see one optional gap
  // it can ignore.
  if (!exists(path.join(dir, '.claude', 'commands', 'caf-feature-catalog-sync.md'))) {
    entries.push(
      entry({
        status: 'gap',
        filePath: '.claude/commands/caf-feature-catalog-sync.md',
        message: 'missing (optional)',
        syncCommand: 'caf-init scaffold feature-catalog-sync',
        severity: 'optional',
      })
    );
  }

  return entries;
}

function auditAgentDefinitions(dir, agentDirOpt) {
  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  if (!fs.existsSync(agentDirPath)) return [];

  const files = fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
  if (files.length === 0) return [];

  const state = readSyncState(agentDirPath);
  const entries = [];

  for (const file of files) {
    const relPath = path.join(agentDirOpt || '.claude/agents', file);
    const raw = readFileSafe(path.join(agentDirPath, file));
    if (raw == null) continue;

    const kind = detectKind(file);
    const { lines, sections } = parseSections(raw);
    const presentHeaders = new Set(sections.map((s) => s.header));
    const fileEntries = [];

    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      const proposed = SYNCABLE_SECTIONS[header](kind);
      const hash = contentHash(proposed);

      if (presentHeaders.has(header)) {
        const existingSection = sections.find((s) => s.header === header);
        const body = sectionBody(lines, existingSection);
        if (body !== proposed.trim()) {
          fileEntries.push(
            entry({
              status: 'declined',
              filePath: relPath,
              message: `section \`## ${header}\` differs from the latest template (review manually if needed)`,
            })
          );
        }
        continue;
      }

      const decision = getDecision(state, file, header, hash);
      if (decision === 'skipped') {
        fileEntries.push(
          entry({
            status: 'declined',
            filePath: relPath,
            message: `section \`## ${header}\` missing (previously declined in curate --sync-only)`,
          })
        );
        continue;
      }

      fileEntries.push(
        entry({
          status: 'gap',
          filePath: relPath,
          message: `section \`## ${header}\` missing`,
          syncCommand: 'caf-init curate --sync-only',
        })
      );
    }

    entries.push(...(fileEntries.length > 0 ? fileEntries : [entry({ status: 'ok', filePath: relPath, message: 'already in sync' })]));
  }

  return entries;
}

function auditArtifactHandoff(dir) {
  return auditSingleFile(dir, '.caf/workflows/agent-handoff.md', 'agent-handoff-md', {
    createCommand: 'caf-init scaffold workflow',
    // No command inserts individual missing sections into an already-generated
    // agent-handoff.md today (unlike curate --sync-only for .claude/agents/*.md) — report as-is.
    partialSyncCommand: null,
  });
}

function auditQualityGates(dir) {
  return [
    ...auditSingleFile(dir, '.caf/workflows/task-completion.md', 'task-completion-md', {
      createCommand: 'caf-init scaffold task-completion',
      partialSyncCommand: null,
    }),
    ...auditSingleFile(dir, '.caf/workflows/piv-workflow.md', 'piv-workflow-md', {
      createCommand: 'caf-init scaffold workflow',
      partialSyncCommand: null,
    }),
  ];
}

function printLayer(lines, layerName, entries) {
  lines.push(`${layerName}`);
  for (const e of entries) {
    lines.push(`  ${SYMBOL[e.status]} ${e.filePath} — ${e.message}`);
  }
  lines.push('');
}

function printConsole(layerName, entries) {
  console.log(kleur.bold(layerName));
  for (const e of entries) {
    console.log(`  ${COLOR[e.status](SYMBOL[e.status])} ${e.filePath} ${kleur.dim('—')} ${e.message}`);
  }
  console.log('');
}

export async function audit({ dir, agentDir: agentDirOpt, output }) {
  section('audit — read-only compliance report against caf-initiator templates (never writes)');

  const stack = await detectStack({ dir, explicitGlobs: undefined });

  const layers = [
    { name: 'Layer 1 (Knowledge Base)', entries: auditKnowledgeBase(dir, stack) },
    { name: 'Layer 2 (Agent Definitions)', entries: auditAgentDefinitions(dir, agentDirOpt) },
    { name: 'Layer 3 (Artifact Handoff)', entries: auditArtifactHandoff(dir) },
    { name: 'Layer 4 (Quality Gates)', entries: auditQualityGates(dir) },
  ];

  console.log('');
  for (const { name, entries } of layers) {
    if (entries.length === 0) continue;
    printConsole(name, entries);
  }

  const allEntries = layers.flatMap((l) => l.entries);
  const requiredGaps = allEntries.filter((e) => e.status === 'gap' && e.severity === 'required');
  const optionalGaps = allEntries.filter((e) => e.status === 'gap' && e.severity === 'optional');
  const declined = allEntries.filter((e) => e.status === 'declined');

  console.log(kleur.bold('Summary'));
  console.log(`  ${requiredGaps.length} required gap(s), ${optionalGaps.length} optional document(s) missing, ${declined.length} need manual review (section name mismatch/declined/customized)`);

  const commandsByGap = new Map();
  for (const e of requiredGaps) {
    if (!e.syncCommand) continue;
    if (!commandsByGap.has(e.syncCommand)) commandsByGap.set(e.syncCommand, []);
    commandsByGap.get(e.syncCommand).push(e.filePath);
  }
  const noCommandGaps = requiredGaps.filter((e) => !e.syncCommand);

  if (commandsByGap.size > 0) {
    console.log('');
    console.log('  Next steps:');
    for (const [cmd, filePaths] of commandsByGap) {
      console.log(`    - \`${cmd}\` → handles ${filePaths.length} gap(s) (${filePaths.join(', ')})`);
    }
  }
  if (noCommandGaps.length > 0) {
    console.log('');
    console.log(kleur.yellow('  No command handles the following gaps yet — needs manual review/apply:'));
    for (const e of noCommandGaps) {
      console.log(`    - ${e.filePath}: ${e.message}`);
    }
  }
  console.log('');

  if (output) {
    const lines = [`# CAF Audit Report`, ''];
    for (const { name, entries } of layers) {
      if (entries.length === 0) continue;
      printLayer(lines, `## ${name}`, entries);
    }
    lines.push('## Summary', '');
    lines.push(
      `${requiredGaps.length} required gap(s), ${optionalGaps.length} optional document(s) missing, ${declined.length} need manual review (section name mismatch/declined/customized)`
    );
    lines.push('');
    for (const [cmd, filePaths] of commandsByGap) {
      lines.push(`- \`${cmd}\` → handles ${filePaths.length} gap(s) (${filePaths.join(', ')})`);
    }
    for (const e of noCommandGaps) {
      lines.push(`- ${e.filePath}: ${e.message} (no automatic command yet)`);
    }
    const outputPath = path.isAbsolute(output) ? output : path.join(dir, output);
    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
    console.log(kleur.dim(`report saved to ${outputPath}`));
  }

  // Optional-doc gaps never fail the run (see reference-docs.js — Layer 1 reference docs are
  // never required for the pipeline). Required gaps do, so `audit` is usable as a CI gate.
  if (requiredGaps.length > 0) process.exitCode = 1;

  return { layers, requiredGaps, optionalGaps, declined };
}
