import path from 'node:path';
import kleur from 'kleur';

import { section, readFileSafe, readJsonSafe, exists } from '../util.js';
import { SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody } from '../utils/agent-sections.js';
import { hashSection, compareSection, SECTION_STATUS } from '../utils/section-diff.js';
import { readManifest, getBaselineHash } from '../utils/generate-manifest.js';
import { findUnresolvedPlaceholders } from '../utils/placeholder-check.js';
import { detectRepoContext } from '../utils/repo-context.js';
import { listDraftFiles } from './complete-drafts.js';

// `caf-init curate --check-drafts` (CAF-COMPLETE-DRAFTS-01) — the deterministic fence around an
// AI (or a human) filling in caf-init's drafts. READ-ONLY: it never writes, not even the
// manifest. It checks only what code can check; whether the business content is *true* is not
// something this can know — that stays with the human reviewing the diff.
//
// FAIL (exit code 1): a rule was broken and the document must be corrected.
// WARN: can't be verified, or is only suspicious — a human should look.
// INFO: remaining work, not a problem.

const LEVEL = { FAIL: 'FAIL', WARN: 'WARN', INFO: 'INFO' };
const COLOR = { FAIL: kleur.red, WARN: kleur.yellow, INFO: kleur.dim };

// Every form utils/runner-command.js `verifyCommand` emits, plus the bare root form. Group names:
// `pkg` = workspace package name (absent → root scope), `script` = the script name.
const COMMAND_PATTERNS = [
  /^pnpm --filter (?<pkg>\S+) run (?<script>\S+)/,
  /^yarn workspace (?<pkg>\S+) run (?<script>\S+)/,
  /^bun run --filter (?<pkg>\S+) (?<script>\S+)/,
  /^npm run (?<script>\S+) --workspace (?<pkg>\S+)/,
  /^(?:pnpm|npm|yarn|bun) run (?<script>\S+)/,
];
// Anything else in that position is prose/a template (`TODO`, `<script>`, `...`), not a claim
// that a script exists.
const REAL_NAME = /^[A-Za-z0-9@][\w@/:.\-]*$/;

const SCRIPT_CHECKED = (rel, agentDir) =>
  rel === 'CLAUDE.md' || rel === '.caf/workflows/task-completion.md' || rel.startsWith(`${agentDir}/`);
const BANNER_EXPECTED = (rel) =>
  rel === 'CLAUDE.md' || rel === 'AGENTS.md' || rel.endsWith('/RULES.md') || rel.startsWith('docs/');
const PROSE_PATH_CHECKED = (rel) => rel === 'CLAUDE.md' || rel === 'AGENTS.md' || rel.startsWith('docs/');

// A backticked token that reads as a repo file path: has a folder and an extension, no
// wildcard/placeholder characters. Paths into CAF's own trees and docs/ are skipped — generated
// text points at optional documents there that legitimately may not exist.
const LOOKS_LIKE_PATH = /^(?!\.caf\/|\.claude\/|docs\/|https?:)[\w@.\-[\]()]+(?:\/[\w@.\-[\]()]+)+\.[A-Za-z0-9]{1,5}$/;

function backtickSpans(content) {
  return [...content.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
}

function parseCommand(span) {
  for (const pattern of COMMAND_PATTERNS) {
    const match = span.match(pattern);
    if (match) return { pkg: match.groups.pkg || null, script: match.groups.script };
  }
  return null;
}

function checkTrackedSections(dir, agentDir, agentFiles, findings) {
  const manifest = readManifest(dir);
  for (const rel of agentFiles) {
    const raw = readFileSafe(path.join(dir, rel));
    if (raw == null) continue;
    const kind = detectKind(rel);
    const { lines, sections } = parseSections(raw);
    const untracked = [];

    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      const template = SYNCABLE_SECTIONS[header](kind);
      if (template == null) continue; // not part of this kind's template
      const baselineHash = getBaselineHash(manifest, rel, header);
      const existing = sections.find((s) => s.header === header);

      if (!existing) {
        if (baselineHash != null) {
          findings.push({
            level: LEVEL.FAIL,
            file: rel,
            message: `tracked section \`## ${header}\` was removed — restore it (it had a recorded baseline)`,
          });
        }
        continue;
      }
      if (baselineHash == null) {
        untracked.push(header);
        continue;
      }
      const status = compareSection({
        baselineHash,
        currentHash: hashSection(sectionBody(lines, existing)),
        templateHash: hashSection(template),
      });
      if (status === SECTION_STATUS.CUSTOMIZATION || status === SECTION_STATUS.CONFLICT) {
        findings.push({
          level: LEVEL.FAIL,
          file: rel,
          message:
            `tracked section \`## ${header}\` changed since its baseline (${status}) — restore the original ` +
            'text; only Role, Scope and Verify Checklist are meant to be edited',
        });
      }
    }

    if (untracked.length > 0) {
      findings.push({
        level: LEVEL.WARN,
        file: rel,
        message:
          `no baseline for ${untracked.map((h) => `\`## ${h}\``).join(', ')} — cannot verify they are ` +
          'unchanged. Run `caf-init curate baseline` BEFORE the next AI edit to enable this check',
      });
    }
  }
}

function scriptIndex(dir, context) {
  const root = readJsonSafe(path.join(dir, 'package.json'));
  const byPackage = new Map();
  for (const app of context.apps) {
    if (app.path === '.') continue;
    const pkg = readJsonSafe(path.join(dir, app.path, 'package.json'));
    if (pkg?.name) byPackage.set(pkg.name, { path: app.path, scripts: Object.keys(pkg.scripts || {}) });
  }
  return { rootScripts: root ? Object.keys(root.scripts || {}) : null, byPackage };
}

function checkScripts(rel, content, index, findings) {
  const seen = new Set();
  for (const span of backtickSpans(content)) {
    const command = parseCommand(span);
    if (!command || !REAL_NAME.test(command.script) || command.script === 'TODO') continue;
    if (command.pkg && !REAL_NAME.test(command.pkg)) continue;
    if (seen.has(span)) continue;
    seen.add(span);

    if (command.pkg) {
      const pkg = index.byPackage.get(command.pkg);
      if (!pkg) {
        findings.push({
          level: LEVEL.FAIL,
          file: rel,
          message: `\`${span}\` — no workspace package named \`${command.pkg}\` was found`,
        });
      } else if (!pkg.scripts.includes(command.script)) {
        findings.push({
          level: LEVEL.FAIL,
          file: rel,
          message: `\`${span}\` — script \`${command.script}\` does not exist in ${pkg.path}/package.json`,
        });
      }
      continue;
    }
    if (index.rootScripts == null) {
      findings.push({ level: LEVEL.WARN, file: rel, message: `\`${span}\` — no root package.json to check this against` });
    } else if (!index.rootScripts.includes(command.script)) {
      findings.push({
        level: LEVEL.FAIL,
        file: rel,
        message: `\`${span}\` — script \`${command.script}\` does not exist in the root package.json`,
      });
    }
  }
}

// RULES.md is reference-based: the first column of its table is the real path of the golden
// example. A path that doesn't exist makes the whole entry meaningless, hence FAIL.
function checkRulesPaths(dir, rel, content, findings) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (!match) continue;
    if (!exists(path.join(dir, match[1]))) {
      findings.push({ level: LEVEL.FAIL, file: rel, message: `golden example path \`${match[1]}\` does not exist` });
    }
  }
}

function checkProsePaths(dir, rel, content, findings) {
  const missing = [...new Set(backtickSpans(content).filter((s) => LOOKS_LIKE_PATH.test(s)))].filter(
    (p) => !exists(path.join(dir, p))
  );
  for (const p of missing) {
    findings.push({
      level: LEVEL.WARN,
      file: rel,
      message: `\`${p}\` is cited but does not exist (fine if it is a deliberate "wrong" example)`,
    });
  }
}

/**
 * Run every check. Returns `{ findings, fails, warns }`; sets `process.exitCode = 1` when any
 * FAIL exists. Never writes.
 */
export async function checkDrafts({ dir, agentDir: agentDirOpt, repoMode }) {
  section('check-drafts — verify completed drafts against CAF rules (read-only, never writes)');

  const agentDir = (agentDirOpt || '.claude/agents').replace(/\/$/, '');
  const drafts = await listDraftFiles(dir, agentDir);
  const findings = [];

  if (drafts.length === 0) {
    console.log(kleur.yellow('  no draft found — nothing to check (run `caf-init scaffold` first)'));
    return { findings, fails: 0, warns: 0 };
  }

  const context = await detectRepoContext({ dir, mode: repoMode });
  const index = scriptIndex(dir, context);

  checkTrackedSections(
    dir,
    agentDir,
    drafts.filter((rel) => rel.startsWith(`${agentDir}/`)),
    findings
  );

  for (const rel of drafts) {
    const content = readFileSafe(path.join(dir, rel));
    if (content == null) continue;

    for (const placeholder of findUnresolvedPlaceholders(content)) {
      findings.push({ level: LEVEL.FAIL, file: rel, message: `unresolved placeholder ${placeholder}` });
    }
    if (SCRIPT_CHECKED(rel, agentDir)) checkScripts(rel, content, index, findings);
    if (rel.endsWith('/RULES.md')) checkRulesPaths(dir, rel, content, findings);
    if (PROSE_PATH_CHECKED(rel)) checkProsePaths(dir, rel, content, findings);
    if (BANNER_EXPECTED(rel) && !/DRAFT/.test(content.split(/\r?\n/).slice(0, 15).join('\n'))) {
      findings.push({
        level: LEVEL.WARN,
        file: rel,
        message: 'DRAFT banner is gone — fine only if a human reviewed this file and removed it on purpose',
      });
    }
    const todos = (content.match(/\bTODO\b/g) || []).length;
    if (todos > 0) findings.push({ level: LEVEL.INFO, file: rel, message: `${todos} TODO(s) still open` });
  }

  console.log('');
  for (const level of [LEVEL.FAIL, LEVEL.WARN, LEVEL.INFO]) {
    const group = findings.filter((f) => f.level === level);
    if (group.length === 0) continue;
    console.log(kleur.bold(level));
    for (const f of group) console.log(`  ${COLOR[level](level)} ${f.file} ${kleur.dim('—')} ${f.message}`);
    console.log('');
  }

  const fails = findings.filter((f) => f.level === LEVEL.FAIL).length;
  const warns = findings.filter((f) => f.level === LEVEL.WARN).length;
  console.log(kleur.bold('Summary'));
  console.log(`  ${drafts.length} draft(s) checked — ${fails} fail, ${warns} warn`);
  console.log(
    kleur.dim(
      '  This checks structure and verifiable facts only. Whether business context, PRD, ADR reasons and\n' +
        '  golden-example choices are TRUE is not checkable — review the diff yourself.'
    )
  );
  if (fails > 0) process.exitCode = 1;

  return { findings, fails, warns };
}
