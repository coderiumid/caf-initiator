import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, exists, readFileSafe, writeIfAbsent } from '../util.js';
import { writeIfAbsentGuarded, reportCollisions, detectSkillDirCollision } from '../utils/collision-check.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { matchVerifyScripts, readPackageName } from '../utils/package-scripts.js';
import { SKILLS_DIR, SKILL_NAMES, buildSkillFiles, hasSkillDraftBanner, skillsForKind, skillPath } from '../templates/skill-md.js';
import { buildSkillsBody } from '../templates/agent-md.js';
import { KNOWN_KINDS, detectKind, parseSections, sectionBody, insertSection } from '../utils/agent-sections.js';
import { assertNoUnresolvedPlaceholders } from '../utils/placeholder-check.js';

/**
 * One entry per detected app, in the shape buildVerifyChecklist() takes — the same derivation
 * `scaffold agents` uses for an agent's `## Verify Checklist` (commands/agents.js), so the
 * caf-verify skill and the agent definitions name the same commands.
 */
export function collectVerifyApps(dir, stack) {
  return stack.apps.map((app) => ({
    scripts: matchVerifyScripts(dir, app.path),
    packageManager: app.packageManager || stack.packageManager,
    // Only meaningful in a monorepo: at root scope the bare `<pm> run <script>` form is right.
    packageName: stack.isMonorepo ? readPackageName(dir, app.path) : null,
    appPath: app.path,
  }));
}

/**
 * Repo-relative SKILL.md paths an agent of `kind` should point at right now: the kind's skills
 * (SKILLS_BY_KIND) that exist on disk and carry no DRAFT banner. Empty when the repo has no
 * skills — `scaffold agents` then renders exactly what it rendered before skills existed.
 */
export function usableSkillPaths(dir, kind) {
  return skillsForKind(kind)
    .map(skillPath)
    .filter((rel) => {
      const content = readFileSafe(path.join(dir, rel));
      return content != null && !hasSkillDraftBanner(content);
    });
}

function reportSkillDirCollisions(collisions) {
  if (collisions.length === 0) return;
  console.log('');
  console.log(kleur.red(`✗ ${collisions.length} skill name collision(s) — a skill folder with the same name minus/plus \`caf-\` already exists:`));
  for (const { existingPath, targetPath } of collisions) {
    console.log(kleur.red(`  - ${existingPath}`));
    console.log(kleur.dim(`    intended target: ${targetPath} (NOT written, no agent will point at it)`));
  }
  console.log('');
  console.log(
    kleur.yellow(
      'Two skills that differ only by the `caf-` prefix would both be offered to a manual session.\n' +
        '  Rename or remove the existing folder if the caf- skill should replace it, then re-run\n' +
        '  `caf-init scaffold skills`. caf-init does not merge or migrate skills.'
    )
  );
  process.exitCode = 1;
}

/**
 * True only when `next` is exactly `raw` with one contiguous block inserted, and that block is
 * nothing but the `## Skills` section (`core`) plus surrounding blank lines. This is the proof
 * that adding a pointer section did not touch a single existing byte — the one place caf-init
 * rewrites a file that already exists, so it is checked before every write rather than assumed.
 */
export function isPureInsertion(raw, next, core) {
  const added = next.length - raw.length;
  if (added <= 0) return false;
  let at = 0;
  while (at < raw.length && raw[at] === next[at]) at += 1;
  if (next.slice(0, at) + next.slice(at + added) !== raw) return false;
  return next.slice(at, at + added).trim() === core;
}

function isRecognizedKind(file) {
  const stem = path.basename(file, '.md');
  return KNOWN_KINDS.includes(stem.startsWith('caf-') ? stem.slice('caf-'.length) : stem);
}

/**
 * Offer a `## Skills` pointer section to agent definitions that already exist — `scaffold
 * agents` writes through writeIfAbsent, so an agent generated earlier would otherwise never get
 * one. Same preview + per-file confirmation as `curate sync` uses for a missing section.
 *
 * Only skills whose file exists and carries no DRAFT banner are pointed at. An agent that
 * already has a `## Skills` section is never edited, whatever it contains. `--force` does not
 * reach this step.
 */
async function addSkillPointers({ dir, agentDir, dryRun, onDisk }) {
  const result = { added: [], wouldAdd: [], declined: [], untouched: [], refused: [] };
  const usable = SKILL_NAMES.filter((name) => onDisk.has(name) && !hasSkillDraftBanner(onDisk.get(name)));

  const agentDirPath = path.join(dir, agentDir);
  const files = fs.existsSync(agentDirPath)
    ? fs.readdirSync(agentDirPath).filter((f) => f.endsWith('.md')).sort()
    : [];

  console.log('');
  section('skills — point existing agent definitions at the skills');
  if (files.length === 0) {
    console.log(
      kleur.dim(`  no agent definitions in ${agentDirPath} yet — \`caf-init scaffold agents\` adds the pointers when it generates them`)
    );
    return result;
  }

  for (const file of files) {
    const filePath = path.join(agentDirPath, file);
    const wanted = skillsForKind(detectKind(file)).filter((name) => usable.includes(name));
    if (wanted.length === 0) continue;

    const raw = readFileSafe(filePath);
    if (raw == null) continue;
    const { lines, sections } = parseSections(raw);
    const paths = wanted.map(skillPath);

    const existing = sections.find((s) => s.header === 'Skills');
    if (existing) {
      const current = sectionBody(lines, existing);
      const missing = paths.filter((p) => !current.includes(p));
      result.untouched.push(filePath);
      console.log(kleur.dim(`  skip  ${file} (already has "## Skills" — left untouched)`));
      if (missing.length > 0) {
        console.log(kleur.yellow(`        not listed there: ${missing.join(', ')} — add the pointer yourself if you want it`));
      }
      continue;
    }

    const body = buildSkillsBody(paths);
    assertNoUnresolvedPlaceholders(body, filePath);
    const next = insertSection(lines, sections, 'Skills', body);
    if (!isPureInsertion(raw, next, `## Skills\n${body}`)) {
      result.refused.push(filePath);
      console.log(
        kleur.yellow(`  skip  ${file} — the section cannot be inserted without changing other bytes (e.g. CRLF line endings); add it manually`)
      );
      continue;
    }

    const recognized = isRecognizedKind(file);
    console.log('');
    console.log(kleur.yellow(`${file}: no "## Skills" section. Preview:`));
    console.log(kleur.dim('---'));
    console.log(`## Skills\n${body}`);
    console.log(kleur.dim('---'));
    if (!recognized) {
      console.log(kleur.yellow(`  ${file} is not a kind caf-init recognizes — treated as an implementation agent; default answer is No`));
    }

    if (dryRun) {
      console.log(kleur.yellow(`  would add "## Skills" to ${file} (dry-run, nothing written)`));
      result.wouldAdd.push(filePath);
      continue;
    }

    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: `Add section "## Skills" to ${file}?`,
      initial: recognized,
    });
    if (!confirmed) {
      result.declined.push(filePath);
      console.log(kleur.dim(`  skip  ${file}: section "## Skills" declined`));
      continue;
    }
    if (readFileSafe(filePath) !== raw) {
      result.refused.push(filePath);
      console.log(kleur.yellow(`  skip  ${file} — the file changed while waiting for the answer; re-run to try again`));
      continue;
    }

    // The single sanctioned rewrite of an existing file: `next` is proven above to be `raw` plus
    // exactly one block. Placeholders were checked on that block only — the rest is the user's.
    writeIfAbsent(filePath, next, { overwrite: true, validatePlaceholders: false });
    result.added.push(filePath);
  }

  return result;
}

/**
 * `caf-init scaffold skills` (CAF-SKILLS-01) — write the universal CAF skills into
 * `.claude/skills/<name>/SKILL.md`. Explicit-only: not part of the bare `scaffold` chain.
 *
 * Never overwrites an existing SKILL.md unless `overwrite` (`--force`) is passed. Then offers the
 * pointers to agent definitions that already exist (see addSkillPointers).
 */
export async function skillsTarget({ dir, agentDir = '.claude/agents', dryRun = false, overwrite = false, mode }) {
  section('skills — write the universal CAF skills into .claude/skills/');

  const stack = await detectStack({ dir, explicitGlobs: undefined, mode });
  const files = buildSkillFiles({ mode: stack.mode, verifyApps: collectVerifyApps(dir, stack) });

  console.log('');
  const written = [];
  const skipped = [];
  const wouldWrite = [];
  const legacyCollisions = [];
  const dirCollisions = [];
  // name → content that is (or, on a dry run, would be) on disk after this step; absent when
  // the skill does not exist and was not written.
  const onDisk = new Map();

  for (const file of files) {
    const filePath = path.join(dir, file.relPath);
    const existingPath = detectSkillDirCollision(path.join(dir, SKILLS_DIR), file.name);
    if (existingPath) {
      dirCollisions.push({ existingPath, targetPath: filePath });
      continue;
    }
    const result = writeIfAbsentGuarded(filePath, file.content, { dryRun, overwrite }, legacyCollisions);
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);
    else if (result === 'dry-run') wouldWrite.push(filePath);

    if (result === 'written' || result === 'dry-run') onDisk.set(file.name, file.content);
    else if (exists(filePath)) onDisk.set(file.name, readFileSafe(filePath) ?? '');
  }

  const drafts = [...onDisk].filter(([, content]) => hasSkillDraftBanner(content)).map(([name]) => name);
  if (drafts.length > 0) {
    console.log('');
    console.log(
      kleur.yellow(
        `⚠ ${drafts.join(', ')}: DRAFT — a verification script was not detected, so the skill has open \`TODO\`\n` +
          '  lines. Agents are told to skip a DRAFT skill, and no agent is pointed at it. Resolve the\n' +
          '  TODO lines and remove the banner; an agent that has no `## Skills` section yet gets the\n' +
          '  pointer on the next `caf-init scaffold skills`, one that already has it is never edited —\n' +
          '  add the pointer there yourself.'
      )
    );
  }

  console.log('');
  const count = dryRun ? `would write ${wouldWrite.length}` : `wrote ${written.length}`;
  console.log(kleur.green(`${count} skill(s) in ${path.join(dir, SKILLS_DIR)}, ${skipped.length} skipped (already exist)`));

  reportCollisions(legacyCollisions);
  reportSkillDirCollisions(dirCollisions);

  const pointers = await addSkillPointers({ dir, agentDir: agentDir || '.claude/agents', dryRun, onDisk });

  return { written, skipped, drafts, collisions: dirCollisions, pointers };
}
