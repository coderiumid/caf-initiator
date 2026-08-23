import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, writeIfAbsent, readFileSafe } from '../util.js';
import { RUNNER_TARGETS, CLAUDE_CODE_STATUS_ROW, ANTIGRAVITY_STATUS_ROW } from '../utils/runner-targets.js';
import { toolsArrayToMap } from '../utils/opencode-agent-transform.js';
import { stripCommandFrontmatter, rewriteAgentPaths, addReviewNotice } from '../utils/opencode-command-transform.js';

// Per-kind source/target/transform config. Only 'opencode' has a verified target dir for
// kind='command' — .opencode/commands/ (plural) was confirmed against umkm-pos's hand-written
// ground truth. cline/cursor/kiro command paths/schemas are unverified, so they're excluded
// from the command publish menu entirely (TODO once verified against a real example).
const KIND_CONFIG = {
  agent: {
    defaultSourceDir: '.claude/agents',
    targetDirFor: (target) => target.dir,
    transform: (target, raw) => (target.id === 'opencode' ? toolsArrayToMap(raw) : raw),
  },
  command: {
    defaultSourceDir: '.claude/commands',
    targetDirFor: (target) => (target.id === 'opencode' ? '.opencode/commands' : null),
    transform: (target, raw) =>
      target.id === 'opencode' ? addReviewNotice(rewriteAgentPaths(stripCommandFrontmatter(raw))) : raw,
  },
};

function statusColor(status, text) {
  if (status === 'validated') return kleur.green(text);
  if (status === 'unvalidated') return kleur.yellow(text);
  return kleur.red(text); // buggy, none
}

function printEnforcementTable() {
  console.log('');
  console.log(kleur.bold('Status enforcement scope/tools per AI runner:'));
  console.log(`  ${kleur.bold(CLAUDE_CODE_STATUS_ROW.label.padEnd(20))} ${statusColor(CLAUDE_CODE_STATUS_ROW.status, CLAUDE_CODE_STATUS_ROW.statusLabel)}`);
  for (const target of RUNNER_TARGETS) {
    console.log(`  ${kleur.bold(target.label.padEnd(20))} ${statusColor(target.status, target.statusLabel)}`);
    console.log(`  ${' '.repeat(20)} ${kleur.dim(target.note)}`);
  }
  console.log(`  ${kleur.bold(ANTIGRAVITY_STATUS_ROW.label.padEnd(20))} ${statusColor(ANTIGRAVITY_STATUS_ROW.status, ANTIGRAVITY_STATUS_ROW.statusLabel)}`);
  console.log(kleur.dim('  (Antigravity is not offered as a publish target — see status above)'));
  console.log('');
}

function listMdFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();
}

async function pickTargets(kind, config) {
  // For kind='command', only offer runners with a verified target dir (see KIND_CONFIG) —
  // don't let the user pick a target whose path/schema we haven't checked against a real example.
  const eligible = RUNNER_TARGETS.filter((t) => config.targetDirFor(t) != null);
  const { picked } = await prompts({
    type: 'multiselect',
    name: 'picked',
    message: `Also publish a copy of ${kind === 'command' ? 'these command definitions' : 'these agent definitions'} to other tools?`,
    instructions: false,
    choices: [
      ...eligible.map((t) => ({ title: `${t.label} (${config.targetDirFor(t)}/) ${t.statusLabel}`, value: t })),
      { title: 'Custom folder...', value: { id: 'custom' } },
    ],
  });
  return picked || [];
}

async function resolveCustomTargets(picked) {
  const resolved = [];
  for (const target of picked) {
    if (target.id === 'custom') {
      const { customPath } = await prompts({
        type: 'text',
        name: 'customPath',
        message: 'Custom destination folder path (relative to --dir):',
      });
      if (!customPath) continue;
      resolved.push({
        id: 'custom',
        label: `Custom (${customPath})`,
        dir: customPath,
        status: 'unvalidated',
      });
    } else {
      resolved.push(target);
    }
  }
  return resolved;
}

async function confirmRisk(targets) {
  const names = targets.map((t) => t.label).join(', ');
  console.log('');
  console.log(
    kleur.red(
      `⚠ WARNING: The target(s) you selected (${names}) are unvalidated or known to have\n` +
        '  enforcement issues. The "Scope"/"Allowed Tools" fields in this file may NOT be\n' +
        '  TECHNICALLY ENFORCED by that tool — the agent could ignore these boundaries\n' +
        '  if the tool\'s enforcement is weak or absent.\n' +
        '\n' +
        '  This is especially risky for implementation agents with WRITE access to code.'
    )
  );
  const { confirmed } = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: 'I understand the risk and still want to publish to the target(s) above:',
    initial: false,
  });
  return Boolean(confirmed);
}

async function publishOneKind(kind, { dir, sourceDirOpt, dryRun }) {
  const config = KIND_CONFIG[kind];
  const label = kind === 'command' ? 'command definition' : 'agent definition';

  const sourceDir = path.join(dir, sourceDirOpt || config.defaultSourceDir);
  const files = listMdFiles(sourceDir);

  if (files.length === 0) {
    console.log(kleur.red(`No ${label} found in ${sourceDir}. Run \`caf-init scaffold agents\` first.`));
    return;
  }

  console.log(kleur.dim(`source: ${sourceDir} (${files.length} file(s))`));

  const pickedRaw = await pickTargets(kind, config);
  if (pickedRaw.length === 0) {
    console.log(kleur.dim('no target selected — done without publishing'));
    return;
  }

  const targets = await resolveCustomTargets(pickedRaw);
  if (targets.length === 0) {
    console.log(kleur.dim('no valid target selected — done without publishing'));
    return;
  }

  const confirmed = await confirmRisk(targets);
  if (!confirmed) {
    console.log('');
    console.log(kleur.yellow('publish cancelled — risk not confirmed, no files copied.'));
    return;
  }

  console.log('');
  const summary = [];
  for (const target of targets) {
    const targetDirRel = target.id === 'custom' ? target.dir : config.targetDirFor(target);
    const targetDir = path.join(dir, targetDirRel);
    let written = 0;
    let skipped = 0;
    for (const file of files) {
      const raw = readFileSafe(path.join(sourceDir, file));
      if (raw == null) continue;
      const content = config.transform(target, raw);
      const result = writeIfAbsent(path.join(targetDir, file), content, { dryRun });
      if (result === 'written') written += 1;
      else if (result === 'skipped') skipped += 1;
    }
    summary.push({ target, written, skipped, targetDirRel });
  }

  console.log('');
  console.log(kleur.green(`publish summary (${label}):`));
  for (const { target, written, skipped, targetDirRel } of summary) {
    console.log(`  - ${target.label}: ${written} written, ${skipped} skipped (already exist) → ${path.join(dir, targetDirRel)}`);
  }
}

export async function agentsPublish({ dir, agentDir: agentDirOpt, kind = 'agent', dryRun = false }) {
  section('agents publish — copy generated agent/command definitions to other AI runner targets');

  printEnforcementTable();

  const kindsToRun = kind === 'both' ? ['agent', 'command'] : [kind];
  for (const oneKind of kindsToRun) {
    console.log('');
    console.log(kleur.bold(`— ${oneKind} —`));
    // --agent-dir only overrides the agent source dir (existing flag); command source dir is
    // always the default '.claude/commands' for now.
    const sourceDirOpt = oneKind === 'agent' ? agentDirOpt : undefined;
    await publishOneKind(oneKind, { dir, sourceDirOpt, dryRun });
  }
}
