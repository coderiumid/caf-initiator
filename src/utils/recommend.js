import { TRACKERS } from './tracker-signals.js';

// CAF-INIT-SMART-01 D7: the single pure function behind the golden-example app picker, the
// summary screen and `--yes`. Input is what `detectProject` and `detectTrackerSignals` returned;
// nothing here reads the file system, asks, or prints.

const FRONTEND_FRAMEWORKS = ['Next.js', 'Nuxt', 'Angular', 'Svelte', 'React', 'Vue'];
const BACKEND_FRAMEWORKS = ['NestJS', 'Fastify', 'Koa', 'Express'];

/** Tracker verdict: exactly one tracker with a signal is `single`; none or several is never guessed. */
export function recommendTracker(signals = {}) {
  const withSignal = TRACKERS.filter((t) => (signals[t.key] || []).length > 0);
  if (withSignal.length === 1) {
    const [only] = withSignal;
    return { status: 'single', key: only.key, name: only.name, reasons: signals[only.key], candidates: [only.name] };
  }
  return {
    status: withSignal.length === 0 ? 'none' : 'ambiguous',
    key: null,
    name: null,
    reasons: [],
    candidates: withSignal.map((t) => t.name),
  };
}

/**
 * D4: an app is a golden-example candidate when it is run/deployed (a dev/start/serve/preview
 * script), its stack is recognized and it has real source files. A shared `packages/*` library or a
 * config-only package has no runnable script or no code, so it falls out; a root app of a single
 * repo follows the same rule.
 */
export function isGoldenExampleApp(app) {
  return Boolean(app.framework) && Boolean(app.scripts?.runnable) && app.hasCode === true;
}

export function recommendGoldenApps(detected) {
  return detected.apps.filter(isGoldenExampleApp).map((a) => a.path);
}

export function roleOfApp(app) {
  if (FRONTEND_FRAMEWORKS.includes(app.framework)) return 'frontend';
  if (BACKEND_FRAMEWORKS.includes(app.framework)) return 'backend';
  return null;
}

/**
 * Agent set (D5). SINGLE_REPO: frontend and backend both cover the whole repo. MONOREPO: an app
 * goes to the role its framework implies; an app with no known role gets no agent (the picker's
 * "extra apps" are not routed by caf-orchestrator). Hidden/superseded kinds are never recommended.
 */
export function recommendAgents(detected) {
  const roleApp = { frontend: [], backend: [] };
  if (detected.mode === 'SINGLE_REPO') {
    roleApp.frontend = detected.apps.map((a) => a.path);
    roleApp.backend = detected.apps.map((a) => a.path);
  } else {
    for (const app of detected.apps) {
      const role = roleOfApp(app);
      if (role) roleApp[role].push(app.path);
    }
  }
  const kinds = ['planner'];
  if (roleApp.frontend.length > 0) kinds.push('frontend');
  if (roleApp.backend.length > 0) kinds.push('backend');
  kinds.push('validator', 'reviewer');
  return { kinds, roleApp };
}

// ADR drafts are a human decision about which decisions matter: the recommendation is none. They are
// made only when chosen in the `e` editor or with --adr.
export function recommendAdr() {
  return false;
}

export function recommend(detected, signals = {}) {
  return {
    adr: recommendAdr(),
    tracker: recommendTracker(signals),
    goldenApps: recommendGoldenApps(detected),
    agents: recommendAgents(detected),
  };
}
