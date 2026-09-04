#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import kleur from 'kleur';

import { agentsPublish } from './commands/export.js';
import { curate } from './commands/curate.js';
import { curateBaseline, curateForceRebaseline } from './commands/curate-baseline.js';
import { referenceDocs } from './commands/reference-docs.js';
import { runScaffold, runScaffoldTarget, TARGETS } from './commands/scaffold.js';

const program = new Command();
// Without this, the root program's own --dir/--dry-run options greedily consume matching
// flags typed after a subcommand name (e.g. `caf-init scaffold adr --dir X`), so the subcommand's own
// --dir silently falls back to its default instead of the value the user passed.
program.enablePositionalOptions();

program
  .name('caf-init')
  .description('Automate the initial setup of the Coderium Agent Framework (CAF) in a repo');

// scaffold: `caf-init scaffold` runs the default Setup → Golden Examples → ADR → Agents →
// Task Completion → Workflow chain; `caf-init scaffold <target>` runs one target standalone
// with behavior identical to the old individual commands. Union of every underlying target's
// flags is declared here since a single positional-arg command can't have per-target option
// sets in commander.
program
  .command('scaffold')
  .description(
    `bare: run Setup → Golden Examples → ADR → Agents → Task Completion → Workflow in sequence, ` +
      `with a skip-confirmation before each step after Setup. With a target ` +
      `(${Object.keys(TARGETS).join('|')}): run only that part, behavior identical to the old ` +
      `standalone command.`
  )
  .argument('[target]', `optional: run only one part (${Object.keys(TARGETS).join('|')})`)
  .option('--dir <path>', 'target repo directory', process.cwd())
  .option('--dry-run', 'show detection results without writing anything', false)
  .option('--app <app-path>', 'restrict to a specific app path (e.g. apps/api) — only used by golden-examples/adr/agents/task-completion targets')
  .option('--agent-dir <path>', 'directory to read/write agent definitions', '.claude/agents')
  .option(
    '--command-dir <path>',
    'directory to write companion slash commands into — only used by agents/feature-catalog-sync targets',
    '.claude/commands'
  )
  .option(
    '--force',
    'overwrite files that already exist instead of skipping them (only used by the agents target) — ' +
      'opt-in escape hatch for writeIfAbsent\'s normal "never overwrite" guarantee, use with care',
    false
  )
  .action(async (target, cmdOpts) => {
    const dir = path.resolve(cmdOpts.dir);
    const dryRun = Boolean(cmdOpts.dryRun);
    const overwrite = Boolean(cmdOpts.force);
    if (!target) {
      await runScaffold({ dir, dryRun, explicitGlobs: undefined, agentDir: cmdOpts.agentDir, overwrite });
      return;
    }
    await runScaffoldTarget(target, {
      dir,
      dryRun,
      agentDir: cmdOpts.agentDir,
      app: cmdOpts.app,
      commandDir: cmdOpts.commandDir,
      overwrite,
    });
  });

// A nested `agents publish` command re-declaring `--dir` on both parent and child hits a
// commander parsing quirk where the child's own flag value gets shadowed by the parent's —
// so this is a separate top-level command instead of `agents.command('publish')`.
program
  .command('export')
  .description('copy already-generated agent definitions to other AI runner targets, with explicit enforcement-risk warnings')
  .option('--dir <path>', 'target repo directory', process.cwd())
  .option('--agent-dir <path>', 'source directory containing existing agent definitions', '.claude/agents')
  .option('--kind <agent|command|both>', 'what to publish', 'agent')
  .option('--dry-run', 'show what would be published without writing anything', false)
  .option(
    '--force',
    'overwrite files that already exist at the destination instead of skipping them — ' +
      'opt-in escape hatch for writeIfAbsent\'s normal "never overwrite" guarantee, use with care',
    false
  )
  .action(async (cmdOpts) => {
    const dir = path.resolve(cmdOpts.dir);
    await agentsPublish({
      dir,
      agentDir: cmdOpts.agentDir,
      kind: cmdOpts.kind,
      dryRun: Boolean(cmdOpts.dryRun),
      overwrite: Boolean(cmdOpts.force),
    });
  });

// Same nested-command flag-shadowing quirk as export above — separate top-level
// command instead of `agents.command('curate')`. `baseline` is an optional positional
// sub-action (same pattern as `scaffold [target]`) rather than a commander nested command,
// which would collide with this same top-level `curate` name (commander disallows two
// commands with the same name at the same level).
program
  .command('curate')
  .description(
    'audit report (read-only, Layer 1-4 compliance) then offer to sync missing sections into .claude/agents/*.md — bare runs both, --audit-only/--sync-only isolate one side for CI gates or direct use. `curate baseline` is a separate backfill flow for projects without manifest tracking yet.'
  )
  .argument('[subaction]', 'optional: "baseline" — backfill manifest for untracked sections without editing file content')
  .option('--dir <path>', 'target repo directory', process.cwd())
  .option('--agent-dir <path>', 'directory containing existing agent definitions', '.claude/agents')
  .option('--output <file>', 'also save the audit report as markdown to this path (relative to --dir unless absolute)')
  .option('--audit-only', 'report only, non-interactive — exit code 1 on required gaps (for CI gates)', false)
  .option('--sync-only', 'skip the audit report, go straight to the sync flow — non-interactive prompts still apply per section', false)
  .option('--dry-run', 'with --sync-only or baseline: show what would happen without writing anything or prompting', false)
  .option('--yes', 'with baseline: skip the confirmation prompt', false)
  .option(
    '--force',
    'with baseline: re-baseline one CONFLICT section to its current content instead of backfilling UNTRACKED sections — requires --file and --section, never writes file content',
    false
  )
  .option('--file <path>', 'with baseline --force: path (relative to --dir) of the agent file containing the section')
  .option('--section <header>', 'with baseline --force: the `## Heading` text of the section to re-baseline')
  .action(async (subaction, cmdOpts) => {
    const dir = path.resolve(cmdOpts.dir);

    if (subaction === 'baseline' && cmdOpts.force) {
      await curateForceRebaseline({
        dir,
        agentDir: cmdOpts.agentDir,
        file: cmdOpts.file,
        header: cmdOpts.section,
        dryRun: Boolean(cmdOpts.dryRun),
        yes: Boolean(cmdOpts.yes),
      });
      return;
    }

    if (subaction === 'baseline') {
      await curateBaseline({
        dir,
        agentDir: cmdOpts.agentDir,
        dryRun: Boolean(cmdOpts.dryRun),
        yes: Boolean(cmdOpts.yes),
      });
      return;
    }
    if (subaction) {
      console.error(`curate: unknown subaction "${subaction}" (only "baseline" is recognized)`);
      process.exitCode = 1;
      return;
    }

    if (cmdOpts.auditOnly && cmdOpts.syncOnly) {
      console.error('curate: --audit-only and --sync-only are mutually exclusive');
      process.exitCode = 1;
      return;
    }
    const mode = cmdOpts.auditOnly ? 'audit-only' : cmdOpts.syncOnly ? 'sync-only' : 'default';
    await curate({
      dir,
      agentDir: cmdOpts.agentDir,
      output: cmdOpts.output,
      mode,
      dryRun: Boolean(cmdOpts.dryRun),
    });
  });

program
  .command('docs')
  .description(
    'scaffold optional Layer 1 reference docs (PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy) — all read-only/optional, never required for the pipeline to run'
  )
  .option('--dir <path>', 'target repo directory', process.cwd())
  .option('--dry-run', 'show detection results without writing anything', false)
  .option(
    '--include <items...>',
    'non-interactive: only generate these items (product, architecture, schema, testing-strategy, api-contract)'
  )
  .option('--feature <name...>', 'non-interactive: Feature Spec names to generate placeholders for')
  .action(async (cmdOpts) => {
    const dir = path.resolve(cmdOpts.dir);
    const interactive = !cmdOpts.include && !cmdOpts.feature;
    await referenceDocs({
      dir,
      dryRun: Boolean(cmdOpts.dryRun),
      interactive,
      include: cmdOpts.include || [],
      features: cmdOpts.feature || [],
    });
  });

async function main() {
  program.help();
}

program.action(main);

program.parseAsync(process.argv).catch((err) => {
  console.error(kleur.red('caf-initiator failed:'), err);
  process.exit(1);
});
