// Shared scratch-repo helpers for tests (extracted from repo-context.test.js at CAF-SKILLS-01).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Create a temp repo from `{ 'relative/path': string | object }` (objects are JSON-encoded). */
export function makeRepo(files, prefix = 'caf-repo-context-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

export function copyFixture(fixture, prefix = 'caf-fixture-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.cpSync(fixture, dir, { recursive: true });
  return dir;
}

/** `{ relPath: content }` for every file under `dir` — compare before/after to prove no write. */
export function snapshotTree(dir, base = dir) {
  const out = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, snapshotTree(abs, base));
    else out[path.relative(base, abs)] = fs.readFileSync(abs, 'utf8');
  }
  return out;
}
