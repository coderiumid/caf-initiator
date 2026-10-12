// CAF-SDD-03b3 — the `/caf-plan` command (hidden) and the spec-aware `/caf-review` and
// `/caf-fix-review`.
//
// `/caf-plan` is a complete builder that no scaffold run writes: until the ticket that connects
// it, `buildPlanMd()` is only reached from here. The two review commands change inside sections
// they already had (T1(e)); every other command is the one recorded in
// test/fixtures/pre-sdd03b3/ before this ticket touched `src/` (never regenerate it).
// Every scaffold and `curate sync` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildPlanMd, PLAN_COMMAND_NAME } from '../src/templates/plan-command.js';
import { buildFixReviewMd } from '../src/templates/fix-review-command.js';
import { buildReviewMd } from '../src/templates/review-command.js';
import { SKILL_NAMES } from '../src/templates/skill-md.js';
import { writeIfAbsent } from '../src/util.js';
import { readManifest } from '../src/utils/generate-manifest.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { FIXTURE_NAMES, fixtureDir } from './helpers/frozen-kinds.js';
import { COMMAND_DIR, commandSections, renderCommands } from './helpers/commands-render.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const SRC = path.join(HERE, '..', 'src');
const AGENT_DIR = '.claude/agents';

// Recorded from main before this ticket touched src/ (T2). Never regenerated.
const OLD = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd03b3', `commands.${f}.json`), 'utf8')).files])
);

// T1(a): the 13 commands a full scaffold writes, in both fixtures.
const COMMAND_FILES = [
  'caf-audit-scan.md',
  'caf-audit-to-ticket.md',
  'caf-complete-drafts.md',
  'caf-design-ticket.md',
  'caf-discovery-start.md',
  'caf-discovery-to-ticket.md',
  'caf-feature-catalog-sync.md',
  'caf-fix-review.md',
  'caf-plan-ticket.md',
  'caf-qa-check.md',
  'caf-review-ticket.md',
  'caf-review.md',
  'caf-run-pipeline.md',
];
const CHANGED_FILES = ['caf-fix-review.md', 'caf-review.md'];

// T1(e): the sections of the two commands that change. Nothing else in them may.
const REVIEW_CHANGED = [
  '1. Read Task Artifacts (optional, best-effort)',
  '3. Spawn `caf-reviewer` (`.claude/agents/caf-reviewer.md`) — INITIAL mode',
  '4. Post GitHub PR Review',
  '5. Summary to the User',
];
const FIX_REVIEW_CHANGED = ['4. Spawn `caf-reviewer` (`.claude/agents/caf-reviewer.md`)', '6. Summary to User', 'Constraints'];

const REVIEW_HEADERS = [
  '0. Permission Check (REQUIRED, before any step below)',
  '0.5 Resolve PR Number & TICKET-ID',
  '0.7 Check for an Existing Review (idempotency)',
  '1. Read Task Artifacts (optional, best-effort)',
  '2. Fetch the PR Diff',
  '3. Spawn `caf-reviewer` (`.claude/agents/caf-reviewer.md`) — INITIAL mode',
  '4. Post GitHub PR Review',
  '5. Summary to the User',
  'Constraints',
];
const FIX_REVIEW_HEADERS = [
  '0. Permission Check (REQUIRED, before any step below)',
  '0.5 PR Number Resolution',
  '1. Fetch Comments',
  '2. Show the List',
  '3. User Chooses',
  '4. Spawn `caf-reviewer` (`.claude/agents/caf-reviewer.md`)',
  '5. Reply & Post Summary',
  '6. Summary to User',
  'Constraints',
];

// T1(d), Q-2: what caf-orchestrator's webhook path mirrors or parses. Written out literally; each
// line must be in the command exactly as often as it was before this ticket.
const REVIEW_MARKERS = [
  'allowed-tools: Read, Grep, Glob, Task, Bash(gh pr view:*), Bash(gh pr list:*), Bash(gh pr diff:*), Bash(gh repo view:*), Bash(gh api user:*), Bash(gh api repos/*/collaborators/*/permission:*), Bash(gh api repos/*/pulls/*/reviews:*)',
  'argument-hint: [PR-number, e.g. "81"]',
  'The `$ARGUMENTS` argument is a **PR number** (e.g. `81`), **NOT a TICKET-ID** — consistent',
  '> Do not `git push`, do not call `gh api` at all against GitHub, do not change ticket status in the tracker, do not fix any code — write `review-notes.md` only, in the usual format (Verdict, Security Audit, Qualitative Review, etc). Communicating back to GitHub (posting the PR Review) is the job of this command\'s main thread, done after you finish.',
  '- **Explicit mode: INITIAL** — a FULL review of this PR\'s diff from scratch, using the same',
  '- `commentContext = []` (empty array, as-is — no comments to carry over, unlike',
  '- Instructions to write `.caf/tasks/{TICKET-ID}/review-notes.md` — format EXACTLY as defined',
  '  in `.claude/agents/caf-reviewer.md` (Ticket, Agent, Verdict, Security Audit, Qualitative Review,',
  '  Verdict Rationale, For Developer) — **don\'t invent a new structure**, reuse the existing one.',
  '| Verdict (review-notes.md) | GitHub `event` |',
  '| APPROVE | `APPROVE` |',
  '| CHANGES REQUESTED | `REQUEST_CHANGES` |',
  '| DEFER | `COMMENT` |',
  'gh api repos/{owner}/{repo}/pulls/{number}/reviews -X POST \\',
  '  -f event="{APPROVE|REQUEST_CHANGES|COMMENT}" \\',
  '  -f body="{summary}" \\',
];
const FIX_REVIEW_MARKERS = [
  'allowed-tools: Read, Grep, Glob, Task, Bash(git branch:*), Bash(gh pr list:*), Bash(gh pr view:*), Bash(gh repo view:*), Bash(gh api:*)',
  'argument-hint: [PR-number, example: "81"]',
  'The `$ARGUMENTS` argument is a **PR number** (e.g. `81`), **NOT a TICKET-ID** — different from',
  '> Do not `git push`, do not call any `gh api` against GitHub, do not change ticket status in the tracker — only write `fix-review-log.md`. Communicating back to GitHub is the main thread\'s job for this command, done after you finish.',
  '- Instruction to write `.caf/tasks/{TICKET-ID}/fix-review-log.md` with the format:',
  '  ## Fix Review Log — {TICKET-ID}',
  '  Generated: {timestamp}',
  '  Triggered by: {mode: scoped | global}',
  '  ### Comment {comment_id or url} [{INLINE path:line | GENERAL}]',
  '  > {original comment quote, truncated if long}',
  '  Status: FIXED | SKIPPED | NOT_APPLICABLE',
  '  Notes: {brief reason, required especially for SKIPPED/NOT_APPLICABLE}',
  '  gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies -f body="{status + notes}"',
  'gh api repos/{owner}/{repo}/issues/{number}/comments -f body="{summary of fix-review-log.md contents}"',
];

const flat = (s) => s.replace(/\s+/g, ' ');
const count = (content, line) => content.split('\n').filter((l) => l === line).length;
const headers = (content) => commandSections(content).map((s) => s.header).filter(Boolean);
const section = (content, header) => {
  const found = commandSections(content).filter((s) => s.header === header);
  assert.equal(found.length, 1, `exactly one "## ${header}"`);
  return found[0].body;
};
const fences = (body) => body.match(/^ *```[\s\S]*?^ *```$/gm) || [];
const frontmatterKeys = (content) => {
  const m = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'frontmatter block');
  return m[1].split('\n').map((l) => l.slice(0, l.indexOf(':')));
};

const now = {};
for (const fixture of FIXTURE_NAMES) now[fixture] = await renderCommands(fixture);

// ---------------------------------------------------------------------------------------------
// AC-1 — the builder and the shape of the file
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: /caf-plan on ${fixture} — written as caf-plan.md with the frontmatter and layout of the other commands, no placeholder left`, async () => {
    const plan = buildPlanMd({ agentDir: AGENT_DIR });
    assert.equal(plan, buildPlanMd(), 'the default agent dir is .claude/agents');
    assert.deepEqual(findUnresolvedPlaceholders(plan), []);

    // through the same guard every generated file goes through
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03b3-plan-');
    const filePath = path.join(dir, COMMAND_DIR, `${PLAN_COMMAND_NAME}.md`);
    assert.equal(path.basename(filePath), 'caf-plan.md');
    assert.equal(await silenced(() => writeIfAbsent(filePath, plan)), 'written');
    assert.equal(fs.readFileSync(filePath, 'utf8'), plan);

    // the pattern T1(a) recorded, taken from the command it is closest to
    const sibling = OLD[fixture]['caf-review.md'];
    assert.deepEqual(frontmatterKeys(plan), ['allowed-tools', 'description', 'argument-hint']);
    assert.deepEqual(frontmatterKeys(plan), frontmatterKeys(sibling));
    const afterFrontmatter = (c) => c.slice(c.indexOf('\n---\n') + 5).split('\n');
    assert.deepEqual(afterFrontmatter(plan).slice(0, 4), afterFrontmatter(sibling).slice(0, 4), 'blank line, DRAFT banner, blank line');
    assert.equal(plan.split('\n').filter((l) => /^# /.test(l)).length, 1);
    assert.match(plan, /^# Plan \(Spec-First\)$/m);
    assert.equal(headers(plan).at(-1), 'Constraints');
    assert.ok(plan.endsWith('\n') && !plan.endsWith('\n\n'));
    assert.match(plan, /^allowed-tools: Read, Grep, Glob, Task$/m, 'the main thread reads and spawns; it has no Write, Edit or Bash');
  });
}

test('AC-1: the agent dir is the only input, and it reaches every path in the file', () => {
  const custom = buildPlanMd({ agentDir: '.opencode/agent' });
  assert.ok(custom.includes('`.opencode/agent/caf-planner.md`'));
  assert.ok(!custom.includes('.claude/agents'));
});

// ---------------------------------------------------------------------------------------------
// AC-2 — what /caf-plan says
// ---------------------------------------------------------------------------------------------

test('AC-2: /caf-plan takes a ticket ID or free text, and names the artifact folder', () => {
  const plan = buildPlanMd();
  assert.deepEqual(headers(plan), ['1. Input', '2. Artifact Folder', '3. Existing Spec', '4. Spawn `caf-planner` (`.claude/agents/caf-planner.md`)', '5. Stop', 'Constraints']);
  const input = flat(section(plan, '1. Input'));
  assert.ok(input.includes('`$ARGUMENTS`'));
  assert.ok(input.includes('**A ticket ID**'));
  assert.ok(input.includes('**Free text**'));
  assert.match(plan, /^argument-hint: \[TICKET-ID or free text, /m);

  const folder = flat(section(plan, '2. Artifact Folder'));
  assert.ok(folder.includes('`.caf/tasks/<ID-or-slug>/`'));
  assert.ok(folder.includes('kebab-case'));
  assert.ok(folder.includes('at most five words'));
});

test('AC-2: /caf-plan spawns caf-planner and points at its rules instead of copying them', () => {
  const plan = buildPlanMd();
  const spawn = flat(section(plan, '4. Spawn `caf-planner` (`.claude/agents/caf-planner.md`)'));
  assert.ok(spawn.includes('Task tool'));
  assert.ok(flat(plan).includes('are deliberately not repeated here'));
  assert.ok(flat(plan).includes('`## Output` of `caf-planner` (`.claude/agents/caf-planner.md`)'));
  // none of the planner's own rule text: the format of the spec, the question tags, the AC ids
  for (const copied of ['AC-1', 'Verify:', 'BLOCKING', '### 1. Specify', '### 2. Clarify', 'automated test', 'Frontend Tasks']) {
    assert.ok(!plan.includes(copied), `must not restate the planner rule "${copied}"`);
  }
});

test('AC-2: /caf-plan continues an answered NEEDS_CLARIFICATION, and treats APPROVED as a contract', () => {
  const plan = buildPlanMd();
  const existing = flat(section(plan, '3. Existing Spec'));
  assert.ok(existing.includes('`.caf/tasks/<ID-or-slug>/requirements.md`'));
  assert.match(existing, /`Status: NEEDS_CLARIFICATION`.*answer filled in.*continue/);
  assert.match(existing, /`Status: APPROVED`.*do(es)? not change (its|the) goal, scope or acceptance criteria/);
  assert.match(existing, /proposal.*`verify-report\.md`/);
});

test('AC-2: /caf-plan stops after tasks.md and starts no implementation', () => {
  const plan = buildPlanMd();
  const stop = flat(section(plan, '5. Stop'));
  assert.ok(stop.includes('`tasks.md`'));
  assert.match(stop, /STOP/);
  assert.ok(stop.includes('Do not start implementation'));
  assert.ok(stop.includes('do not approve the spec'));
  assert.ok(!/caf-run-pipeline/.test(stop.replace(/do not run `\/caf-run-pipeline`/g, '')), 'no hand-off into the pipeline');
});

// ---------------------------------------------------------------------------------------------
// AC-3 — hidden
// ---------------------------------------------------------------------------------------------

for (const [fixture, role] of [['mono-pnpm'], ['single-nuxt'], ['single-nuxt', 'frontend'], ['single-nuxt', 'backend']]) {
  test(`AC-3: a full scaffold on ${fixture}${role ? ` (--role ${role})` : ''} — every agent picked, every opt-in command accepted — writes no caf-plan.md`, async () => {
    const { dir, files } = role ? await renderCommands(fixture, { role }) : now[fixture];
    assert.deepEqual(Object.keys(files), COMMAND_FILES, 'precondition: the run did write the commands');
    const everything = Object.keys(snapshotTree(dir));
    assert.deepEqual(everything.filter((rel) => /caf-plan(?!-ticket|ner)/.test(rel)), []);
  });
}

test('AC-3: the frozen MONOREPO render and its snapshot have no /caf-plan entry', async () => {
  const rendered = Object.keys((await renderMonoSnapshot()).files);
  assert.ok(rendered.includes('.claude/commands/caf-run-pipeline.md'));
  assert.deepEqual(rendered.filter((f) => /caf-plan\.md$/.test(f)), []);
  const recorded = Object.keys(JSON.parse(fs.readFileSync(path.join(FIXTURES, 'snapshots', 'mono-pnpm.json'), 'utf8')).files);
  assert.deepEqual(recorded.filter((f) => /caf-plan\.md$/.test(f)), []);
});

test('AC-3: no command of the CLI imports the /caf-plan builder', () => {
  const importers = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith('.js') && entry.name !== 'plan-command.js' && fs.readFileSync(abs, 'utf8').includes('plan-command')) importers.push(path.relative(SRC, abs));
    }
  };
  walk(SRC);
  assert.deepEqual(importers, []);
});

// ---------------------------------------------------------------------------------------------
// AC-4 — every other command is the one recorded before this ticket
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-4: ${fixture} — the same 13 commands, and all but /caf-review and /caf-fix-review are byte-identical to the golden`, () => {
    assert.deepEqual(Object.keys(OLD[fixture]), COMMAND_FILES, 'the golden holds every command');
    assert.deepEqual(Object.keys(now[fixture].files), COMMAND_FILES);
    for (const file of COMMAND_FILES) {
      if (CHANGED_FILES.includes(file)) continue;
      assert.equal(now[fixture].files[file], OLD[fixture][file], `${file} must stay byte-identical`);
    }
  });
}

test('AC-4: the name /caf-plan is not the name of a skill, of /caf-plan-ticket or of any other command', () => {
  assert.equal(PLAN_COMMAND_NAME, 'caf-plan');
  assert.ok(!SKILL_NAMES.includes(PLAN_COMMAND_NAME));
  assert.notEqual(PLAN_COMMAND_NAME, 'caf-plan-ticket');
  assert.ok(!COMMAND_FILES.includes(`${PLAN_COMMAND_NAME}.md`));
  assert.ok(COMMAND_FILES.includes('caf-plan-ticket.md'), '/caf-plan-ticket is still written');
});

// ---------------------------------------------------------------------------------------------
// AC-5 — /caf-review
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: /caf-review on ${fixture} — finds the artifact folder and hands it to the reviewer`, () => {
    const md = now[fixture].files['caf-review.md'];
    assert.equal(md, buildReviewMd({ agentDir: AGENT_DIR }));
    const read = flat(section(md, REVIEW_CHANGED[0]));
    assert.ok(read.includes('`.caf/tasks/{TICKET-ID}/`'));
    assert.match(read, /the argument.*the PR.*branch.*ticket ID/);
    for (const artifact of ['`requirements.md`', '`tasks.md`', '`design.md`', '`verify-report.md`']) assert.ok(read.includes(artifact), artifact);

    const spawn = flat(section(md, REVIEW_CHANGED[1]));
    assert.match(spawn, /artifact folder.*`\.caf\/tasks\/\{TICKET-ID\}\/`/);
    assert.ok(spawn.includes('`## Output`'), 'the spec checks are the reviewer\'s own, referred to and not copied');
  });

  test(`AC-5: /caf-review on ${fixture} — no artifact folder: a code-only review, said so in the PR Review and in chat`, () => {
    const md = now[fixture].files['caf-review.md'];
    const read = flat(section(md, REVIEW_CHANGED[0]));
    assert.match(read, /not found.*code-only review/i);
    assert.match(read, /DO NOT fail or STOP/);
    assert.match(flat(section(md, REVIEW_CHANGED[1])), /code-only review/);
    assert.match(flat(section(md, REVIEW_CHANGED[2])), /code-only review.*`body`|`body`.*code-only review/);
    assert.match(flat(section(md, REVIEW_CHANGED[3])), /code-only review/);
  });

  test(`AC-5: /caf-review on ${fixture} — name, argument and output markers are the ones recorded before this ticket`, () => {
    const md = now[fixture].files['caf-review.md'];
    const old = OLD[fixture]['caf-review.md'];
    for (const marker of REVIEW_MARKERS) {
      assert.ok(count(old, marker) >= 1, `precondition, in the golden: ${marker}`);
      assert.equal(count(md, marker), count(old, marker), marker);
    }
    // every command block and format block of the changed sections, verbatim
    for (const header of REVIEW_CHANGED) {
      assert.deepEqual(fences(section(md, header)), fences(section(old, header)), `fenced blocks of "${header}"`);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — /caf-fix-review
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: /caf-fix-review on ${fixture} — a comment that asks to change goal, scope or an AC never edits requirements.md`, () => {
    const md = now[fixture].files['caf-fix-review.md'];
    assert.equal(md, buildFixReviewMd({ agentDir: AGENT_DIR }));
    const spawn = flat(section(md, FIX_REVIEW_CHANGED[0]));
    assert.match(spawn, /goal, scope or an acceptance criterion/);
    assert.match(spawn, /(never|not) edit `requirements\.md`/i);
    assert.match(spawn, /proposal.*`## Proposed Spec Changes`.*`\.caf\/tasks\/\{TICKET-ID\}\/verify-report\.md`/);
    assert.match(spawn, /needs a human decision/i);
    assert.match(spawn, /Every other comment is (assessed and )?fixed as usual/i);
    // the proposal uses a status the log already had: no new value for the webhook parser
    assert.match(spawn, /`SKIPPED`/);

    assert.match(flat(section(md, FIX_REVIEW_CHANGED[1])), /needs? a human decision/i);
    const constraints = flat(section(md, FIX_REVIEW_CHANGED[2]));
    assert.match(constraints, /NEVER edits `requirements\.md`/);
    assert.ok(constraints.includes('`verify-report.md`'));
  });

  test(`AC-6: /caf-fix-review on ${fixture} — the appended proposal cannot turn verify-report.md into a pass`, () => {
    // caf-orchestrator tests the whole verify-report.md for \bSUCCESS\b
    const spawn = flat(section(now[fixture].files['caf-fix-review.md'], FIX_REVIEW_CHANGED[0]));
    assert.match(spawn, /append/i);
    assert.match(spawn, /`Status:` line/);
    assert.ok(!/\bSUCCESS\b/.test(now[fixture].files['caf-fix-review.md']));
  });

  test(`AC-6: /caf-fix-review on ${fixture} — name, argument and output markers are the ones recorded before this ticket`, () => {
    const md = now[fixture].files['caf-fix-review.md'];
    const old = OLD[fixture]['caf-fix-review.md'];
    for (const marker of FIX_REVIEW_MARKERS) {
      assert.ok(count(old, marker) >= 1, `precondition, in the golden: ${marker}`);
      assert.equal(count(md, marker), count(old, marker), marker);
    }
    for (const header of FIX_REVIEW_CHANGED) {
      assert.deepEqual(fences(section(md, header)), fences(section(old, header)), `fenced blocks of "${header}"`);
    }
    // the three values readFixReviewLog() accepts, and no fourth
    assert.deepEqual([...new Set(md.match(/Status: [A-Z_ |]+/g))], ['Status: FIXED | SKIPPED | NOT_APPLICABLE']);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-7 — only the sections of T1(e) differ; commands are not tracked by curate
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  for (const [file, expectedHeaders, changed] of [
    ['caf-review.md', REVIEW_HEADERS, REVIEW_CHANGED],
    ['caf-fix-review.md', FIX_REVIEW_HEADERS, FIX_REVIEW_CHANGED],
  ]) {
    test(`AC-7: ${file} on ${fixture} — only the sections recorded by T1 differ from the golden, and no header was added`, () => {
      const oldSections = commandSections(OLD[fixture][file]);
      const newSections = commandSections(now[fixture].files[file]);
      assert.deepEqual(oldSections.map((s) => s.header), [null, ...expectedHeaders], 'the golden has the headers T1 recorded');
      assert.deepEqual(newSections.map((s) => s.header), oldSections.map((s) => s.header));
      // `###` and deeper, and anything that would read as a header, fenced or not
      const allHeaders = (c) => c.split('\n').filter((l) => /^\s*#{1,6} /.test(l));
      assert.deepEqual(allHeaders(now[fixture].files[file]), allHeaders(OLD[fixture][file]));

      const differing = newSections.filter((s, i) => s.body !== oldSections[i].body).map((s) => s.header);
      assert.deepEqual(differing, changed);
      assert.equal(newSections[0].body, oldSections[0].body, 'frontmatter, banner, title and purpose are untouched');
    });

    test(`${file} on ${fixture} — the new text adds no TODO, no placeholder and no fence`, () => {
      const md = now[fixture].files[file];
      const old = OLD[fixture][file];
      assert.deepEqual(findUnresolvedPlaceholders(md), []);
      assert.equal((md.match(/TODO/g) || []).length, (old.match(/TODO/g) || []).length);
      assert.equal((md.match(/```/g) || []).length, (old.match(/```/g) || []).length);
    });
  }

  // Q-1: commands are not tracked. The manifest records agent sections only, so there is nothing
  // for `curate sync` to write; a command written earlier keeps its text until it is deleted and
  // scaffolded again.
  test(`AC-7: ${fixture} — curate sync does not track commands: an old or customized command is left byte-identical`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03b3-sync-');
    for (const [rel, content] of Object.entries(snapshotTree(now[fixture].dir))) {
      if (!rel.startsWith('.claude')) continue;
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), content, 'utf8');
    }
    const customized = `${OLD[fixture]['caf-fix-review.md']}\n- Team rule: only the on-call reviewer runs this.\n`;
    fs.writeFileSync(path.join(dir, COMMAND_DIR, 'caf-review.md'), OLD[fixture]['caf-review.md'], 'utf8');
    fs.writeFileSync(path.join(dir, COMMAND_DIR, 'caf-fix-review.md'), customized, 'utf8');
    const before = snapshotTree(path.join(dir, COMMAND_DIR));

    for (const dryRun of [true, false]) {
      await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
      assert.deepEqual(snapshotTree(path.join(dir, COMMAND_DIR)), before, `curate sync (dryRun ${dryRun}) must not touch a command`);
    }
    assert.deepEqual(Object.keys(readManifest(dir).files).filter((rel) => rel.includes('commands')), []);
  });

  test(`AC-7: ${fixture} — a scaffold re-run never overwrites an existing command; a deleted one comes back with the new text`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03b3-rerun-');
    const customized = `${OLD[fixture]['caf-fix-review.md']}\n- Team rule: only the on-call reviewer runs this.\n`;
    const commandPath = (file) => path.join(dir, COMMAND_DIR, file);
    assert.equal(await silenced(() => writeIfAbsent(commandPath('caf-fix-review.md'), customized)), 'written');
    assert.equal(await silenced(() => writeIfAbsent(commandPath('caf-review.md'), OLD[fixture]['caf-review.md'])), 'written');

    assert.equal(await silenced(() => writeIfAbsent(commandPath('caf-fix-review.md'), buildFixReviewMd({ agentDir: AGENT_DIR }))), 'skipped');
    assert.equal(await silenced(() => writeIfAbsent(commandPath('caf-review.md'), buildReviewMd({ agentDir: AGENT_DIR }))), 'skipped');
    assert.equal(fs.readFileSync(commandPath('caf-fix-review.md'), 'utf8'), customized);
    assert.equal(fs.readFileSync(commandPath('caf-review.md'), 'utf8'), OLD[fixture]['caf-review.md']);

    fs.rmSync(commandPath('caf-review.md'));
    assert.equal(await silenced(() => writeIfAbsent(commandPath('caf-review.md'), buildReviewMd({ agentDir: AGENT_DIR }))), 'written');
    assert.equal(fs.readFileSync(commandPath('caf-review.md'), 'utf8'), now[fixture].files['caf-review.md']);
  });
}
