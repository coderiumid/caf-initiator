import fs from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';

import { section, readFileSafe, exists, dirHasContent } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody, templateForExistingSection } from '../utils/agent-sections.js';
import { readSyncState, contentHash, getDecision } from '../utils/sync-state.js';
import { canonicalHeaders } from '../utils/canonical-sections.js';
import { extractHeaders } from '../utils/section-headers.js';
import { hashSection, compareSection, SECTION_STATUS } from '../utils/section-diff.js';
import { readManifest, getBaselineHash } from '../utils/generate-manifest.js';
import { templateToolsForKind } from '../templates/agent-md.js';
import { usableSkillPaths } from './skills.js';

const SYMBOL = { ok: '✓', gap: '✗', declined: '⊘', warn: '!' };
const COLOR = { ok: kleur.green, gap: kleur.red, declined: kleur.yellow, warn: kleur.yellow };

// status: 'ok' | 'gap' | 'declined' | 'warn'. 'warn' is a rollout warning (see
// rolloutWarnings()): shown with the agent definitions, counted on its own, never a gap. severity 'optional' never fails the exit code (Layer 1
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

const SECTION_STATUS_MESSAGE = {
  [SECTION_STATUS.DRIFT]: (header) =>
    `section \`## ${header}\` differs from the latest template (DRIFT — untouched since last generate/sync, safe to auto-sync)`,
  [SECTION_STATUS.CUSTOMIZATION]: (header) =>
    `section \`## ${header}\` differs from its baseline (CUSTOMIZATION — edited manually since last sync, will NOT be auto-synced)`,
  [SECTION_STATUS.CONFLICT]: (header) =>
    `section \`## ${header}\` differs from both its baseline and the latest template (CONFLICT — both changed, needs manual review)`,
  [SECTION_STATUS.UNTRACKED]: (header) =>
    `section \`## ${header}\` present but has no manifest baseline yet (UNTRACKED — run \`caf-init curate baseline\` first)`,
};

/** The inline `tools: [a, b]` list of a file's frontmatter, or null when it has none in that shape. */
function frontmatterTools(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*$/m);
  const line = m && m[1].match(/^tools:[ \t]*\[(.*)\][ \t]*$/m);
  if (!line) return null;
  return line[1]
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

const toolList = (tools) => `\`[${tools.join(', ')}]\``;

// The two parts of a template change that `curate sync` does not carry to an agent generated
// earlier (CAF-SDD-02d): the frontmatter `tools:` line (sync writes sections, never frontmatter)
// and a pointer to a skill that became active later (`## Skills` is not tracked, and
// `scaffold skills` never edits an agent that already has the section). Before this, such an
// agent read as "already in sync".
// Warnings on purpose, never gaps: a `tools:` line may differ because a human added an MCP tool
// or took one away, and a pointer may have been left out by choice. They must not change the
// exit code. Read-only and deterministic: the same tables the generator renders from.
// - Only for a file whose name is a known kind. `implementation` is the fallback for any other
//   name; holding a custom agent against it would be a guess.
// - Tools are compared as a set: the order of the list means nothing to the harness.
// - "Active" is the generator's own rule (usableSkillPaths): the skill is mapped to the kind,
//   its file exists and it has no DRAFT banner. A DRAFT skill is never asked for.
function rolloutWarnings(dir, relPath, raw, kind, lines, sections) {
  if (kind === 'implementation') return [];
  const warnings = [];
  const warn = (check, message) => warnings.push({ ...entry({ status: 'warn', filePath: relPath, message }), check });

  const template = templateToolsForKind(kind);
  const current = frontmatterTools(raw);
  if (template && current && [...current].sort().join('\n') !== [...template].sort().join('\n')) {
    warn(
      'tools',
      `frontmatter \`tools:\` is ${toolList(current)}, the template for kind \`${kind}\` has ${toolList(template)} ` +
        '(warning — `curate sync` does not write frontmatter: edit the line by hand, or leave it if the difference is on purpose)'
    );
  }

  const skillsSection = sections.find((s) => s.header === 'Skills');
  const pointedAt = skillsSection ? sectionBody(lines, skillsSection) : '';
  const missing = usableSkillPaths(dir, kind).filter((p) => !pointedAt.includes(p));
  if (missing.length > 0) {
    const list = missing.map((p) => `\`${p}\``).join(', ');
    const what = `no pointer to ${list}, ${missing.length === 1 ? 'an active skill' : 'active skills'} of kind \`${kind}\``;
    warn(
      'skill-pointer',
      skillsSection
        ? `${what} (warning — \`caf-init scaffold skills\` never edits an agent that has \`## Skills\`: add the pointer line to \`## Skills\` by hand, as \`- \`<path>\`\`)`
        : `${what} (warning — the file has no \`## Skills\` section: run \`caf-init scaffold skills\`, which offers to add it)`
    );
  }
  return warnings;
}

export function auditAgentDefinitions(dir, agentDirOpt) {
  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  if (!fs.existsSync(agentDirPath)) return { entries: [], sectionCounts: {}, warnings: [] };

  const files = fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
  if (files.length === 0) return { entries: [], sectionCounts: {}, warnings: [] };

  const state = readSyncState(agentDirPath);
  const manifest = readManifest(dir);
  const entries = [];
  // Kept out of `entries`: those are the section report, and a warning is not a section status.
  const warnings = [];
  const sectionCounts = {
    [SECTION_STATUS.IN_SYNC]: 0,
    [SECTION_STATUS.DRIFT]: 0,
    [SECTION_STATUS.CUSTOMIZATION]: 0,
    [SECTION_STATUS.CONFLICT]: 0,
    [SECTION_STATUS.UNTRACKED]: 0,
  };

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
      if (proposed == null) continue; // section not part of this kind's template at all

      if (presentHeaders.has(header)) {
        const existingSection = sections.find((s) => s.header === header);
        const body = sectionBody(lines, existingSection);
        const baselineHash = getBaselineHash(manifest, relPath, header);
        // Same rule as agents-sync.js: a template that can't be rendered for this file (null)
        // compares as "template unchanged", so the section is never reported as DRIFT.
        const template = templateForExistingSection(header, kind, body);
        const status = compareSection({
          baselineHash,
          currentHash: hashSection(body),
          templateHash: template == null ? baselineHash : hashSection(template),
        });
        sectionCounts[status] += 1;
        if (status !== SECTION_STATUS.IN_SYNC) {
          fileEntries.push(
            entry({
              status: status === SECTION_STATUS.DRIFT ? 'gap' : 'declined',
              filePath: relPath,
              message: SECTION_STATUS_MESSAGE[status](header),
              syncCommand: status === SECTION_STATUS.DRIFT ? 'caf-init curate --sync-only' : null,
            })
          );
        }
        continue;
      }

      const hash = contentHash(proposed);
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
    warnings.push(...rolloutWarnings(dir, relPath, raw, kind, lines, sections));
  }

  return { entries, sectionCounts, warnings };
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

export async function audit({ dir, agentDir: agentDirOpt, output, repoMode }) {
  section('audit — read-only compliance report against caf-initiator templates (never writes)');

  const stack = await detectStack({ dir, explicitGlobs: undefined, mode: repoMode });
  const agentDefsResult = auditAgentDefinitions(dir, agentDirOpt);

  const layers = [
    { name: 'Layer 1 (Knowledge Base)', entries: auditKnowledgeBase(dir, stack) },
    { name: 'Layer 2 (Agent Definitions)', entries: [...agentDefsResult.entries, ...agentDefsResult.warnings] },
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
  const warnings = agentDefsResult.warnings;
  const warningSummary =
    `${warnings.length} warning(s) — rollout steps \`curate sync\` does not carry (frontmatter \`tools:\`, ` +
    '`## Skills` pointers); they do not change the exit code';

  console.log(kleur.bold('Summary'));
  console.log(`  ${requiredGaps.length} required gap(s), ${optionalGaps.length} optional document(s) missing, ${declined.length} need manual review (section name mismatch/declined/customized)`);

  if (warnings.length > 0) console.log(kleur.yellow(`  ${warningSummary}`));

  const sc = agentDefsResult.sectionCounts;
  const trackedSectionTotal = sc ? Object.values(sc).reduce((a, b) => a + b, 0) : 0;
  if (trackedSectionTotal > 0) {
    console.log(
      `  agent sections tracked: ${sc[SECTION_STATUS.IN_SYNC]} in-sync, ${sc[SECTION_STATUS.DRIFT]} drift, ` +
        `${sc[SECTION_STATUS.CUSTOMIZATION]} customization, ${sc[SECTION_STATUS.CONFLICT]} conflict, ${sc[SECTION_STATUS.UNTRACKED]} untracked`
    );
  }

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
    if (warnings.length > 0) lines.push(warningSummary);
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
  // Warnings never do (CAF-SDD-02d).
  if (requiredGaps.length > 0) process.exitCode = 1;

  return { layers, requiredGaps, optionalGaps, declined, warnings, sectionCounts: agentDefsResult.sectionCounts };
}
