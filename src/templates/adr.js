function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pad(number) {
  return String(number).padStart(3, '0');
}

export function adrFilename(number, title) {
  return `adr-${pad(number)}-${slugify(title)}.md`;
}

/**
 * Build ADR skeleton markdown. `evidence` (if present) is factual detection output, never
 * a reason — Decision/Alternatives/Consequences are always left TODO for a human to fill in.
 */
export function buildAdr({ number, title, evidence }) {
  const contextBody = evidence
    ? `${evidence}\n\nTODO: explain the context/problem that motivated this decision.`
    : 'TODO: explain the context/problem that motivated this decision.';

  return `# ADR-${pad(number)}: ${title}

## Status
Proposed <!-- TODO: change to Accepted/Deprecated/Superseded after review -->

## Context
${contextBody}

## Decision
TODO: what the final decision is, and **why** (not just "what") — this section MUST be
filled in by a human, this tool doesn't know the reasoning behind a decision already made.

## Alternatives Considered
TODO: other options considered and why they weren't chosen.

## Consequences
TODO: the impact/trade-offs of this decision, including negative ones if any.
`;
}
