import path from 'node:path';
import kleur from 'kleur';

import { section, exists, readFileSafe } from '../util.js';
import { writeIfAbsentGuarded, reportCollisions, detectSkillDirCollision } from '../utils/collision-check.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { matchVerifyScripts, readPackageName } from '../utils/package-scripts.js';
import { SKILLS_DIR, buildSkillFiles, hasSkillDraftBanner } from '../templates/skill-md.js';

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
 * `caf-init scaffold skills` (CAF-SKILLS-01) — write the universal CAF skills into
 * `.claude/skills/<name>/SKILL.md`. Explicit-only: not part of the bare `scaffold` chain.
 *
 * Never overwrites an existing SKILL.md unless `overwrite` (`--force`) is passed.
 */
export async function skillsTarget({ dir, dryRun = false, overwrite = false, mode }) {
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
          '  TODO lines, remove the banner, then re-run `caf-init scaffold skills`.'
      )
    );
  }

  console.log('');
  const count = dryRun ? `would write ${wouldWrite.length}` : `wrote ${written.length}`;
  console.log(kleur.green(`${count} skill(s) in ${path.join(dir, SKILLS_DIR)}, ${skipped.length} skipped (already exist)`));

  reportCollisions(legacyCollisions);
  reportSkillDirCollisions(dirCollisions);

  return { written, skipped, drafts, collisions: dirCollisions };
}
