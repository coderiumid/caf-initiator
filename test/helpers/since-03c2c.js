// What a golden recorded before CAF-SDD-03c2c becomes under it (the goldens are never edited):
// `/caf-plan-ticket` is not written, `/caf-run-pipeline` is `/caf-run` (file name and every mention),
// and `/caf-run` of two whole-repo agents has another "how to choose which agent" step.
// test/sdd03c2c-run-command.test.js holds those changes themselves.
const OLD = 'caf-run-pipeline.md';
const NEW = 'caf-run.md';
const START = '**How to choose which agent to spawn**';
const END = 'If multiple agents have tasks, run them **sequentially, not in parallel**';

export const renameRunCommand = (text) => text.replaceAll('/caf-run-pipeline', '/caf-run');

const routingBlock = (text) => {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  return start >= 0 && end > start ? [start, end] : null;
};

/**
 * `{ [path]: content }` of a golden put through the ticket. `current` is the same map as rendered
 * now: only used to take the routing step of `/caf-run`, which the ticket changed for one roster.
 */
export function sinceSdd03c2c(files, current = {}) {
  const out = {};
  for (const [rel, content] of Object.entries(files)) {
    if (rel.endsWith('caf-plan-ticket.md')) continue;
    if (rel.endsWith(OLD)) {
      const key = rel.slice(0, -OLD.length) + NEW;
      let text = renameRunCommand(content);
      const now = current[key];
      const [a, b] = routingBlock(text) || [];
      const [c, d] = (now && routingBlock(now)) || [];
      if (a !== undefined && c !== undefined) text = text.slice(0, a) + now.slice(c, d) + text.slice(b);
      out[key] = text;
    } else {
      out[rel] = rel.includes('.claude/commands/') ? renameRunCommand(content) : content;
    }
  }
  return out;
}
