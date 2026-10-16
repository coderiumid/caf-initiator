# CAF-SDD-03e — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED` dan Q-1 sampai Q-3 terjawab. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03e` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya: aturan perintah di validator (section hasil keputusan T1), dan `## Working Pattern` validator dan reviewer. Selebihnya tidak berubah satu byte pun; `tools:` dan `## Skills` tidak disentuh.
- Kosakata disalin dari teks validator, reviewer, dan agent-handoff yang sudah ada; jangan membuat istilah baru. Kata TODO tidak ditulis literal di aturan.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T5. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Golden `frozen-kinds` tidak berubah (Q-4 gugur). Bila ada yang ternyata merah atau perlu diubah: STOP `NEEDS_HUMAN`.
- Builder `## Working Pattern` boleh diberi parameter kind (T1: hari ini tanpa kind), dengan syarat render kind lain identik byte-for-byte (AC-10).
- Revisi 2: T1 sudah dikerjakan; hasilnya (A2, A3, Q-5) sudah dimasukkan ke spec. Lanjut dari T2; `verify-report.md` yang ada dilengkapi, jangan ditimpa.
- Bila temuan T1 bertentangan dengan sebuah AC, STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Test lain tidak diubah.

## Tasks
- [x] T1 (selesai, hasil di spec revisi 2; AC-14): Audit baca-saja, catat di `verify-report.md`: di mana batas Bash validator dinyatakan sekarang (`## Allowed Tools`, `## Output`, atau frontmatter); teks `## Working Pattern` generik (kutip frasa yang dipakai AC-8 dan AC-9); builder yang menulis section itu dan apakah dipakai bersama kind lain; golden dan test yang memuat teks validator/reviewer (termasuk `frozen-kinds`); entri snapshot terdampak; teks validator tentang `UNVERIFIED` untuk perintah buatan tiket.
- [ ] T2 (AC-10, AC-11): Simpan render validator, reviewer, dan satu kind lain per fixture ke `test/fixtures/pre-sdd03e/`; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-13, termasuk AC-7b): Tulis test merah untuk tiap AC.
- [ ] T4 (AC-1 sampai AC-9): Ubah template validator (aturan perintah) dan `## Working Pattern` validator dan reviewer, tanpa mengubah kind lain.
- [ ] T5 (AC-13, AC-14): Pastikan sync dari golden pra-tiket menulis hanya section yang berubah; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T6 (AC-15): `npm test` penuh; golden `frozen-kinds` harus tetap tidak berubah.
- [ ] T7 (AC-16): Perbarui README dan CLAUDE.md.
- [ ] T8: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, golden yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T7).

## Di luar tugas ini
`tools:`, `## Skills`, `## Input`, `## Retry Logic`, agent selain validator dan reviewer, penegakan keras di runner, command, orchestrator, planner, `curate audit`, menampilkan kind validator.

## Coverage
- AC-1 sampai AC-9, AC-7b → T3, T4
- AC-10, AC-11 → T2, T3, T4
- AC-12 → T3, T4
- AC-13 → T3, T5
- AC-14 → T1, T5
- AC-15 → T6
- AC-16 → T7
