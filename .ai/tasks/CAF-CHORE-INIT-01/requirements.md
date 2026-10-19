Status: APPROVED

# CAF-CHORE-INIT-01 — Aktifkan caf-design/caf-breakdown, sembunyikan architect

## 1. Goal
Skill `caf-design` dan `caf-breakdown` terbukti dipakai planner dengan benar (dispatch 17 Okt), jadi
template tidak lagi menulis banner DRAFT untuk keduanya. `architect` tidak lagi ditawarkan picker
(diganti planner + `design.md`), kind dan berkas yang sudah ada tetap.

## 2. Scope
Dalam: `src/templates/skill-md.js`, `src/commands/agents.js`, test terkait, `README.md`, `CAF.md`.
Luar: bump versi, push, merge, `caf-traceability` (tetap berbanner), perubahan orchestrator.

## 3. Findings
- Finding: `buildDesignSkill` dan `buildBreakdownSkill` menulis `${SPEC_DRAFT_BANNER}` di `src/templates/skill-md.js`; `buildTraceabilitySkill` memakai banner yang sama.
- Finding: `SUPERSEDED_CANDIDATE_KINDS = ['qa', 'implementer']` di `src/commands/agents.js`; `isOfferedCandidate` menyaring picker dengan daftar itu.
- Finding: `buildRunMd` sudah punya cabang `hasArchitect=false` (lewati stage, planner menulis `design.md`).

## 4. Acceptance Criteria
- AC-1: When scaffold skills ditulis, then `caf-design/SKILL.md` dan `caf-breakdown/SKILL.md` tidak memuat banner `> DRAFT` maupun `Agents: this skill is NOT ready`. Verify: automated test di test/chore-init-01.test.js
- AC-2: When scaffold skills ditulis, then front-matter dua skill itu diikuti tepat satu baris kosong lalu isi. Verify: automated test di test/chore-init-01.test.js
- AC-3: When scaffold skills ditulis, then `caf-traceability` masih berbanner. Verify: automated test di test/chore-init-01.test.js
- AC-4: When scaffold baru SINGLE_REPO, then `## Skills` planner memuat pointer `caf-design` dan `caf-breakdown`, tanpa peringatan DRAFT, dan check-drafts tidak menghitungnya draft. Verify: automated test di test/chore-init-01.test.js
- AC-5: When `curate sync` dijalankan pada repo dengan berkas skill lama, then berkas skill tidak berubah byte-per-byte. Verify: automated test di test/chore-init-01.test.js
- AC-6: When hash/fixture skill dihitung ulang, then test pin sdd05a/sdd05b/sdd10/sdd12 lolos. Verify: command: npm test | expect: exit code 0
- AC-7: When `isOfferedCandidate` dipanggil, then `architect` tidak ditawarkan; kind tetap di `KNOWN_KINDS`. Verify: automated test di test/chore-init-01.test.js
- AC-8: When repo punya `caf-architect.md`, then `curate` membaca kind `architect` dan berkas tidak berubah. Verify: automated test di test/chore-init-01.test.js
- AC-9: When `scaffold --dry-run` di fixture scratch, then architect tidak ada di keluaran. Verify: command: node src/index.js scaffold agents --dir <scratch> --dry-run | expect: tidak memuat caf-architect
- AC-10: When README/CAF.md dibaca, then kalimat banner DRAFT caf-design/caf-breakdown dan "Architect stays" sesuai perilaku baru. Verify: manual

## 5. Assumptions
Assumption A-1: Teks `/caf-run` tanpa architect sudah benar (basis: cabang `hasArchitect=false` di `run-command.js`).

## 6. Questions
Tidak ada
