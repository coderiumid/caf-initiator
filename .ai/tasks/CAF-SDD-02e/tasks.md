# CAF-SDD-02e — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED` dan Q-1 sampai Q-3 terjawab. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-02e` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya planner `## Output` (dan `## Input` bila T1 menunjukkan perlu). Selebihnya tidak berubah satu byte pun. Isi skill `caf-spec` dan `caf-no-guess` tidak boleh berubah.
- Aturan ditulis berdasarkan niat, bukan daftar kata terlarang. Kata TODO tidak ditulis literal di aturan (check-drafts menghitungnya per agent); ikuti pola rumusan 02d.
- Kosakata (Finding, Assumption A-n, Verify, nama bagian) disalin dari teks planner dan `caf-spec` yang sudah ada; jangan membuat istilah baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T6 dengan aturan AC-13. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk golden `frozen-kinds` yang memuat teks planner, atau aturan 02d yang berkontradiksi), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Test lain tidak diubah.

## Tasks
- [x] T1 (A2, AC-13): Audit baca-saja, catat di `verify-report.md`: teks planner `## Output` dan `## Input` sekarang, aturan 02d tentang "belum dibaca", placeholder, dan Finding yang akan diperluas atau diganti; apakah ada kontradiksi dengan aturan baru; golden dan test yang memuat teks planner (termasuk `frozen-kinds`); entri snapshot terdampak; apakah `curate --check-drafts` menghitung kata tertentu di teks agent.
- [x] T2 (AC-11): Simpan render planner (kedua fixture) ke `test/fixtures/pre-sdd02e/`; commit golden itu lebih dulu.
- [x] T3 (AC-1 sampai AC-12): Tulis test merah untuk tiap AC.
- [x] T4 (AC-1 sampai AC-10): Ubah planner `## Output` (dan `## Input` bila perlu).
- [x] T5 (AC-12, AC-13): Pastikan sync dari golden pra-tiket menulis hanya section yang berubah; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [x] T6 (AC-14): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [x] T7 (AC-15): Perbarui README dan CLAUDE.md.
- [x] T8: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T7).

## Di luar tugas ini
Isi `caf-spec` dan `caf-no-guess`, `## Constraints` planner, `tools:`, agent selain planner, command, orchestrator, `curate audit`.