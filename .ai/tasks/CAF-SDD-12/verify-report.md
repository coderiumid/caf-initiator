Status: SUCCESS

# Verify Report — CAF-SDD-12 (tahap 1)

## T1
- Nilai literal bullet bahasa SDD-11 ("language of the ticket description") ada di: `src/templates/agent-md.js`, `test/sdd11-planner-language.test.js`, `test/helpers/since-11.js`, `test/fixtures/snapshots/mono-pnpm.json`, `CLAUDE.md`. Tidak ada di `README*` atau `docs/`.
- Tujuh test lain membaca golden lama lewat `sinceSdd11`/`sinceSdd11Files`: `sdd02e`, `sdd03f`, `sdd03g`, `sdd05a`, `sdd05b`, `sdd06`, `sdd10`. `test/repo-context.test.js` memegang `mono-pnpm.json`.
- Urutan helper: `since-05a/05b → 06 → 07 → 11 → 12`. `since-12` diterapkan setelah `since-11`.
- Tidak ada temuan yang bertentangan dengan AC (tidak ada test yang memegang baris bahasa di luar jalur since-N). Lanjut ke `src/`.

## Acceptance Criteria
- AC-1: automated-test — `test/sdd12-planner-language.test.js` (`AC-1`, dua fixture): kalimat baru ada verbatim di `### 1. Specify`, dalam satu bullet; sisa bullet SDD-11 (daftar kata tetap, path/simbol/perintah/kutipan) sama persis.
- AC-2: automated-test — `AC-2`, dua fixture: planner dibanding `pre-sdd12/` hanya beda di baris bullet itu (satu baris SDD-11 diganti lima baris); `tools:`, 8 baris awal dan semua section lain identik byte.
- AC-3: automated-test — `AC-3`, dua fixture: `## Output` semua kind selain planner identik byte dengan `pre-sdd12/output-by-kind.*`.
- AC-4: automated-test — `AC-4`: tanpa `TODO`, tanpa heading `###`/`## `, tanpa nilai status baru, tanpa daftar bahasa atau kata terlarang; tetap satu bullet.
- AC-5: automated-test — `AC-5`, dua fixture: planner dengan teks SDD-11 dan planner pra-SDD-11, tidak diedit → `Output` `DRIFT`, dibawa ke teks baru, section lain sama byte, sync kedua tanpa drift; `Output` diedit tangan → `CONFLICT`, berkas tidak berubah byte (dry-run dan nyata).
- AC-6: automated-test — `AC-6` (tiga skill tidak memuat kalimat baru) dan cek sha256 yang ada (`sdd10-spec-v4`, `sdd05a-caf-design`, `sdd05b-caf-breakdown`, `sdd02b/02c`) tetap lulus tanpa diubah. Tidak ada berkas skill yang disentuh.
- AC-7: command — `npm test` | expect: exit 0. Hasil: `# tests 1029`, `# pass 1029`, `# fail 0`. Test lama yang memegang `## Output` planner berubah hanya lewat `test/helpers/since-12.js`; golden lama tidak diedit (`git diff` ke `test/fixtures/pre-sdd*` lama: 0 baris). Jumlah test tidak turun (1015 → 1029).
- AC-8: UNVERIFIED — manual: dibaca maintainer. Teks ada di `CLAUDE.md`, bagian "Language of the Planner's artifacts (CAF-SDD-11)", bullet "Where the language comes from (CAF-SDD-12)" (asal bahasa, pesan akhir, rollout `curate sync`); tanpa section baru.
- AC-9: manual — dijalankan di tahap 2, lihat bagian "Tahap 2" (lima run: B ×3 dan B4 semuanya Inggris, tiket Indonesia tetap Indonesia). Tetap perlu dibaca Ganjar; tabel di `/tmp/dispatch-results/REPORT-SDD12.md`.

## Hasil `npm test`
- Sebelum (HEAD `e71a17c`): 1015 test, 1015 lulus.
- Sesudah: 1029 test, 1029 lulus, 0 gagal. Tambahan 14 test = `test/sdd12-planner-language.test.js`.

## Test yang diubah (nama dan alasan)
Semua gagal karena teks bullet bahasa SDD-11 kini lebih panjang; asersi tidak dilonggarkan, ekspektasi lama dikirim lewat `sinceSdd12`.
- `test/sdd02e-planner-read.test.js` — AC-11 planner (mono-pnpm, single-nuxt): `Output` golden 02e dibawa lewat `sinceSdd12(sinceSdd11(...))`.
- `test/sdd03f-stale-text.test.js` — AC-8 planner (mono-pnpm, single-nuxt): idem.
- `test/sdd03g-unknown-kind.test.js` — AC-10 "default scaffold of every variant is the recorded one": `sinceSdd12Files` setelah `sinceSdd11Files`.
- `test/sdd05a-caf-design.test.js` — AC-7 planner (2) dan AC-10 sync planner pra-tiket (2): `sinceSdd12` di ekspektasi.
- `test/sdd05b-caf-breakdown.test.js` — AC-7 planner (2) dan AC-9 sync (2): idem.
- `test/sdd06-artifact-contract.test.js` — AC-4 planner (2): idem.
- `test/sdd10-spec-v4.test.js` — AC-5 planner (2): idem.
- `test/sdd11-planner-language.test.js` — AC-1, AC-2, AC-3, AC-5 (8 test): memegang baris bahasa SDD-11; ekspektasi diubah ke `LANGUAGE_RULE_NOW = sinceSdd12(LANGUAGE_RULE)`. Teks SDD-11 `LANGUAGE_RULE` tetap utuh di berkas.
- `test/repo-context.test.js` (tanpa perubahan berkas) — gagal pada snapshot `mono-pnpm.json`; snapshot diperbarui, lihat berikut.
- `test/fixtures/snapshots/mono-pnpm.json` — hanya entri `.claude/agents/caf-planner.md` yang berubah (dicek terhadap render: key lain, `stack`, dan format JSON sama). Bukan preseden.

## Berkas baru
`test/fixtures/pre-sdd12/` (rekaman dari HEAD sebelum `src/` berubah), `test/helpers/record-sdd12.mjs`, `test/helpers/since-12.js`, `test/sdd12-planner-language.test.js`.

## Catatan
- Satu perubahan `src/`: `src/templates/agent-md.js` (4 baris kalimat baru + 1 baris SDD-11 dipecah; komentar). Baris pecahan hanya dirapikan untuk lebar.
- Teks yang dipakai sama dengan T2: "The language is the one the ticket author wrote in, judged from the title and sentences of the ticket, not from UI text quoted in it, code, or files you read: an English ticket that quotes an Indonesian label is still written in English, with the label quoted as it is. Your final message to the user follows the same language."

## Tahap 2
- Dispatch di worktree `~/Projects/umkm-pos-dispatch` (branch `test/caf-dispatch`), commit sync `d5ed488` (hanya kalimat SDD-12 di `## Output` planner + manifest). Lima run, satu per ID: CAF-DT-B5/B6/B7 (teks B), CAF-DT-B8 (teks B4) → prosa dan pesan akhir Inggris; CAF-DT-I1 (Indonesia, kutip "Export") → Indonesia, berhenti di klarifikasi. Kata tetap tidak diterjemahkan. Detail: `/tmp/dispatch-results/REPORT-SDD12.md`.
