// CAF-SDD-03g — a temp monorepo with every kind of agent file `curate` can meet: the known kinds,
// a per-app `implementation` agent for an app outside frontend/backend (apps/admin -> admin.md),
// and a custom read-only agent under a name no kind claims (caf-foo.md). Used once, from main
// before the ticket touched `src/`, to record test/fixtures/pre-sdd03g/, and on every test run.
import fs from 'node:fs';
import path from 'node:path';

import { audit } from '../../src/commands/audit.js';
import { agentsSync } from '../../src/commands/agents-sync.js';
import { checkDrafts } from '../../src/commands/check-drafts.js';
import { curateBaseline } from '../../src/commands/curate-baseline.js';
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { generateDrafts } from '../../src/steps/04-generate-drafts.js';
import { parseSections, sectionBody, replaceSectionBody } from '../../src/utils/agent-sections.js';
import { readManifest, writeManifest, setSectionBaseline } from '../../src/utils/generate-manifest.js';
import { hashSection } from '../../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './make-repo.js';
import { AGENT_DIR, fixtureDir, renderAgents } from './frozen-kinds.js';
import { silenced } from './mono-snapshot.js';

export const APP_AGENT = 'admin.md';
export const CUSTOM_AGENT = 'caf-foo.md';
export const STALE_OUTPUT = 'Stale output text from an older template.';

function write(dir, rel, content) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content, 'utf8');
}

/** Replace `## Output` of the agent with a stale text and record that text as the baseline: a DRIFT. */
export function makeDrift(dir, file, { header = 'Output' } = {}) {
  const rel = path.join(AGENT_DIR, file);
  const raw = fs.readFileSync(path.join(dir, rel), 'utf8');
  const { lines, sections } = parseSections(raw);
  const next = replaceSectionBody(lines, sections.find((s) => s.header === header), STALE_OUTPUT);
  fs.writeFileSync(path.join(dir, rel), next, 'utf8');
  const manifest = readManifest(dir);
  const parsed = parseSections(next);
  setSectionBaseline(manifest, rel, header, hashSection(sectionBody(parsed.lines, parsed.sections.find((s) => s.header === header))));
  writeManifest(dir, manifest);
}

/**
 * `{ dir, files }`: mono-pnpm plus apps/admin, CLAUDE.md & co, every known-kind agent, admin.md,
 * and caf-foo.md (the devops agent under an unknown name). `baseline: true` runs `curate baseline`.
 */
export async function makeKindsRepo({ baseline = true, custom = true } = {}) {
  const dir = copyFixture(fixtureDir('mono-pnpm'), 'caf-sdd03g-');
  write(
    dir,
    'apps/admin/package.json',
    JSON.stringify({ name: '@mono/admin', scripts: { build: 'vite build', lint: 'eslint .', test: 'vitest run' }, dependencies: { vite: '^5.0.0' } }, null, 2)
  );
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  await silenced(() => generateDrafts({ dir, dryRun: false, stack, tracker: { tracker: 'Linear' } }));

  const rendered = await renderAgents('mono-pnpm', { extraApps: ['apps/admin'], dir });
  const files = [];
  for (const { file, content } of Object.values(rendered)) {
    write(dir, path.join(AGENT_DIR, file), content);
    files.push(file);
  }
  if (!files.includes(APP_AGENT)) throw new Error(`expected ${APP_AGENT} among ${files.join(', ')}`);
  if (custom) {
    write(dir, path.join(AGENT_DIR, CUSTOM_AGENT), rendered.devops.content);
    files.push(CUSTOM_AGENT);
  }
  if (baseline) await silenced(() => curateBaseline({ dir, yes: true }));
  return { dir, files: files.sort() };
}

/** Strip the temp dir out of any value so a recording does not depend on where it ran. */
export function relativeTo(dir, value) {
  return JSON.parse(JSON.stringify(value).split(JSON.stringify(dir).slice(1, -1)).join('<repo>'));
}

/**
 * What `curate audit`, `curate sync --dry-run` and `curate --check-drafts` report for a repo made
 * by makeKindsRepo, plus the tree before and after (all three are read-only / dry).
 */
export async function reportKindsRepo(dir) {
  const before = snapshotTree(dir);
  const savedExitCode = process.exitCode;
  try {
    process.exitCode = undefined;
    const auditResult = await silenced(() => audit({ dir }));
    const auditExit = process.exitCode ?? 0;
    process.exitCode = undefined;
    const syncDryRun = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
    const check = await silenced(() => checkDrafts({ dir }));
    const checkExit = process.exitCode ?? 0;
    return {
      audit: relativeTo(dir, {
        layers: auditResult.layers,
        requiredGaps: auditResult.requiredGaps.length,
        optionalGaps: auditResult.optionalGaps.length,
        declined: auditResult.declined.length,
        sectionCounts: auditResult.sectionCounts,
        exit: auditExit,
      }),
      syncDryRun: relativeTo(dir, syncDryRun),
      checkDrafts: relativeTo(dir, { findings: check.findings, fails: check.fails, warns: check.warns, exit: checkExit }),
      unchanged: JSON.stringify(before) === JSON.stringify(snapshotTree(dir)),
    };
  } finally {
    process.exitCode = savedExitCode;
  }
}
