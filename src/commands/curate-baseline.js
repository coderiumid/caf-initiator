import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, readFileSafe } from '../util.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody } from '../utils/agent-sections.js';
import { hashSection } from '../utils/section-diff.js';
import { readManifest, writeManifest, getBaselineHash, setSectionBaseline } from '../utils/generate-manifest.js';

function listAgentFiles(agentDirPath) {
  if (!fs.existsSync(agentDirPath)) return [];
  return fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

// Backfill for projects that used caf-initiator before CAF-CURATE-DIFF-01 existed and so have no
// manifest at all. requirements.md STOP item #2, Option (a): treat every UNTRACKED section's
// CURRENT content as the baseline exactly as-is — never guess from git timestamps (Option (b),
// explicitly rejected: that's how the umkm-pos/coderium-web-v2 CDR-38 gap happened in the first
// place, a wrong guess silently becoming a wrong baseline). This command NEVER edits file
// content — only records what's already there into the manifest, and only after the user
// confirms, because after this baseline is written, `curate sync` treats content unchanged from
// this exact moment as "safe to auto-sync" and anything already-customized-but-not-yet-tracked
// permanently loses the distinction from a fresh template match.
export async function curateBaseline({ dir, agentDir: agentDirOpt, dryRun = false, yes = false }) {
  section(
    'curate baseline — record the CURRENT content of untracked sections as their manifest baseline. ' +
      'Never edits file content. Only for sections without an existing baseline.'
  );

  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  const files = listAgentFiles(agentDirPath);

  if (files.length === 0) {
    console.log(kleur.red(`No agent definitions found in ${agentDirPath}. Nothing to baseline.`));
    return { baselined: [] };
  }

  const manifest = readManifest(dir);
  const candidates = [];

  for (const file of files) {
    const relPath = path.join(agentDirOpt || '.claude/agents', file);
    const raw = readFileSafe(path.join(agentDirPath, file));
    if (raw == null) continue;

    const kind = detectKind(file);
    const { lines, sections } = parseSections(raw);
    const presentHeaders = new Set(sections.map((s) => s.header));

    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      if (SYNCABLE_SECTIONS[header](kind) == null) continue; // not part of this kind's template
      if (!presentHeaders.has(header)) continue; // nothing to baseline — section doesn't exist here
      if (getBaselineHash(manifest, relPath, header) != null) continue; // already tracked, leave it alone

      const existingSection = sections.find((s) => s.header === header);
      const body = sectionBody(lines, existingSection);
      candidates.push({ relPath, file, header, hash: hashSection(body) });
    }
  }

  if (candidates.length === 0) {
    console.log(kleur.green('Nothing to baseline — every existing section already has a manifest entry.'));
    return { baselined: [] };
  }

  console.log(kleur.yellow(`${candidates.length} untracked section(s) found. Their CURRENT content will become the baseline as-is:`));
  console.log(kleur.dim('(review these manually first if you have not already — this does not check whether they match the latest template)'));
  console.log('');
  for (const c of candidates) {
    console.log(`  ${kleur.dim('UNTRACKED')} ${c.relPath} — \`## ${c.header}\``);
  }
  console.log('');

  if (dryRun) {
    console.log(kleur.yellow(`would record ${candidates.length} baseline(s) (dry-run, nothing written)`));
    return { baselined: [] };
  }

  if (!yes) {
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Record these ${candidates.length} section(s) as their baseline now? This does not change any file content.`,
      initial: false,
    });
    if (!confirmed) {
      console.log(kleur.dim('cancelled — no baseline written'));
      return { baselined: [] };
    }
  }

  for (const c of candidates) {
    setSectionBaseline(manifest, c.relPath, c.header, c.hash);
  }
  writeManifest(dir, manifest);

  console.log(kleur.green(`baseline recorded for ${candidates.length} section(s) — future \`curate audit\`/\`curate sync\` runs will track drift from here on.`));
  return { baselined: candidates };
}
