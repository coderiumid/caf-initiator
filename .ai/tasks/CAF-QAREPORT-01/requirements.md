# Ticket: CAF-QAREPORT-01

## Judul
Fix QA gate false-exhaustion — `caf-qa` agent tidak punya report contract yang baku

## Problem

QA gate di `run-agent-pipeline.use-case.ts` (`caf-orchestrator`) kadang menyatakan
`GATE EXHAUSTED` walau QA sebenarnya lulus 100% (semua test/lint/build PASS, semua
acceptance criteria terpenuhi). Ditemukan di `umkm-pos` PR #109 (GAN-132) — QA gate
exhausted meski `qa-report.md` isinya `Status: SUCCESS` dan semua check hijau.

Sebagai pembanding, PR #114 (GAN-135) — kasus serupa (QA retry sekali) tapi berhasil
lolos ke reviewer/PR. Kedua laporan sama-sama valid, tapi diparsing beda oleh
orchestrator.

## Root Cause (hasil investigasi)

1. **Kontrak status salah tempel di template generator.**
   `buildRetryLogicSection(kind)` di `caf-initiator/src/templates/agent-md.js`
   memberi teks generik "write `verify-report.md` dengan `Status: SUCCESS`" ke SEMUA
   kind kecuali `DISCOVERY_KINDS` (`pm`, `ux-designer`) — termasuk `qa` dan
   `reviewer`, yang punya kontrak status berbeda (`qa-report.md`/`PASS`|`FAIL` dan
   `review-notes.md`/`Verdict`). Pernah ada insiden serupa sebelumnya
   (`CAF-RETRYLOGIC-01`, untuk `pm`/`ux-designer`) — fix-nya tidak diperluas ke `qa`.

2. **Parser `readQaReport()` scan seluruh isi file, bukan baris `Status:` spesifik.**
   `report-reader.ts`: `/\bPASS\b/.test(raw)` — mencari kata "PASS" berdiri sendiri
   DI MANA PUN di raw text. Hasilnya nondeterministik: match atau tidaknya tergantung
   gaya penulisan bebas QA agent di badan laporan (mis. tabel dengan sel "PASS" vs.
   kalimat "... PASSED" yang tidak match `\b`), bukan pada kontrak status yang
   sebenarnya.

3. **`caf-qa` tidak punya report skeleton baku.**
   `buildReportFormatSection(kind)` hanya mengembalikan skeleton fix untuk `reviewer`
   dan `auditor` — untuk `qa`, `null`. Akibatnya QA agent bebas berimprovisasi
   struktur laporan tiap run, yang bikin masalah #2 makin nggak konsisten.

4. **`caf-qa.md` di target repo masih draft mentah caf-initiator**, belum pernah
   di-review/lengkapi manusia (Scope & Verify Checklist masih `TODO`), dan section
   Retry Logic-nya membawa bug #1 ke dalam instruksi nyata yang dijalankan agent.

## Acceptance Criteria

- [ ] `caf-qa` punya report skeleton baku (format tabel/section tetap, ada baris
      `Status: PASS` atau `Status: FAIL` yang wajib)
- [ ] `caf-qa` Retry Logic section menunjuk ke `qa-report.md`/`Status: PASS`, bukan
      `verify-report.md`/`Status: SUCCESS`
- [ ] `caf-reviewer` Retry Logic section tidak lagi membawa teks
      `verify-report.md`/`Status: SUCCESS` yang salah kontrak
- [ ] `readQaReport()` mem-parsing status dari baris `Status:` spesifik (line-anchored),
      bukan scan bebas ke seluruh isi file
- [ ] `caf-qa.md` di `umkm-pos` dan `coderium-web-v2` sudah pakai kontrak yang benar
- [ ] Perubahan generator TIDAK butuh perubahan pada `verify-report.md`/reviewer
      contract yang sudah benar (implementation agents tetap `Status: SUCCESS`)

## Affected Repos & Files

| Repo | File | Perubahan |
|---|---|---|
| `coderiumid/caf-initiator` | `src/templates/agent-md.js` | tambah case `qa` di `buildReportFormatSection`, `buildRetryLogicSection`, `buildAuditContractSections` |
| `coderiumid/caf-orchestrator` | `src/infrastructure/reports/report-reader.ts` | `readQaReport()` jadi line-anchored |
| `ganjardbc/umkm-pos` | `.claude/agents/caf-qa.md` | isi TODO + fix Retry Logic + tambah Report Format |
| `ganjardbc/umkm-pos` | `.claude/agents/caf-reviewer.md` | audit + fix Retry Logic bila kena bug sama |
| `ganjardbc/coderium-web-v2` | `.claude/agents/caf-qa.md` | sama seperti umkm-pos (file identik) |
| `ganjardbc/coderium-web-v2` | `.claude/agents/caf-reviewer.md` | sama seperti umkm-pos |

## Out of Scope

- `website-cms-v2` — repo ketiga pemakai CAF, sengaja di-skip (audit terpisah)
- Perubahan pada kontrak `verify-report.md` (implementation agents) — sudah benar,
  tidak disentuh
- Perubahan pada `Verdict` contract reviewer yang sudah ada di
  `buildReviewerReportFormat()` — hanya Retry Logic section-nya yang perlu diaudit