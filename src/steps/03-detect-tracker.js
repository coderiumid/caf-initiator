import kleur from 'kleur';
import ask from '../utils/ask.js';
import { isAutoAnswers } from '../utils/ask.js';
import { section } from '../util.js';
import { detectProject } from '../utils/detect.js';
import { detectTrackerSignals, TRACKERS } from '../utils/tracker-signals.js';
import { recommendTracker } from '../utils/recommend.js';

/**
 * Picker without a preselected choice (D2): the tracker is never guessed. `initial` is left at the
 * first entry only because `prompts` needs one; the message says nothing is preselected.
 */
export async function pickTracker({ message = 'Which ticket tracker does this project use?' } = {}) {
  const { tracker } = await ask({
    type: 'select',
    name: 'tracker',
    message,
    initial: 0,
    choices: TRACKERS.map((t) => ({ title: t.name, value: t.name })),
  });
  return tracker ?? null;
}

/**
 * Step 3: detect ticket tracker. Never silently defaults — exactly one tracker with a signal is
 * used (and the reason shown); none or several asks, unless answers are automatic, in which case
 * nothing is chosen and the caller must stop (the message points at `--tracker`).
 *
 * `trackerOverride` is the display name from `--tracker`, `gitHost` comes from `detectProject`.
 * Returns `{ tracker, source, status, candidates }`; `tracker` is null when cancelled/ambiguous.
 */
export async function detectTracker({ dir, gitHost, trackerOverride = null } = {}) {
  section('Step 3 — Detect ticket tracker');

  if (trackerOverride) {
    console.log(kleur.green(`  tracker: ${trackerOverride} (--tracker)`));
    return { tracker: trackerOverride, source: '--tracker', status: 'flag', candidates: [trackerOverride] };
  }

  const host = gitHost === undefined ? (await detectProject({ dir })).gitHost : gitHost;
  const verdict = recommendTracker(await detectTrackerSignals({ dir, gitHost: host }));

  if (verdict.status === 'single') {
    const source = verdict.reasons.join('; ');
    console.log(kleur.green(`  detected: ${verdict.name} (${source})`));
    return { tracker: verdict.name, source, status: 'single', candidates: verdict.candidates };
  }

  const why = verdict.status === 'none' ? 'no tracker signal found' : `several trackers have a signal (${verdict.candidates.join(', ')})`;
  if (isAutoAnswers()) {
    console.log(kleur.yellow(`  ${why} — not guessing`));
    return { tracker: null, source: null, status: verdict.status, candidates: verdict.candidates };
  }

  console.log(kleur.yellow(`  ${why} — asking`));
  const tracker = await pickTracker();
  if (tracker === null) {
    console.log(kleur.dim('  cancelled by user'));
    return { tracker: null, source: null, status: verdict.status, candidates: verdict.candidates };
  }
  return { tracker, source: 'user prompt', status: verdict.status, candidates: verdict.candidates };
}
