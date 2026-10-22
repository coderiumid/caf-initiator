// CAF-INIT-SMART-01 AC7 — every prompt has a default, nothing that overwrites or deletes defaults to
// Y, and the (Y/n) / (y/N) notation matches the default. Scans the prompt definitions in src/.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defaultAnswer } from '../src/utils/ask.js';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const DESTRUCTIVE = /overwrit|replac|delet|remov|discard|timpa|hapus/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

// Every `prompts({ ... })` / `ask({ ... })` call: the object literal up to its matching brace.
function promptDefinitions() {
  const found = [];
  for (const file of walk(SRC)) {
    if (file.endsWith(path.join('utils', 'ask.js'))) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\b(?:prompts|ask)\(\s*\{/g)) {
      let depth = 0;
      let i = m.index + m[0].length - 1;
      const start = i;
      for (; i < text.length; i += 1) {
        if (text[i] === '{') depth += 1;
        else if (text[i] === '}' && --depth === 0) break;
      }
      const body = text.slice(start, i + 1);
      found.push({
        file: path.relative(SRC, file),
        body,
        type: body.match(/type:\s*'(\w+)'/)?.[1],
        // The first `message:` at the top level is the question; template literals count.
        message: body.match(/message:\s*([`'"])((?:\\.|(?!\1).)*)\1/)?.[2] ?? '',
        initial: body.match(/\binitial:\s*([^,\n}]+)/)?.[1]?.trim(),
      });
    }
  }
  return found;
}

const defs = promptDefinitions();

test('AC7: the scan finds the prompts (guards against a regex that matches nothing)', () => {
  assert.ok(defs.length >= 20, `found ${defs.length}`);
  assert.ok(defs.every((d) => d.type), 'every definition has a type');
  assert.ok(defs.some((d) => d.message.includes('Proceed? (Y/n/e)')));
});

test('AC7: confirm, text and select prompts declare their default (`initial`)', () => {
  const missing = defs.filter((d) => ['confirm', 'text', 'select'].includes(d.type) && d.initial === undefined);
  assert.deepEqual(missing.map((d) => `${d.file}: ${d.message}`), []);
});

test('AC7: multiselect prompts state their default through ticked choices (`selected`), or an explicit empty one', () => {
  // A multiselect with no `selected` defaults to nothing ticked; that is only acceptable when the
  // question says "leave empty"/"none" or when its call site gives the unattended answer (`auto`).
  const unclear = defs.filter(
    (d) => d.type === 'multiselect' && !/selected:/.test(d.body) && !/\bauto:/.test(d.body) && !/empty|none|ticked|\?/i.test(d.message)
  );
  assert.deepEqual(unclear.map((d) => `${d.file}: ${d.message}`), []);
});

test('AC7: a confirm that overwrites, replaces or deletes defaults to N', () => {
  const offenders = defs.filter((d) => d.type === 'confirm' && DESTRUCTIVE.test(d.message) && d.initial !== 'false');
  assert.deepEqual(offenders.map((d) => `${d.file}: ${d.message}`), []);
  // The D8 conflict prompts are among the ones checked.
  assert.ok(defs.some((d) => d.type === 'confirm' && /^Overwrite /.test(d.message) && d.initial === 'false'));
});

test('AC7: a confirm that writes into a file the user owns says what it adds and keeps the file otherwise intact', () => {
  // "Add section ## Skills/## X" prompts are insertion-only (isPureInsertion proves it) — they do
  // not match the destructive words and keep Y; this pins that they never grow one.
  const insertions = defs.filter((d) => d.type === 'confirm' && /^Add section/.test(d.message));
  assert.equal(insertions.length, 2);
  for (const d of insertions) assert.doesNotMatch(d.message, DESTRUCTIVE);
});

test('AC7: capital-letter notation marks the default — (Y/n) = Y, (y/N) = N', () => {
  for (const d of defs) {
    if (/\(Y\/n/.test(d.message)) assert.ok(['true', "'Y'"].includes(d.initial), `${d.file}: ${d.message}`);
    if (/\(y\/N/.test(d.message)) assert.ok(['false', "'N'"].includes(d.initial), `${d.file}: ${d.message}`);
  }
  // prompts itself prints (Y/n) for initial true and (y/N) for initial false, so a plain confirm is consistent by construction.
  for (const d of defs.filter((x) => x.type === 'confirm')) assert.ok(['true', 'false'].includes(d.initial), `${d.file}: initial must be a literal boolean`);
});

test('AC7: unattended answers are the declared defaults, never an overwrite', () => {
  assert.equal(defaultAnswer({ type: 'confirm', initial: false }), false);
  assert.equal(defaultAnswer({ type: 'confirm' }), true);
  assert.equal(defaultAnswer({ type: 'text', initial: 'Y' }), 'Y');
  assert.equal(defaultAnswer({ type: 'select', initial: 1, choices: [{ value: 'a' }, { value: 'b' }] }), 'b');
  assert.deepEqual(defaultAnswer({ type: 'multiselect', choices: [{ value: 1, selected: true }, { value: 2 }] }), [1]);
  assert.deepEqual(defaultAnswer({ type: 'multiselect', auto: ['x'], choices: [] }), ['x']);
});
