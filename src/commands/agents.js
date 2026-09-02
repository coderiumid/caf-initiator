import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section } from '../util.js';
import { writeIfAbsentGuarded, reportCollisions } from '../utils/collision-check.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { detectTracker } from '../steps/03-detect-tracker.js';
import { matchVerifyScripts, readPackageName } from '../utils/package-scripts.js';
import { buildAgentMd, agentSlug } from '../templates/agent-md.js';
import { buildAuditScanMd, buildAuditToTicketMd } from '../templates/audit-commands.js';
import {
  buildDiscoveryStartMd,
  buildPmAgentMd,
  buildUxDesignerAgentMd,
} from '../templates/discovery-commands.js';
import { buildDiscoveryToTicketMd } from '../templates/discovery-to-ticket.js';
import {
  buildDesignTicketMd,
  buildPlanTicketMd,
  buildQaCheckMd,
  buildReviewTicketMd,
} from '../templates/ticket-preview-commands.js';
import { buildRunPipelineMd } from '../templates/run-pipeline-command.js';
import { buildFixReviewMd } from '../templates/fix-review-command.js';
import { buildReviewMd } from '../templates/review-command.js';

// Companion command preview manual per ticket-driven role. Deliberately only these four roles:
// Frontend/Backend write production code (collides with the orchestrator running in parallel),
// Documentation is non-blocking in the CAF design — see note in ticket-preview-commands.js.
// A manual path for Frontend/Backend exists, but via /caf-run-pipeline (opt-in + collision guard),
// not as a per-role preview command here.
const PREVIEW_COMMANDS = [
  { kind: 'planner', label: 'Planner', file: 'caf-plan-ticket.md', build: buildPlanTicketMd },
  { kind: 'architect', label: 'Architect', file: 'caf-design-ticket.md', build: buildDesignTicketMd },
  { kind: 'qa', label: 'QA', file: 'caf-qa-check.md', build: buildQaCheckMd },
  { kind: 'reviewer', label: 'Reviewer', file: 'caf-review-ticket.md', build: buildReviewTicketMd },
];

const CAF_WARNING = [
  'CAF.md: "Do not create every agent at once — start with Planner + 1 implementation agent."',
  'Recommendation: pick Planner + one implementation agent first, add other agents after that',
  'proves stable on 1-2 real tickets.',
  '',
  'Auditor is independent (proactive scan, does not wait for a ticket) — it can be picked any',
  'time without Planner. The recommendation above still applies to the normal ticket-driven flow.',
].join('\n');

// caf-orchestrator only recognizes these two fixed implementation roles (agents.modelOverrides
// in caf.config.yaml, and CAF.md's .claude/agents/caf-frontend.md / caf-backend.md convention).
// Do not add a third — that's an orchestrator limitation to report to the user, not to work
// around here. `role` here stays the bare kind ('frontend'/'backend') — agentSlug() in
// templates/agent-md.js applies the `caf-` filename prefix at write time.
const FIXED_ROLES = ['frontend', 'backend'];

function candidateApps(stack, appOpt) {
  if (!appOpt) return stack.apps;
  const app = stack.apps.find((a) => a.path === appOpt);
  if (!app) {
    console.log(kleur.red(`--app ${appOpt} not found in detected stack`));
    return [];
  }
  return [app];
}

// CAF-MULTIAPP-01: multiselect so a role can be assigned more than one app (e.g. caf-frontend
// covering both apps/web and apps/landing). This naturally also covers the old single-app
// "pick it or leave it unassigned" choice — no special-casing needed for apps.length === 1, a
// checkbox list with one item still lets the user pick zero or one.
async function pickRoleApps(apps) {
  const roleApp = {};
  for (const role of FIXED_ROLES) {
    if (apps.length === 0) {
      roleApp[role] = [];
      continue;
    }
    const { picked } = await prompts({
      type: 'multiselect',
      name: 'picked',
      message: `Pick the app(s) acting as "${role}" (leave empty if none — pick more than one if this role covers more than one app):`,
      instructions: false,
      choices: apps.map((a) => ({ title: `${a.name} (${a.path})`, value: a })),
    });
    roleApp[role] = picked || [];
  }
  return roleApp;
}

async function pickExtraApps(remaining) {
  if (remaining.length === 0) return [];

  console.log('');
  console.log(
    kleur.yellow(
      '⚠ The following apps are NOT registered as fixed roles (frontend/backend) known to\n' +
        '  caf-orchestrator. Agents for these apps can be generated for manual/direct Claude Code\n' +
        '  use, but will NOT be automatically invoked by caf-orchestrator unless you\n' +
        '  modify its routing yourself:'
    )
  );
  for (const app of remaining) {
    console.log(kleur.yellow(`  - ${app.path}${app.framework ? ` (${app.framework})` : ''}`));
  }
  console.log('');

  const { picked } = await prompts({
    type: 'multiselect',
    name: 'picked',
    message: 'Still generate agents for the apps above?',
    instructions: false,
    choices: remaining.map((a) => ({ title: `${a.name} (${a.path})`, value: a })),
  });
  return picked || [];
}

function roleAppLabel(app) {
  return `${app.path}${app.framework ? ` (${app.framework})` : ''}`;
}

function buildCandidates(roleApp, extraApps) {
  const implementationAppPaths = FIXED_ROLES.flatMap((role) => roleApp[role] || []).map((app) => app.path);

  const candidates = [
    {
      kind: 'planner',
      name: 'Planner',
      role: 'Breaks a ticket down into a concrete work plan and determines the order of agents involved.',
      scope: 'TODO: code/artifact area the Planner may read — decide manually.',
      app: null,
    },
    {
      kind: 'architect',
      name: 'Architect (optional, for complex tasks)',
      role: 'Designs the technical approach for tasks involving many components/architectural decisions.',
      scope: 'TODO: code/artifact area the Architect may read — decide manually.',
      app: null,
    },
  ];

  for (const role of FIXED_ROLES) {
    const apps = roleApp[role];
    if (!apps || apps.length === 0) continue;
    const labels = apps.map(roleAppLabel).join(', ');
    candidates.push({
      kind: role,
      apps,
      name: `${role[0].toUpperCase()}${role.slice(1)} (${labels})`,
      role: `Implements code changes in ${labels} per the Planner's plan (role: ${role}).`,
      scope: apps.length === 1 ? `\`${apps[0].path}/**\`` : apps.map((a) => `\`${a.path}/**\``).join(', '),
    });
  }

  for (const app of extraApps) {
    candidates.push({
      kind: 'implementation',
      app,
      name: `${app.path} agent${app.framework ? ` (${app.framework})` : ''} (outside caf-orchestrator routing)`,
      role: `Implements code changes in ${roleAppLabel(app)} per the Planner's plan.`,
      scope: `\`${app.path}/**\``,
    });
  }

  candidates.push(
    {
      kind: 'qa',
      name: 'QA',
      role: "Verifies the implementation meets the ticket's acceptance criteria.",
      scope: 'TODO: code/artifact area QA may read — decide manually.',
      app: null,
      appNames: implementationAppPaths,
    },
    {
      kind: 'reviewer',
      name: 'Reviewer',
      role: 'Reviews the implementation diff for quality, consistency, and risk before merge.',
      scope: 'TODO: code/artifact area the Reviewer may read — decide manually.',
      app: null,
      appNames: implementationAppPaths,
    },
    {
      kind: 'documentation',
      name: 'Documentation',
      role: 'Updates documentation (README, CHANGELOG, docs/) to match the changes made.',
      scope: 'TODO: code/artifact area Documentation may read — decide manually.',
      app: null,
    },
    {
      kind: 'auditor',
      name: 'Auditor',
      // CAF.md § Cluster 4 scope: functional bugs + tech debt/performance, exclude deep security
      // scanning. Keep this wording aligned with templates/audit-report-format.js.
      role:
        'Proactively scans the codebase to find functional bugs, performance issues, ' +
        'technical debt, test coverage gaps, and convention/ADR violations; proposes prioritized ' +
        'tasks (does not generate tickets directly — that is a human decision via /caf-audit-to-ticket). ' +
        'Deep security scanning is out of scope.',
      scope: 'TODO: code/artifact area the Auditor may read — decide manually.',
      app: null,
    },
    {
      kind: 'devops',
      name: 'DevOps (post-merge, next phase)',
      role: 'Handles deployment and infrastructure configuration after changes are merged.',
      scope: 'TODO: code/artifact area DevOps may read — decide manually.',
      app: null,
    },
    // Cluster 1 (Discovery). Neither role goes through buildAgentMd — their Tools and Verify
    // Checklist contracts differ (see templates/discovery-commands.js), so `role`/`scope` here
    // are only prompt labels, not used at generate time.
    {
      kind: 'pm',
      name: 'Product Manager (Discovery — Cluster 1)',
      role: 'Writes the PRD and assesses whether a UX Designer is needed for a feature, without touching code.',
      scope: '`.caf/discovery/{slug}/**`',
      app: null,
    },
    {
      kind: 'ux-designer',
      name: 'UX Designer (Discovery — only if Product Manager is also selected)',
      role: 'Breaks down the user interaction flow into flow.md for a feature.',
      scope: '`.caf/discovery/{slug}/**`',
      app: null,
    }
  );

  return candidates;
}

export async function agents({ dir, app: appOpt, agentDir: agentDirOpt, commandDir: commandDirOpt, dryRun = false }) {
  section('agents — draft agent definitions into .claude/agents/ (or equivalent)');

  console.log(kleur.yellow(CAF_WARNING));
  console.log('');

  const stack = await detectStack({ dir, explicitGlobs: undefined });
  const apps = candidateApps(stack, appOpt);

  const roleApp = await pickRoleApps(apps);
  const assignedPaths = new Set(Object.values(roleApp).flat().map((a) => a.path));
  const remaining = apps.filter((a) => !assignedPaths.has(a.path));
  const extraApps = await pickExtraApps(remaining);

  const candidates = buildCandidates(roleApp, extraApps);

  const { picked } = await prompts({
    type: 'multiselect',
    name: 'picked',
    message: 'Pick the agents to generate:',
    instructions: false,
    choices: candidates.map((c) => ({ title: c.name, value: c })),
  });

  if (!picked || picked.length === 0) {
    console.log(kleur.dim('no agents selected — done without generating'));
    return { written: [], skipped: [] };
  }

  // UX Designer doesn't stand alone outside the Discovery flow: without PM Agent there's no
  // prd.md to use as input, and no command that spawns it. That choice is dropped (not a total
  // abort) so other agents selected in the same run still get generated.
  let selected = picked;
  const pmPicked = selected.some((c) => c.kind === 'pm');
  const uxPicked = selected.some((c) => c.kind === 'ux-designer');
  if (uxPicked && !pmPicked) {
    console.log('');
    console.log(
      kleur.red(
        '✗ UX Designer was selected without Product Manager — not generated.\n' +
          '  UX Designer does not stand alone outside the Discovery flow: its input is prd.md from\n' +
          '  the PM Agent, and it is spawned by PM\'s /caf-discovery-start. Re-run\n' +
          '  `caf-init scaffold agents` and select Product Manager together with UX Designer.'
      )
    );
    selected = selected.filter((c) => c.kind !== 'ux-designer');
    if (selected.length === 0) {
      console.log(kleur.dim('no agents remaining — done without generating'));
      return { written: [], skipped: [] };
    }
  }
  const uxSelected = selected.some((c) => c.kind === 'ux-designer');

  const agentDirPath = path.join(dir, agentDirOpt || '.claude/agents');
  const relativeAgentDir = agentDirOpt || '.claude/agents';
  const commandDirPath = path.join(dir, commandDirOpt || '.claude/commands');

  // Auditor and PM both need the tracker for their companion command. Detection/prompting is
  // done only once — if both are selected in the same run, the user isn't asked twice.
  let trackerResolved = false;
  let tracker = null;
  const getTracker = async () => {
    if (!trackerResolved) {
      ({ tracker } = await detectTracker({ dir }));
      trackerResolved = true;
    }
    return tracker;
  };

  console.log('');
  const written = [];
  const skipped = [];
  const collisions = [];
  for (const candidate of selected) {
    // CAF-MULTIAPP-01: frontend/backend candidates carry `apps` (array, possibly >1) instead of
    // a single `app` — everything else (implementation/extraApps, and the whole-repo roles that
    // never had an app to begin with) is untouched, still single `app` or null.
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
        // Only meaningful in a monorepo: at root scope the bare `<pm> run <script>` form is right.
        packageName: stack.isMonorepo ? readPackageName(dir, app.path) : null,
        appPath: app.path,
      }));
    } else if (candidate.app) {
      scripts = matchVerifyScripts(dir, candidate.app.path);
      packageManager = candidate.app.packageManager || stack.packageManager;
      packageName = stack.isMonorepo ? readPackageName(dir, candidate.app.path) : null;
    }

    // Computed before the content: it is both the filename stem and the frontmatter `name`
    // Claude Code dispatches on, so the two must come from the same value. `candidate.app` is
    // undefined for frontend/backend candidates, but agentSlug() never reads it for those kinds
    // (only for 'implementation').
    const slug = agentSlug(candidate.kind, candidate.app);

    const content =
      candidate.kind === 'pm'
        ? buildPmAgentMd({ agentDir: relativeAgentDir, slug })
        : candidate.kind === 'ux-designer'
          ? buildUxDesignerAgentMd({ agentDir: relativeAgentDir, slug })
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
            });

    const filePath = path.join(agentDirPath, `${slug}.md`);
    const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);
  }

  console.log('');
  console.log(kleur.green(`generated ${written.length} agent definition draft(s) in ${agentDirPath}`));
  for (const filePath of written) {
    console.log(`  - ${filePath}`);
  }

  for (const preview of PREVIEW_COMMANDS) {
    if (!selected.some((c) => c.kind === preview.kind)) continue;

    console.log('');
    section(`${preview.label} selected — generate companion command (/${preview.file.replace(/\.md$/, '')})`);

    const content = preview.build({ agentDir: relativeAgentDir });
    const filePath = path.join(commandDirPath, preview.file);
    const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);

    console.log('');
    console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
  }

  // /caf-run-pipeline deliberately does NOT follow the PREVIEW_COMMANDS pattern (auto-generate
  // as soon as its role is selected). This command checks out a branch and writes production
  // code, and its biggest risk — colliding with a caf-orchestrator handling the same ticket —
  // cannot be detected from repo contents alone. So the generate decision is left to the human
  // via an explicit confirmation (default: no), the same pattern as the enforcement warning
  // in export.
  const plannerPicked = selected.some((c) => c.kind === 'planner');
  const implementationCandidates = selected.filter(
    (c) => c.kind === 'frontend' || c.kind === 'backend' || c.kind === 'implementation'
  );
  const implementationRoles = implementationCandidates.map((c) => agentSlug(c.kind, c.app));
  // role -> app path(s), for explicit commit scoping in /caf-run-pipeline (see plan.md
  // CAF-RUNPIPELINE-AUTOPR-01 section 3). Always an array now (CAF-MULTIAPP-01): frontend/backend
  // candidates carry `apps` (possibly >1), implementation/extraApps candidates carry a single
  // `app` — c.app.path is already '.' for a single-app non-monorepo repo (see 02-detect-stack.js).
  const appPaths = Object.fromEntries(
    implementationCandidates.map((c) => [agentSlug(c.kind, c.app), (c.apps || [c.app]).map((a) => a.path)])
  );

  if (plannerPicked && implementationRoles.length > 0) {
    console.log('');
    section('Planner + implementation agent(s) selected — offer the /caf-run-pipeline command (optional)');

    console.log(
      kleur.yellow(
        '⚠ /caf-run-pipeline runs the entire Cluster 2 pipeline in a single Claude Code session:\n' +
          '  checks out branch `ai-agent/{TICKET-ID}` and WRITES APPLICATION CODE via the\n' +
          '  implementation agent. This is the only command from caf-initiator that does both.\n' +
          '\n' +
          '  This command is for projects that do NOT yet use caf-orchestrator. If this project\n' +
          '  already uses the orchestrator, two code writers could handle the same ticket in\n' +
          '  parallel. The command has a guard (checks local + remote branch, checks verify-report.md\n' +
          '  for SUCCESS), but that guard cannot detect an orchestrator that just started and hasn\'t\n' +
          '  pushed its branch yet.\n' +
          '\n' +
          '  This command auto-commits/pushes/opens a PR when the final status is SUCCESS, without\n' +
          '  asking — no commit/push/PR at all if it ends in NEEDS_HUMAN.'
      )
    );
    console.log('');

    const { generateRunPipeline } = await prompts({
      type: 'confirm',
      name: 'generateRunPipeline',
      message: 'Generate /caf-run-pipeline?',
      initial: false,
    });

    if (generateRunPipeline) {
      const content = buildRunPipelineMd({
        agentDir: relativeAgentDir,
        implementationRoles,
        appPaths,
        hasArchitect: selected.some((c) => c.kind === 'architect'),
        hasDocumentation: selected.some((c) => c.kind === 'documentation'),
      });
      const filePath = path.join(commandDirPath, 'caf-run-pipeline.md');
      const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
      if (result === 'written') written.push(filePath);
      else if (result === 'skipped') skipped.push(filePath);

      console.log('');
      console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
    } else {
      console.log(kleur.dim('/caf-run-pipeline not generated'));
    }
  }

  // CAF-PRREVIEW-01 Checkpoint A: same pattern as /caf-run-pipeline (explicit opt-in, not
  // auto-generated as soon as Reviewer is selected) — its side effects are real on GitHub
  // (public reply to someone else's PR), not just writing a local file.
  const reviewerPicked = selected.some((c) => c.kind === 'reviewer');
  if (reviewerPicked) {
    console.log('');
    section('Reviewer selected — offer the /caf-fix-review command (optional)');

    console.log(
      kleur.yellow(
        '⚠ /caf-fix-review REPLIES TO OTHER PEOPLE\'S PRs ON GITHUB: fetches human reviewer\n' +
          '  comments on a PR, spawns caf-reviewer.md to assess FIXED/SKIPPED/NOT_APPLICABLE, then\n' +
          '  replies to the original comment + posts one summary comment — its side effects are\n' +
          '  public and real, not just writing a local file.\n' +
          '\n' +
          '  This command is the INTERACTIVE path (manual, user-triggered) for the Reviewer\n' +
          '  Agent\'s post-PR mode — different from the mandatory pre-PR gate caf-reviewer.md\n' +
          '  that already runs automatically in the pipeline. Automatic reactive triggering (a\n' +
          '  GitHub comment triggering itself, without a manual command) is a separate\n' +
          '  caf-orchestrator scope (not included here).\n' +
          '\n' +
          '  There is a permission whitelist check (write/maintain/admin) before this command\n' +
          '  processes anything — a user without that access is silently not responded to.'
      )
    );
    console.log('');

    const { generateFixReview } = await prompts({
      type: 'confirm',
      name: 'generateFixReview',
      message: 'Generate /caf-fix-review?',
      initial: false,
    });

    if (generateFixReview) {
      const content = buildFixReviewMd({ agentDir: relativeAgentDir });
      const filePath = path.join(commandDirPath, 'caf-fix-review.md');
      const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
      if (result === 'written') written.push(filePath);
      else if (result === 'skipped') skipped.push(filePath);

      console.log('');
      console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
    } else {
      console.log(kleur.dim('/caf-fix-review not generated'));
    }

    // A separate sub-task from /caf-fix-review above — INITIAL mode (a from-scratch review for
    // a PR that hasn't been reviewed yet), not fix mode (responding to human reviewer comments).
    // Two independent commands, deliberately not merged into one auto-mode-picking command.
    console.log('');
    section('Reviewer selected — offer the /caf-review command (optional)');

    console.log(
      kleur.yellow(
        '⚠ /caf-review CREATES A NEW PR REVIEW ON GITHUB: spawns caf-reviewer.md in INITIAL mode\n' +
          '  (full review from the PR diff, not a response to comments), then posts the result as\n' +
          '  one PR Review (APPROVE/REQUEST_CHANGES/COMMENT) — its side effects are public and\n' +
          '  real, not just writing a local file.\n' +
          '\n' +
          '  This command is for PRs that have NEVER been reviewed by anyone — different from\n' +
          '  /caf-fix-review (responding to human reviewer comments on a PR that HAS already\n' +
          '  been reviewed).\n' +
          '\n' +
          '  There is a permission whitelist check (write/maintain/admin) and an idempotency check\n' +
          '  (warns if this PR was already reviewed by this command before) before processing anything.'
      )
    );
    console.log('');

    const { generateReview } = await prompts({
      type: 'confirm',
      name: 'generateReview',
      message: 'Generate /caf-review?',
      initial: false,
    });

    if (generateReview) {
      const content = buildReviewMd({ agentDir: relativeAgentDir });
      const filePath = path.join(commandDirPath, 'caf-review.md');
      const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);
      if (result === 'written') written.push(filePath);
      else if (result === 'skipped') skipped.push(filePath);

      console.log('');
      console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
    } else {
      console.log(kleur.dim('/caf-review not generated'));
    }
  }

  const auditorPicked = selected.some((c) => c.kind === 'auditor');
  if (auditorPicked) {
    console.log('');
    section('Auditor selected — generate companion commands (/caf-audit-scan, /caf-audit-to-ticket)');

    const tracker = await getTracker();

    const scanContent = buildAuditScanMd({ agentDir: relativeAgentDir });
    const scanPath = path.join(commandDirPath, 'caf-audit-scan.md');
    const scanResult = writeIfAbsentGuarded(scanPath, scanContent, { dryRun }, collisions);
    if (scanResult === 'written') written.push(scanPath);
    else if (scanResult === 'skipped') skipped.push(scanPath);

    const ticketContent = buildAuditToTicketMd({ tracker, agentDir: relativeAgentDir });
    const ticketPath = path.join(commandDirPath, 'caf-audit-to-ticket.md');
    const ticketResult = writeIfAbsentGuarded(ticketPath, ticketContent, { dryRun }, collisions);
    if (ticketResult === 'written') written.push(ticketPath);
    else if (ticketResult === 'skipped') skipped.push(ticketPath);

    console.log('');
    console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
  }

  if (pmPicked) {
    console.log('');
    section('Product Manager selected — generate companion commands (/caf-discovery-start, /caf-discovery-to-ticket)');

    const tracker = await getTracker();

    const startContent = buildDiscoveryStartMd({
      agentDir: relativeAgentDir,
      hasUxDesigner: uxSelected,
    });
    const startPath = path.join(commandDirPath, 'caf-discovery-start.md');
    const startResult = writeIfAbsentGuarded(startPath, startContent, { dryRun }, collisions);
    if (startResult === 'written') written.push(startPath);
    else if (startResult === 'skipped') skipped.push(startPath);

    const discoveryTicketContent = buildDiscoveryToTicketMd({ tracker, agentDir: relativeAgentDir });
    const discoveryTicketPath = path.join(commandDirPath, 'caf-discovery-to-ticket.md');
    const discoveryTicketResult = writeIfAbsentGuarded(discoveryTicketPath, discoveryTicketContent, { dryRun }, collisions);
    if (discoveryTicketResult === 'written') written.push(discoveryTicketPath);
    else if (discoveryTicketResult === 'skipped') skipped.push(discoveryTicketPath);

    console.log('');
    console.log(kleur.green(`generated command draft(s) in ${commandDirPath}`));
  }

  reportCollisions(collisions);

  return { written, skipped };
}
