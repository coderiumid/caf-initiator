## Pre-PR gate's silent-default lenient parser — observasi, bukan diperbaiki di ticket ini

**Ditemukan:** 2026-09-04, selama investigasi Task 1 `CAF-REVIEWER-FORMAT-01`, membaca
`report-reader.ts` (`caf-orchestrator`).

**Masalah:**
`report-reader.ts` punya dua parser Verdict berbeda untuk `review-notes.md`:

- `readReviewerReport()` (dipakai `run-agent-pipeline.use-case.ts`, gate pre-PR pipeline
  reguler — ini yang kena CDR-43) — LENIENT: regex `/\bAPPROVE\b/i` dkk, kalau tidak ada
  yang match, diam-diam default ke `verdict = 'CHANGES_REQUESTED'` (baris 69). Tidak ada
  error, tidak ada log peringatan — pipeline lanjut seolah reviewer benar-benar meminta
  perubahan, padahal Verdict-nya sekadar tidak terbaca.
- `readInitialReviewReport()` (dipakai `run-pr-review.use-case.ts`, webhook mode `initial`,
  `CAF-ORCH-PRREVIEW-03`) — STRICT: exact-match setelah cleanup, `throw
  UnrecognizedVerdictError` kalau tidak cocok/tidak ada — eksplisit STOP.

**Dampak:**
Fix di ticket ini (Report Format kind-aware untuk `reviewer`) membuat kemungkinan
mismatch jauh lebih kecil karena agent sekarang punya instruksi eksplisit soal wording
Verdict. Tapi selama `readReviewerReport()` masih silent-default, root cause STRUKTURAL
CDR-43 (gate gagal diam-diam, bukan gagal loud) tetap ada — kalau suatu saat wording
drift lagi (mis. `report-reader.ts` diubah tanpa `caf-reviewer.md` ikut diupdate, lihat
risiko 2-sumber-kebenaran di `verify-report.md`/README), gate pre-PR akan kembali salah
baca sebagai `CHANGES_REQUESTED` tanpa ada sinyal error — bukan STOP eksplisit seperti
versi webhook.

**Rekomendasi:** Ticket terpisah, pola sama seperti `CAF-RETRYLOGIC-01`/
`CAF-DEVOPS-KIND-01` — investigasi dulu apakah `readReviewerReport()` sebaiknya juga
throw eksplisit (samakan dengan `readInitialReviewReport()`) atau silent-default memang
sengaja (mis. karena pipeline reguler punya siklus retry otomatis yang bisa
"menyembuhkan diri" dari verdict yang salah baca, beda dengan webhook single-run). Ini
perubahan di `caf-orchestrator`, bukan `caf-initiator` — di luar scope tool ini
sepenuhnya.

**Status:** Dicatat sebagai observasi per instruksi eksekusi (Eksplisit Out of Scope),
belum dikerjakan. Butuh konfirmasi user dan sesi terpisah di repo `caf-orchestrator`
kalau mau dilanjutkan.

---

## 2-sumber-kebenaran: `buildReportFormatSection('reviewer')` (caf-initiator) vs `buildInitialReviewPrompt()` (caf-orchestrator)

**Ditemukan:** 2026-09-04, Task 1 `CAF-REVIEWER-FORMAT-01` (checkpoint wajib, dikonfirmasi
user untuk lanjut Task 2 tanpa memperluas scope ke single-sourcing).

**Ringkasan risiko:** kedua repo menyalin skeleton Verdict (Ticket, Agent, Verdict,
Security Audit, Qualitative Review, Verdict Rationale, For Developer) secara terpisah,
tanpa import lintas-repo (dua npm package berbeda, deploy cycle berbeda). Sekarang identik
karena disalin verbatim dari `buildInitialReviewPrompt()`, tapi bisa drift kalau salah satu
diubah tanpa yang lain.

**Keputusan:** didokumentasikan (komentar di `agent-md.js`, README, test regex-lock di
`test/reviewer-report-format.test.js`), TIDAK single-sourced — biaya cross-repo
single-sourcing (shared package/build-time fetch) tidak sebanding untuk satu string.
Lihat README § "Content-level section tracking" dan komentar di atas
`buildReviewerReportFormat()` (`src/templates/agent-md.js`).

**Status:** Risiko diketahui, mitigasi = test regex-lock (Task 3) sebagai early-warning,
bukan pencegahan struktural. Terbuka untuk revisit kalau drift beneran terjadi di masa
depan.
