import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, readFileSafe } from '../util.js';
import { readSyncState, writeSyncState, contentHash, getDecision, setDecision } from '../utils/sync-state.js';
import {
  SYNCABLE_SECTIONS,
  detectKind,
  parseSections,
  sectionBody,
  insertSection,
  replaceSectionBody,
} from '../utils/agent-sections.js';
import { hashSection, compareSection, SECTION_STATUS } from '../utils/section-diff.js';
import { readManifest, writeManifest, getBaselineHash, setSectionBaseline } from '../utils/generate-manifest.js';

function listAgentFiles(agentDirPath) {
  if (!fs.existsSync(agentDirPath)) return [];
  return fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

// Statuses this command refuses to write, and why — printed verbatim at the end of the run so a
// skip is never silent (CAF-CURATE-DIFF-01: the user must know a section needs their attention).
const NEVER_SYNCED = {
  [SECTION_STATUS.CUSTOMIZATION]: 'edited manually since the last baseline — your version is kept, review the template change yourself if you want it',
  [SECTION_STATUS.CONFLICT]: 'both your file and the template changed since the last baseline — needs a manual decision',
  [SECTION_STATUS.UNTRACKED]: 'no manifest baseline yet — run `caf-init curate baseline` first to record the current content as the baseline',
};

export async function agentsSync({ dir, agentDir: agentDirOpt, dryRun = false }) {
  section(
    'sync agents — add missing sections and update sections that drifted from the template in ' +
      'already-generated .claude/agents/*.md. Never overwrites a section you edited yourself.'
  );

  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  const files = listAgentFiles(agentDirPath);

  if (files.length === 0) {
    console.log(kleur.red(`No agent definitions found in ${agentDirPath}. Run \`caf-init scaffold agents\` first.`));
    return { updated: [], skipped: [], drifted: [], needsAttention: [] };
  }

  const state = readSyncState(agentDirPath);
  const manifest = readManifest(dir);
  const updated = [];
  const skipped = [];
  const drifted = [];
  const needsAttention = [];
  let manifestChanged = false;

  for (const file of files) {
    const filePath = path.join(agentDirPath, file);
    const relPath = path.join(agentDirOpt || '.claude/agents', file);
    const raw = readFileSafe(filePath);
    if (raw == null) continue;

    const kind = detectKind(file);
    let { lines, sections } = parseSections(raw);
    const presentHeaders = new Set(sections.map((s) => s.header));
    let currentContent = raw;
    let fileChanged = false;

    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      const proposed = SYNCABLE_SECTIONS[header](kind);
      if (proposed == null) continue; // section isn't part of this kind's template at all

      if (presentHeaders.has(header)) {
        const existingSection = sections.find((s) => s.header === header);
        const body = sectionBody(lines, existingSection);
        const status = compareSection({
          baselineHash: getBaselineHash(manifest, relPath, header),
          currentHash: hashSection(body),
          templateHash: hashSection(proposed),
        });

        if (status === SECTION_STATUS.IN_SYNC) continue;

        // Every non-DRIFT status lands here and is reported, never written. This is the single
        // gate that makes "a manual edit is never overwritten" true: reaching the write branch
        // below requires status === DRIFT, which requires currentHash === baselineHash, i.e.
        // the section is byte-for-byte (post-normalization) what curate itself last wrote.
        if (status !== SECTION_STATUS.DRIFT) {
          needsAttention.push({ file: relPath, header, status });
          continue;
        }

        if (dryRun) {
          console.log(kleur.yellow(`  would update "## ${header}" in ${file} (DRIFT, dry-run — nothing written)`));
          drifted.push(`${relPath}#${header}`);
          continue;
        }

        currentContent = replaceSectionBody(lines, existingSection, proposed.trim());
        ({ lines, sections } = parseSections(currentContent));
        setSectionBaseline(manifest, relPath, header, hashSection(proposed));
        manifestChanged = true;
        fileChanged = true;
        drifted.push(`${relPath}#${header}`);
        console.log(kleur.green(`  drift-sync  ${file}: section "## ${header}" updated to the latest template`));
        continue;
      }

      const hash = contentHash(proposed);
      const decision = getDecision(state, file, header, hash);
      if (decision === 'skipped') {
        console.log(kleur.dim(`  skip  ${file}: section "## ${header}" (previously declined, template unchanged)`));
        continue;
      }

      console.log('');
      console.log(kleur.yellow(`${file}: section "## ${header}" missing, present in the latest template. Preview:`));
      console.log(kleur.dim('---'));
      console.log(proposed);
      console.log(kleur.dim('---'));

      if (dryRun) {
        console.log(kleur.yellow(`  would add "## ${header}" to ${file} (dry-run, nothing written)`));
        continue;
      }

      const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Add section "## ${header}" to ${file}?`,
        initial: true,
      });

      if (!confirmed) {
        setDecision(state, file, header, hash, 'skipped');
        skipped.push(`${file}#${header}`);
        console.log(kleur.dim(`  skip  ${file}: section "## ${header}" declined — won't be asked again unless the template changes`));
        continue;
      }

      currentContent = insertSection(lines, sections, header, proposed);
      ({ lines, sections } = parseSections(currentContent));
      presentHeaders.add(header);
      // A section this command just wrote is by definition at the template's current content —
      // baseline it now so the next run can tell a later user edit apart from template drift.
      setSectionBaseline(manifest, relPath, header, hashSection(proposed));
      manifestChanged = true;
      fileChanged = true;
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, currentContent, 'utf8');
      console.log(kleur.green(`  updated  ${filePath}`));
      updated.push(filePath);
    }
  }

  writeSyncState(agentDirPath, state, { dryRun });
  if (manifestChanged) writeManifest(dir, manifest, { dryRun });

  console.log('');
  const driftedLabel = dryRun ? 'drifted section(s) that would be synced' : 'drifted section(s) synced';
  console.log(
    kleur.green(
      `sync complete — ${updated.length} file(s) updated, ${drifted.length} ${driftedLabel}, ${skipped.length} section(s) skipped`
    )
  );

  if (needsAttention.length > 0) {
    console.log('');
    console.log(kleur.bold(`${needsAttention.length} section(s) were NOT synced and need your attention:`));
    for (const { file, header, status } of needsAttention) {
      console.log(`  ${kleur.yellow(status.padEnd(13))} ${file} ${kleur.dim('—')} \`## ${header}\``);
      console.log(`  ${' '.repeat(13)} ${kleur.dim(NEVER_SYNCED[status])}`);
    }
    console.log('');
  }

  return { updated, skipped, drifted, needsAttention };
}
