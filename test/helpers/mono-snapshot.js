// Renders everything the MONOREPO path produces for test/fixtures/mono-pnpm, as one plain object.
// Used twice: once (from `main`, before CAF-INIT-SINGLE-REPO touched any code) to record
// test/fixtures/snapshots/mono-pnpm.json, and on every test run to prove the MONOREPO path still
// renders byte-identical output. Only fields that existed before the change are captured, so new
// additive fields (e.g. `mode`) don't make the comparison meaningless.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectStack } from '../../src/steps/02-detect-stack.js';
import { buildCandidates } from '../../src/commands/agents.js';
import { matchVerifyScripts, readPackageName } from '../../src/utils/package-scripts.js';
import { buildAgentMd, agentSlug } from '../../src/templates/agent-md.js';
import { buildClaudeMd } from '../../src/templates/claude-md.js';
import { buildAgentsMd } from '../../src/templates/agents-md.js';
import { buildTasksReadme } from '../../src/templates/tasks-readme.js';
import { buildRunPipelineMd } from '../../src/templates/run-pipeline-command.js';
import { buildTaskCompletionMd } from '../../src/templates/task-completion-md.js';
import { buildPivWorkflowMd } from '../../src/templates/piv-workflow-md.js';
import { buildAgentHandoffMd } from '../../src/templates/agent-handoff-md.js';
import { readAgentRoster } from '../../src/utils/read-agent-roster.js';

export const MONO_FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'mono-pnpm');

export async function silenced(fn) {
  const original = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = original;
  }
}

export async function renderMonoSnapshot(detectOpts = {}) {
  const dir = MONO_FIXTURE;
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined, ...detectOpts }));
  const sortedApps = [...stack.apps].sort((a, b) => a.path.localeCompare(b.path));
  const legacyStack = {
    isMonorepo: stack.isMonorepo,
    monorepoTool: stack.monorepoTool,
    packageManager: stack.packageManager,
    apps: sortedApps,
    database: stack.database,
    confidence: stack.confidence,
  };

  const web = sortedApps.find((a) => a.path === 'apps/web');
  const api = sortedApps.find((a) => a.path === 'apps/api');
  const candidates = buildCandidates({ frontend: [web], backend: [api] }, []);

  const agentFiles = {};
  for (const candidate of candidates) {
    if (candidate.kind === 'pm' || candidate.kind === 'ux-designer') continue;
    const verifyApps = candidate.apps
      ? candidate.apps.map((app) => ({
          scripts: matchVerifyScripts(dir, app.path),
          packageManager: app.packageManager || stack.packageManager,
          packageName: stack.isMonorepo ? readPackageName(dir, app.path) : null,
          appPath: app.path,
        }))
      : null;
    const slug = agentSlug(candidate.kind, candidate.app);
    agentFiles[`${slug}.md`] = buildAgentMd({
      name: candidate.name,
      role: candidate.role,
      scope: candidate.scope,
      scopeApps: candidate.apps || null,
      scripts: null,
      packageManager: null,
      packageName: null,
      verifyApps,
      kind: candidate.kind,
      appNames: candidate.appNames,
      slug,
    });
  }

  // Roster as `scaffold workflow` reads it: from the agent files on disk.
  const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-mono-roster-'));
  for (const [file, content] of Object.entries(agentFiles)) fs.writeFileSync(path.join(agentDir, file), content);
  const roster = readAgentRoster(agentDir);

  return {
    stack: legacyStack,
    files: {
      'CLAUDE.md': buildClaudeMd({ ...legacyStack, tracker: 'Linear' }),
      'AGENTS.md': buildAgentsMd({ tracker: 'Linear' }),
      '.caf/tasks/README.md': buildTasksReadme({ tracker: 'Linear' }),
      '.claude/commands/caf-run-pipeline.md': buildRunPipelineMd({
        agentDir: '.claude/agents',
        implementationRoles: ['caf-frontend', 'caf-backend'],
        appPaths: { 'caf-frontend': ['apps/web'], 'caf-backend': ['apps/api'] },
        hasArchitect: true,
        hasDocumentation: true,
      }),
      '.caf/workflows/task-completion.md': buildTaskCompletionMd({
        scripts: matchVerifyScripts(dir, 'apps/api'),
        packageManager: api.packageManager || stack.packageManager,
        packageName: readPackageName(dir, 'apps/api'),
        scope: '@mono/api (apps/api)',
      }),
      '.caf/workflows/piv-workflow.md': buildPivWorkflowMd({
        agentDir: '.claude/agents',
        roster,
        qaRetries: null,
        reviewerRetries: null,
      }),
      '.caf/workflows/agent-handoff.md': buildAgentHandoffMd({ roster }),
      ...Object.fromEntries(Object.entries(agentFiles).map(([k, v]) => [`.claude/agents/${k}`, v])),
    },
  };
}
