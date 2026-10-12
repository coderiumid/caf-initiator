// Shared renderer for the kind guard tests (CAF-SDD-03a). Renders every agent candidate for a
// fixture through the same calls `caf-init scaffold agents` makes (commands/agents.js), so the
// tests and the golden files in test/fixtures/frozen-kinds/ see exactly what a real run writes.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectStack } from '../../src/steps/02-detect-stack.js';
import { buildCandidates, buildSingleRepoCandidates } from '../../src/commands/agents.js';
import { matchVerifyScripts, readPackageName } from '../../src/utils/package-scripts.js';
import { buildAgentMd, agentSlug } from '../../src/templates/agent-md.js';
import { buildPmAgentMd, buildUxDesignerAgentMd } from '../../src/templates/discovery-commands.js';
import { SYNCABLE_SECTIONS, parseSections, sectionBody } from '../../src/utils/agent-sections.js';
import { silenced } from './mono-snapshot.js';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

export const FIXTURE_NAMES = ['mono-pnpm', 'single-nuxt'];
export const GOLDEN_DIR = path.join(FIXTURES_DIR, 'frozen-kinds');
export const AGENT_DIR = '.claude/agents';

export function fixtureDir(fixture) {
  return path.join(FIXTURES_DIR, fixture);
}

// Written out literally on purpose (requirements A3): deriving this from KNOWN_KINDS would let a
// kind silently drop out of the freeze. `implementer` only exists in SINGLE_REPO, so it is
// frozen on single-nuxt only.
export const FROZEN = [
  { kind: 'qa', fixture: 'mono-pnpm' },
  { kind: 'qa', fixture: 'single-nuxt' },
  { kind: 'documentation', fixture: 'mono-pnpm' },
  { kind: 'documentation', fixture: 'single-nuxt' },
  { kind: 'architect', fixture: 'mono-pnpm' },
  { kind: 'architect', fixture: 'single-nuxt' },
  { kind: 'devops', fixture: 'mono-pnpm' },
  { kind: 'devops', fixture: 'single-nuxt' },
  { kind: 'auditor', fixture: 'mono-pnpm' },
  { kind: 'auditor', fixture: 'single-nuxt' },
  { kind: 'pm', fixture: 'mono-pnpm' },
  { kind: 'pm', fixture: 'single-nuxt' },
  { kind: 'ux-designer', fixture: 'mono-pnpm' },
  { kind: 'ux-designer', fixture: 'single-nuxt' },
  { kind: 'implementer', fixture: 'single-nuxt' },
];

/**
 * `{ [kind]: { file, content } }` for every candidate `scaffold agents` would offer (hidden ones
 * included) in the given fixture. MONOREPO assigns apps/web to frontend and apps/api to backend,
 * as test/helpers/mono-snapshot.js does; SINGLE_REPO uses the default `implementer` role.
 */
export async function renderAgents(fixture) {
  const dir = fixtureDir(fixture);
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));

  let candidates;
  if (stack.isMonorepo) {
    const web = stack.apps.find((a) => a.path === 'apps/web');
    const api = stack.apps.find((a) => a.path === 'apps/api');
    candidates = buildCandidates({ frontend: [web], backend: [api] }, []);
  } else {
    candidates = buildSingleRepoCandidates(stack.apps[0], [], 'implementer');
  }

  const out = {};
  for (const candidate of candidates) {
    let scripts = null;
    let packageManager = null;
    let packageName = null;
    let scopeApps = null;
    let verifyApps = null;

    if (candidate.apps) {
      scopeApps = candidate.apps;
      verifyApps = candidate.apps.map((app) => ({
        scripts: matchVerifyScripts(dir, app.path),
        packageManager: app.packageManager || stack.packageManager,
        packageName: stack.isMonorepo ? readPackageName(dir, app.path) : null,
        appPath: app.path,
      }));
    } else if (candidate.app) {
      scripts = matchVerifyScripts(dir, candidate.app.path);
      packageManager = candidate.app.packageManager || stack.packageManager;
      packageName = stack.isMonorepo ? readPackageName(dir, candidate.app.path) : null;
    }

    const slug = agentSlug(candidate.kind, candidate.app);
    const content =
      candidate.kind === 'pm'
        ? buildPmAgentMd({ agentDir: AGENT_DIR, slug })
        : candidate.kind === 'ux-designer'
          ? buildUxDesignerAgentMd({ agentDir: AGENT_DIR, slug })
          : buildAgentMd({
              name: candidate.name,
              role: candidate.role,
              scope: candidate.scope,
              scopeApps,
              scripts,
              packageManager,
              packageName,
              verifyApps,
              kind: candidate.kind,
              appNames: candidate.appNames,
              slug,
              skills: [],
            });
    out[candidate.kind] = { file: `${slug}.md`, content };
  }
  return out;
}

/** The frontmatter `tools:` list of a rendered agent file, e.g. `['Read', 'Bash']`. */
export function frontmatterTools(content) {
  const frontmatter = content.split(/^---$/m)[1] || '';
  const m = frontmatter.match(/^tools:\s*\[(.*)\]\s*$/m);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** `{ header: body }` for every tracked (SYNCABLE_SECTIONS) section present in the file. */
export function trackedSections(content) {
  const { lines, sections } = parseSections(content);
  const out = {};
  for (const header of Object.keys(SYNCABLE_SECTIONS)) {
    const s = sections.find((x) => x.header === header);
    if (s) out[header] = sectionBody(lines, s);
  }
  return out;
}

/** What a golden file records for one kind + fixture: the parts `curate sync` can overwrite. */
export function goldenOf({ kind, fixture, file, content }) {
  return { kind, fixture, file, tools: frontmatterTools(content), sections: trackedSections(content) };
}

export function goldenPath(kind, fixture) {
  return path.join(GOLDEN_DIR, `${kind}.${fixture}.json`);
}
