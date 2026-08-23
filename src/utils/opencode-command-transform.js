const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

// OpenCode command frontmatter only recognizes `description` — confirmed against all 10
// hand-written files in umkm-pos's .opencode/commands/. Claude Code's `allowed-tools` and
// `argument-hint` (and any other field) get dropped.
function extractDescription(frontmatterBlock) {
  const lines = frontmatterBlock.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^description:\s*(.*)$/);
    if (!match) continue;

    const inline = match[1].trim();
    if (inline && !/^[>|][+-]?$/.test(inline)) return inline;

    // Folded/literal block scalar (`description: >` or `description: |`) — collect the
    // indented continuation lines and fold them into one line, same as the ground truth does.
    const parts = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (!/^\s/.test(next) || next.trim() === '') break;
      parts.push(next.trim());
    }
    return parts.join(' ').trim();
  }
  return null;
}

/**
 * Reduce a Claude Code command file's frontmatter down to the `description` field only —
 * OpenCode doesn't recognize `allowed-tools` or `argument-hint`. Body passes through unchanged.
 */
export function stripCommandFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return content;

  const description = extractDescription(match[1]);
  if (description == null) return content;

  const body = content.slice(match[0].length);
  return `---\ndescription: ${description}\n---\n${body}`;
}

// The only `.claude/` path pattern that appears in any of the 10 command bodies (verified via
// grep against umkm-pos) is a reference to the agent definition file — confirmed against
// .opencode/agent/'s singular dir name in umkm-pos's ground truth commands.
const AGENT_PATH_RE = /\.claude\/agents\//g;

/**
 * Rewrite `.claude/agents/foo.md` references in a command body to `.opencode/agent/foo.md`,
 * matching where agentsPublish's kind='agent' path actually puts OpenCode agent definitions.
 */
export function rewriteAgentPaths(content) {
  return content.replace(AGENT_PATH_RE, '.opencode/agent/');
}

const REVIEW_NOTICE =
  '> Auto-published from caf-initiator (Claude Code → OpenCode). Paths have\n' +
  '> already been rewritten automatically, but Claude-Code-specific terms/structure\n' +
  '> (e.g. "spawn agent", Claude-only tool references) have not been manually\n' +
  '> reviewed yet. Adjust before serious use.';

/**
 * Insert a review-needed notice at the top of the body (right after frontmatter), flagging that
 * the auto-publish only handles frontmatter/path mechanics — terminology and structure specific
 * to Claude Code (e.g. "spawn agent") were confirmed to differ from hand-written OpenCode
 * ground truth and still need manual review.
 */
export function addReviewNotice(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return content;

  const body = content.slice(match[0].length).replace(/^\n+/, '');
  return `${match[0]}\n${REVIEW_NOTICE}\n\n${body}`;
}
