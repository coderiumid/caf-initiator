// CAF-INIT-DOCS-REMOVE amendment 4 (AC-25 to AC-32) — the golden-examples step picks several apps in
// one run, in the bare `scaffold` chain and in `scaffold golden-examples`. The picker has nothing
// ticked, `--app` (repeatable, path or slug) and `--all-apps` replace only the app picker, an app
// whose RULES.md exists is skipped up front, and the end summary lists the apps with no RULES.md.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { goldenExamples, resolveAppSelectors } from '../src/commands/golden-examples.js';
import { runScaffold, TARGETS, CHAIN_ORDER } from '../src/commands/scaffold.js';
import { buildRulesMd } from '../src/templates/golden-example-rules-md.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(HERE, '..', 'src', 'index.js');
const MONO = path.join(HERE, 'fixtures', 'mono-pnpm');
const SINGLE = path.join(HERE, 'fixtures', 'single-nuxt');

const API_RULES = '.caf/knowledge/golden-examples/apps/api/RULES.md';
const WEB_RULES = '.caf/knowledge/golden-examples/apps/web/RULES.md';
const SINGLE_RULES = '.caf/knowledge/golden-examples/RULES.md';

const API_FILE = 'src/services/a.service.ts';
const WEB_FILE = 'components/B.vue';

/** mono-pnpm with one candidate file per app (the fixture has none), so each app asks one category. */
function monoRepo() {
  const dir = copyFixture(MONO, 'caf-golden-multi-');
  fs.mkdirSync(path.join(dir, 'apps/api/src/services'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apps/api', API_FILE), 'export class A { run() { return 1 } }\n');
  fs.mkdirSync(path.join(dir, 'apps/web/components'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apps/web', WEB_FILE), '<template><div/></template>\n');
  return dir;
}

const apiPick = { relPath: API_FILE };
const webPick = { relPath: WEB_FILE };

/** Runs `fn` with console output captured; resets the prompt queue and exit code around it. */
async function run(answers, fn) {
  prompts._injected = [];
  prompts.inject(answers);
  process.exitCode = undefined;
  const lines = [];
  const original = { log: console.log, error: console.error };
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  let result;
  try {
    result = await fn();
  } finally {
    console.log = original.log;
    console.error = original.error;
  }
  const exitCode = process.exitCode;
  process.exitCode = undefined;
  const unused = prompts._injected.length;
  prompts._injected = [];
  return { result, output: lines.join('\n'), exitCode, unused };
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const has = (dir, rel) => fs.existsSync(path.join(dir, rel));
const todoCount = (text) => (text.match(/TODO/g) || []).length;

function cli(args, dir) {
  return spawnSync(process.execPath, [INDEX, 'scaffold', ...args, '--dir', dir], { encoding: 'utf8', stdin: 'ignore', input: '' });
}

// ---------------------------------------------------------------------------------------------
// AC-25 — a single repo does not change
// ---------------------------------------------------------------------------------------------

test('AC-25: single repo — no app picker, one RULES.md at the root of golden-examples, as before', async () => {
  const dir = copyFixture(SINGLE);
  const before = snapshotTree(dir);
  // single-nuxt has a Component and a Composable category; nothing else may be asked.
  const { result, exitCode, unused, output } = await run(
    [[], [{ relPath: 'composables/useApi.ts' }]],
    () => goldenExamples({ dir, dryRun: false })
  );
  assert.equal(exitCode, undefined);
  assert.equal(unused, 0, 'the two category questions are the only prompts (no app picker)');
  const after = snapshotTree(dir);
  const added = Object.keys(after).filter((f) => !(f in before));
  assert.deepEqual(added, [SINGLE_RULES]);
  assert.equal(
    after[SINGLE_RULES],
    buildRulesMd({ appLabel: 'website-cms-v2', entries: [{ relPath: 'composables/useApi.ts', patternName: 'Composable/Hook' }] })
  );
  assert.equal(result.written.length, 1);
  assert.ok(!/App 1\//.test(output), 'no progress marker for a single app');
  assert.ok(!/apps without golden example/.test(output), 'no multi-app summary for a single app');
});

// ---------------------------------------------------------------------------------------------
// AC-26 — monorepo: picker with nothing ticked, several apps in one run
// ---------------------------------------------------------------------------------------------

test('AC-26: monorepo — choosing two apps writes a RULES.md for both in one run, with progress markers', async () => {
  const dir = monoRepo();
  const { result, output, exitCode, unused } = await run(
    [['apps/api', 'apps/web'], [apiPick], [webPick]],
    () => goldenExamples({ dir })
  );
  assert.equal(exitCode, undefined);
  assert.equal(unused, 0);
  assert.ok(has(dir, API_RULES) && has(dir, WEB_RULES));
  assert.equal(result.written.length, 2);
  assert.match(output, /App 1\/2: api \(apps\/api\)/);
  assert.match(output, /App 2\/2: web \(apps\/web\)/);
});

test('AC-26: monorepo — the picker is a multiselect over every detected app and nothing is ticked by default', async () => {
  const src = fs.readFileSync(path.join(HERE, '..', 'src', 'commands', 'golden-examples.js'), 'utf8');
  const picker = src.slice(src.indexOf('async function pickApps'), src.indexOf('function printMissingSummary'));
  assert.match(picker, /type: 'multiselect'/);
  assert.match(picker, /stack\.apps\.map/);
  assert.ok(!/selected:|initial:/.test(picker), 'no choice is pre-ticked');
});

// ---------------------------------------------------------------------------------------------
// AC-27 — Enter with no app ticked
// ---------------------------------------------------------------------------------------------

test('AC-27: no app chosen — exit code unchanged, nothing written, a hint names the apps without a golden example', async () => {
  const dir = monoRepo();
  const before = snapshotTree(dir);
  const { result, exitCode, output } = await run([[]], () => goldenExamples({ dir }));
  assert.equal(exitCode, undefined);
  assert.deepEqual(snapshotTree(dir), before);
  assert.deepEqual(result, { written: [], skipped: [] });
  assert.match(output, /apps without golden example: api \(apps\/api\), web \(apps\/web\)/);
  assert.match(output, /caf-init scaffold golden-examples --app/);
});

// ---------------------------------------------------------------------------------------------
// AC-28 (amended) — --app / --all-apps replace only the app picker
// ---------------------------------------------------------------------------------------------

test('AC-28: --app repeated, by slug and by path, skips the app picker; the file questions still run', async () => {
  const dir = monoRepo();
  const { unused, exitCode } = await run([[apiPick], [webPick]], () => goldenExamples({ dir, app: ['api', 'apps/web'] }));
  assert.equal(exitCode, undefined);
  assert.equal(unused, 0);
  assert.ok(has(dir, API_RULES) && has(dir, WEB_RULES));
});

test('AC-28: --all-apps takes every app; the file questions still run and RULES.md is never filled in on its own', async () => {
  const dir = monoRepo();
  const { unused, output } = await run([[apiPick], []], () => goldenExamples({ dir, allApps: true }));
  assert.equal(unused, 0);
  assert.match(output, /App 2\/2: web/);
  assert.ok(has(dir, API_RULES));
  assert.ok(!has(dir, WEB_RULES), 'nothing chosen for web, nothing generated for it');
});

test('AC-28: an unknown value is an error naming the known apps — exit 1, nothing written, no prompt', async () => {
  const dir = monoRepo();
  const before = snapshotTree(dir);
  const { exitCode, output, unused } = await run([[apiPick]], () => goldenExamples({ dir, app: ['api', 'tidak-ada'] }));
  assert.equal(exitCode, 1);
  assert.equal(unused, 1);
  assert.deepEqual(snapshotTree(dir), before);
  assert.match(output, /--app tidak-ada not found in detected stack \(known apps: api \(apps\/api\), web \(apps\/web\)\)/);
});

test('AC-28: an ambiguous slug is an error that names both paths', () => {
  const stack = { apps: [{ name: '@m/web', path: 'apps/web' }, { name: '@m/web2', path: 'packages/web' }, { name: '@m/api', path: 'apps/api' }] };
  const bySlug = resolveAppSelectors(stack, ['web']);
  assert.match(bySlug.error, /ambiguous/);
  assert.match(bySlug.error, /apps\/web/);
  assert.match(bySlug.error, /packages\/web/);
  assert.deepEqual(resolveAppSelectors(stack, ['packages/web', 'api']).apps.map((a) => a.path), ['packages/web', 'apps/api']);
  assert.ok(resolveAppSelectors(stack, ['nope']).error);
});

test('AC-28: --all-apps together with --app is refused', async () => {
  const dir = monoRepo();
  const before = snapshotTree(dir);
  const { exitCode, output } = await run([], () => goldenExamples({ dir, app: ['api'], allApps: true }));
  assert.equal(exitCode, 1);
  assert.match(output, /cannot be combined/);
  assert.deepEqual(snapshotTree(dir), before);
});

test('AC-28 (cli): scaffold golden-examples --app <slug> --app <path> and --all-apps run without the app picker', () => {
  // The fixture has no candidate file, so there is no file question either: nothing may prompt.
  for (const args of [['golden-examples', '--app', 'api', '--app', 'apps/web'], ['golden-examples', '--all-apps']]) {
    const dir = copyFixture(MONO);
    const r = cli(args, dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /App 1\/2/);
    assert.match(r.stdout, /App 2\/2/);
    assert.ok(!has(dir, '.caf'));
  }
});

test('AC-28 (cli): unknown value, and --all-apps with --app, exit non-zero and write nothing', () => {
  for (const args of [['golden-examples', '--app', 'tidak-ada'], ['golden-examples', '--all-apps', '--app', 'api']]) {
    const dir = copyFixture(MONO);
    const before = snapshotTree(dir);
    const r = cli(args, dir);
    assert.notEqual(r.status, 0);
    assert.deepEqual(snapshotTree(dir), before);
  }
});

test('AC-28 (cli): repeated --app and --all-apps are refused outside scaffold golden-examples, before anything runs', () => {
  const cases = [
    ['adr', '--app', 'apps/api', '--app', 'apps/web'],
    ['task-completion', '--app', 'apps/api', '--app', 'apps/web'],
    ['agents', '--app', 'apps/api', '--app', 'apps/web'],
    ['adr', '--all-apps'],
    ['task-completion', '--all-apps'],
    ['agents', '--all-apps'],
    ['--app', 'apps/api', '--app', 'apps/web'], // the bare chain
    ['--all-apps'],
  ];
  for (const args of cases) {
    const dir = copyFixture(MONO);
    const before = snapshotTree(dir);
    const r = cli(args, dir);
    assert.equal(r.status, 1, `${args.join(' ')}: ${r.stdout}`);
    assert.match(r.stderr, /only for scaffold golden-examples \(hanya untuk scaffold golden-examples\)/);
    assert.deepEqual(snapshotTree(dir), before, `${args.join(' ')} wrote something`);
  }
});

test('AC-28 (cli): a single --app still works on the other targets', () => {
  const dir = copyFixture(MONO);
  const r = cli(['task-completion', '--app', 'apps/api', '--dry-run'], dir);
  assert.equal(r.status, 0, r.stderr);
});

// ---------------------------------------------------------------------------------------------
// AC-29 — a rerun never overwrites and only adds what is missing
// ---------------------------------------------------------------------------------------------

test('AC-29: an existing RULES.md is skipped up front, without its category question, and stays byte for byte', async () => {
  const dir = monoRepo();
  await run([['apps/api'], [apiPick]], () => goldenExamples({ dir }));
  const file = path.join(dir, API_RULES);
  fs.appendFileSync(file, '\nmy own note\n');
  const edited = fs.readFileSync(file, 'utf8');

  const { result, output, unused } = await run([['apps/api', 'apps/web'], [webPick]], () => goldenExamples({ dir }));
  assert.equal(unused, 0, 'api asked nothing; the one category answer went to web');
  assert.equal(fs.readFileSync(file, 'utf8'), edited);
  assert.ok(has(dir, WEB_RULES));
  assert.match(output, /already exists, skipped \(sudah ada, skip\)/);
  assert.deepEqual(result.written, [path.join(dir, WEB_RULES)]);
  assert.deepEqual(result.skipped, [file]);
});

test('AC-29: single repo — an existing RULES.md is skipped up front too and left untouched', async () => {
  const dir = copyFixture(SINGLE);
  fs.mkdirSync(path.join(dir, '.caf/knowledge/golden-examples'), { recursive: true });
  fs.writeFileSync(path.join(dir, SINGLE_RULES), 'hand written\n');
  const { unused, output } = await run([[], []], () => goldenExamples({ dir }));
  assert.equal(unused, 2, 'no category question');
  assert.equal(read(dir, SINGLE_RULES), 'hand written\n');
  assert.match(output, /sudah ada, skip/);
});

// ---------------------------------------------------------------------------------------------
// AC-30 — the closing summary after a partial run
// ---------------------------------------------------------------------------------------------

test('AC-30: after a run for one of two apps, the summary names the other and not the first', async () => {
  const dir = monoRepo();
  const { output } = await run([['apps/api'], [apiPick]], () => goldenExamples({ dir }));
  const summary = output.split('\n').find((l) => l.startsWith('apps without golden example:'));
  assert.equal(summary, 'apps without golden example: web (apps/web)');
});

test('AC-30: once every app has a RULES.md the summary says none', async () => {
  const dir = monoRepo();
  const { output } = await run([['apps/api', 'apps/web'], [apiPick], [webPick]], () => goldenExamples({ dir }));
  assert.match(output, /apps without golden example: none/);
});

test('AC-30: the summary is counted from RULES.md files, so a dry run counts what it would write', async () => {
  const dir = monoRepo();
  const before = snapshotTree(dir);
  const { output } = await run([['apps/api'], [apiPick]], () => goldenExamples({ dir, dryRun: true }));
  assert.deepEqual(snapshotTree(dir), before);
  assert.match(output, /apps without golden example: web \(apps\/web\)/);
});

// ---------------------------------------------------------------------------------------------
// AC-31 — the bare chain uses the same picker and goes on
// ---------------------------------------------------------------------------------------------

test('AC-31: bare scaffold — one app ticked, the other left with Enter on its category, and the chain goes on', async () => {
  const dir = monoRepo();
  const real = {};
  const ran = [];
  for (const key of CHAIN_ORDER) {
    if (key === 'golden-examples') continue;
    real[key] = TARGETS[key].run;
    TARGETS[key].run = async () => {
      ran.push(key);
      return { written: [], skipped: [] };
    };
  }
  // golden confirm, app picker (both apps), api category, web category (Enter), then adr runs, the rest are skipped.
  const answers = [true, ['apps/api', 'apps/web'], [apiPick], [], true, ...CHAIN_ORDER.slice(2).map(() => false)];
  prompts._injected = [];
  prompts.inject(answers);
  const original = console.log;
  console.log = () => {};
  process.exitCode = undefined;
  try {
    await runScaffold({ dir, dryRun: false, agentDir: '.claude/agents' });
  } finally {
    console.log = original;
    for (const key of Object.keys(real)) TARGETS[key].run = real[key];
  }
  const exitCode = process.exitCode;
  const unused = prompts._injected.length;
  prompts._injected = [];
  assert.equal(exitCode, undefined);
  assert.equal(unused, 0);
  assert.deepEqual(ran, ['adr'], 'the chain reached the step after golden-examples');
  assert.ok(has(dir, API_RULES));
  assert.ok(!has(dir, WEB_RULES), 'Enter on every category of web writes nothing — no TODO-only RULES.md (decision 5)');
});

// ---------------------------------------------------------------------------------------------
// AC-32 — N apps give N identical-shape RULES.md and no other file
// ---------------------------------------------------------------------------------------------

test('AC-32: two apps give two RULES.md, each equal to the single-app render, and no other file under .caf', async () => {
  const dir = monoRepo();
  const before = snapshotTree(dir);
  await run([['apps/api', 'apps/web'], [apiPick], [webPick]], () => goldenExamples({ dir }));
  const added = Object.keys(snapshotTree(dir)).filter((f) => !(f in before)).sort();
  assert.deepEqual(added, [API_RULES, WEB_RULES]);

  const one = monoRepo();
  await run([['apps/api'], [apiPick]], () => goldenExamples({ dir: one }));
  assert.equal(read(dir, API_RULES), read(one, API_RULES), 'the api file is the one a single-app run writes');
  assert.equal(todoCount(read(dir, API_RULES)), todoCount(read(dir, WEB_RULES)));
  assert.equal(todoCount(read(dir, API_RULES)), todoCount(read(one, API_RULES)));
});
