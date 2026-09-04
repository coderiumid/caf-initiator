import path from 'node:path';

import {
  buildInputSection,
  buildOutputSection,
  buildToolsSection,
  buildWorkingPatternSection,
  buildRetryLogicSection,
  buildWhatToLookForSection,
  buildReportFormatSection,
  DISCOVERY_KINDS,
} from '../templates/agent-md.js';

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
// not recoverable from the file alone). Every section here is either kind-only (Allowed Tools,
// Input, Output, What to Look For, Report Format) or fully constant (Working Pattern, Retry
// Logic) — CAF-CURATE-DIFF-01 extended this from "Input" alone specifically so content drift in
// Retry Logic (the CDR-38 case: a template fix to the SUCCESS-literal instruction) is detectable
// and auto-syncable, not just missing-section presence. Role/Scope/Verify Checklist are excluded
// on purpose — they embed real per-project data captured only at generation time.
// A builder may return null for a given kind (e.g. auditor-only sections for a non-auditor kind)
// to mean "this section isn't part of that kind's template at all" — callers must skip it, not
// treat it as a content mismatch. Shared by agents-sync.js (apply) and audit.js (read-only
// report) so the two never drift.
// Sections whose builders have no real Discovery (pm/ux-designer) branch yet, so for those kinds
// they are held back — the builder is treated as returning null ("not part of this kind's
// template"), exactly like the auditor-only sections are for a non-auditor kind.
//
// Why this guard exists (CAF-RETRYLOGIC-01): caf-pm.md/caf-ux-designer.md are rendered by
// discovery-commands.js, not buildAgentMd, and these builders answer for `kind` 'pm'/
// 'ux-designer' with generic Cluster 2 defaults that are wrong for a Discovery agent:
//   - buildToolsSection    → the default `[Read]` + human-decision TODO, dropping the Discovery
//                            tools contract INCLUDING its no-write-to-tracker prohibition
//   - buildInputSection    → the 'TODO: which artifact is received…' fallback
//   - buildOutputSection   → the 'TODO: which artifact is produced…' fallback (no ARTIFACT_BY_ROLE
//                            entry for pm/ux-designer)
// A correctly-generated Discovery agent would therefore read as DRIFT on these and be overwritten
// by `curate sync`. Holding them back makes them UNTRACKED for Discovery kinds: curate reports
// nothing and writes nothing, which is correct-but-incomplete rather than destructive.
// `Retry Logic` is NOT in this list — buildRetryLogicSection(kind) has a real Discovery branch, so
// it is compared normally for every kind.
//
// `Working Pattern (PIV)` was guarded here too until the header-mismatch fix (the Discovery
// heading was `## Work Pattern (PIV)`, one word short, which made curate INSERT a second,
// duplicate section instead of comparing the existing one). Now that discoveryAgentMd() emits the
// canonical `## Working Pattern (PIV)` heading, the section is trackable again — it goes back to
// UNTRACKED-until-baselined like everything else, not permanently held back. Its body wording is
// still Discovery-specific (mentions documents, not code) and differs from
// buildWorkingPatternSection()'s generic text; once baselined, a `curate sync` would normalize it
// to the generic wording. That's a content question, not a corruption risk (no security/behavior
// contract is lost the way Allowed Tools would lose the no-write-to-tracker rule), so it's left
// for CAF-DISCOVERY-SECTIONS-01 rather than re-guarded here.
//
// This is a stopgap, not the end state. Giving the three remaining builders genuine Discovery
// content is tracked in `.ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md` — deleting an entry
// from this list is how that ticket lands, one section at a time.
const DISCOVERY_GUARDED_SECTIONS = ['Allowed Tools', 'Input', 'Output'];

function guardDiscovery(header, build) {
  return (kind) => {
    if (DISCOVERY_KINDS.includes(kind) && DISCOVERY_GUARDED_SECTIONS.includes(header)) return null;
    return build(kind);
  };
}

export const SYNCABLE_SECTIONS = {
  'Allowed Tools': guardDiscovery('Allowed Tools', (kind) => buildToolsSection(kind)),
  Input: guardDiscovery('Input', (kind) => buildInputSection(kind)),
  Output: guardDiscovery('Output', (kind) => buildOutputSection(kind)),
  'Working Pattern (PIV)': () => buildWorkingPatternSection(),
  'Retry Logic': (kind) => buildRetryLogicSection(kind),
  'What to Look For': (kind) => buildWhatToLookForSection(kind),
  'Report Format': (kind) => buildReportFormatSection(kind),
};

// 'auditor', 'pm', 'ux-designer' added alongside the caf- rename: buildInputSection/
// buildOutputSection (or the discovery-commands.js equivalents for pm/ux-designer) already
// branch on these kinds with real content, so leaving any of them out of KNOWN_KINDS meant
// detectKind() misclassified that file as 'implementation' — a pre-existing gap that would
// otherwise corrupt curate section regen for the newly-renamed caf-auditor.md,
// caf-pm.md, and caf-ux-designer.md.
// 'devops' added at CAF-DEVOPS-KIND-01: without it, detectKind('caf-devops.md') misclassified as
// 'implementation' and a curate sync could overwrite a correctly-generated read-only devops
// agent's Allowed Tools with implementation's Read+Write+Edit+Bash (privilege escalation).
// No entry was added to a guard list for devops: buildToolsSection('devops')
// (templates/agent-md.js TOOLS_BY_KIND/TOOLS_RATIONALE) is already kind-aware and correct
// (Read+Bash) once detectKind() routes here correctly — nothing left to guard. buildInputSection/
// buildOutputSection have no devops branch and fall through to their generic constant TODO
// fallback (no ARTIFACT_BY_ROLE.devops entry), which is honest ("not yet defined") and never
// carries real content to lose, unlike the Discovery case this pattern was built for.
export const KNOWN_KINDS = ['planner', 'architect', 'frontend', 'backend', 'qa', 'reviewer', 'documentation', 'auditor', 'pm', 'ux-designer', 'devops'];

export function detectKind(filename) {
  const stem = path.basename(filename, '.md');
  // Strip the caf- prefix only when the remainder is a kind we actually renamed — avoids
  // misreading an unrelated custom agent that happens to be named caf-<something>.md. Checked
  // against KNOWN_KINDS rather than CAF_PREFIXED_KINDS (a strict subset — 'devops' isn't in
  // CAF_PREFIXED_KINDS because agentSlug() doesn't generate a caf-devops.md name yet) so a
  // manually-named or future-renamed caf-devops.md is still recognized (CAF-DEVOPS-KIND-01).
  const unprefixed = stem.startsWith('caf-') ? stem.slice(4) : stem;
  const slug = KNOWN_KINDS.includes(unprefixed) ? unprefixed : stem;
  return KNOWN_KINDS.includes(slug) ? slug : 'implementation';
}

export function parseSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;
  let inFencedBlock = false;
  lines.forEach((line, idx) => {
    // A `## ...` line inside a fenced code block (e.g. the report skeleton embedded in
    // caf-auditor.md's "Report Format" section) is example content, not a real section
    // boundary — see CAF-SECTIONPARSE-01.
    if (/^```/.test(line)) {
      inFencedBlock = !inFencedBlock;
      return;
    }
    if (inFencedBlock) return;
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

/**
 * Replaces the body of an existing `## header` block in place, leaving the heading line and
 * every other section byte-for-byte untouched. Only ever called for sections that compared as
 * DRIFT (file content provably unchanged since the last baseline) — see agents-sync.js.
 * Preserves the original block's trailing blank lines so replacing a section never reflows
 * the spacing of the sections around it.
 */
export function replaceSectionBody(lines, s, body) {
  const original = lines.slice(s.startLine + 1, s.endLine);
  let trailingBlanks = 0;
  for (let i = original.length - 1; i >= 0 && original[i].trim() === ''; i -= 1) trailingBlanks += 1;
  const replacement = [...body.split('\n'), ...Array(trailingBlanks).fill('')];
  return [...lines.slice(0, s.startLine + 1), ...replacement, ...lines.slice(s.endLine)].join('\n');
}
