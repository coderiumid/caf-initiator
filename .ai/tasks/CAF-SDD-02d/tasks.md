# CAF-SDD-02d — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED` dan Q-1 sampai Q-3 terjawab. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-02d` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya planner `## Input` dan `## Output`. Selebihnya tidak berubah satu byte pun. Isi skill `caf-spec` tidak boleh berubah (hash terkunci).
- Kosakata status dan nama bagian disalin dari teks planner/validator/reviewer yang sudah ada; jangan membuat istilah baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T6 dengan aturan AC-13. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk golden `frozen-kinds` yang memuat teks planner), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Test lain tidak diubah.

## Tasks
- [x] T1 (A2, A3, AC-7, AC-13): Audit baca-saja, catat di `verify-report.md`: teks planner `## Input` dan `## Output` sekarang; konteks frasa `## Status: PLAN` (apakah konvensi status requirements atau hal lain); apakah `## Input` di-track `curate sync`; golden dan test yang memuat teks planner (termasuk `frozen-kinds`); lokasi kode `curate audit` dan sumber data tabel `tools:` per kind dan pemetaan skill per kind; bagaimana audit menentukan "skill aktif" (tanpa banner DRAFT) dan pointer di `## Skills`; entri snapshot terdampak.
- [x] T2 (AC-8): Simpan render planner (kedua fixture) ke `test/fixtures/pre-sdd02d/`; commit golden itu lebih dulu.
- [x] T3 (AC-1 sampai AC-12): Tulis test merah untuk tiap AC.
- [x] T4 (AC-1 sampai AC-7): Ubah planner `## Input` dan `## Output`.
- [x] T5 (AC-10 sampai AC-12): Tambah dua pemeriksaan peringatan di `curate audit`, tanpa mengubah exit code.
- [x] T6 (AC-9, AC-13): Pastikan sync dari golden pra-tiket menulis `## Input`/`## Output` saja; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [x] T7 (AC-14): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [x] T8 (AC-15): Perbarui README dan CLAUDE.md.
- [x] T9: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T8).

## Di luar tugas ini
Isi `caf-spec`, `caf-traceability`, agent selain planner, command, orchestrator, `curate sync` menulis `## Skills`/frontmatter, aturan bahasa artefak.