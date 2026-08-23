import { execFileSync } from 'node:child_process';

const TODO_PATTERN = /\b(TODO|FIXME|HACK)\b/;

function getRecencyScore(filePath, cwd) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', filePath], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (!out) return 0;
    const commitTs = Number(out) * 1000;
    if (!Number.isFinite(commitTs)) return 0;
    const ageDays = (Date.now() - commitTs) / (1000 * 60 * 60 * 24);
    // Newer = higher score, decaying over ~1 year, floored at 0.
    return Math.max(0, 100 - ageDays / 3.65);
  } catch {
    return 0;
  }
}

function getSizeBandScore(content) {
  const lines = content.split(/\r?\n/).length;
  if (lines < 15) return 20;
  if (lines > 300) return 20;
  // Sweet spot around 30-150 lines.
  if (lines >= 30 && lines <= 150) return 100;
  if (lines < 30) return 60;
  return 60;
}

function getTodoPenalty(content) {
  return TODO_PATTERN.test(content) ? -20 : 0;
}

/**
 * Score a candidate file for golden-example suitability. Higher is better.
 */
export function scoreFile(filePath, content, { cwd } = {}) {
  const recency = getRecencyScore(filePath, cwd);
  const sizeBand = getSizeBandScore(content);
  const todoPenalty = getTodoPenalty(content);
  return recency + sizeBand + todoPenalty;
}
