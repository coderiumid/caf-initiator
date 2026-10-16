# CAF-SDD-03f — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03f` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya: `piv-workflow.md` (token Reviewer, daftar peran, kalimat retry), deskripsi frontmatter `/caf-run-pipeline`, planner `## Output` (satu pengecualian, Q-1), dan daftar opsional di `curate audit`. Selebihnya tidak berubah satu byte pun. Isi skill, `tools:`, `## Skills`, `## Retry Logic` tidak boleh berubah.
- Kosakata disalin dari teks agent dan template yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T7. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk golden `frozen-kinds` yang memuat teks yang berubah, atau token Verdict yang berbeda dari yang diterima orchestrator), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Cari teks yang berubah di semua berkas test, bukan hanya test yang namanya jelas terkait.
- CAF.md, README.md, dan CLAUDE.md: ubah hanya bagian yang disebut AC-12 sampai AC-16; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A2 sampai A5, AC-17): Audit baca-saja, catat di `verify-report.md`: builder dan fixture/golden `piv-workflow.md` dan `/caf-run-pipeline`; token Verdict literal di template reviewer dan bentuk yang diterima orchestrator-nya (dari komentar atau test kontrak bila ada); semua tempat "max 3x" dan "all four"; definisi daftar opsional di `audit.js` dan cara berkas yang ada tetap diaudit; bagian CAF.md tentang Layer 3, retry, orchestrator, dan tempat SDD paling cocok; entri snapshot terdampak; test yang mengunci teks yang berubah.
- [ ] T2 (AC-9, AC-11): Simpan render planner, `piv-workflow.md`, dan `/caf-run-pipeline` (dengan dan tanpa Documentation) ke `test/fixtures/pre-sdd03f/`; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-11): Tulis test merah untuk tiap AC otomatis.
- [ ] T4 (AC-1 sampai AC-4, AC-8): Ubah `piv-workflow.md`, deskripsi `/caf-run-pipeline`, dan planner `## Output`.
- [ ] T5 (AC-5, AC-6): Ubah daftar opsional `curate audit`.
- [ ] T6 (AC-7): Perbaiki komentar "all four" menjadi lima jenis bukti.
- [ ] T7 (AC-10, AC-17): Pastikan sync dari golden pra-tiket menulis hanya section yang berubah; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T8 (AC-18): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T9 (AC-12, AC-13): Perbarui README.md dan CLAUDE.md.
- [ ] T10 (AC-14 sampai AC-16): Perbarui CAF.md (SDD, validator, Layer 3, retry, orchestrator); bandingkan contoh Layer 3 dengan hasil render `agent-handoff.md`.
- [ ] T11: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, baris "all four" yang dibiarkan beserta alasan, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md (T9), CAF.md (T10).

## Di luar tugas ini
Rujukan usang yang ditunda ke 03c2/03c3, rename command, wiring validator, `## Input` reviewer, `SINGLE_REPO`, `--role`, fallback kind tak dikenal, isi skill, `tools:`, `## Skills`, `## Retry Logic`, orchestrator.

## Coverage
- AC-1 sampai AC-4, AC-8 → T3, T4
- AC-5, AC-6 → T3, T5
- AC-7 → T6
- AC-9, AC-11 → T2, T3
- AC-10 → T3, T7
- AC-12, AC-13 → T9
- AC-14, AC-15, AC-16 → T10
- AC-17 → T1, T7
- AC-18 → T8
