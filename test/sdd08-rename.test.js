// CAF-SDD-08 — the builder of `/caf-run` is `src/templates/run-command.js` / `buildRunMd`.
// A rename of names only: the module body, the users and the count of `/caf-run-pipeline`
// (the old command name) are compared with the commit before the rename.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.join('test', 'sdd08-rename.test.js');
const OLD_FILE = 'src/templates/run-pipeline-command.js';
const NEW_FILE = 'src/templates/run-command.js';
// Built from parts so this file does not hold the old names it scans for.
const OLD_NAMES = ['run-pipeline' + '-command', 'buildRun' + 'PipelineMd'];
const OLD_COMMAND = '/caf-run' + '-pipeline';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function gitAvailable() {
  try {
    git('rev-parse', '--git-dir');
    return true;
  } catch {
    return false;
  }
}

// The latest commit that touches the old path is the rename; its parent still has the old file.
function baseCommit() {
  const rename = git('log', '--format=%H', '-1', '--', OLD_FILE).trim();
  return rename ? git('rev-parse', `${rename}~1`).trim() : '';
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'fixtures' && dir.endsWith('test')) continue;
      walk(full, out);
    } else out.push(full);
  }
  return out;
}

const base = gitAvailable() ? baseCommit() : '';
const gitTest = (name, fn) => test(name, { skip: base ? false : 'git history of the rename not available' }, fn);

test('AC-1: the old module is gone and the new one exports buildRunMd only', async () => {
  assert.equal(fs.existsSync(path.join(ROOT, OLD_FILE)), false);
  assert.equal(fs.existsSync(path.join(ROOT, NEW_FILE)), true);
  const mod = await import(path.join(ROOT, NEW_FILE));
  assert.equal(typeof mod.buildRunMd, 'function');
  assert.equal(OLD_NAMES[1] in mod, false);
});

test('AC-1: no file in src/ or test/ (fixtures and this file excepted) holds an old name', () => {
  const hits = [];
  for (const top of ['src', 'test']) {
    for (const file of walk(path.join(ROOT, top))) {
      if (path.relative(ROOT, file) === SELF) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const name of [...OLD_NAMES, 'generateRun' + 'Pipeline']) {
        if (text.includes(name)) hits.push(`${path.relative(ROOT, file)}: ${name}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

gitTest('AC-3: run-command.js differs from the old file only on lines that held an old name', () => {
  const before = git('show', `${base}:${OLD_FILE}`);
  const after = fs.readFileSync(path.join(ROOT, NEW_FILE), 'utf8');
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  assert.equal(afterLines.length, beforeLines.length);
  const replaced = before.replaceAll(OLD_NAMES[1], 'buildRunMd').replaceAll('run-pipeline.md', 'run.md');
  assert.equal(replaced, after);
  const changed = beforeLines.filter((line, i) => line !== afterLines[i]);
  assert.ok(changed.length > 0);
  for (const line of changed) assert.ok(/buildRun\w*Md|run-pipeline\.md/.test(line), line);
});

gitTest('AC-5: /caf-run-pipeline occurrences in src/ and README.md are as before the ticket', () => {
  const count = (text) => text.split(OLD_COMMAND).length - 1;
  const files = (ref) => git('ls-tree', '-r', '--name-only', ref, '--', 'src', 'README.md').split('\n').filter(Boolean);
  const countBefore = files(base).reduce((n, f) => n + count(git('show', `${base}:${f}`)), 0);
  const countNow = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'README.md')]
    .filter((f) => fs.existsSync(f))
    .reduce((n, f) => n + count(fs.readFileSync(f, 'utf8')), 0);
  assert.ok(countBefore > 0);
  assert.equal(countNow, countBefore);
});
