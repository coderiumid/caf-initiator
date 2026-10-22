// CAF-INIT-SMART-01 AC2 + AC5 — tracker signals, recommend(), golden-example app eligibility.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { detectTrackerSignals } from '../src/utils/tracker-signals.js';
import { recommend, recommendTracker, recommendAgents, isGoldenExampleApp } from '../src/utils/recommend.js';
import { detectTracker } from '../src/steps/03-detect-tracker.js';
import { withAutoAnswers } from '../src/utils/ask.js';
import { detectProject } from '../src/utils/detect.js';
import { makeRepo } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';

const verdictOf = async (files, gitHost = null) => recommendTracker(await detectTrackerSignals({ dir: makeRepo(files), gitHost }));

test('AC2: exactly one signal selects the tracker, with the reason', async () => {
  const linear = await verdictOf({ 'package.json': {}, '.env.example': 'LINEAR_API_KEY=\n' });
  assert.deepEqual([linear.status, linear.name], ['single', 'Linear']);
  assert.match(linear.reasons[0], /LINEAR_API_KEY in \.env\.example/);

  const jira = await verdictOf({ 'package.json': {}, '.env': 'JIRA_BASE_URL=x\n' });
  assert.deepEqual([jira.status, jira.name], ['single', 'Jira']);

  const strongLinear = await verdictOf({ '.linear/config.json': '{}' });
  assert.equal(strongLinear.name, 'Linear');
  const strongJira = await verdictOf({ 'atlassian.yml': 'x: 1' });
  assert.equal(strongJira.name, 'Jira');

  const ref = await verdictOf({ 'docs/process.md': 'tickets live at https://acme.atlassian.net/browse/X' });
  assert.equal(ref.name, 'Jira');
});

test('AC2: GitHub/GitLab Issues need the issue-template folder AND the matching remote', async () => {
  const gh = await verdictOf({ '.github/ISSUE_TEMPLATE/bug.md': 'x' }, 'github');
  assert.equal(gh.name, 'GitHub Issues');
  const gl = await verdictOf({ '.gitlab/issue_templates/bug.md': 'x' }, 'gitlab');
  assert.equal(gl.name, 'GitLab Issues');
  assert.equal((await verdictOf({ '.github/ISSUE_TEMPLATE/bug.md': 'x' }, 'gitlab')).status, 'none');
  assert.equal((await verdictOf({ '.gitlab/issue_templates/bug.md': 'x' }, 'github')).status, 'none');
});

test('AC2: a git host alone is no signal; bare words in the README are no signal', async () => {
  assert.equal((await verdictOf({ 'package.json': {} }, 'github')).status, 'none');
  assert.equal((await verdictOf({ 'package.json': {} }, 'gitlab')).status, 'none');
  const readme = await verdictOf({ 'README.md': 'We used to track work in Linear, then Jira.' });
  assert.equal(readme.status, 'none');
});

test('AC2: none or several signals is never preselected', async () => {
  const none = await verdictOf({ 'package.json': {} });
  assert.deepEqual([none.status, none.name, none.candidates], ['none', null, []]);
  const many = await verdictOf({ '.linear/x': '1', 'atlassian.yml': 'x: 1' });
  assert.deepEqual([many.status, many.name], ['ambiguous', null]);
  assert.deepEqual(many.candidates, ['Linear', 'Jira']);
});

test('AC2: detectTracker — single signal needs no prompt; ambiguous in auto mode refuses to guess', async () => {
  const single = makeRepo({ '.linear/x': '1' });
  const r1 = await silenced(() => detectTracker({ dir: single }));
  assert.equal(r1.tracker, 'Linear');
  assert.equal(r1.status, 'single');

  const ambiguous = makeRepo({ '.linear/x': '1', 'atlassian.yml': 'x: 1' });
  const r2 = await silenced(() => withAutoAnswers(() => detectTracker({ dir: ambiguous })));
  assert.equal(r2.tracker, null);
  assert.equal(r2.status, 'ambiguous');

  const r3 = await silenced(() => detectTracker({ dir: ambiguous, trackerOverride: 'GitLab Issues' }));
  assert.equal(r3.tracker, 'GitLab Issues');
});

// --- AC5 ---------------------------------------------------------------------------------

const app = (over) => ({ name: 'x', path: 'apps/x', slug: 'x', framework: 'Nuxt', scripts: { runnable: 'dev' }, hasCode: true, ...over });

test('AC5: runnable app with a known stack and real code is recommended', () => {
  assert.equal(isGoldenExampleApp(app()), true);
});

test('AC5: shared package, config-only package and unknown stack are not', () => {
  assert.equal(isGoldenExampleApp(app({ path: 'packages/ui', scripts: { runnable: null } })), false);
  assert.equal(isGoldenExampleApp(app({ path: 'packages/eslint-config', framework: null, scripts: { runnable: null }, hasCode: false })), false);
  assert.equal(isGoldenExampleApp(app({ hasCode: false })), false);
  assert.equal(isGoldenExampleApp(app({ framework: null })), false);
});

test('AC5: recommend() on a real monorepo picks only the apps', async () => {
  const dir = makeRepo({
    'package.json': { name: 'm', workspaces: ['apps/*', 'packages/*'] },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'nuxt dev' }, dependencies: { nuxt: '^3' } },
    'apps/web/pages/index.vue': '<template/>',
    'apps/api/package.json': { name: 'api', scripts: { start: 'node .' }, dependencies: { express: '^4' } },
    'apps/api/src/index.js': 'export {}',
    'packages/ui/package.json': { name: 'ui', scripts: { build: 'tsc' }, dependencies: { react: '^18' } },
    'packages/ui/src/index.ts': 'export {}',
    'packages/cfg/package.json': { name: 'cfg' },
    'packages/cfg/eslint.config.js': 'export default []',
  });
  const detected = await detectProject({ dir });
  const rec = recommend(detected, {});
  assert.deepEqual(rec.goldenApps, ['apps/api', 'apps/web']);
  assert.deepEqual(rec.agents.roleApp, { frontend: ['apps/web', 'packages/ui'], backend: ['apps/api'] });
  assert.deepEqual(rec.agents.kinds, ['planner', 'frontend', 'backend', 'validator', 'reviewer']);
  assert.equal(rec.tracker.status, 'none');
});

test('AC5: recommend() is pure — same input, same output, input untouched', async () => {
  const detected = await detectProject({ dir: makeRepo({ 'package.json': { name: 's', scripts: { dev: 'x' }, dependencies: { vue: '^3' } }, 'src/a.js': '1' }) });
  const frozen = JSON.stringify(detected);
  assert.deepEqual(recommend(detected, {}), recommend(detected, {}));
  assert.equal(JSON.stringify(detected), frozen);
  assert.deepEqual(recommendAgents(detected).roleApp, { frontend: ['.'], backend: ['.'] });
});
