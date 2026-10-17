# CAF-SDD-09 — Samakan `CAF.md` dengan perilaku SDD yang sudah ada (caf-initiator)
Status: APPROVED
Source: backlog SDD (docs gap), disetujui Ganjar 17 Okt

## 1. Outcome
`CAF.md` di root `caf-initiator` menggambarkan CAF yang sekarang: alur spec-first dengan `design.md` dan `breakdown.md` dari Planner, skill `caf-spec`, `caf-traceability`, `caf-design`, `caf-breakdown`, roster dan command final, serta gerbang spec di orkestrasi. Pembaca (manusia atau AI yang menjalankan `CAF.md`) tidak lagi mendapat gambaran lama (Architect sebagai langkah wajib, QA sebagai gate, 8 agen).

## 2. Scope
In:
- Perubahan teks di `CAF.md` saja, plus satu test dokumentasi baru dan satu paragraf di `CLAUDE.md`.
- Bagian yang diperbarui: "What CAF Is" (tambah satu paragraf), "Full Pipeline", tabel agen spesialis, daftar skill dan mapping di Layer 2, daftar artefak Layer 3, "Recommended Full Folder Structure", ringkasan Layer 5.
Out:
- Kode di `src/`, template, golden, snapshot, orchestrator.
- Menulis ulang Cluster 1/3/4 atau Layer 4; hanya diberi catatan status.
- Dokumen lain (`README.md` sudah benar menurut catatan; `CAF-SUMMARY.md` dkk di Project tidak disentuh).

## 3. Constraints and Assumptions
- Finding: `CAF.md` tidak dibaca oleh kode atau test sebagai data. Komentar di `src/templates/*` hanya merujuk namanya ("CAF.md Layer 3", "CAF.md Cluster 1", "CAF.md Cluster 4", "CAF.md Layer 2").
- Finding: bagian "What CAF Is" sudah punya paragraf SDD (spec-first menuju spec-anchored) dan paragraf Validator; yang kurang adalah `design.md`, `breakdown.md`, skill baru, dan command.
- Finding: "Full Pipeline" masih memuat langkah Architect dan Documentation tanpa gerbang spec, Clarify, atau Validator. Tabel "8 Specialist Agents" masih memuat Architect (`design.md`), QA (`qa-report.md`), Documentation, DevOps. Daftar artefak Layer 3 tidak memuat `breakdown.md`. Folder structure masih memuat `caf-architect.md`, `caf-documentation.md`, `caf-design-ticket.md`, `caf-qa-check.md`, `caf-review-ticket.md`.
- Finding: Layer 5 menggambarkan alur Linear/Jira/GitHub sampai `verify-report.md` saja, tanpa Clarify, gerbang spec (label `spec-approval`), atau `/caf-approve-spec`. Perilaku itu ada di orchestrator 04c/04d.
- Constraint: judul `### Layer 3 — Artifact Handoff`, `### Layer 2 — Agent Definitions`, `### Cluster 1 — Discovery`, `### Cluster 4 — Audit` tidak diganti, karena komentar di template merujuknya.
- Constraint: teks `CAF.md` berbahasa Inggris (seperti sekarang).
- Constraint: tidak ada klaim perilaku yang belum dilihat. Setiap kalimat baru ditulis dari `CLAUDE.md` initiator atau `README.md`; yang bersumber dari orchestrator ditulis dari `CAF-STATUS-TERKINI` (dikutip di bawah) dan diberi tanda "implemented by caf-orchestrator".
- Assumption A-1: dasar perilaku orchestrator yang akan ditulis: gerbang spec dengan label `spec-approval` (dapat dikonfigurasi), Draft PR berisi spec saja, `/caf-approve-spec` hanya mengubah baris `Status:`, `NEEDS_CLARIFICATION` selalu berhenti dan bertanya di tiket (marka `❓ CAF-CLARIFY`). Dasar: progress 04c/04d. T1 memeriksanya terhadap `CLAUDE.md`/README orchestrator bila repo itu ada di mesin; bila tidak, kalimat ditulis umum tanpa nama label.
- Assumption A-2: `architect` masih ditawarkan picker (belum disembunyikan sampai dispatch test `caf-design`), jadi teks menyebut Architect sebagai "optional, being folded into the Planner", bukan "dihapus".

## 4. Decisions Already Made
- D-1 (konsultan; Ganjar boleh ubah): `CAF.md` tetap spesifikasi generik. Bagian yang hanya benar untuk `caf-init` ditandai "what `caf-init` scaffolds"; Cluster 1, 3, 4 tidak di-scaffold lagi dan diberi satu kalimat status, isinya tetap.
- D-2: test dokumentasi hanya memeriksa keberadaan istilah dan ketiadaan klaim usang (daftar di AC-8), bukan seluruh isi.

## 5. Open Questions
Tidak ada

## 6. Acceptance Criteria
- AC-1: When a reader opens "What CAF Is", then it states that the Planner writes `requirements.md` and `tasks.md`, and `design.md` or `breakdown.md` when the request needs one, with the three criteria for `design.md` and the one-outcome rule for `breakdown.md`. Verify: manual: read the paragraph; plus AC-8.
- AC-2: When a reader opens "Full Pipeline", then the diagram shows Specify/Clarify with the human approval gate before implementation, the Validator as the gate (with QA named as the older gate), and no step that makes Architect mandatory. Verify: manual: read the diagram.
- AC-3: When a reader opens the specialist agents table, then it lists the final roster `caf-planner`, `caf-frontend`, `caf-backend`, `caf-validator`, `caf-reviewer` with their artifacts, and marks Architect, QA, Documentation, DevOps as optional or superseded. The count "8 Specialist Agents" is gone. Verify: automated test (AC-8 checks the removed count phrase).
- AC-4: When a reader opens the skills part of Layer 2, then `caf-spec`, `caf-traceability`, `caf-design`, `caf-breakdown` are listed with the agent kinds they are mapped to and the fact that the last three are born as DRAFT with a banner. Verify: manual: compare with the `SKILLS_BY_KIND` table in `src/templates/skill-md.js` (T1 reads it).
- AC-5: When a reader opens Layer 3, then `breakdown.md` is in the artifact list and the Planner owns `design.md`; each of the two says it has no `Status:` line. Verify: automated test (AC-8).
- AC-6: When a reader opens the folder structure, then it lists the five final agents and five final commands (`/caf-plan`, `/caf-run`, `/caf-review`, `/caf-fix-review`, `/caf-complete-drafts`), and the removed commands are not drawn as scaffolded. Verify: automated test (AC-8).
- AC-7: When a reader opens Layer 5, then one added paragraph describes the SDD flow of the orchestrator (stop on `NEEDS_CLARIFICATION` and ask on the ticket, spec gate with a Draft PR, approval by a human, retry limits unchanged) and says it is implemented by caf-orchestrator. Verify: manual: read the paragraph against A-1.
- AC-8: When `npm test` runs, then a new test `test/sdd09-caf-md.test.js` passes: `CAF.md` contains `design.md`, `breakdown.md`, `caf-design`, `caf-breakdown`, `caf-traceability`, `/caf-plan`, `/caf-run`; it contains none of `8 Specialist Agents`, `caf-design-ticket.md`, `caf-qa-check.md`, `caf-review-ticket.md`; and the four headings listed in Constraints are still there. Verify: automated test: `test/sdd09-caf-md.test.js`.
- AC-9: When `npm test` runs, then every other test passes unchanged and no file under `test/fixtures/` or `src/` differs from before. Verify: command: `git diff --stat main -- src test/fixtures` | expect: empty output; and command: `npm test` | expect: exit code 0.
- AC-10: When a maintainer opens `CLAUDE.md`, then one short paragraph says `CAF.md` is reference material kept in step with the tickets, which headings other files refer to, and that `test/sdd09-caf-md.test.js` guards the terms. Verify: manual: read it (the executor reports UNVERIFIED; Ganjar reads).

## Coverage
AC-1 → T2; AC-2 → T2; AC-3 → T2; AC-4 → T3; AC-5 → T3; AC-6 → T4; AC-7 → T5; AC-8 → T6; AC-9 → T7; AC-10 → T6.