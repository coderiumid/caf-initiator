// Shared artifact contract per role (CAF.md Layer 3 — .caf/tasks/{TICKET-ID}/). Single source of
// truth consumed by agent-handoff-md.js (roster table) and agent-md.js (per-agent Output section).
export const ARTIFACT_BY_ROLE = {
  planner: '`requirements.md`, `tasks.md`',
  architect: '`design.md`',
  frontend: 'kode + `verify-report.md`',
  backend: 'kode + `verify-report.md`',
  qa: '`qa-report.md`',
  reviewer: '`review-notes.md`',
  documentation: 'update `docs/` (paralel, non-blocking)',
  auditor: '`audit-report.md`',
};
