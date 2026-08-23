import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, readFileSafe } from '../util.js';
import { readSyncState, writeSyncState, contentHash, getDecision, setDecision } from '../utils/sync-state.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody, insertSection } from '../utils/agent-sections.js';

function listAgentFiles(agentDirPath) {
  if (!fs.existsSync(agentDirPath)) return [];
  return fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

export async function agentsSync({ dir, agentDir: agentDirOpt, dryRun = false }) {
  section('sync agents — add missing sections (e.g. Input) to already-generated .claude/agents/*.md without touching existing content');

  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  const files = listAgentFiles(agentDirPath);

  if (files.length === 0) {
    console.log(kleur.red(`No agent definitions found in ${agentDirPath}. Run \`caf-init scaffold agents\` first.`));
    return { updated: [], skipped: [] };
  }

  const state = readSyncState(agentDirPath);
  const updated = [];
  const skipped = [];

  for (const file of files) {
    const filePath = path.join(agentDirPath, file);
    const raw = readFileSafe(filePath);
    if (raw == null) continue;

    const kind = detectKind(file);
    let { lines, sections } = parseSections(raw);
    const presentHeaders = new Set(sections.map((s) => s.header));
    let currentContent = raw;
    let fileChanged = false;

    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      const proposed = SYNCABLE_SECTIONS[header](kind);
      const hash = contentHash(proposed);

      if (presentHeaders.has(header)) {
        const existingSection = sections.find((s) => s.header === header);
        const body = sectionBody(lines, existingSection);
        if (body !== proposed.trim()) {
          console.log(
            kleur.dim(
              `  note  ${file}: section "## ${header}" already exists but differs from the latest template — review manually if needed`
            )
          );
        }
        continue;
      }

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
      fileChanged = true;
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, currentContent, 'utf8');
      console.log(kleur.green(`  updated  ${filePath}`));
      updated.push(filePath);
    }
  }

  writeSyncState(agentDirPath, state, { dryRun });

  console.log('');
  console.log(kleur.green(`sync complete — ${updated.length} file(s) updated, ${skipped.length} section(s) skipped`));

  return { updated, skipped };
}
