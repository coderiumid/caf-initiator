import path from 'node:path';

import { readFileSafe } from '../util.js';

function indentOf(line) {
  const match = line.match(/^(\s*)/);
  return match[1].length;
}

/**
 * Find a `key:` line at the given indent inside `lines[fromIdx..]`, and return the
 * slice of lines that make up its nested block (strictly deeper indent), stopping
 * at the first line that returns to `<= indent` or end of file.
 * Returns null if the key isn't found before the block ends.
 */
function findBlock(lines, fromIdx, indent, key) {
  for (let i = fromIdx; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const lineIndent = indentOf(line);
    if (lineIndent < indent) return null; // left the parent block entirely
    if (lineIndent > indent) continue; // deeper than expected here, skip (handled by caller when descending)
    if (lineIndent === indent) {
      const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!match) return null;
      if (match[1] !== key) {
        // Sibling key at same indent — if we've already scanned past where the
        // target key would be for a well-formed file, this file just doesn't have it.
        continue;
      }
      const blockLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() === '') {
          j += 1;
          continue;
        }
        if (indentOf(l) <= indent) break;
        blockLines.push(l);
        j += 1;
      }
      return { inlineValue: match[2].trim(), blockLines, startIndex: i };
    }
  }
  return null;
}

/**
 * Read `maxRetries` for a given agent role (e.g. 'qa', 'reviewer') from a
 * `agents: -> <role>: -> maxRetries: N` block in caf.config.yaml, using manual
 * indentation-based parsing (no YAML dependency, mirrors the pnpm-workspace.yaml
 * parser in 02-detect-stack.js).
 *
 * Returns { maxRetries: number, source: 'caf.config.yaml' } on an unambiguous
 * match, or null if the file, the `agents:`/role block, or the maxRetries field
 * is missing, malformed, or ambiguous. Never guesses.
 */
export function readMaxRetries(rootDir, role) {
  const raw = readFileSafe(path.join(rootDir, 'caf.config.yaml'));
  if (!raw) return null;

  const lines = raw.split(/\r?\n/);

  const agentsBlock = findBlock(lines, 0, 0, 'agents');
  if (!agentsBlock || agentsBlock.blockLines.length === 0) return null;

  const agentsIndent = indentOf(agentsBlock.blockLines[0]);
  const roleBlock = findBlock(agentsBlock.blockLines, 0, agentsIndent, role);
  if (!roleBlock || roleBlock.blockLines.length === 0) return null;

  const roleIndent = indentOf(roleBlock.blockLines[0]);
  const retriesBlock = findBlock(roleBlock.blockLines, 0, roleIndent, 'maxRetries');
  if (!retriesBlock) return null;

  const value = retriesBlock.inlineValue;
  if (!/^\d+$/.test(value)) return null; // ambiguous/non-numeric — don't guess

  return { maxRetries: Number(value), source: 'caf.config.yaml' };
}
