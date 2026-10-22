import path from 'node:path';
import kleur from 'kleur';

import ask, { withAutoAnswers } from '../utils/ask.js';
import { recordWrites, section, withSilentConsole } from '../util.js';
import { detectProject } from '../utils/detect.js';
import { detectTrackerSignals } from '../utils/tracker-signals.js';
import { recommend } from '../utils/recommend.js';
import { pickTracker } from '../steps/03-detect-tracker.js';
import { runSetup } from './setup.js';
import { goldenExamples } from './golden-examples.js';
import { agents } from './agents.js';
import { TARGETS, CHAIN_ORDER, printSummary } from './scaffold.js';

// CAF-INIT-SMART-01 (D3): `caf-init scaffold` as detect -> (tracker picker when needed) -> one
// summary screen -> `Proceed? (Y/n/e)`. Everything that can be inferred is detected; the existing
// steps then run unattended (auto answers) with the choices shown in the summary. The old step by
// step chain stays as `runScaffold` (scaffold.js).

export const AGENT_KINDS = ['planner', 'frontend', 'backend', 'validator', 'reviewer'];

const ANSWER = { proceed: 'proceed', cancel: 'cancel', edit: 'edit' };

export function parseProceedAnswer(raw) {
  if (raw === undefined || raw === null) return ANSWER.cancel;
  const value = String(raw).trim().toLowerCase();
  if (value === '' || value === 'y' || value === 'yes') return ANSWER.proceed;
  if (value === 'n' || value === 'no') return ANSWER.cancel;
  if (value === 'e' || value === 'edit') return ANSWER.edit;
  return null;
}

/** Runs Setup and every chain step unattended with the choices of `sel`. Used for the real run and the preview. */
export async function runChain(ctx, sel) {
  const summary = [];
  const trackerResult = { tracker: sel.tracker.name, source: sel.tracker.source };
  const setup = await runSetup({ dir: ctx.dir, dryRun: ctx.dryRun, mode: ctx.mode, trackerResult });
  if (!setup.ok) return { ok: false, reason: setup.reason, summary };
  summary.push({ step: 'Setup', ran: true, written: setup.written.length, skipped: setup.skipped.length });

  for (const key of CHAIN_ORDER) {
    const { label, run } = TARGETS[key];
    console.log('');
    if (key === 'golden-examples' && sel.goldenApps.length === 0) {
      console.log(kleur.dim('golden-examples: no app selected — skipped'));
      summary.push({ step: label, ran: false });
      continue;
    }
    try {
      let result;
      if (key === 'golden-examples') {
        result = await goldenExamples({ dir: ctx.dir, app: sel.goldenApps, dryRun: ctx.dryRun, mode: ctx.mode });
      } else if (key === 'agents') {
        result = await agents({
          dir: ctx.dir,
          agentDir: ctx.agentDir,
          dryRun: ctx.dryRun,
          overwrite: ctx.overwrite,
          mode: ctx.mode,
          scope: ctx.scope,
          role: ctx.role,
          plan: { kinds: sel.kinds, roleApp: sel.roleApp },
        });
      } else {
        result = await run(ctx);
      }
      summary.push({ step: label, ran: true, written: result?.written?.length ?? 0, skipped: result?.skipped?.length ?? 0 });
    } catch (err) {
      summary.push({ step: label, ran: false, error: err.message });
      return { ok: false, reason: `step "${label}" failed`, summary };
    }
  }
  return { ok: true, summary };
}

/** Which files a run with `sel` would create or skip: the whole chain as a silent dry run. */
export async function previewRun(ctx, sel) {
  const stop = recordWrites();
  const exitCode = process.exitCode;
  let error = null;
  try {
    await withSilentConsole(() => withAutoAnswers(() => runChain({ ...ctx, dryRun: true }, sel)));
  } catch (err) {
    error = err;
  } finally {
    process.exitCode = exitCode;
  }
  const entries = stop();
  const rel = (p) => path.relative(ctx.dir, p) || p;
  return {
    create: entries.filter((e) => e.result === 'dry-run' && !e.overwrite).map((e) => rel(e.path)),
    unchanged: entries.filter((e) => e.result === 'skipped' && e.same).map((e) => rel(e.path)),
    conflicts: entries.filter((e) => e.result === 'skipped' && !e.same).map((e) => ({ path: e.path, rel: rel(e.path) })),
    error,
  };
}

export function agentLine(detected, sel) {
  const appName = (p) => (p === '.' ? 'repo root' : p);
  const parts = sel.kinds.map((kind) => {
    const paths = sel.roleApp[kind];
    return paths && paths.length > 0 && detected.mode !== 'SINGLE_REPO' ? `${kind} (${paths.map(appName).join(', ')})` : kind;
  });
  return parts.length > 0 ? parts.join(', ') : 'none';
}

export function renderSummary(detected, sel, preview) {
  const lines = [];
  const pm = detected.packageManager ? `, ${detected.packageManager}` : '';
  lines.push(kleur.bold('Summary'));
  lines.push(`  Repo:             ${detected.mode}${pm} — ${detected.apps.length} app${detected.apps.length === 1 ? '' : 's'}`);
  lines.push(`  Tracker:          ${sel.tracker.name}${sel.tracker.source ? kleur.dim(` (${sel.tracker.source})`) : ''}`);
  lines.push(`  Golden examples:  ${sel.goldenApps.length > 0 ? sel.goldenApps.join(', ') : 'none'}`);
  lines.push(`  Agents:           ${agentLine(detected, sel)}`);
  lines.push(`  Files:            ${preview.create.length} to create, ${preview.unchanged.length} already identical, ${preview.conflicts.length} exist and differ (skipped)`);
  for (const { rel } of preview.conflicts.slice(0, 8)) lines.push(kleur.dim(`                      skip  ${rel}`));
  if (preview.conflicts.length > 8) lines.push(kleur.dim(`                      … and ${preview.conflicts.length - 8} more`));
  if (preview.error) lines.push(kleur.yellow(`  (file preview incomplete: ${preview.error.message})`));
  lines.push(kleur.dim('  Opt-in commands with side effects (/caf-run, /caf-review, /caf-fix-review) are not generated; use `caf-init scaffold agents`.'));
  return lines.join('\n');
}

async function editSelection(detected, sel) {
  const { what = [] } = await ask({
    type: 'multiselect',
    name: 'what',
    message: 'What do you want to change?',
    instructions: false,
    choices: [
      { title: 'Tracker', value: 'tracker' },
      { title: 'Golden-example apps', value: 'apps' },
      { title: 'Agents', value: 'agents' },
    ],
  });
  if (what.includes('tracker')) {
    const name = await pickTracker();
    if (name) sel.tracker = { name, source: 'user prompt', status: 'edited' };
  }
  if (what.includes('apps')) {
    const { picked } = await ask({
      type: 'multiselect',
      name: 'picked',
      message: 'Apps to scan for golden examples (space to tick):',
      instructions: false,
      choices: detected.apps.map((a) => ({ title: `${a.name} (${a.path})`, value: a.path, selected: sel.goldenApps.includes(a.path) })),
    });
    if (picked) sel.goldenApps = picked;
  }
  if (what.includes('agents')) {
    const { picked } = await ask({
      type: 'multiselect',
      name: 'picked',
      message: 'Agents to generate:',
      instructions: false,
      choices: AGENT_KINDS.map((kind) => ({ title: kind, value: kind, selected: sel.kinds.includes(kind) })),
    });
    if (picked) sel.kinds = AGENT_KINDS.filter((k) => picked.includes(k));
  }
}

/**
 * Entry point of bare `scaffold`. Returns `{ ok, reason?, selection?, summary? }`; a refusal sets
 * `process.exitCode = 1` and writes nothing.
 */
export async function runSmartScaffold(opts) {
  const { dir, dryRun = false, agentDir, overwrite, mode, scope, role, interactive = true } = opts;
  const ctx = { dir, dryRun, agentDir, overwrite, mode, scope, role };

  section('scaffold — detecting the project');
  const detected = await detectProject({ dir, mode });
  const signals = await detectTrackerSignals({ dir, gitHost: detected.gitHost });
  const rec = recommend(detected, signals);

  const sel = {
    tracker: rec.tracker.status === 'single' ? { name: rec.tracker.name, source: rec.tracker.reasons.join('; '), status: 'single' } : null,
    goldenApps: rec.goldenApps,
    kinds: rec.agents.kinds,
    roleApp: rec.agents.roleApp,
  };

  if (!sel.tracker) {
    const why = rec.tracker.status === 'none' ? 'no tracker signal found' : `several trackers have a signal (${rec.tracker.candidates.join(', ')})`;
    console.log(kleur.yellow(`  ${why} — asking`));
    const name = await pickTracker();
    if (!name) {
      console.log(kleur.dim('no tracker selected — stopping'));
      return { ok: false, reason: 'no-tracker' };
    }
    sel.tracker = { name, source: 'user prompt', status: rec.tracker.status };
  }

  for (;;) {
    const preview = await previewRun(ctx, sel);
    console.log('');
    console.log(renderSummary(detected, sel, preview));
    console.log('');

    let verdict = null;
    while (verdict === null) {
      const { answer } = await ask({ type: 'text', name: 'answer', message: 'Proceed? (Y/n/e)', initial: 'Y' });
      verdict = parseProceedAnswer(answer);
    }
    if (verdict === ANSWER.cancel) {
      console.log(kleur.dim('cancelled — nothing written'));
      return { ok: false, reason: 'cancelled' };
    }
    if (verdict === ANSWER.edit) {
      await editSelection(detected, sel);
      continue;
    }
    break;
  }

  const result = await withAutoAnswers(() => runChain(ctx, sel));
  console.log('');
  if (result.ok) {
    printSummary(result.summary);
    console.log('');
    console.log(dryRun ? kleur.yellow('dry-run complete — nothing was written') : kleur.green('done — review generated drafts before using them with an AI agent'));
  } else {
    printSummary(result.summary);
    console.log(kleur.red(`chain stopped — ${result.reason}`));
  }
  return { ok: result.ok, selection: sel, summary: result.summary };
}
