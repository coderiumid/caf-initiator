import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';
import { exists, readFileSafe, section } from '../util.js';

/**
 * Step 3: detect ticket tracker. Never silently defaults — asks the user
 * when there's no clear signal.
 */
export async function detectTracker({ dir }) {
  section('Step 3 — Detect ticket tracker');

  if (exists(path.join(dir, '.linear'))) {
    console.log(kleur.green('  detected: Linear (.linear/ present)'));
    return { tracker: 'Linear', source: '.linear/' };
  }

  if (exists(path.join(dir, 'atlassian.yml'))) {
    console.log(kleur.green('  detected: Jira (atlassian.yml present)'));
    return { tracker: 'Jira', source: 'atlassian.yml' };
  }

  const readme = readFileSafe(path.join(dir, 'README.md')) || '';
  const lower = readme.toLowerCase();
  if (lower.includes('linear')) {
    console.log(kleur.green('  detected: Linear (mentioned in README.md)'));
    return { tracker: 'Linear', source: 'README.md' };
  }
  if (lower.includes('jira') || lower.includes('atlassian')) {
    console.log(kleur.green('  detected: Jira (mentioned in README.md)'));
    return { tracker: 'Jira', source: 'README.md' };
  }

  console.log(kleur.yellow('  no tracker signal found — asking'));
  const { tracker } = await prompts({
    type: 'select',
    name: 'tracker',
    message: 'Which ticket tracker does this project use?',
    choices: [
      { title: 'Linear', value: 'Linear' },
      { title: 'Jira', value: 'Jira' },
      { title: 'GitHub Issues', value: 'GitHub Issues' },
    ],
  });

  if (tracker === undefined) {
    console.log(kleur.dim('  cancelled by user'));
    return { tracker: null, source: null };
  }

  return { tracker, source: 'user prompt' };
}
