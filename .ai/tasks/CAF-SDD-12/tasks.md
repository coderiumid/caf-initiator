# CAF-SDD-12 — Tasks
Status: APPROVED. Commit lokal saja; jangan push, merge, atau publish. Tahap 1 (T1–T5) di repo `caf-initiator`, branch `ai-agent/CAF-SDD-12` dari `main` yang sudah memuat 09–11. Tahap 2 (T6) hanya berjalan bila tahap 1 SUCCESS, di worktree uji umkm-pos; satu tiket, dua tahap.

## T1 — Periksa
- Baca `PLANNER_SPEC_WORKFLOW` (`src/templates/agent-md.js`) dan bullet bahasa dari SDD-11 (cari kalimat "in the language of the ticket description"). Cari nilai literal itu, bukan hanya nama builder, di `src/`, `test/`, `test/helpers/`, `CLAUDE.md`, `README*`, `docs/`; catat semua berkas yang memuatnya (A-2).
- Baca `test/helpers/since-11.js`, `since-07.js`, `since-06.js` dan urutan penerapannya; `since-12` diterapkan setelah `since-11`.
- Bila temuan bertentangan dengan AC, STOP sebelum menyentuh `src/`.

## T2 — Tulis penegasan (satu bullet, satu kalimat tambahan, niat bukan daftar kata)
Ubah bullet bahasa SDD-11 yang sudah ada (jangan menambah bullet). Sisipkan kalimat berikut tepat setelah kalimat pertama bullet (kalimat "Write the prose ... and the open questions too."), dan tambahkan pesan akhir. Teks boleh dirapikan hanya untuk lebar baris, bukan makna:
```
  The language is the one the ticket author wrote in, judged from the title and sentences
  of the ticket, not from UI text quoted in it, code, or files you read: an English ticket
  that quotes an Indonesian label is still written in English, with the label quoted as it
  is. Your final message to the user follows the same language.
```
Kalimat lain di bullet (daftar kata tetap, path/simbol/perintah/kutipan) tidak diubah.

## T3 — Golden dan test
- Rekam `test/fixtures/pre-sdd12/` (planner kedua fixture + `## Output` semua kind) dari HEAD sebelum kode berubah (`test/helpers/record-sdd12.mjs`, pola `record-sdd11.mjs`); jangan di-regenerate.
- `test/sdd12-planner-language.test.js`: AC-1 sampai AC-5 (AC-5 mencakup repo dengan teks SDD-11 dan repo pra-SDD-11).

## T4 — Helper dan test lama
- `test/helpers/since-12.js` (teks baru ditulis lengkap di helper, bukan diimpor); test lama yang membandingkan planner/`## Output` dengan golden sebelum 12 membacanya lewat helper ini, termasuk `sdd11-planner-language` bila ia memegang baris yang berubah. Golden tidak diedit; asersi tidak dilonggarkan. Catat tiap test yang diubah.
- `mono-pnpm.json`: periksa dulu bahwa hanya entri `caf-planner.md` yang berubah; bukan preseden.
- Skill tidak disentuh; pastikan hash `caf-spec` (v4), `caf-design`, `caf-breakdown` tetap lulus.

## T5 — Dokumen dan verifikasi tahap 1
- `CLAUDE.md`: perbarui paragraf bahasa SDD-11 (AC-8) tanpa menambah section.
- `npm test`; catat jumlah sebelum/sesudah. `verify-report.md` dengan baris pertama `Status: SUCCESS|NEEDS_HUMAN`, bukti per AC, daftar test yang diubah, catatan "AC-9 tahap 2". Commit terakhir tahap 1.

## T6 — Dispatch ulang (tahap 2, AC-9; hanya bila T5 SUCCESS)
Lakukan di worktree uji umkm-pos `~/Projects/umkm-pos-dispatch` (branch `test/caf-dispatch`), bukan di checkout utama umkm-pos dan bukan di `main`:
- Jalankan `curate --sync-only --dry-run`, lalu tanpa `--dry-run` dari checkout `caf-initiator` yang memuat commit tahap 1, hanya di worktree itu. Tanpa `curate baseline`, tanpa `--force`. Lapor hunk yang ditulis (harapan: hanya `## Output` planner, dan hanya kalimat SDD-12; bila ada hunk lain, STOP dan lapor). Commit di branch uji.
- Jalankan lima run dengan cara pemanggilan yang sama seperti dispatch 17 Okt (`claude --agent caf-planner --print --output-format stream-json --verbose --permission-mode bypassPermissions --setting-sources project`, awalan headless, stdin): B-teks identik dengan ID CAF-DT-B5, CAF-DT-B6, CAF-DT-B7 (teks dari `/tmp/dispatch-results/B/ticket.txt`, ganti hanya ID); B4-teks (tanpa string Indonesia) dengan ID CAF-DT-B8 (`/tmp/dispatch-results/B4/ticket.txt`); satu tiket Indonesia baru ID CAF-DT-I1 yang mengutip satu istilah UI Inggris (mis. label tombol "Export" atau pesan "Loading...") pada fitur kecil satu app yang masuk akal di kode itu, tanpa menyebut spec/skill/CAF.
- Salin `.caf/tasks/<ID>/` ke `/tmp/dispatch-results/<ID>/artifacts/` setelah tiap run, lalu hapus hanya folder itu dari worktree.
- Nilai tiap run: bahasa prosa `requirements.md`, `tasks.md`, dan pesan akhir (kutip dua kalimat pertama Outcome dan dua kalimat pertama pesan akhir); kata tetap tidak diterjemahkan (`Status:`, `AC-n:`, `Verify:`, `Finding:`, `Assumption A-n:`, `Q-n`, `Answer:`, `Tidak ada`, judul section). Tulis `/tmp/dispatch-results/REPORT-SDD12.md`: tabel | Run | Bahasa tiket | Bahasa prosa | Bahasa pesan akhir | Kutipan | Lulus? |. Jangan mengubah agent, skill, atau teks tiket antar-run. Bila hasil campuran, laporkan apa adanya; jangan ulang berkali-kali sampai lulus.
- Jangan menghapus worktree; laporkan path dan perintah penghapusannya.