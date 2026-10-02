import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, exists } from '../util.js';
import { writeIfAbsentGuarded, reportCollisions } from '../utils/collision-check.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { buildCompleteDraftsMd } from '../templates/complete-drafts-command.js';
import { KNOWLEDGE_INDEX_DOCS } from '../templates/knowledge-index-md.js';
import { curateBaseline } from './curate-baseline.js';

/**
 * Repo-relative draft files a `/caf-complete-drafts` run (and `curate --check-drafts`) cares
 * about, limited to the ones that exist right now. Shared by both so the command's inventory and
 * the checker's scan can never disagree about what counts as a draft.
 */
export async function listDraftFiles(dir, agentDir = '.claude/agents') {
  const fixed = [
    'CLAUDE.md',
    'AGENTS.md',
    '.caf/tasks/README.md',
    '.caf/workflows/task-completion.md',
    ...KNOWLEDGE_INDEX_DOCS.map((d) => d.path),
  ];
  const globbed = await fg(
    [
      `${agentDir.replace(/\/$/, '')}/*.md`,
      '.caf/knowledge/golden-examples/**/RULES.md',
      '.caf/knowledge/decisions/*.md',
      'docs/product/features/*.md',
    ],
    { cwd: dir, dot: true }
  );
  const present = fixed.filter((rel) => exists(path.join(dir, rel)));
  return [...new Set([...present, ...globbed.sort()])];
}

/**
 * Generate `.claude/commands/caf-complete-drafts.md` — the command a user runs in their AI
 * runner to fill in the TODOs caf-init left behind (CAF-COMPLETE-DRAFTS-01). caf-init never
 * calls a model itself.
 *
 * When agent definitions exist, also offers to record the manifest baseline now (via the
 * existing `curate baseline`, which never edits file content): freshly generated agents are
 * UNTRACKED, and without a baseline taken *before* the AI edits them, `curate --check-drafts`
 * has nothing to compare a tracked section against.
 */
export async function completeDrafts({
  dir,
  commandDir = '.claude/commands',
  agentDir = '.claude/agents',
  dryRun = false,
  mode,
}) {
  section('complete-drafts — generate the /caf-complete-drafts command (AI-assisted TODO completion)');

  const stack = await detectStack({ dir, explicitGlobs: undefined, mode });
  const drafts = await listDraftFiles(dir, agentDir);

  console.log('');
  if (drafts.length === 0) {
    console.log(kleur.yellow('  no draft found yet — run `caf-init scaffold` first; the command is still generated.'));
  } else {
    console.log(`  drafts found: ${drafts.length}`);
  }

  const filePath = path.join(dir, commandDir, 'caf-complete-drafts.md');
  const content = buildCompleteDraftsMd({
    mode: stack.mode,
    packageManager: stack.packageManager,
    apps: stack.apps,
    agentDir,
    drafts,
  });

  const collisions = [];
  const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
  const written = result === 'written' ? [filePath] : [];
  const skipped = result === 'skipped' ? [filePath] : [];

  const agentDirPath = path.join(dir, agentDir);
  const hasAgents = fs.existsSync(agentDirPath) && fs.readdirSync(agentDirPath).some((f) => f.endsWith('.md'));
  if (hasAgents) {
    console.log('');
    console.log(
      kleur.yellow(
        '⚠ Agent definitions exist. `curate --check-drafts` can only tell that an AI changed a tracked\n' +
          '  section (Allowed Tools, Input, Output, Retry Logic, ...) if their CURRENT content is recorded\n' +
          '  as the baseline BEFORE /caf-complete-drafts runs. This records hashes only — no file content\n' +
          '  is edited. Sections that already have a baseline are left alone.'
      )
    );
    let record = false;
    if (!dryRun) {
      const answer = await prompts({
        type: 'confirm',
        name: 'record',
        message: 'Record the baseline for untracked agent sections now?',
        initial: true,
      });
      record = Boolean(answer.record);
    }
    if (dryRun || record) {
      await curateBaseline({ dir, agentDir, dryRun, yes: true });
    } else {
      console.log(
        kleur.dim('  baseline not recorded — run `caf-init curate baseline` before /caf-complete-drafts to enable that check')
      );
    }
  }

  console.log('');
  if (result === 'written') {
    console.log(kleur.green(`generated ${filePath}`));
    console.log('  Next steps:');
    console.log('    1. open your AI runner (e.g. Claude Code) in this repo and run /caf-complete-drafts');
    console.log('    2. answer its questions — business context, PRD, ADR reasons and golden examples are yours to decide');
    console.log('    3. run `caf-init curate --check-drafts`, then review the diff before committing');
  } else if (result === 'skipped') {
    console.log(kleur.dim(`${filePath} already exists — not overwritten`));
  }

  reportCollisions(collisions);

  return { written, skipped };
}
