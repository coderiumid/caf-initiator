import prompts from 'prompts';
import kleur from 'kleur';

import { runSetup } from './setup.js';
import { agentsPublish } from './export.js';
import { referenceDocs } from './reference-docs.js';
import { runScaffold, runScaffoldTarget } from './scaffold.js';

export async function interactiveMenu({ dir, dryRun, explicitGlobs, agentDir }) {
  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'What do you want to run?',
    choices: [
      { title: '* Initial setup (audit + detection + draft CLAUDE.md/AGENTS.md)', value: 'setup' },
      { title: '* Golden examples selector', value: 'golden-examples' },
      { title: '* Reference docs (optional: PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy)', value: 'reference-docs' },
      { title: '* ADR draft generator', value: 'adr' },
      { title: '* Agent definitions scaffolder', value: 'agents' },
      { title: '* Agent multi-target publish', value: 'export' },
      { title: '* Task completion (Definition of Done) generator', value: 'task-completion' },
      { title: '* Workflow docs generator (piv-workflow + agent-handoff)', value: 'workflow' },
      { title: '* Feature catalog sync command generator', value: 'feature-catalog-sync' },
      { title: '* Run all in sequence (Setup → Golden Examples → ADR → Agents → Task Completion → Workflow)', value: 'scaffold' },
      { title: '* Exit', value: 'exit' },
    ],
  });

  switch (choice) {
    case 'setup':
      await runSetup({ dir, dryRun, explicitGlobs });
      return;
    case 'reference-docs':
      await referenceDocs({ dir, dryRun, interactive: true });
      return;
    case 'export':
      await agentsPublish({ dir, agentDir });
      return;
    case 'golden-examples':
    case 'adr':
    case 'agents':
    case 'task-completion':
    case 'workflow':
    case 'feature-catalog-sync':
      await runScaffoldTarget(choice, { dir, dryRun, agentDir });
      return;
    case 'scaffold':
      await runScaffold({ dir, dryRun, explicitGlobs, agentDir });
      return;
    default:
      console.log(kleur.dim('exiting'));
      return;
  }
}
