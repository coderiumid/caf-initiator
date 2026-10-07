// CAF-SKILLS-01 — the optional, non-syncable `## Skills` section of an agent definition.
// The contract that matters most: an agent with no skills renders byte-identical to before this
// ticket (the frozen MONOREPO snapshot depends on it), and adding skills never disturbs a section
// `curate` tracks.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAgentMd, buildSkillsBody, buildSkillsSection } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, SYNCABLE_SECTIONS, parseSections } from '../src/utils/agent-sections.js';
import { extractSection, hashSection } from '../src/utils/section-diff.js';

const KINDS = [...KNOWN_KINDS, 'implementation'];
const PATHS = ['.claude/skills/caf-verify/SKILL.md', '.claude/skills/caf-no-guess/SKILL.md'];

function agent(kind, extra = {}) {
  return buildAgentMd({ name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind, appNames: [], slug: `caf-${kind}`, ...extra });
}

test('buildSkillsSection: empty or missing list renders nothing', () => {
  assert.equal(buildSkillsSection([]), '');
  assert.equal(buildSkillsSection(), '');
  assert.equal(buildSkillsSection(null), '');
});

test('buildAgentMd: no `skills` and `skills: []` are byte-identical for every kind', () => {
  for (const kind of KINDS) {
    assert.equal(agent(kind, { skills: [] }), agent(kind), kind);
    assert.ok(!/^## Skills$/m.test(agent(kind)), `${kind} must not render ## Skills by default`);
  }
});

test('buildAgentMd: skills render as one `## Skills` section after Output, before Constraints/Working Pattern', () => {
  for (const kind of KINDS) {
    const headers = parseSections(agent(kind, { skills: PATHS })).sections.map((s) => s.header);
    assert.equal(headers.filter((h) => h === 'Skills').length, 1, kind);
    const at = headers.indexOf('Skills');
    assert.equal(headers[at - 1], 'Output', kind);
    assert.equal(headers[at + 1], kind === 'planner' ? 'Constraints' : 'Working Pattern (PIV)', kind);
  }
});

test('buildAgentMd: removing the Skills block gives back the skill-less file byte for byte', () => {
  for (const kind of KINDS) {
    const withSkills = agent(kind, { skills: PATHS });
    const block = buildSkillsSection(PATHS);
    assert.equal(withSkills.split(block).length, 2, kind);
    assert.equal(withSkills.replace(block, ''), agent(kind), kind);
  }
});

test('buildAgentMd: skills never touch the frontmatter or the tools list', () => {
  for (const kind of KINDS) {
    const frontmatter = (md) => md.slice(0, md.indexOf('\n---\n', 4));
    const withSkills = agent(kind, { skills: PATHS });
    assert.equal(frontmatter(withSkills), frontmatter(agent(kind)), kind);
    assert.ok(!/^skills:/m.test(frontmatter(withSkills)), kind);
    assert.ok(!/^tools:.*\bSkill\b/m.test(frontmatter(withSkills)), kind);
  }
});

test('buildAgentMd: every tracked section hashes the same with and without skills', () => {
  for (const kind of KINDS) {
    const plain = agent(kind);
    const withSkills = agent(kind, { skills: PATHS });
    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      const before = extractSection(plain, header);
      const after = extractSection(withSkills, header);
      assert.equal(after == null, before == null, `${kind} ## ${header}`);
      if (before != null) assert.equal(hashSection(after), hashSection(before), `${kind} ## ${header}`);
    }
  }
});

test('buildSkillsBody: lists every pointer in order, gates on the DRAFT banner only', () => {
  const body = buildSkillsBody(PATHS);
  const pointers = [...body.matchAll(/^- `([^`]+)`$/gm)].map((m) => m[1]);
  assert.deepEqual(pointers, PATHS);
  assert.match(body, /`Read`/);
  assert.match(body, /`DRAFT` banner/);
  // The word TODO would make a finished skill that mentions it look unusable, and would inflate
  // check-drafts' TODO count for every agent.
  assert.ok(!/\bTODO\b/.test(body));
  assert.ok(!/^## /m.test(body), 'a `## ` line in the body would be read as a section boundary');
});
