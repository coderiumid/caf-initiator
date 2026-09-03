import crypto from 'node:crypto';

import { parseSections, sectionBody } from './agent-sections.js';

export const SECTION_STATUS = {
  IN_SYNC: 'IN_SYNC',
  DRIFT: 'DRIFT',
  CUSTOMIZATION: 'CUSTOMIZATION',
  CONFLICT: 'CONFLICT',
  UNTRACKED: 'UNTRACKED',
};

/**
 * Returns the body text of `## <header>` in `content` (from just after the heading to just
 * before the next heading of equal-or-higher level), or null if the header isn't present.
 * Delegates to the same header parser curate/sync already use so section boundaries never
 * drift between the two features.
 */
export function extractSection(content, header) {
  const { lines, sections } = parseSections(content);
  const match = sections.find((s) => s.header === header);
  if (!match) return null;
  return sectionBody(lines, match);
}

// Cosmetic-only normalization so CRLF/LF swaps or trailing-whitespace reformatting never
// register as a content change: normalize line endings, trim trailing whitespace per line,
// and trim leading/trailing blank lines around the section body.
function normalizeSectionBody(body) {
  return body
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}

export function hashSection(body) {
  const normalized = normalizeSectionBody(body);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * 3-way comparison per design.md — the sole gate that decides whether a section may be
 * auto-synced. Auto-sync (DRIFT) requires currentHash === baselineHash: the file must be
 * byte-for-byte (post-normalization) unchanged since it was last generated/synced. Any
 * deviation from that routes to CUSTOMIZATION or CONFLICT, never DRIFT — this is what
 * guarantees a user's manual edit can never be silently overwritten.
 */
export function compareSection({ baselineHash, currentHash, templateHash }) {
  if (baselineHash == null) return SECTION_STATUS.UNTRACKED;

  const currentMatchesBaseline = currentHash === baselineHash;
  const templateMatchesBaseline = templateHash === baselineHash;

  if (currentMatchesBaseline && templateMatchesBaseline) return SECTION_STATUS.IN_SYNC;
  if (currentMatchesBaseline && !templateMatchesBaseline) return SECTION_STATUS.DRIFT;
  if (!currentMatchesBaseline && templateMatchesBaseline) return SECTION_STATUS.CUSTOMIZATION;
  return SECTION_STATUS.CONFLICT;
}
