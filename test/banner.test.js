// CAF-INIT-SMART-01 AC9 — the banner: snapshots (colored and plain), when it shows, NO_COLOR.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { renderBanner, detectColorLevel, shouldShowBanner, printBanner, TAGLINE, HINT } from '../src/utils/banner.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(HERE, '..', 'src', 'index.js');
const snapshot = (name) => fs.readFileSync(path.join(HERE, 'fixtures', 'banner', `${name}.txt`), 'utf8');
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

test('AC9: plain snapshot — block letters left-aligned, tagline, hint', () => {
  assert.equal(`${renderBanner({ color: 'none' })}\n`, snapshot('none'));
  const lines = renderBanner({ color: 'none' }).split('\n');
  assert.equal(lines.length, 8);
  assert.ok(lines.slice(0, 5).every((l) => l.length > 0 && /^[ █]+$/.test(l)));
  assert.equal(lines[6], TAGLINE);
  assert.equal(lines[7], HINT);
  assert.equal(TAGLINE, 'Coderium Agent Framework — Spec-Driven Agentic Delivery');
  assert.equal(HINT, "Run 'caf-init --help' for usage information");
});

test('AC9: truecolor snapshot — gradient blue, teal, lavender; italic yellow tagline; grey hint', () => {
  const out = renderBanner({ color: 'truecolor' });
  assert.equal(`${out}\n`, snapshot('truecolor'));
  const lines = out.split('\n');
  assert.match(lines[0], /^\x1b\[38;2;122;162;247m/); // #7AA2F7
  assert.match(lines[1], /^\x1b\[38;2;122;162;247m/);
  assert.match(lines[2], /^\x1b\[38;2;127;214;194m/); // #7FD6C2
  assert.match(lines[3], /^\x1b\[38;2;127;214;194m/);
  assert.match(lines[4], /^\x1b\[38;2;169;169;196m/); // #A9A9C4
  assert.match(lines[6], /^\x1b\[3m\x1b\[38;2;232;217;143m/); // italic #E8D98F
  assert.match(lines[7], /^\x1b\[38;2;110;110;133m/); // #6E6E85
  assert.equal(strip(out), renderBanner({ color: 'none' }));
});

test('AC9: 256-color snapshot — same text, palette indexes', () => {
  const out = renderBanner({ color: '256' });
  assert.equal(`${out}\n`, snapshot('256'));
  assert.doesNotMatch(out, /38;2;/);
  assert.match(out, /\x1b\[38;5;\d+m/);
  assert.equal(strip(out), renderBanner({ color: 'none' }));
});

test('AC9: renderBanner is pure and takes a custom tagline', () => {
  assert.equal(renderBanner({ color: 'none' }), renderBanner({ color: 'none' }));
  assert.match(renderBanner({ color: false, tagline: 'Hello' }), /\nHello\n/);
  assert.equal(renderBanner({ color: true }), renderBanner({ color: 'truecolor' }));
});

test('AC9: colors step down truecolor -> 256 -> none; NO_COLOR removes them', () => {
  const tty = (env) => detectColorLevel({ env, isTTY: true });
  assert.equal(tty({ COLORTERM: 'truecolor', TERM: 'xterm-256color' }), 'truecolor');
  assert.equal(tty({ COLORTERM: '24bit' }), 'truecolor');
  assert.equal(tty({ TERM: 'xterm-256color' }), '256');
  assert.equal(tty({ TERM: 'xterm' }), 'none');
  assert.equal(tty({ TERM: 'dumb', COLORTERM: 'truecolor' }), 'none');
  assert.equal(tty({ NO_COLOR: '1', COLORTERM: 'truecolor' }), 'none');
  assert.equal(detectColorLevel({ env: { COLORTERM: 'truecolor' }, isTTY: false }), 'none');
});

test('AC9: shown only on a TTY, without --yes, --no-banner and CAF_NO_BANNER', () => {
  assert.equal(shouldShowBanner({ isTTY: true }), true);
  assert.equal(shouldShowBanner({ isTTY: false }), false);
  assert.equal(shouldShowBanner({ isTTY: true, yes: true }), false);
  assert.equal(shouldShowBanner({ isTTY: true, noBanner: true }), false);
  assert.equal(shouldShowBanner({ isTTY: true, env: { CAF_NO_BANNER: '1' } }), false);
  assert.equal(shouldShowBanner({ isTTY: true, env: { CAF_NO_BANNER: '0' } }), true);
});

test('AC9: printBanner writes the banner (colored or not) only when allowed', () => {
  const run = (stream, extra = {}) => {
    let out = '';
    const printed = printBanner({ stream, write: (t) => (out += t), env: { COLORTERM: 'truecolor' }, ...extra });
    return { printed, out };
  };
  const tty = { isTTY: true };
  assert.deepEqual(run(tty), { printed: true, out: `${renderBanner({ color: 'truecolor' })}\n\n` });
  assert.equal(run(tty, { env: { COLORTERM: 'truecolor', NO_COLOR: '1' } }).out, `${renderBanner({ color: 'none' })}\n\n`);
  assert.equal(run({ isTTY: false }).printed, false);
  assert.equal(run(tty, { yes: true }).printed, false);
  assert.equal(run(tty, { noBanner: true }).printed, false);
  assert.equal(run(tty, { env: { CAF_NO_BANNER: '1' } }).printed, false);
});

test('AC9: through the CLI, a non-TTY run (pipes) shows no banner for bare caf-init or scaffold', () => {
  const bare = spawnSync(process.execPath, [INDEX], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.doesNotMatch(bare.stdout + bare.stderr, /Spec-Driven Agentic Delivery/);
  assert.match(bare.stdout + bare.stderr, /Usage: caf-init/);
  const help = spawnSync(process.execPath, [INDEX, 'scaffold', '--help'], { encoding: 'utf8' });
  assert.match(help.stdout, /--no-banner/);
});
