import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, writeIfAbsent } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { matchVerifyScripts, readPackageName } from '../utils/package-scripts.js';
import { buildTaskCompletionMd } from '../templates/task-completion-md.js';

async function pickScope(stack, appOpt) {
  if (appOpt) {
    const app = stack.apps.find((a) => a.path === appOpt);
    if (!app) {
      console.log(kleur.red(`--app ${appOpt} not found in detected stack`));
      return null;
    }
    return { path: app.path, label: `${app.name} (${app.path})`, packageManager: app.packageManager || stack.packageManager };
  }

  if (!stack.isMonorepo) {
    return { path: '.', label: 'whole repo (root)', packageManager: stack.packageManager };
  }

  const { picked } = await prompts({
    type: 'select',
    name: 'picked',
    message: 'Pick the scope for task-completion.md:',
    choices: [
      ...stack.apps.map((a) => ({
        title: `${a.name} (${a.path})`,
        value: { path: a.path, label: `${a.name} (${a.path})`, packageManager: a.packageManager || stack.packageManager },
      })),
      { title: 'whole repo (root-level scripts)', value: { path: '.', label: 'whole repo (root)', packageManager: stack.packageManager } },
    ],
  });

  return picked || null;
}

export async function taskCompletion({ dir, app: appOpt, dryRun = false }) {
  section('task-completion — draft .caf/workflows/task-completion.md from detected package.json scripts');

  const stack = await detectStack({ dir, explicitGlobs: undefined });
  const scope = await pickScope(stack, appOpt);

  if (!scope) {
    console.log(kleur.dim('no scope selected — done without generating'));
    return { written: [], skipped: [] };
  }

  const scripts = matchVerifyScripts(dir, scope.path);
  // Only meaningful in a monorepo: at root scope the bare `<pm> run <script>` form is right.
  const packageName = stack.isMonorepo ? readPackageName(dir, scope.path) : null;
  const content = buildTaskCompletionMd({
    scripts,
    packageManager: scope.packageManager,
    packageName,
    scope: scope.label,
  });

  const filePath = path.join(dir, '.caf/workflows/task-completion.md');
  const written = [];
  const skipped = [];

  const result = writeIfAbsent(filePath, content, { dryRun });
  if (result === 'written') written.push(filePath);
  else if (result === 'skipped') skipped.push(filePath);

  console.log('');
  if (written.length === 0) {
    console.log(kleur.dim('no new file written — already exists'));
  } else {
    console.log(kleur.green(`generated task-completion.md at ${filePath}`));
  }

  return { written, skipped };
}
