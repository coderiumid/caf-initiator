import { buildClaudeMd } from '../templates/claude-md.js';
import { buildAgentsMd } from '../templates/agents-md.js';
import { buildAgentHandoffMd } from '../templates/agent-handoff-md.js';
import { buildPivWorkflowMd } from '../templates/piv-workflow-md.js';
import { buildTaskCompletionMd } from '../templates/task-completion-md.js';
import { extractHeaders } from './section-headers.js';

// Dummy roster used only to read `## Header` names out of the templates below — never
// written anywhere. Every role marked present so every conditionally-rendered structural
// header shows up in the canonical list.
const DUMMY_ROSTER = {
  known: [
    { slug: 'planner', label: 'Planner', present: true },
    { slug: 'architect', label: 'Architect', present: true },
    { slug: 'frontend', label: 'Frontend', present: true },
    { slug: 'backend', label: 'Backend', present: true },
    { slug: 'qa', label: 'QA', present: true },
    { slug: 'reviewer', label: 'Reviewer', present: true },
    { slug: 'documentation', label: 'Documentation', present: true },
  ],
  custom: [],
};

/**
 * Section headers a freshly-generated draft of `kind` would contain, read straight off the
 * real template functions (not hand-copied) so this can't drift from templates/*.js. Dummy
 * args are chosen so every structurally-always-present section renders; `task-completion-md`
 * gets all scripts "found" so its conditional gap-notes section (present only when a verify
 * script is missing in the *target* repo, not a fixed structural section) is excluded from
 * the canonical list on purpose.
 */
export function canonicalHeaders(kind) {
  switch (kind) {
    case 'claude-md':
      return extractHeaders(buildClaudeMd({ isMonorepo: false, monorepoTool: null, packageManager: null, apps: [], database: [], tracker: null }));
    case 'agents-md':
      return extractHeaders(buildAgentsMd({ tracker: null }));
    case 'agent-handoff-md':
      return extractHeaders(buildAgentHandoffMd({ roster: DUMMY_ROSTER }));
    case 'piv-workflow-md':
      return extractHeaders(
        buildPivWorkflowMd({ agentDir: '.claude/agents', roster: DUMMY_ROSTER, qaRetries: null, reviewerRetries: null })
      );
    case 'task-completion-md':
      return extractHeaders(
        buildTaskCompletionMd({
          scripts: { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' },
          packageManager: 'npm',
          scope: null,
        })
      );
    default:
      return [];
  }
}
