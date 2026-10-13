// Renders the implementation agents (CAF-SDD-03d): frontend and backend in MONOREPO, and in
// SINGLE_REPO the default `implementer` plus the one agent `--role frontend|backend` writes in its
// place. Same calls as `caf-init scaffold agents` (commands/agents.js). Used once (from main,
// before the ticket touched `src/`) to record test/fixtures/pre-sdd03d/, and on every test run.
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { buildSingleRepoCandidates } from '../../src/commands/agents.js';
import { matchVerifyScripts } from '../../src/utils/package-scripts.js';
import { buildAgentMd, agentSlug } from '../../src/templates/agent-md.js';
import { skillsForKind, skillPath } from '../../src/templates/skill-md.js';
import { fixtureDir, frontmatterTools, renderAgents, trackedSections } from './frozen-kinds.js';
import { silenced } from './mono-snapshot.js';

// Written out literally: `id` is the name of the golden file.
export const IMPLEMENTATION_CASES = [
  { id: 'frontend.mono-pnpm', kind: 'frontend', fixture: 'mono-pnpm', role: null },
  { id: 'backend.mono-pnpm', kind: 'backend', fixture: 'mono-pnpm', role: null },
  { id: 'implementer.single-nuxt', kind: 'implementer', fixture: 'single-nuxt', role: 'implementer' },
  { id: 'frontend.single-nuxt', kind: 'frontend', fixture: 'single-nuxt', role: 'frontend' },
  { id: 'backend.single-nuxt', kind: 'backend', fixture: 'single-nuxt', role: 'backend' },
];

/** The SINGLE_REPO implementation agent for `role`, with the given `## Skills` pointers. */
async function renderSingleRole(fixture, role, skills) {
  const dir = fixtureDir(fixture);
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const candidate = buildSingleRepoCandidates(stack.apps[0], [], role).find((c) => c.kind === role);
  const slug = agentSlug(candidate.kind, candidate.app);
  const content = buildAgentMd({
    name: candidate.name,
    role: candidate.role,
    scope: candidate.scope,
    scopeApps: null,
    scripts: matchVerifyScripts(dir, candidate.app.path),
    packageManager: candidate.app.packageManager || stack.packageManager,
    packageName: null,
    verifyApps: null,
    kind: candidate.kind,
    appNames: candidate.appNames,
    slug,
    skills,
  });
  return { file: `${slug}.md`, content };
}

/**
 * `{ [id]: { id, kind, fixture, role, file, tools, sections, content, contentWithSkills } }`.
 * `content` is rendered without `## Skills` (as renderAgents does); `contentWithSkills` is the
 * SINGLE_REPO render with every skill of the kind pointed at, `null` for MONOREPO.
 */
export async function renderImplementationAgents() {
  const out = {};
  for (const { id, kind, fixture, role } of IMPLEMENTATION_CASES) {
    const agent = role ? await renderSingleRole(fixture, role, []) : (await renderAgents(fixture))[kind];
    const withSkills = role ? await renderSingleRole(fixture, role, skillsForKind(kind).map(skillPath)) : null;
    out[id] = {
      id,
      kind,
      fixture,
      role,
      file: agent.file,
      tools: frontmatterTools(agent.content),
      sections: trackedSections(agent.content),
      content: agent.content,
      contentWithSkills: withSkills ? withSkills.content : null,
    };
  }
  return out;
}
