// Enforcement status per AI runner, based on prior research. This table is deliberately blunt —
// do not soften the language or omit entries to make the tool feel friendlier.
export const RUNNER_TARGETS = [
  {
    id: 'opencode',
    label: 'OpenCode',
    dir: '.opencode/agent',
    status: 'buggy',
    statusLabel: '⚠ known enforcement bugs',
    note: 'Has recurring permission-enforcement bugs (confirmed via public issue tracker).',
  },
  {
    id: 'cline',
    label: 'Cline (--plan mode)',
    dir: '.cline/agents',
    status: 'buggy',
    statusLabel: '⚠ model compliance only, not technical enforcement',
    note: 'Has been shown to still write files via bash even in read-only mode.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    dir: '.cursor/agents',
    status: 'unvalidated',
    statusLabel: '❓ not yet validated',
    note: 'Enforcement status unknown — do not assume it is safe.',
  },
  {
    id: 'kiro',
    label: 'Kiro',
    dir: '.kiro/agents',
    status: 'unvalidated',
    statusLabel: '❓ not yet validated',
    note: 'Enforcement status unknown — do not assume it is safe.',
  },
];

// Antigravity is intentionally absent from RUNNER_TARGETS — auto-approves every tool call
// including file writes, so there is no read-only guarantee to offer at all. Do not add it.

export const CLAUDE_CODE_STATUS_ROW = {
  label: 'Claude Code',
  statusLabel: 'Validated — technically enforces scope restriction',
  status: 'validated',
};

export const ANTIGRAVITY_STATUS_ROW = {
  label: 'Antigravity',
  statusLabel: 'Auto-approves ALL tool calls including file writes — NO read-only guarantee at all',
  status: 'none',
};
