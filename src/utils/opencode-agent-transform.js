import kleur from 'kleur';

// Only names that ever appear in agent-md.js's TOOLS_BY_KIND. Add here if that map grows —
// an unmapped name falls back to a warned lowercase guess rather than failing the whole publish.
const TOOL_NAME_MAP = {
  Read: 'read',
  Write: 'write',
  Edit: 'edit',
  Bash: 'bash',
};

const TOOLS_LINE = /^tools: \[(.*)\]$/m;

/**
 * Convert a Claude Code agent file's `tools: [Read, Write]` frontmatter line into OpenCode's
 * `tools:\n  read: true\n  write: true` map form. Only the tools line is touched — the rest of
 * the frontmatter (name/description/model) and the whole body pass through unchanged, since
 * comparing hand-written .opencode/agent/*.md files in umkm-pos confirmed those fields need no
 * conversion.
 */
export function toolsArrayToMap(content) {
  const match = content.match(TOOLS_LINE);
  if (!match) return content;

  const names = match[1]
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  const mapped = names.map((name) => {
    const mappedName = TOOL_NAME_MAP[name];
    if (!mappedName) {
      console.log(kleur.yellow(`  warn  unknown tool name "${name}" in frontmatter — guessing "${name.toLowerCase()}"`));
      return name.toLowerCase();
    }
    return mappedName;
  });

  const replacement = ['tools:', ...mapped.map((n) => `  ${n}: true`)].join('\n');
  return content.replace(TOOLS_LINE, replacement);
}
