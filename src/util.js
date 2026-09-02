import fs from 'node:fs';
import path from 'node:path';
import kleur from 'kleur';

export function exists(p) {
  return fs.existsSync(p);
}

export function dirHasContent(p) {
  if (!fs.existsSync(p)) return false;
  const stat = fs.statSync(p);
  if (!stat.isDirectory()) return true;
  return fs.readdirSync(p).length > 0;
}

export function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

export function readJsonSafe(p) {
  const raw = readFileSafe(p);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write a file only if it doesn't already exist. Never overwrites — UNLESS `overwrite: true`
 * is explicitly passed (CAF-MULTIAPP-01: opt-in escape hatch for regenerating drafts, e.g.
 * `caf-init scaffold agents --force`, without requiring the user to delete the file by hand
 * first). Default behavior (no `overwrite`) is unchanged — this is additive, not a relaxed
 * default; preserve that when touching this function.
 * Returns 'written' | 'skipped' | 'dry-run'.
 */
export function writeIfAbsent(filePath, content, { dryRun = false, overwrite = false } = {}) {
  const alreadyExists = exists(filePath);
  if (alreadyExists && !overwrite) {
    console.log(kleur.dim(`  skip  ${filePath} (already exists)`));
    return 'skipped';
  }
  if (dryRun) {
    console.log(kleur.yellow(`  would ${alreadyExists ? 'overwrite' : 'write'}  ${filePath}`));
    return 'dry-run';
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(kleur.green(`  ${alreadyExists ? 'overwritten' : 'created'}  ${filePath}`));
  return 'written';
}

/**
 * Append lines to a file if missing, without touching existing content. Creates the file
 * if it doesn't exist. Idempotent — re-running never duplicates a line that's already there
 * (unlike writeIfAbsent, which skips the whole file once it exists — this appends inside it).
 * Returns 'written' | 'skipped' | 'dry-run'.
 */
export function appendLinesIfMissing(filePath, lines, { dryRun = false } = {}) {
  const existing = readFileSafe(filePath);
  const existingLines = new Set((existing || '').split(/\r?\n/).map((l) => l.trim()));
  const missing = lines.filter((line) => !existingLines.has(line.trim()));

  if (missing.length === 0) {
    console.log(kleur.dim(`  skip  ${filePath} (patterns already present)`));
    return 'skipped';
  }
  if (dryRun) {
    console.log(kleur.yellow(`  would append to  ${filePath}`));
    return 'dry-run';
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const needsLeadingNewline = existing != null && existing.length > 0 && !existing.endsWith('\n');
  const block = `${needsLeadingNewline ? '\n' : ''}${missing.join('\n')}\n`;
  fs.appendFileSync(filePath, block, 'utf8');
  console.log(kleur.green(`  ${existing == null ? 'created' : 'updated'}  ${filePath}`));
  return 'written';
}

/**
 * Ensure an empty directory exists (create if missing, skip if present).
 */
export function ensureDir(dirPath, { dryRun = false } = {}) {
  if (exists(dirPath)) {
    console.log(kleur.dim(`  skip  ${dirPath}/ (already exists)`));
    return 'skipped';
  }
  if (dryRun) {
    console.log(kleur.yellow(`  would create  ${dirPath}/`));
    return 'dry-run';
  }
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(kleur.green(`  created  ${dirPath}/`));
  return 'written';
}

export function section(title) {
  console.log('');
  console.log(kleur.bold().cyan(`${title}`));
}
