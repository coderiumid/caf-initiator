# Tasks: CAF-COMPLETE-DRAFTS-01

Status: DONE — lihat `verify-report.md`.

- [x] `src/templates/complete-drafts-command.js` — `buildCompleteDraftsMd` (murni, sadar-mode)
- [x] `src/commands/complete-drafts.js` — `completeDrafts` + `listDraftFiles`, tawaran baseline
- [x] `src/commands/check-drafts.js` — `checkDrafts` (read-only)
- [x] `src/commands/scaffold.js` — target `complete-drafts`, langkah terakhir `CHAIN_ORDER`
- [x] `src/index.js` — flag `curate --check-drafts`, eksklusif dengan `--audit-only`/`--sync-only`
- [x] `README.md`, `CLAUDE.md`
- [x] `test/complete-drafts.test.js` (16 test)
- [x] Verify: `npm test`, diff MONOREPO vs `HEAD`, E2E di salinan fixture Nuxt
- [ ] Uji command dengan AI sungguhan di project nyata — TIDAK bisa dilakukan dari sini, perlu user
