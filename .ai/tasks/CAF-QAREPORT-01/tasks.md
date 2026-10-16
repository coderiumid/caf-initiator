# Tasks: CAF-QAREPORT-01

Urutan wajib: Task 1 → Task 2 → Task 3 → Task 4. Task 3/4 baru relevan setelah
Task 1 selesai (template sumbernya harus benar dulu sebelum dipakai acuan edit
manual).

---

## Task 1 — `coderiumid/caf-initiator`

File: `src/templates/agent-md.js`

- [ ] Buat `buildQaReportFormat()` — skeleton laporan QA baku, mengikuti pola
      `buildReviewerReportFormat()`. Wajib ada baris literal `Status: PASS` atau
      `Status: FAIL` (bukan `SUCCESS`).
- [ ] `buildReportFormatSection(kind)` — tambah case `if (kind === 'qa') return
      buildQaReportFormat();`
- [ ] `buildAuditContractSections(kind)` — tambah cabang untuk `qa` supaya
      `## Report Format` ikut ter-render ke body `caf-qa.md` (saat ini cuma
      `auditor` dan `reviewer` yang dirender).
- [ ] `buildRetryLogicSection(kind)` — tambah case `qa`:
      teks baru harus bilang tulis `qa-report.md` dengan `Status: PASS`/`FAIL`,
      bukan `verify-report.md`/`SUCCESS`.
- [ ] `buildRetryLogicSection(kind)` — tambah case `reviewer`: arahkan ke kontrak
      `review-notes.md`/`Verdict` (rujuk ke `buildReviewerReportFormat()`, jangan
      duplikasi teks), bukan `verify-report.md`/`SUCCESS`.
- [ ] Jalankan test suite yang ada (`test/`) — pastikan tidak merusak snapshot
      test untuk kind lain (`frontend`/`backend`/`implementation` harus tetap
      byte-identik ke sebelumnya).

---

## Task 2 — `coderiumid/caf-orchestrator`

File: `src/infrastructure/reports/report-reader.ts`

- [ ] Ganti `readQaReport()` dari scan bebas (`/\bPASS\b/.test(raw)`) jadi
      line-anchored match ke baris `Status:` — pola sama seperti
      `readVerifyReport()` atau `VERDICT_LINE` regex punya reviewer.
      Contoh arah: `const STATUS_LINE = /^Status:\s*(PASS|FAIL)\s*$/im;`
- [ ] Pastikan fallback tetap `FAIL` kalau baris `Status:` tidak ditemukan sama
      sekali (fail-safe, jangan diam-diam anggap PASS).
- [ ] Tambah/update unit test untuk `readQaReport()` — kasus: `Status: PASS`
      match, `Status: FAIL` match, `Status: SUCCESS` (kontrak salah) → harus
      `FAIL` bukan diam-diam PASS, kata "PASS" nyasar di body tapi bukan di
      baris Status → harus tetap `FAIL`.

---

## Task 3 — `ganjardbc/umkm-pos`

File: `.claude/agents/caf-qa.md`

- [ ] Isi `## Scope` (TODO saat ini kosong) — tentukan area yang boleh dibaca QA
      (kemungkinan seluruh repo untuk verifikasi, read-only).
- [ ] Isi `## Verify Checklist` (TODO saat ini kosong) — tentukan verifikasi
      manual yang relevan untuk QA (di luar script otomatis yang sudah dijalankan
      implementation agent).
- [ ] Ganti `## Retry Logic` — pakai kontrak baru dari Task 1 (`qa-report.md`/
      `Status: PASS`|`FAIL`).
- [ ] Tambah `## Report Format` — skeleton dari `buildQaReportFormat()` (Task 1).
- [ ] Hapus banner "DRAFT produced by caf-initiator — review and complete before
      use" setelah semua TODO terisi.

File: `.claude/agents/caf-reviewer.md`

- [ ] Audit `## Retry Logic` — cek apakah masih pakai teks
      `verify-report.md`/`Status: SUCCESS` yang salah kontrak. Kalau iya, ganti
      sesuai fix Task 1.

---

## Task 4 — `ganjardbc/coderium-web-v2`

Sama persis dengan Task 3 (file `caf-qa.md` & `caf-reviewer.md` identik
byte-for-byte dengan `umkm-pos` per pengecekan sebelumnya).

- [ ] `.claude/agents/caf-qa.md` — isi TODO, fix Retry Logic, tambah Report Format
- [ ] `.claude/agents/caf-reviewer.md` — audit Retry Logic