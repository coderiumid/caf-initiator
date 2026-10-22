import path from 'node:path';
import fg from 'fast-glob';
import { exists, readFileSafe } from '../util.js';

// CAF-INIT-SMART-01 D2: tracker signals, counted per tracker. Read-only. A git host alone is
// never a signal — GitHub/GitLab Issues need their issue-template folder AND the matching remote.
export const TRACKERS = [
  { key: 'linear', name: 'Linear' },
  { key: 'jira', name: 'Jira' },
  { key: 'github', name: 'GitHub Issues' },
  { key: 'gitlab', name: 'GitLab Issues' },
];

export function trackerByKey(key) {
  return TRACKERS.find((t) => t.key === key) || null;
}

// Text a "mentions linear.app / atlassian.net" reference is looked for in: docs and config a team
// links its tracker from. README mentions of the bare words "linear"/"jira" are NOT a signal.
const REFERENCE_GLOBS = ['*.md', 'package.json', 'docs/**/*.md', '.github/**/*.{md,yml,yaml}', '.gitlab/**/*.{md,yml,yaml}'];
const MAX_REFERENCE_FILES = 60;
const MAX_FILE_BYTES = 256 * 1024;

async function readEnvFiles(dir) {
  const files = await fg(['.env*'], { cwd: dir, dot: true, onlyFiles: true, deep: 1 });
  return files.sort().map((rel) => ({ rel, text: readFileSafe(path.join(dir, rel)) || '' }));
}

async function readReferenceTexts(dir) {
  const files = (await fg(REFERENCE_GLOBS, { cwd: dir, dot: true, onlyFiles: true, ignore: ['**/node_modules/**'], deep: 4 })).sort();
  return files.slice(0, MAX_REFERENCE_FILES).map((rel) => ({ rel, text: (readFileSafe(path.join(dir, rel)) || '').slice(0, MAX_FILE_BYTES) }));
}

/**
 * `{ linear: string[], jira: string[], github: string[], gitlab: string[] }` — the reasons each
 * tracker has a signal (empty array = no signal). `gitHost` is `detectProject().gitHost`.
 */
export async function detectTrackerSignals({ dir, gitHost = null }) {
  const signals = { linear: [], jira: [], github: [], gitlab: [] };

  if (exists(path.join(dir, '.linear'))) signals.linear.push('.linear/ present');
  if (exists(path.join(dir, 'atlassian.yml'))) signals.jira.push('atlassian.yml present');

  for (const { rel, text } of await readEnvFiles(dir)) {
    if (/^\s*(export\s+)?LINEAR_API_KEY\s*=/m.test(text)) signals.linear.push(`LINEAR_API_KEY in ${rel}`);
    if (/^\s*(export\s+)?JIRA_[A-Z0-9_]*\s*=/m.test(text)) signals.jira.push(`JIRA_* in ${rel}`);
  }

  for (const { rel, text } of await readReferenceTexts(dir)) {
    const lower = text.toLowerCase();
    if (lower.includes('linear.app')) signals.linear.push(`linear.app referenced in ${rel}`);
    if (lower.includes('atlassian.net')) signals.jira.push(`atlassian.net referenced in ${rel}`);
  }

  if (exists(path.join(dir, '.github', 'ISSUE_TEMPLATE')) && gitHost === 'github') {
    signals.github.push('.github/ISSUE_TEMPLATE + GitHub remote');
  }
  if (exists(path.join(dir, '.gitlab', 'issue_templates')) && gitHost === 'gitlab') {
    signals.gitlab.push('.gitlab/issue_templates + GitLab remote');
  }

  for (const key of Object.keys(signals)) signals[key] = [...new Set(signals[key])];
  return signals;
}
