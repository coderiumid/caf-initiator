import path from 'node:path';
import kleur from 'kleur';

import ask, { withAutoAnswers } from '../utils/ask.js';
import { recordWrites, section, setOverwritePolicy, withSilentConsole } from '../util.js';
import { detectProject } from '../utils/detect.js';
import { detectTrackerSignals, trackerByKey, TRACKERS } from '../utils/tracker-signals.js';
import { recommend } from '../utils/recommend.js';
import { pickTracker } from '../steps/03-detect-tracker.js';
import { runSetup } from './setup.js';
import { goldenExamples, resolveAppSelectors } from './golden-examples.js';
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
    if (key === 'adr' && !sel.adr) {
      console.log(kleur.dim('adr: none selected — skipped'));
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
  lines.push(`  ADR drafts:       ${sel.adr ? 'decisions detected from the stack' : 'none (add with e or --adr)'}`);
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
      { title: 'ADR drafts', value: 'adr' },
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
  if (what.includes('adr')) {
    const { draft } = await ask({
      type: 'confirm',
      name: 'draft',
      message: 'Draft ADRs for the technical decisions detected from the stack?',
      initial: false,
    });
    sel.adr = Boolean(draft);
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
  const { dir, dryRun = false, agentDir, overwrite, mode, scope, role, interactive = true, yes = false } = opts;
  // D9: no TTY, or --yes, means no question is ever shown; every default is taken.
  const unattended = yes || !interactive;
  if (unattended) return withAutoAnswers(() => smartScaffold({ ...opts, unattended: true }));
  return smartScaffold({ ...opts, unattended: false });
}

/** Parses `--apps`/`--agents` style lists: `a,b` or repeated values, whitespace trimmed. */
export function splitList(value) {
  return [].concat(value ?? [])
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

function fail(message) {
  console.error(kleur.red(`scaffold: ${message}`));
  process.exitCode = 1;
  return { ok: false, reason: 'invalid' };
}

/** Applies --tracker/--apps/--agents on top of the recommendation; returns `{ error }` for an invalid value. */
function applyFlags(opts, detected, sel) {
  if (opts.tracker) {
    const tracker = trackerByKey(String(opts.tracker).toLowerCase());
    if (!tracker) return { error: `--tracker "${opts.tracker}" is not one of ${TRACKERS.map((t) => t.key).join('|')}` };
    sel.tracker = { name: tracker.name, source: '--tracker', status: 'flag' };
  }
  if (opts.apps !== undefined) {
    const values = splitList(opts.apps);
    if (values.length === 1 && values[0].toLowerCase() === 'none') {
      sel.goldenApps = [];
    } else {
      const resolved = resolveAppSelectors({ apps: detected.apps }, values);
      if (resolved.error) return { error: resolved.error.replace(/^--app /, '--apps ') };
      sel.goldenApps = resolved.apps.map((a) => a.path);
    }
  }
  if (opts.adr) sel.adr = true;
  if (opts.agents !== undefined) {
    const values = splitList(opts.agents);
    const unknown = values.filter((v) => !AGENT_KINDS.includes(v));
    if (unknown.length > 0 || values.length === 0) {
      return { error: `--agents ${unknown.join(',') || '(empty)'} is not valid (choices: ${AGENT_KINDS.join(', ')})` };
    }
    sel.kinds = AGENT_KINDS.filter((k) => values.includes(k));
  }
  return {};
}

// D8: files that exist and differ are skipped by default. One combined question when there are
// some; "one by one" asks per file with N as the default (overwriting is never the default).
async function resolveConflicts(conflicts) {
  if (conflicts.length === 0) return new Set();
  const { choice } = await ask({
    type: 'select',
    name: 'choice',
    message: `${conflicts.length} file(s) already exist and differ. What now?`,
    initial: 0,
    choices: [
      { title: 'Skip all (keep my files)', value: 'skip' },
      { title: 'Overwrite all', value: 'all' },
      { title: 'Choose one by one', value: 'each' },
    ],
  });
  if (choice === 'all') return new Set(conflicts.map((c) => c.path));
  if (choice !== 'each') return new Set();
  const chosen = new Set();
  for (const c of conflicts) {
    const { overwrite } = await ask({ type: 'confirm', name: 'overwrite', message: `Overwrite ${c.rel}?`, initial: false });
    if (overwrite) chosen.add(c.path);
  }
  return chosen;
}

async function smartScaffold(opts) {
  const { dir, dryRun = false, agentDir, overwrite, mode, scope, role, unattended } = opts;
  const ctx = { dir, dryRun, agentDir, overwrite, mode, scope, role };

  section('scaffold — detecting the project');
  const detected = await detectProject({ dir, mode });
  const signals = await detectTrackerSignals({ dir, gitHost: detected.gitHost });
  const rec = recommend(detected, signals);

  let sel = {
    tracker: rec.tracker.status === 'single' ? { name: rec.tracker.name, source: rec.tracker.reasons.join('; '), status: 'single' } : null,
    goldenApps: rec.goldenApps,
    adr: rec.adr,
    kinds: rec.agents.kinds,
    roleApp: rec.agents.roleApp,
  };

  const flagged = applyFlags(opts, detected, sel);
  if (flagged.error) return fail(flagged.error);

  if (!sel.tracker && unattended) {
    const why = rec.tracker.status === 'none' ? 'no tracker signal found' : `several trackers have a signal (${rec.tracker.candidates.join(', ')})`;
    return fail(`cannot choose a ticket tracker without asking: ${why}. Pass --tracker ${TRACKERS.map((t) => t.key).join('|')}.`);
  }

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

    if (unattended) {
      sel.preview = preview;
      break;
    }
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
    sel.preview = preview;
    break;
  }

  // Conflicts: only an attended run can overwrite, and only what the user picked.
  const toOverwrite = unattended || dryRun ? new Set() : await resolveConflicts(sel.preview.conflicts);
  setOverwritePolicy((filePath) => toOverwrite.has(filePath));
  let result;
  try {
    result = await withAutoAnswers(() => runChain(ctx, sel));
  } finally {
    setOverwritePolicy(null);
  }
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
