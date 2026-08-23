import path from 'node:path';
import fs from 'node:fs';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, writeIfAbsent } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { buildDecisionCandidates } from '../utils/decision-signatures.js';
import { buildAdr, adrFilename } from '../templates/adr.js';

const ADR_FILE_RE = /^adr-(\d+)-/;

function nextAdrNumber(decisionsDir) {
  if (!fs.existsSync(decisionsDir)) return 1;
  const files = fs.readdirSync(decisionsDir);
  let max = 0;
  for (const file of files) {
    const match = file.match(ADR_FILE_RE);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

const WHOLE_REPO = Symbol('whole-repo');

async function pickScope(stack, appOpt) {
  if (appOpt) {
    return stack.apps.find((a) => a.path === appOpt) || { name: appOpt, path: appOpt };
  }
  if (stack.apps.length <= 1) return WHOLE_REPO;

  const { scope } = await prompts({
    type: 'select',
    name: 'scope',
    message: 'Pick an app, or the whole repo for a root-level decision:',
    choices: [
      { title: 'Whole repo / root-level decision', value: WHOLE_REPO },
      ...stack.apps.map((a) => ({ title: `${a.name} (${a.path})`, value: a })),
    ],
  });
  return scope ?? null;
}

export async function adr({ dir, app: appOpt, dryRun = false }) {
  section('adr — draft Architecture Decision Records from detected stack');

  const stack = await detectStack({ dir, explicitGlobs: undefined });
  const scope = await pickScope(stack, appOpt);
  if (!scope) {
    console.log(kleur.dim('no scope selected — stopping'));
    return { written: [], skipped: [] };
  }

  const allCandidates = buildDecisionCandidates(stack);
  const candidates =
    scope === WHOLE_REPO
      ? allCandidates
      : allCandidates.filter((c) => c.scope === 'root' || c.scope === scope.path);

  const selected = [];

  if (candidates.length > 0) {
    const { picked } = await prompts({
      type: 'multiselect',
      name: 'picked',
      message: 'Pick the technical decisions to document as ADRs:',
      instructions: false,
      choices: candidates.map((c) => ({ title: c.label, value: c })),
    });
    if (picked && picked.length > 0) {
      selected.push(...picked.map((c) => ({ title: c.title, evidence: c.evidence })));
    }
  } else {
    console.log(kleur.dim('no decision candidates detected from the stack.'));
  }

  const { customInput } = await prompts({
    type: 'text',
    name: 'customInput',
    message: 'Any other decisions to add as blank ADRs? (comma-separated, leave empty if none)',
  });
  if (customInput) {
    const customTitles = customInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    for (const title of customTitles) {
      selected.push({ title, evidence: null });
    }
  }

  if (selected.length === 0) {
    console.log(kleur.dim('no decisions selected — done without generating ADRs'));
    return { written: [], skipped: [] };
  }

  const decisionsDir = path.join(dir, '.caf', 'knowledge', 'decisions');
  let number = nextAdrNumber(decisionsDir);

  console.log('');
  const written = [];
  const skipped = [];
  for (const { title, evidence } of selected) {
    const filename = adrFilename(number, title);
    const filePath = path.join(decisionsDir, filename);
    const content = buildAdr({ number, title, evidence });
    const result = writeIfAbsent(filePath, content, { dryRun });
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);
    number += 1;
  }

  console.log('');
  console.log(kleur.green(`generated ${written.length} ADR draft(s) in .caf/knowledge/decisions/`));
  for (const filePath of written) {
    console.log(`  - ${filePath}`);
  }

  return { written, skipped };
}
