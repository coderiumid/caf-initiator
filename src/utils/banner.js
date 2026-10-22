// CAF-INIT-SMART-01 (D11): the "CAF" banner. Plain ANSI escapes, no dependency. `renderBanner` is
// pure — it returns a string and reads nothing from the environment; `detectColorLevel` and
// `shouldShowBanner` take the environment as arguments for the same reason.

export const TAGLINE = 'Coderium Agent Framework — Spec-Driven Agentic Delivery';
export const HINT = "Run 'caf-init --help' for usage information";

const LOGO = [
  ' ██████  █████  ███████',
  '██      ██   ██ ██     ',
  '██      ███████ █████  ',
  '██      ██   ██ ██     ',
  ' ██████ ██   ██ ██     ',
];

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
// Gradient: blue (rows 1-2) -> teal (3-4) -> lavender grey (5).
const LOGO_COLORS = ['#7AA2F7', '#7AA2F7', '#7FD6C2', '#7FD6C2', '#A9A9C4'].map(hex);
const TAGLINE_COLOR = hex('#E8D98F');
const HINT_COLOR = hex('#6E6E85');

const RESET = '\x1b[0m';
const ITALIC = '\x1b[3m';

function to256([r, g, b]) {
  const level = (v) => Math.round((v / 255) * 5);
  return 16 + 36 * level(r) + 6 * level(g) + level(b);
}

function paint(text, rgb, level, { italic = false } = {}) {
  if (level === 'none') return text;
  const fg = level === 'truecolor' ? `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `\x1b[38;5;${to256(rgb)}m`;
  return `${italic ? ITALIC : ''}${fg}${text}${RESET}`;
}

function normalizeLevel(color) {
  if (color === true) return 'truecolor';
  if (color === false || color == null) return 'none';
  return ['truecolor', '256', 'none'].includes(color) ? color : 'none';
}

/**
 * `color`: 'truecolor' | '256' | 'none' (true = truecolor, false = none). Returns the banner
 * without a trailing newline: logo, blank line, tagline (italic yellow), hint (grey).
 */
export function renderBanner({ color = 'none', tagline = TAGLINE } = {}) {
  const level = normalizeLevel(color);
  const lines = LOGO.map((row, i) => paint(row.trimEnd(), LOGO_COLORS[i], level));
  lines.push('');
  lines.push(paint(tagline, TAGLINE_COLOR, level, { italic: true }));
  lines.push(paint(HINT, HINT_COLOR, level));
  return lines.join('\n');
}

/** Terminal capability: NO_COLOR wins, then COLORTERM=truecolor|24bit, then a 256-color TERM, else none. */
export function detectColorLevel({ env = {}, isTTY = false } = {}) {
  if (!isTTY) return 'none';
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 'none';
  if (env.TERM === 'dumb') return 'none';
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM || '')) return 'truecolor';
  if (/256color/i.test(env.TERM || '')) return '256';
  return 'none';
}

const truthyEnv = (value) => value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';

/** Not in a non-TTY, with --yes, with --no-banner, or with CAF_NO_BANNER. */
export function shouldShowBanner({ isTTY = false, yes = false, noBanner = false, env = {} } = {}) {
  return Boolean(isTTY) && !yes && !noBanner && !truthyEnv(env.CAF_NO_BANNER);
}

/** Prints the banner when the rules above allow it; returns whether it did. */
export function printBanner({ stream = process.stdout, env = process.env, yes = false, noBanner = false, write } = {}) {
  const isTTY = Boolean(stream.isTTY);
  if (!shouldShowBanner({ isTTY, yes, noBanner, env })) return false;
  const text = renderBanner({ color: detectColorLevel({ env, isTTY }) });
  (write || ((t) => stream.write(t)))(`${text}\n\n`);
  return true;
}
