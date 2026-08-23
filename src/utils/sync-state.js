import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { readJsonSafe } from '../util.js';

function statePath(agentDirPath) {
  return path.join(agentDirPath, '.caf-sync-state.json');
}

export function contentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function readSyncState(agentDirPath) {
  return readJsonSafe(statePath(agentDirPath)) || {};
}

/**
 * Persist decline decisions so re-runs don't re-prompt for the same file+section unless
 * the template's proposed content changed (tracked via hash). Never written in dry-run.
 */
export function writeSyncState(agentDirPath, state, { dryRun = false } = {}) {
  if (dryRun) return;
  fs.writeFileSync(statePath(agentDirPath), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function getDecision(state, filename, header, hash) {
  const entry = state[filename]?.[header];
  if (!entry) return null;
  if (entry.hash !== hash) return null; // template's proposed content changed — ask again
  return entry.decision;
}

export function setDecision(state, filename, header, hash, decision) {
  state[filename] = state[filename] || {};
  state[filename][header] = { decision, hash };
}
