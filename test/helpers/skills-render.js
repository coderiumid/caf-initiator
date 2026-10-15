// What `scaffold skills` writes, the agents with their `## Skills` pointers, and the `curate`
// reports of a repo that holds the skills (CAF-SDD-03c2d). Real commands on a temp copy of a
// fixture. Used once, from main before the ticket touched `src/`, to record
// test/fixtures/pre-sdd03c2d/, and on every test run to compare.
import fs from 'node:fs';
import path from 'node:path';

import { skillsTarget } from '../../src/commands/skills.js';
import { checkDrafts } from '../../src/commands/check-drafts.js';
import { auditAgentDefinitions } from '../../src/commands/audit.js';
import { skillsForKind, skillPath, SKILLS_DIR } from '../../src/templates/skill-md.js';
import { AGENT_DIR, fixtureDir, renderAgents } from './frozen-kinds.js';
import { renderImplementationAgents } from './implementation-agents.js';
import { copyFixture, snapshotTree } from './make-repo.js';
import { silenced } from './mono-snapshot.js';

export const SKILL_FIXTURES = ['mono-pnpm', 'single-nuxt'];
export const SKILL_KINDS = ['frontend', 'backend', 'implementer', 'qa', 'validator'];

/** Every file under `.claude/skills/` after `scaffold skills` on a temp copy of the fixture. */
export async function renderSkillFiles(fixture) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-skills-golden-');
  await silenced(() => skillsTarget({ dir }));
  const files = {};
  for (const [rel, content] of Object.entries(snapshotTree(dir))) if (rel.startsWith(`${SKILLS_DIR}/`)) files[rel] = content;
  return files;
}

/** `{ [kind]: { file, content } }` of the SKILL_KINDS present in the fixture, each pointing at every skill of its kind. */
export async function renderAgentsWithSkills(fixture) {
  const all = await renderAgents(fixture, { skillsFor: (kind) => skillsForKind(kind).map(skillPath) });
  const out = {};
  for (const kind of SKILL_KINDS) if (all[kind]) out[kind] = all[kind];
  // SINGLE_REPO frontend/backend are `--role` agents, not part of renderAgents()
  if (fixture === 'single-nuxt') {
    const impl = await renderImplementationAgents();
    out.frontend = { file: impl['frontend.single-nuxt'].file, content: impl['frontend.single-nuxt'].contentWithSkills };
    out.backend = { file: impl['backend.single-nuxt'].file, content: impl['backend.single-nuxt'].contentWithSkills };
  }
  return out;
}

/** A repo that holds `files` (path → content) on top of a copy of the fixture. */
export function materialize(fixture, files) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-skills-old-');
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
  }
  return dir;
}

/** The repo of a scaffold from before the ticket: skills on disk, agents pointing at them. */
export async function renderOldSkillsRepoFiles(fixture) {
  const files = await renderSkillFiles(fixture);
  const agents = await renderAgentsWithSkills(fixture);
  for (const { file, content } of Object.values(agents)) files[`${AGENT_DIR}/${file}`] = content;
  return files;
}

/** `curate --check-drafts` findings and `curate audit` rollout warnings of `dir`, exit code untouched. */
export async function readCurateReports(dir) {
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const drafts = await silenced(() => checkDrafts({ dir }));
    const audit = auditAgentDefinitions(dir);
    const strip = (v) => JSON.parse(JSON.stringify(v).split(JSON.stringify(dir).slice(1, -1)).join('<repo>'));
    return strip({
      checkDrafts: { findings: drafts.findings, fails: drafts.fails, exitCode: process.exitCode ?? null },
      warnings: audit.warnings,
      entries: audit.entries,
    });
  } finally {
    process.exitCode = saved;
  }
}
