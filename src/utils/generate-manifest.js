import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJsonSafe, ensureDir } from '../util.js';

const MANIFEST_VERSION = 1;

function manifestPath(dir) {
  return path.join(dir, '.caf', '.generate-manifest.json');
}

// caf-initiator's own version, stamped onto every baseline written so a future audit can
// tell which template generation produced it. Read from this package's own package.json
// (not the target repo's) — resolved relative to this file so it works regardless of cwd.
function ownVersion() {
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
  const pkg = readJsonSafe(pkgPath);
  return pkg?.version ? `caf-initiator@${pkg.version}` : 'caf-initiator@unknown';
}

// Never crashes on a missing or malformed manifest — a project with no `.caf/.generate-
// manifest.json` at all (every project before this feature existed) must read as "no
// baseline for any section" (UNTRACKED via getBaselineHash returning null), not an error.
export function readManifest(dir) {
  const raw = readJsonSafe(manifestPath(dir));
  if (!raw || typeof raw !== 'object' || typeof raw.files !== 'object' || raw.files === null) {
    return { version: MANIFEST_VERSION, files: {} };
  }
  return raw;
}

export function writeManifest(dir, manifest, { dryRun = false } = {}) {
  if (dryRun) return;
  const cafDir = path.join(dir, '.caf');
  ensureDir(cafDir);
  fs.writeFileSync(manifestPath(dir), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

// hash is the raw hex digest from hashSection() — stored prefixed ("sha256:<hex>") so the
// manifest is self-describing if the hash algorithm ever changes.
export function getBaselineHash(manifest, relPath, header) {
  const stored = manifest.files?.[relPath]?.sections?.[header]?.hash;
  if (!stored) return null;
  return stored.startsWith('sha256:') ? stored.slice('sha256:'.length) : stored;
}

// Mutates `manifest` in place, recording `hash` as the new baseline for `relPath`#`header`.
// Called after curate sync successfully writes a DRIFT section, and by `curate baseline`
// for backfill — both cases want the same "this is now the known-good state" semantics.
export function setSectionBaseline(manifest, relPath, header, hash, { at = new Date().toISOString() } = {}) {
  manifest.files = manifest.files || {};
  manifest.files[relPath] = manifest.files[relPath] || { sections: {} };
  manifest.files[relPath].sections = manifest.files[relPath].sections || {};
  manifest.files[relPath].sections[header] = {
    hash: `sha256:${hash}`,
    templateVersion: ownVersion(),
    lastSyncedAt: at,
  };
}
