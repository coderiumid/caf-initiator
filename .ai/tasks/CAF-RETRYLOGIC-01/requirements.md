# Ticket: CAF-RETRYLOGIC-01 — `Retry Logic` Section Jadi Role-Aware

## Latar Belakang
Ditemukan saat retry `curate sync` di `coderium-web-v2`/`umkm-pos`: section
`## Retry Logic` didaftar di README `caf-initiator` sebagai salah satu
"kind-only/constant section" — isinya sama buat semua jenis agent. Tapi
kebutuhan aktualnya beda antara 2 kelompok agent:

- **Klaster 1 (Discovery)** — `caf-pm`, `caf-ux-designer`: outputnya
  `prd.md`/`flow.md` buat direview manusia, BUKAN `verify-report.md`. Retry
  logic yang benar: "verify gagal → lengkapi bagian yang kurang, retry max
  3x → kalau masih gagal karena informasi memang belum tersedia (bukan
  kesalahan agent), STOP dan tulis `## Open Questions`, laporkan ke manusia
  bahwa discovery ini butuh input mereka."
- **Klaster 2 (Delivery) dan sejenisnya** — `caf-frontend`, `caf-backend`,
  `caf-qa`, `caf-reviewer`, `caf-documentation`, dst: outputnya
  `verify-report.md` yang di-grep `caf-orchestrator` (`report-reader.ts`,
  `/\bSUCCESS\b/`). Retry logic yang benar: "verify passes → tulis
  `verify-report.md` dengan `Status: SUCCESS` (literal, karena
  `caf-orchestrator` treat apapun selain itu sebagai `NEEDS_HUMAN`) ...
  verify fails → retry max 3x → kalau masih gagal, `Status: NEEDS_HUMAN`."

Section lain (`What to Look For`, `Report Format`) SUDAH role-aware
(ditandai eksplisit "Auditor-only" di README) — pola yang sama perlu
diterapkan ke `Retry Logic`.

Dampak nyata: `curate sync` yang dijalankan minggu ini menimpa `Retry Logic`
di `caf-pm.md`/`caf-ux-designer.md` (2 repo) dengan versi Delivery-style yang
salah peran — instruksi generik yang nyuruh mereka nulis `verify-report.md`
dan `Status: SUCCESS`, padahal agent Discovery nggak pernah masuk pipeline
yang baca file itu.

## Apa yang Diminta
`buildRetryLogicSection` (atau fungsi setara di `agent-md.js`) jadi
role-aware — minimal membedakan Discovery vs Delivery, mengikuti pola yang
sudah dipakai `buildWhatToLookForSection(kind)`/`buildReportFormatSection(kind)`.

## Acceptance Criteria
- [ ] `buildRetryLogicSection` menerima parameter `kind` (sama seperti 2
      fungsi Auditor-only yang sudah ada)
- [ ] Untuk `kind` Discovery (`pm`, `ux-designer` — cek dulu nama `kind`
      persis apa yang dipakai di kode, jangan asumsi dari nama file) →
      output "Open Questions"-style retry logic, TIDAK menyebut
      `verify-report.md`/`Status: SUCCESS`
- [ ] Untuk `kind` lain (Delivery dan sejenisnya) → output tetap seperti
      sekarang (`Status: SUCCESS`/`NEEDS_HUMAN`, grep `caf-orchestrator`) —
      TIDAK ADA regresi untuk kind yang sudah benar
- [ ] `curate sync`/`curate audit` — section `Retry Logic` untuk kind
      Discovery sekarang dibandingkan terhadap template Discovery-nya
      sendiri (bukan template generik), supaya `curate` ke depan nggak
      salah tandain lagi
- [ ] Regression: seluruh test suite lama (`CAF-CURATE-DIFF-01` +
      `CAF-SECTIONPARSE-01`, total 38 test) tetap 100% pass
- [ ] Update README bagian tabel section tracking — `Retry Logic` dipindah
      dari kolom "kind-only/constant" ke ditandai role-aware (mengikuti pola
      penulisan `What to Look For`/`Report Format` yang sudah "Auditor-only")

## Eksplisit Out of Scope
- Revert/perbaikan isi `caf-pm.md`/`caf-ux-designer.md` di
  `coderium-web-v2`/`umkm-pos` — itu sesi terpisah, dilakukan SETELAH fix
  ini `SUCCESS` (supaya perbaikannya pakai template yang sudah benar,
  bukan ditambal manual lalu bisa salah lagi di sync berikutnya)
- Audit section lain yang mungkin juga punya masalah role-awareness serupa
  (`Allowed Tools`, `Input`, `Output`, `Working Pattern (PIV)`) — di luar
  scope ticket ini kecuali investigasi menemukan masalah yang sama persis,
  dalam hal itu STOP dan laporkan dulu, jangan diam-diam diperluas
- Desain ulang proses `curate baseline` supaya diff-review lebih ketat
  sebelum commit — item terpisah, dibahas di ticket lain