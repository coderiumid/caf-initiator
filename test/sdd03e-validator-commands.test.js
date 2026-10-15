// CAF-SDD-03e — the validator runs the `Verify: command:` lines of an APPROVED spec, within a safe
// form, and the validator and the reviewer get a `## Working Pattern (PIV)` of their own.
//
// What changed: the validator's `## Allowed Tools` (the command rules), its `## Output` (made to
// agree: the commands it may run, the `Status:` line it reads, where a proposed spec change goes),
// and the `## Working Pattern (PIV)` body of the validator and of the reviewer. The header keeps
// its name: a renamed header would read as a missing section to `curate sync`.
// `test/fixtures/pre-sdd03e/` is the render from before this ticket — never regenerate it.
// Every expected value below is written out literally. Every `scaffold` and `curate sync` runs on
// a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { agents, buildCandidates, buildSingleRepoCandidates, buildValidatorAgent, isOfferedCandidate, SINGLE_REPO_ROLES } from '../src/commands/agents.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { KNOWN_KINDS, SYNCABLE_SECTIONS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { copyFixture } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { withLiveInput } from './helpers/swap-input.js';

const PRE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pre-sdd03e');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(PRE, name), 'utf8'));
const OLD = Object.fromEntries(
  ['validator', 'reviewer', 'planner'].map((kind) => [kind, Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`${kind}.${f}.json`)]))])
);
const OLD_WP = golden('working-pattern-by-kind.json');

const WP = 'Working Pattern (PIV)';

// The generic text T1 recorded, and the two phrases AC-8/AC-9 name.
const GENERIC = [
  "1. PLAN — write a plan first, don't touch code yet",
  '2. IMPLEMENT — execute per the plan',
  '3. VERIFY — run the Verify Checklist below before declaring done',
].join('\n');
const GENERIC_PHRASES = ['PLAN — write a plan first', 'IMPLEMENT — execute per the plan', "don't touch code yet"];

const CHANGED = {
  validator: ['Allowed Tools', 'Output', WP],
  reviewer: [WP],
};

async function stackOf(dir) {
  return silenced(() => detectStack({ dir, explicitGlobs: undefined }));
}

const validator = Object.fromEntries(
  await Promise.all(FIXTURE_NAMES.map(async (f) => [f, buildValidatorAgent(fixtureDir(f), await stackOf(fixtureDir(f)))]))
);
const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
// CAF-SDD-03c2 changed the `## Input` of the reviewer and the planner after these goldens were
// recorded; this ticket is about other sections, so each golden is compared with the live Input
// put in (test/helpers/swap-input.js). The validator's Input did not change.
for (const kind of ['reviewer', 'planner']) {
  for (const f of FIXTURE_NAMES) OLD[kind][f] = withLiveInput(OLD[kind][f], rendered[f][kind].content);
}

const flat = (text) => text.replace(/\s+/g, ' ');
const sectionsOf = (content) => {
  const { lines, sections } = parseSections(content);
  return Object.fromEntries(sections.map((s) => [s.header, sectionBody(lines, s)]));
};
const toolsOf = (fixture) => flat(trackedSections(validator[fixture].content)['Allowed Tools']);
const outputOf = (fixture) => flat(trackedSections(validator[fixture].content).Output);
const step = (text, heading) => {
  const from = text.indexOf(heading);
  assert.ok(from >= 0, heading);
  const next = text.indexOf('\n### ', from + heading.length);
  return text.slice(from, next < 0 ? undefined : next);
};

for (const fixture of FIXTURE_NAMES) {
  // -------------------------------------------------------------------------------------------
  // AC-1 .. AC-6 — the command rules, in `## Allowed Tools`
  // -------------------------------------------------------------------------------------------

  test(`AC-1: validator on ${fixture} — a \`Verify: command:\` line is run only when requirements.md says APPROVED`, () => {
    const tools = toolsOf(fixture);
    assert.match(tools, /Commands from the spec \(`Verify: command: <command> \| expect: <exit code or output>`\):/);
    assert.match(tools, /Run one only when `requirements\.md` says `Status: APPROVED`\. With any other status, do not run it\./);
  });

  test(`AC-2: validator on ${fixture} — the accepted form is one command or a chain of \`&&\``, () => {
    assert.match(toolsOf(fixture), /Accepted form: one command, or commands chained with `&&`\./);
  });

  test(`AC-3: validator on ${fixture} — the rejected list is the one of Q-2`, () => {
    const tools = toolsOf(fixture);
    const rejected = tools.slice(tools.indexOf('Rejected, never run:'));
    assert.ok(rejected.length > 0 && tools.includes('Rejected, never run:'));
    for (const item of ['`;`', '`|`', 'a redirect (`>`, `>>`, `<`)', '`$()`', 'a backtick', '`sudo`', '`rm`', '`curl`', '`wget`', '`git push`']) {
      assert.ok(rejected.includes(item), item);
    }
    assert.match(tools, /in the command itself, the part before ` \| expect:`/);
  });

  test(`AC-4: validator on ${fixture} — a command not run is UNVERIFIED with the reason, never FAIL`, () => {
    const tools = toolsOf(fixture);
    assert.match(tools, /A command that is not run \(the spec is not `APPROVED`, or the form is rejected\): do not run it; the AC is `UNVERIFIED`, with the reason \(the status, or what was rejected\)\. It is never a `FAIL`\./);
    assert.match(outputOf(fixture), /a command outside the ones you may run: do not run it, and give the reason;/);
  });

  test(`AC-5: validator on ${fixture} — a command run is compared with \`expect:\`, PASS only on a match`, () => {
    assert.match(toolsOf(fixture), /A command that is run: compare its exit code or output with `expect:`\. The AC is `PASS` only when they match;/);
  });

  test(`AC-6: validator on ${fixture} — no match is FAIL, with the output`, () => {
    assert.match(toolsOf(fixture), /when they do not, it is `FAIL`, with the output you observed\./);
  });

  // -------------------------------------------------------------------------------------------
  // AC-7, AC-7b — the spec is never edited; a proposal goes under `### Notes`; one file written
  // -------------------------------------------------------------------------------------------

  test(`AC-7: validator on ${fixture} — never edits requirements.md or tasks.md; a proposal is a \`Proposed Spec Changes:\` line under \`### Notes\``, () => {
    const never = flat(step(trackedSections(validator[fixture].content).Output, '### What the Validator never does'));
    assert.match(never, /Edit code, tests, the spec \(`requirements\.md`, `tasks\.md`\) or `verify-report\.md`\./);
    assert.match(
      never,
      /Write a proposed change to the spec in the spec or in `verify-report\.md`\. A proposal is one line under `### Notes` of `validate-report\.md` that starts with `Proposed Spec Changes:`\./
    );
    // The skeleton of `validate-report.md` already has that part; it is not changed.
    assert.equal(trackedSections(validator[fixture].content)['Report Format'], OLD.validator[fixture].sections['Report Format']);
    assert.ok(OLD.validator[fixture].sections['Report Format'].includes('\n### Notes\n'));
  });

  test(`AC-7b: validator on ${fixture} — it still writes validate-report.md only`, () => {
    const tools = toolsOf(fixture);
    assert.match(tools, /Write only for `validate-report\.md`\. No Edit\. Does NOT change code, tests, the spec or `verify-report\.md`\./);
    const output = outputOf(fixture);
    assert.match(output, /The only file it writes is `validate-report\.md`\./);
    for (const text of [tools, output]) {
      assert.doesNotMatch(text, /(write|append|add)[^.]*to `verify-report\.md`/i);
      assert.doesNotMatch(text, /Write (only )?for `verify-report\.md`/);
    }
    assert.ok(!/`## Proposed Spec Changes`/.test(tools + output), 'the verify-report part is not named as a place to write');
    assert.deepEqual(frontmatterTools(validator[fixture].content), ['Read', 'Write', 'Bash']);
  });

  test(`AC-1..AC-7: validator on ${fixture} — the Output agrees with Allowed Tools`, () => {
    const output = trackedSections(validator[fixture].content).Output;
    assert.match(flat(step(output, '### 1. Read')), /`requirements\.md`: its `Status:` line, every AC/);
    const may = flat(step(output, '### Commands you may run'));
    assert.match(may, /The command of a `Verify: command:` line of `requirements\.md`, only within the rules of the Allowed Tools section \(an `APPROVED` spec, an accepted form\)\./);
    assert.match(may, /Nothing else\./);
    for (const text of [output, trackedSections(validator[fixture].content)['Allowed Tools']]) {
      assert.ok(!/\bTODO\b/.test(text.replace(/TODO project-specific: which MCP server[\s\S]*$/, '')), 'no TODO in the rule text');
      assert.ok(!/^## /m.test(text));
    }
  });

  // -------------------------------------------------------------------------------------------
  // AC-8, AC-9 — the Working Pattern of each role
  // -------------------------------------------------------------------------------------------

  test(`AC-8: validator on ${fixture} — Working Pattern: read the spec, run the commands, write evidence per AC; no generic PIV`, () => {
    const wp = trackedSections(validator[fixture].content)[WP];
    for (const phrase of GENERIC_PHRASES) assert.ok(!wp.includes(phrase), phrase);
    assert.equal(
      wp,
      [
        '1. READ — read the spec (`requirements.md`: its `Status:` line, every AC and its `Verify:` line), `tasks.md`, `verify-report.md` and the change',
        '2. RUN — run the Verify Checklist below, then the `Verify: command:` lines the Allowed Tools section lets you run (an `APPROVED` spec, an accepted form); a command you do not run leaves its AC `UNVERIFIED`, with the reason',
        '3. REPORT — write `validate-report.md`: one row per AC with its evidence, as the Report Format section below defines',
      ].join('\n')
    );
  });

  test(`AC-9: reviewer on ${fixture} — Working Pattern: read the spec and the reports, compare the ACs with the change, write the verdict; no generic PIV`, () => {
    const wp = trackedSections(rendered[fixture].reviewer.content)[WP];
    for (const phrase of GENERIC_PHRASES) assert.ok(!wp.includes(phrase), phrase);
    assert.equal(
      wp,
      [
        '1. READ — read the spec (`requirements.md`, `tasks.md`) and the reports (`verify-report.md`, and `validate-report.md` if present), then the diff',
        '2. COMPARE — compare every AC and the scope of the spec with the change, as the Output section describes',
        '3. VERDICT — write `review-notes.md` with its `Verdict:` line, as the Report Format section below defines',
      ].join('\n')
    );
    assert.doesNotMatch(wp, /APPROVE|CHANGES REQUESTED|DEFER/, 'the verdict values stay in Report Format');
  });

  // -------------------------------------------------------------------------------------------
  // AC-10 — every other kind keeps its Working Pattern
  // -------------------------------------------------------------------------------------------

  test(`AC-10: ${fixture} — every other rendered kind keeps its Working Pattern byte for byte`, () => {
    const before = OLD_WP.rendered[fixture];
    // CAF-SDD-03c2: the validator is a candidate now (rendered the same way); the recorded
    // render of before this ticket had no entry for it, and its own Working Pattern is tested above.
    assert.deepEqual(Object.keys(rendered[fixture]).filter((k) => k !== 'validator').sort(), Object.keys(before).sort());
    for (const [kind, agent] of Object.entries(rendered[fixture])) {
      if (kind === 'reviewer' || kind === 'validator') continue;
      assert.equal(trackedSections(agent.content)[WP], before[kind], kind);
    }
    assert.equal(trackedSections(rendered[fixture].planner.content)[WP], OLD.planner[fixture].sections[WP]);
  });

  // -------------------------------------------------------------------------------------------
  // AC-11 — nothing else moved in the validator and the reviewer
  // -------------------------------------------------------------------------------------------

  for (const kind of ['validator', 'reviewer']) {
    test(`AC-11: ${kind} on ${fixture} — outside the changed sections, the file is the pre-ticket render byte for byte`, () => {
      const content = kind === 'validator' ? validator[fixture].content : rendered[fixture][kind].content;
      const old = OLD[kind][fixture];
      assert.deepEqual(frontmatterTools(content), old.tools);
      const now = sectionsOf(content);
      const was = sectionsOf(old.content);
      assert.deepEqual(Object.keys(now), Object.keys(was), 'same headers, same order');
      for (const header of Object.keys(was)) {
        if (CHANGED[kind].includes(header)) assert.notEqual(now[header], was[header], `${header} changed`);
        else assert.equal(now[header], was[header], header);
      }
      // Frontmatter and title, and the whole file once the changed bodies are put back.
      assert.equal(content.split('\n## Role\n')[0], old.content.split('\n## Role\n')[0]);
      let restored = content;
      for (const header of CHANGED[kind]) restored = restored.replace(now[header], was[header]);
      assert.equal(restored, old.content);
    });
  }
}

test('AC-10: the Working Pattern builder answers as before for every kind but validator and reviewer', () => {
  const builder = SYNCABLE_SECTIONS[WP];
  assert.deepEqual(Object.keys(OLD_WP.builder).sort(), [...KNOWN_KINDS, 'implementation', '(none)'].sort());
  for (const kind of [...KNOWN_KINDS, 'implementation']) {
    if (kind === 'validator' || kind === 'reviewer') {
      assert.equal(OLD_WP.builder[kind], GENERIC, `${kind} was generic before`);
      assert.notEqual(builder(kind), GENERIC, kind);
      continue;
    }
    assert.equal(builder(kind), OLD_WP.builder[kind], kind);
  }
  assert.equal(builder(undefined), OLD_WP.builder['(none)']);
  assert.equal(builder(undefined), GENERIC);
});

// ---------------------------------------------------------------------------------------------
// AC-12 — the validator was hidden; CAF-SDD-03c2 reversed it (these tests now state the opposite)
// ---------------------------------------------------------------------------------------------

test('AC-12: validator is a scaffold candidate, and the MONOREPO render has caf-validator.md', async () => {
  const mono = await stackOf(fixtureDir('mono-pnpm'));
  const web = mono.apps.find((a) => a.path === 'apps/web');
  const api = mono.apps.find((a) => a.path === 'apps/api');
  const single = (await stackOf(fixtureDir('single-nuxt'))).apps[0];
  for (const candidates of [
    buildCandidates({ frontend: [web], backend: [api] }, []),
    ...SINGLE_REPO_ROLES.map((role) => buildSingleRepoCandidates(single, [], role)),
  ]) {
    assert.ok(candidates.some((c) => c.kind === 'validator'));
  }
  assert.ok(Object.keys((await renderMonoSnapshot()).files).includes('.claude/agents/caf-validator.md'));
});

const NO_TRACKER_PROMPT = (c) => isOfferedCandidate(c) && !['auditor', 'pm', 'ux-designer'].includes(c.kind);

for (const fixture of FIXTURE_NAMES) {
  test(`AC-12: scaffold agents on ${fixture} writes caf-validator.md`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03e-scaffold-');
    const stack = await stackOf(dir);
    let answers;
    if (stack.isMonorepo) {
      const web = stack.apps.find((a) => a.path === 'apps/web');
      const api = stack.apps.find((a) => a.path === 'apps/api');
      answers = [[web], [api], buildCandidates({ frontend: [web], backend: [api] }, []).filter(NO_TRACKER_PROMPT), false, false, false];
    } else {
      answers = [buildSingleRepoCandidates(stack.apps[0], [], 'implementer').filter(NO_TRACKER_PROMPT), false, false, false];
    }
    prompts.inject(answers);
    await silenced(() => agents({ dir, dryRun: false }));
    prompts._injected.length = 0;
    const written = fs.readdirSync(path.join(dir, AGENT_DIR));
    assert.ok(written.includes('caf-reviewer.md'), 'precondition: the run did write agents');
    assert.deepEqual(written.filter((f) => /validator/.test(f)), ['caf-validator.md']);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-13 — curate sync carries the changed sections to files generated before this ticket
// ---------------------------------------------------------------------------------------------

function baselineRepo(fixture, files) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03e-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const manifest = { version: 1, files: {} };
  for (const { file, content } of files) {
    const rel = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
    const { lines, sections } = parseSections(content);
    for (const s of sections) setSectionBaseline(manifest, rel, s.header, hashSection(sectionBody(lines, s)));
  }
  writeManifest(dir, manifest);
  return dir;
}

const read = (dir, file) => fs.readFileSync(path.join(dir, AGENT_DIR, file), 'utf8');

for (const fixture of FIXTURE_NAMES) {
  test(`AC-13: ${fixture} — curate sync writes the new text of the changed sections only, and leaves every other file alone`, async () => {
    const old = ['validator', 'reviewer', 'planner'].map((kind) => ({ kind, file: OLD[kind][fixture].file, content: OLD[kind][fixture].content }));
    const dir = baselineRepo(fixture, old);
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));

    // CAF-SDD-03f changed the planner's `## Output` after this ticket (the exception for a refactor
    // or config ticket), so the 03e-era planner now drifts there and only there.
    const expectedDrift = Object.entries({ ...CHANGED, planner: ['Output'] }).flatMap(([kind, headers]) => headers.map((h) => `${path.join(AGENT_DIR, OLD[kind][fixture].file)}#${h}`));
    assert.deepEqual([...result.drifted].sort(), expectedDrift.sort());
    assert.deepEqual(result.needsAttention, []);
    assert.deepEqual(result.unverifiable, []);

    // The two changed files are now what a fresh render gives.
    assert.equal(read(dir, 'caf-validator.md'), validator[fixture].content);
    assert.equal(read(dir, 'caf-reviewer.md'), rendered[fixture].reviewer.content);
    // The planner: only its `## Output` moved (CAF-SDD-03f), to what a fresh render gives.
    // (`## Constraints` is not tracked: CAF-SDD-03c2b changed it and sync leaves the old one)
    assert.equal(read(dir, OLD.planner[fixture].file), swapConstraints(rendered[fixture].planner.content, OLD.planner[fixture].content));
  });

  test(`AC-13: ${fixture} — a validator and a reviewer whose Working Pattern was customized are not overwritten there`, async () => {
    const custom = (content) => content.replace(GENERIC, '1. My own steps');
    // Baselined as generated, then edited by the user: the template changed too, so a CONFLICT.
    const dir = baselineRepo(fixture, ['validator', 'reviewer'].map((kind) => ({ file: OLD[kind][fixture].file, content: OLD[kind][fixture].content })));
    const files = ['validator', 'reviewer'].map((kind) => ({ file: OLD[kind][fixture].file, content: custom(OLD[kind][fixture].content) }));
    for (const f of files) {
      assert.ok(f.content.includes('1. My own steps'), 'precondition');
      fs.writeFileSync(path.join(dir, AGENT_DIR, f.file), f.content, 'utf8');
    }
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));

    assert.deepEqual(
      result.needsAttention.map((n) => `${n.file}#${n.header}#${n.status}`).sort(),
      files.map((f) => `${path.join(AGENT_DIR, f.file)}#${WP}#CONFLICT`).sort()
    );
    for (const f of files) assert.equal(trackedSections(read(dir, f.file))[WP], '1. My own steps', f.file);
    // The reviewer had nothing else to carry: the file is byte for byte what the user had.
    assert.equal(read(dir, OLD.reviewer[fixture].file), files.find((f) => f.file === OLD.reviewer[fixture].file).content);
    // The validator still gets its other two changed sections.
    const v = trackedSections(read(dir, 'caf-validator.md'));
    assert.equal(v['Allowed Tools'], trackedSections(validator[fixture].content)['Allowed Tools']);
    assert.equal(v.Output, trackedSections(validator[fixture].content).Output);
  });
}
