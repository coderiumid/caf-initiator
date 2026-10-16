# CAF-SDD-03d — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED` (revisi 2) dan Q-1 sampai Q-3 serta K-1 terjawab. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03d` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya `## Output` agent frontend, backend, implementer (sesuai Q-3). Selebihnya tidak berubah satu byte pun.
- Kosakata bukti dan format baris AC disalin dari teks validator, reviewer, dan agent-handoff yang sudah ada. Jangan membuat istilah baru.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T6 dengan aturan AC-8. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC, STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Golden: 14 golden `frozen-kinds` tidak boleh disentuh. `test/fixtures/frozen-kinds/implementer.single-nuxt.json` boleh diubah satu kali, hanya `sections.Output`, dengan hasil render baru; bagian lain berkas itu harus identik (K-1). Test yang membandingkannya tidak dilonggarkan.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui (dugaan dari T1: `test/discovery-sections.test.js`, tabel OUTPUT di `test/sdd02-planner-spec.test.js`, `test/repo-context.test.js` lewat snapshot, dan `test/false-drift.test.js` bila repo legacy-manifest memuat frontend/backend); catat tiap perubahan di `verify-report.md` beserta alasan. Test lain tidak diubah.

## Tasks
- [x] T1 (A2, A3, AC-8) SELESAI (hasil di verify-report; K-1 dijawab di requirements revisi 2): Audit baca-saja, catat di `verify-report.md`: di mana `## Output` ketiga agent dibangun (satu builder atau tiga); apakah `curate sync` melacak `## Output` mereka; teks persis kosakata bukti, `## Proposed Spec Changes`, dan format baris AC di validator/reviewer/agent-handoff; daftar test yang mengunci teks ketiga agent; entri snapshot terdampak.
- [x] T2 (AC-6): Simpan render ketiga agent (fixture yang relevan) ke `test/fixtures/pre-sdd03d/`; commit golden itu lebih dulu.
- [x] T3 (AC-1 sampai AC-7): Tulis test merah untuk tiap AC.
- [x] T4 (AC-1 sampai AC-5): Tambah aturan ke `## Output` ketiga agent, lewat builder bersama bila ada.
- [x] T5 (AC-7): Pastikan sync dari golden pra-tiket menulis `## Output` saja.
- [x] T6 (AC-8): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1; catat tiap entri.
- [x] T7 (AC-9): `npm test` penuh; hanya `implementer.single-nuxt.json` yang berubah di `frozen-kinds` (hanya `Output`); test `todo` tetap ada.
- [x] T8 (AC-10): Perbarui README dan CLAUDE.md.
- [x] T9: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T8).

## Di luar tugas ini
Pointer dan banner `caf-traceability`, rename `caf-verify`, command, orchestrator, validator, reviewer, planner, menyembunyikan `implementer`, `tools:`.