import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, readFileSafe } from '../util.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody } from '../utils/agent-sections.js';
import { hashSection, compareSection, SECTION_STATUS } from '../utils/section-diff.js';
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

// `curate baseline --force` — explicit, scoped re-baseline for a single section that is
// CONFLICT (both the file content and the template changed since its old baseline, so
// `curate sync` refuses to touch it — see agents-sync.js NEVER_SYNCED). This is the escape
// hatch: a human has decided the CONFLICT is spurious (e.g. CAF-SECTIONPARSE-01 — the old
// baseline hash was recorded from a buggy parser's truncated read, not from real content) and
// wants the section's CURRENT content accepted as the new baseline. Same non-negotiable as
// curateBaseline() above: this NEVER edits file content, only the manifest, and only after
// explicit confirmation. Deliberately scoped to one file+header per call — no "force every
// CONFLICT" bulk mode, so the user sees exactly which section they're accepting (requirements.md
// AC + Task 1).
export async function curateForceRebaseline({ dir, agentDir: agentDirOpt, file, header, dryRun = false, yes = false }) {
  section(
    `curate baseline --force — re-baseline "## ${header}" in ${file} to its CURRENT content. ` +
      'Never edits file content. Only for sections currently in CONFLICT.'
  );

  if (!file || !header) {
    console.log(kleur.red('curate baseline --force requires both --file <path> and --section <header>.'));
    return { rebaselined: false };
  }

  const agentDirRel = agentDirOpt || '.claude/agents';
  const relPath = path.isAbsolute(file) ? path.relative(dir, file) : file;
  const filePath = path.join(dir, relPath);
  const raw = readFileSafe(filePath);

  if (raw == null) {
    console.log(kleur.red(`could not read ${filePath} — nothing to re-baseline.`));
    return { rebaselined: false };
  }

  const fileName = path.basename(relPath);
  const kind = detectKind(fileName);
  const { lines, sections } = parseSections(raw);
  const existingSection = sections.find((s) => s.header === header);

  if (!existingSection) {
    console.log(kleur.red(`"## ${header}" not found in ${relPath} — nothing to re-baseline.`));
    return { rebaselined: false };
  }

  const proposed = SYNCABLE_SECTIONS[header] ? SYNCABLE_SECTIONS[header](kind) : null;
  if (proposed == null) {
    console.log(kleur.red(`"## ${header}" is not a tracked/syncable section for kind "${kind}" — nothing to re-baseline.`));
    return { rebaselined: false };
  }

  const body = sectionBody(lines, existingSection);
  const currentHash = hashSection(body);
  const templateHash = hashSection(proposed);
  const manifest = readManifest(dir);
  const baselineHash = getBaselineHash(manifest, relPath, header);

  const status = compareSection({ baselineHash, currentHash, templateHash });
  if (status !== SECTION_STATUS.CONFLICT) {
    console.log(
      kleur.red(
        `"## ${header}" in ${relPath} is ${status}, not CONFLICT — --force only applies to CONFLICT sections. ` +
          (status === SECTION_STATUS.DRIFT
            ? 'Use `caf-init curate --sync-only` instead.'
            : status === SECTION_STATUS.UNTRACKED
              ? 'Use `caf-init curate baseline` (no --force) instead.'
              : status === SECTION_STATUS.CUSTOMIZATION
                ? 'Already tracked as your customization — nothing to do.'
                : 'Already IN_SYNC — nothing to do.')
      )
    );
    return { rebaselined: false };
  }

  // Re-baselining sets baseline := current, so current always matches the new baseline —
  // by compareSection's own definition (see section-diff.js) that rules out CUSTOMIZATION,
  // which requires current !== baseline. The only two reachable outcomes are IN_SYNC (current
  // now also matches the template) or DRIFT (current matches the new baseline but not the
  // template — same as any other section whose template changed since it was last recorded).
  const nextStatus = currentHash === templateHash ? SECTION_STATUS.IN_SYNC : SECTION_STATUS.DRIFT;

  console.log(kleur.yellow(`"## ${header}" in ${relPath} is currently CONFLICT. Its CURRENT content will become the new baseline:`));
  console.log(kleur.dim('---'));
  console.log(body.trim());
  console.log(kleur.dim('---'));
  console.log(kleur.dim(`after re-baseline, this section will report as ${nextStatus} on the next \`curate audit\`.`));
  console.log('');

  if (dryRun) {
    console.log(kleur.yellow('would re-baseline this section (dry-run, nothing written)'));
    return { rebaselined: false };
  }

  if (!yes) {
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Accept the CURRENT content of "## ${header}" in ${relPath} as its new baseline? This does not change any file content.`,
      initial: false,
    });
    if (!confirmed) {
      console.log(kleur.dim('cancelled — no baseline written'));
      return { rebaselined: false };
    }
  }

  setSectionBaseline(manifest, relPath, header, currentHash);
  writeManifest(dir, manifest);

  console.log(kleur.green(`baseline re-recorded for "## ${header}" in ${relPath} — will report as ${nextStatus} from now on.`));
  return { rebaselined: true, relPath, header, nextStatus };
}
