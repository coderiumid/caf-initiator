// CAF-CHORE-INIT-01 hid `architect` from the picker. The goldens recorded before that ticket
// (`test/fixtures/pre-*`, `snapshots/mono-pnpm.json`) hold a roster with caf-architect.md in it, so
// the helpers that mimic the picker for them still select it: they stand for "a user who picks
// architect", which still works (the candidate and the kind are untouched). Only the new tests of
// that ticket use the live `isOfferedCandidate`.
import { isOfferedCandidate } from '../../src/commands/agents.js';

export const offeredWithArchitect = (candidate) => isOfferedCandidate(candidate) || candidate.kind === 'architect';
