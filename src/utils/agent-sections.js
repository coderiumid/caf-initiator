import path from 'node:path';

import { buildInputSection, CAF_PREFIXED_KINDS } from '../templates/agent-md.js';

export const TEMPLATE_SECTION_ORDER = [
  'Role',
  'Scope',
  'Allowed Tools',
  'Input',
  'Output',
  'Working Pattern (PIV)',
  'Verify Checklist',
  'Retry Logic',
  // Auditor-only, and last on purpose — "Report Format" embeds a fenced report skeleton whose
  // literal `## ...` lines this (fence-unaware) parser would otherwise treat as real sections.
  'What to Look For',
  'Report Format',
];

// Sections we can safely regenerate default content for without instance-specific data
// (role/scope/verify scripts, all captured only at `caf-init scaffold agents` generation time and
// not recoverable from the file alone). Only "Input" qualifies today — its content depends
// solely on `kind`. Add new entries here as buildAgentMd grows sections that are kind-only.
// Shared by agents-sync.js (apply) and audit.js (read-only report) so the two never drift.
export const SYNCABLE_SECTIONS = {
  Input: (kind) => buildInputSection(kind),
};

// 'auditor', 'pm', 'ux-designer' added alongside the caf- rename: buildInputSection/
// buildOutputSection (or the discovery-commands.js equivalents for pm/ux-designer) already
// branch on these kinds with real content, so leaving any of them out of KNOWN_KINDS meant
// detectKind() misclassified that file as 'implementation' — a pre-existing gap that would
// otherwise corrupt curate section regen for the newly-renamed caf-auditor.md,
// caf-pm.md, and caf-ux-designer.md.
export const KNOWN_KINDS = ['planner', 'architect', 'frontend', 'backend', 'qa', 'reviewer', 'documentation', 'auditor', 'pm', 'ux-designer'];

export function detectKind(filename) {
  const stem = path.basename(filename, '.md');
  // Strip the caf- prefix only when the remainder is a kind we actually renamed — avoids
  // misreading an unrelated custom agent that happens to be named caf-<something>.md.
  const unprefixed = stem.startsWith('caf-') ? stem.slice(4) : stem;
  const slug = CAF_PREFIXED_KINDS.includes(unprefixed) ? unprefixed : stem;
  return KNOWN_KINDS.includes(slug) ? slug : 'implementation';
}

export function parseSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;
  lines.forEach((line, idx) => {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      if (current) current.endLine = idx;
      current = { header: m[1].trim(), startLine: idx };
      sections.push(current);
    }
  });
  if (current) current.endLine = lines.length;
  return { lines, sections };
}

export function sectionBody(lines, s) {
  return lines.slice(s.startLine + 1, s.endLine).join('\n').trim();
}

// Inserts a new "## header" block right after the nearest preceding section that's also in
// TEMPLATE_SECTION_ORDER, or before the nearest following one — so the file ends up matching
// the template's section order without disturbing any other section's content.
export function insertSection(lines, sections, header, body) {
  const orderIdx = TEMPLATE_SECTION_ORDER.indexOf(header);
  let insertAt = null;
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const idx = TEMPLATE_SECTION_ORDER.indexOf(sections[i].header);
    if (idx !== -1 && idx < orderIdx) {
      insertAt = sections[i].endLine;
      break;
    }
  }
  if (insertAt == null) {
    for (const s of sections) {
      const idx = TEMPLATE_SECTION_ORDER.indexOf(s.header);
      if (idx !== -1 && idx > orderIdx) {
        insertAt = s.startLine;
        break;
      }
    }
  }
  if (insertAt == null) insertAt = lines.length;
  const block = ['', `## ${header}`, body, ''];
  return [...lines.slice(0, insertAt), ...block, ...lines.slice(insertAt)].join('\n');
}
