// CAF-INIT-SMART-01 follow-up — /caf-run (PR step), /caf-review and /caf-fix-review use gh and GitHub
// PRs only: offered with a GitHub remote (or none yet), neither offered nor written otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agents, buildSingleRepoCandidates, isOfferedCandidate } from '../src/commands/agents.js';
import { runSmartScaffold, renderSummary } from '../src/commands/scaffold-flow.js';
import { githubCommandsOffered } from '../src/utils/recommend.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { promptCount, resetPromptCount } from '../src/utils/ask.js';
import { copyFixture } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const REMOTES = {
  github: 'git@github.com:acme/app.git',
  gitlab: 'git@gitlab.com:acme/app.git',
  bitbucket: 'git@bitbucket.org:acme/app.git',
};

function repo(remote) {
  const dir = copyFixture(path.join(FIXTURES, 'single-nuxt'));
  if (remote) {
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    fs.writeFileSync(path.join(dir, '.git', 'config'), `[remote "origin"]\n\turl = ${remote}\n`);
  }
  return dir;
}

const commands = (dir) => {
  const d = path.join(dir, '.claude', 'commands');
  return fs.existsSync(d) ? fs.readdirSync(d).sort() : [];
};

// `agents` asked on its own: pick the agents, then answer yes to every command offered. The budget
// turns a prompt that should not appear into an error instead of a hang.
async function scaffoldAgents(dir, { budget }) {
  const stack = await silenced(() => detectStack({ dir }));
  const picked = buildSingleRepoCandidates(stack.apps[0], []).filter(isOfferedCandidate);
  prompts.inject([picked, true, true, true]);
  resetPromptCount(budget);
  try {
    await silenced(() => agents({ dir, dryRun: false }));
  } finally {
    prompts._injected = [];
  }
}

test('githubCommandsOffered: GitHub or no remote yes; anything else no', () => {
  assert.equal(githubCommandsOffered({ remoteUrl: null, gitHost: null }), true);
  assert.equal(githubCommandsOffered({ remoteUrl: REMOTES.github, gitHost: 'github' }), true);
  assert.equal(githubCommandsOffered({ remoteUrl: REMOTES.gitlab, gitHost: 'gitlab' }), false);
  assert.equal(githubCommandsOffered({ remoteUrl: REMOTES.bitbucket, gitHost: null }), false);
});

test('github: scaffold agents offers /caf-run, /caf-fix-review and /caf-review (three questions) and writes them', async () => {
  const dir = repo(REMOTES.github);
  await scaffoldAgents(dir, { budget: 4 });
  assert.equal(promptCount(), 4);
  assert.deepEqual(commands(dir).filter((f) => /^caf-(run|review|fix-review)\.md$/.test(f)), ['caf-fix-review.md', 'caf-review.md', 'caf-run.md']);
});

test('gitlab: scaffold agents asks only for the agents and writes none of the three commands', async () => {
  const dir = repo(REMOTES.gitlab);
  await scaffoldAgents(dir, { budget: 1 });
  assert.equal(promptCount(), 1);
  const files = commands(dir);
  for (const name of ['caf-run.md', 'caf-review.md', 'caf-fix-review.md']) assert.ok(!files.includes(name), name);
  assert.ok(files.includes('caf-plan.md'), 'the other commands are still written');
});

test('a non-GitHub, non-GitLab remote (bitbucket) behaves like gitlab', async () => {
  const dir = repo(REMOTES.bitbucket);
  await scaffoldAgents(dir, { budget: 1 });
  assert.ok(!commands(dir).includes('caf-run.md'));
});

test('the scaffold flow: github generates /caf-run only; gitlab generates none of the three; summary says why', async () => {
  const run = async (remote) => {
    const dir = repo(remote);
    prompts.inject(['Y']);
    resetPromptCount(1);
    const lines = [];
    const log = console.log;
    console.log = (...a) => lines.push(a.join(' '));
    try {
      await runSmartScaffold({ dir, agentDir: '.claude/agents', interactive: true, tracker: 'linear' });
    } finally {
      console.log = log;
      prompts._injected = [];
    }
    return { dir, out: lines.join('\n') };
  };
  const gh = await run(REMOTES.github);
  assert.ok(commands(gh.dir).includes('caf-run.md'));
  assert.ok(!commands(gh.dir).includes('caf-review.md') && !commands(gh.dir).includes('caf-fix-review.md'));
  assert.match(gh.out, /Commands:\s+\/caf-run \(generated; on success it commits, pushes a branch and opens a PR/);
  assert.match(gh.out, /\/caf-review and \/caf-fix-review are not generated \(GitHub only/);

  const gl = await run(REMOTES.gitlab);
  for (const name of ['caf-run.md', 'caf-review.md', 'caf-fix-review.md']) assert.ok(!commands(gl.dir).includes(name), name);
  assert.match(gl.out, /Commands:\s+no \/caf-run, \/caf-review or \/caf-fix-review — GitHub only/);
  assert.match(gl.out, /the remote is not GitHub/);
});

test('renderSummary mentions the side effects of /caf-run on a GitHub repo', () => {
  const detected = { mode: 'SINGLE_REPO', packageManager: 'npm', apps: [{}], remoteUrl: REMOTES.github, gitHost: 'github' };
  const sel = { tracker: { name: 'Linear' }, goldenApps: [], adr: false, kinds: ['planner', 'frontend'], roleApp: {} };
  const out = renderSummary(detected, sel, { create: [], unchanged: [], conflicts: [] });
  assert.match(out, /commits, pushes a branch and opens a PR/);
});
