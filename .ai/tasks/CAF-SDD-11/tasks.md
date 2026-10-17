# CAF-SDD-11 — Tasks
Status: APPROVED. Commit lokal saja; jangan push, merge, atau publish. Lanjut di branch `ai-agent/CAF-SDD-09`, setelah CAF-SDD-10 selesai dan ter-commit.

## T1 — Periksa
- Baca `PLANNER_SPEC_WORKFLOW` (`src/templates/agent-md.js`), `buildOutputSection`, dan semua test yang memegang daftar baris `## Output` planner (`sdd02d-planner-audit`, `sdd02e-planner-read`, `sdd05a`, `sdd05b`, `sdd06`, `sdd07` bila relevan, `sdd03f-stale-text`). Catat mana yang gagal pada baris baru (A-2).
- Bila temuan bertentangan dengan AC, STOP sebelum menyentuh `src/`.

## T2 — Tulis aturan (satu aturan, niat bukan daftar kata)
Tambahkan sebagai baris utuh di `### 1. Specify`, tepat setelah bullet `Status:` dan sebelum bullet `Tidak ada`. Teks (boleh dirapikan hanya untuk lebar baris, bukan makna):
```
- Write the prose of `requirements.md`, `tasks.md`, `design.md` and `breakdown.md` in the
  language of the ticket description (of the request, when it comes from chat), and the open
  questions too. The words the templates and other agents read stay exactly as the templates
  show them, in every language: section headings, `Status:` and its values, `AC-n:`,
  `Verify:` and its three forms, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`,
  `NON-BLOCKING`, `Answer:` and `Tidak ada`. File paths, symbol names, commands and text
  quoted from the ticket are written as they are.
```
## T3 — Golden dan test
- Rekam `test/fixtures/pre-sdd11/` (planner kedua fixture + `## Output` semua kind) dari HEAD sebelum kode berubah (`test/helpers/record-sdd11.mjs`, pola `record-sdd06.mjs`); jangan di-regenerate.
- `test/sdd11-planner-language.test.js`: AC-1 sampai AC-5.

## T4 — Helper dan test lama
- `test/helpers/since-11.js` (teks baru ditulis lengkap di helper, bukan diimpor); test lama yang membandingkan planner/`## Output` dengan golden sebelum 11 membacanya lewat helper ini (diterapkan setelah `since-06`/`since-07`). Golden tidak diedit; asersi tidak dilonggarkan. Catat tiap test yang diubah.
- `mono-pnpm.json`: hanya entri `caf-planner.md` yang berubah (diperiksa dulu bahwa hanya itu); bukan preseden.

## T5 — Dokumen dan verifikasi
- `CLAUDE.md`: paragraf AC-8; perbarui kalimat "Out of scope ... the language of the planner's artifacts".
- `npm test`; catat jumlah sebelum/sesudah. `verify-report.md` dengan baris pertama `Status: SUCCESS|NEEDS_HUMAN`, bukti per AC, daftar test yang diubah, catatan "AC-9 butuh dispatch Ganjar". Commit TERAKHIR.