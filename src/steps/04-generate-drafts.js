import path from 'node:path';
import { appendLinesIfMissing, ensureDir, exists, section, writeIfAbsent } from '../util.js';
import { buildClaudeMd } from '../templates/claude-md.js';
import { buildAgentsMd } from '../templates/agents-md.js';
import { buildTasksReadme } from '../templates/tasks-readme.js';
import { buildKnowledgeIndexMd, KNOWLEDGE_INDEX_DOCS } from '../templates/knowledge-index-md.js';

/**
 * Step 4: generate draft knowledge-base files. Never overwrites existing files.
 */
export function generateDrafts({ dir, dryRun, stack, tracker }) {
  section('Step 4 — Generate draft files');

  const written = [];
  const skipped = [];
  const track = (result, filePath) => {
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);
  };

  const claudeMdPath = path.join(dir, 'CLAUDE.md');
  const claudeMd = buildClaudeMd({ ...stack, tracker: tracker.tracker });
  track(writeIfAbsent(claudeMdPath, claudeMd, { dryRun }), claudeMdPath);

  const agentsMdPath = path.join(dir, 'AGENTS.md');
  const agentsMd = buildAgentsMd({ tracker: tracker.tracker });
  track(writeIfAbsent(agentsMdPath, agentsMd, { dryRun }), agentsMdPath);

  const tasksReadmePath = path.join(dir, '.caf', 'tasks', 'README.md');
  const tasksReadme = buildTasksReadme({ tracker: tracker.tracker });
  track(writeIfAbsent(tasksReadmePath, tasksReadme, { dryRun }), tasksReadmePath);

  // Only audits/discovery are agent scratch output, not meant for git — tasks stay tracked.
  // README.md is the one file in each tree that should stay tracked.
  const gitignorePath = path.join(dir, '.gitignore');
  track(
    appendLinesIfMissing(
      gitignorePath,
      [
        '.caf/discovery/*/',
        '!.caf/discovery/README.md',
        '.caf/audits/*/',
        '!.caf/audits/README.md',
      ],
      { dryRun }
    ),
    gitignorePath
  );

  ensureDir(path.join(dir, '.caf', 'knowledge', 'decisions'), { dryRun });
  ensureDir(path.join(dir, '.caf', 'knowledge', 'golden-examples'), { dryRun });

  const indexPath = path.join(dir, '.caf', 'knowledge', 'INDEX.md');
  const items = KNOWLEDGE_INDEX_DOCS.map((doc) => ({ ...doc, exists: exists(path.join(dir, doc.path)) }));
  const indexMd = buildKnowledgeIndexMd({ items });
  track(writeIfAbsent(indexPath, indexMd, { dryRun }), indexPath);

  return { written, skipped };
}
