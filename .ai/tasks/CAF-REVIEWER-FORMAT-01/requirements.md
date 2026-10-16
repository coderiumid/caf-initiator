# Ticket: CAF-REVIEWER-FORMAT-01 — `Report Format` Kind-Aware untuk `reviewer`

## Latar Belakang
Ditemukan lewat CDR-43 di `coderium-web-v2`: gate `caf-reviewer` di pipeline
pra-PR (Klaster 2) stop di `NEEDS_HUMAN`, padahal implementasinya sendiri
sudah benar dan Reviewer menulis "Overall Verdict: APPROVED". Root cause:

- Parser `report-reader.ts` (`caf-orchestrator`) STRICT — regex
  `/\bAPPROVE\b/i` butuh word-boundary persis setelah "APPROVE". Kata
  "APPROVED" tidak match (huruf "D" bikin boundary gagal) → verdict jatuh ke
  default `CHANGES_REQUESTED` → pipeline treat sebagai belum approved →
  `NEEDS_HUMAN`.
- `caf-reviewer.md` (template `caf-initiator`) TIDAK PUNYA section
  `## Report Format`/`## What to Look For` sama sekali — dikonfirmasi lewat
  `grep -n "^##"`. Section itu saat ini eksklusif untuk kind `auditor`
  (ditandai "Auditor-only" di README). Reviewer menulis Verdict berdasarkan
  tebakan wajar secara bahasa, bukan instruksi eksplisit — hasilnya nggak
  match kontrak ketat yang `caf-orchestrator` harapkan.

Ini pola yang sama dengan `CAF-RETRYLOGIC-01`/`CAF-DISCOVERY-SECTIONS-01`:
gap kontrak antara agent definition (tidak spesifik) dan parser (strict) —
bedanya kali ini section-nya belum pernah ada sama sekali untuk kind
`reviewer` (bukan section existing yang salah isi).

**Konten kanonik sudah tersedia** — bukan perlu didesain dari nol. Format
Verdict yang benar sudah ditulis dan diuji di
`run-pr-review.use-case.ts::buildInitialReviewPrompt()` (dibangun untuk
webhook mode `initial`, `CAF-ORCH-PRREVIEW-03`):

```
Verdict: APPROVE | CHANGES REQUESTED | DEFER
...
### Verdict Rationale
...
Verdict HARUS persis salah satu dari tiga nilai di atas (APPROVE / CHANGES REQUESTED / DEFER)
```

## Apa yang Diminta
1. `Report Format` di `agent-md.js` (`caf-initiator`) menjadi kind-aware
   untuk `reviewer` — bukan lagi eksklusif `auditor`. Isi untuk `reviewer`:
   format `review-notes.md` (Verdict, Security Audit, Qualitative Review,
   Verdict Rationale), dengan baris Verdict PERSIS `Verdict: APPROVE` /
   `Verdict: CHANGES REQUESTED` / `Verdict: DEFER` — match regex
   `report-reader.ts` kata per kata
2. Investigasi (Task 1): apakah wording di `buildInitialReviewPrompt()`
   (runtime, `caf-orchestrator`) dan section `Report Format` baru ini
   (static, `caf-initiator`) berisiko saling drift ke depan (2 sumber
   kebenaran yang kebetulan sama sekarang, tapi bisa nggak sinkron kalau
   salah satu diubah tanpa yang lain) — laporkan, putuskan apakah perlu
   langkah mitigasi atau cukup dicatat sebagai risiko yang diketahui
3. `curate sync` di `coderium-web-v2`/`umkm-pos` — section ini INSERT baru
   (bukan overwrite), karena sebelumnya section-nya nggak ada sama sekali

## Acceptance Criteria
- [ ] `buildReportFormatSection(kind)` menghasilkan konten yang benar untuk
      `kind='reviewer'`, dengan baris Verdict yang match persis regex
      `/\bAPPROVE\b/i`, `/\bDEFER\b/i` dst di `report-reader.ts`
- [ ] Kind `auditor` — TIDAK berubah sama sekali (byte-for-byte, pola sama
      seperti ticket-ticket sebelumnya)
- [ ] Kind lain (bukan `auditor`/`reviewer`) — tetap `null` (tidak berubah)
- [ ] `curate audit` terhadap fixture `caf-reviewer.md` TANPA section ini →
      terbaca sebagai "missing" (bukan `DRIFT`/`UNTRACKED`, konsisten
      kategori section yang belum pernah ada)
- [ ] `curate sync` terhadap fixture yang sama → section ter-INSERT dengan
      benar, tidak mengganggu section lain (`Role`, `Scope`, dst)
- [ ] Regression: seluruh test suite sebelumnya (262 test dari
      `CAF-ORCH-PRREVIEW-03` — cek dulu apakah ini hitungan `caf-orchestrator`
      atau `caf-initiator`, pastikan run test suite yang benar di repo yang
      benar) tetap 100% pass
- [ ] Setelah `curate sync` dijalankan ke `coderium-web-v2`/`umkm-pos` (sesi
      terpisah, lihat Out of Scope): `caf-reviewer.md` di kedua repo punya
      section `Report Format` yang benar

## Eksplisit Out of Scope
- Menjalankan `curate sync` beneran ke `coderium-web-v2`/`umkm-pos` — sesi
  TERPISAH setelah ticket ini `SUCCESS` di `caf-initiator` (user akan
  retrigger CDR-43 manual setelah kedua langkah ini selesai)
- Mengubah default lenient di gate Reviewer pra-PR (`report-reader.ts`
  baris 69, `let verdict: ReviewerVerdict = 'CHANGES_REQUESTED'` sebagai
  fallback diam-diam, BUKAN error eksplisit seperti versi strict webhook) —
  ini kemungkinan gap terpisah (silent-default vs eksplisit STOP kayak versi
  webhook), dicatat sebagai observasi, bukan diperbaiki di ticket ini kecuali
  Task 1 investigasi menyarankan lain dan dikonfirmasi user
- `buildInitialReviewPrompt()` sendiri — TIDAK diubah, tetap seperti sekarang