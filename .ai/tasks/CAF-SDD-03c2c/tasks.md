# CAF-SDD-03c2c — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`, dan main sudah memuat 03c2b (planner `## Constraints` bebas rujukan Discovery; peringatan `planner-constraints` di `curate audit`). Bila salah satu tidak terpenuhi, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03c2c` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Yang boleh berubah: nama command `/caf-run-pipeline` menjadi `/caf-run` (berkas, judul, pesan dan prompt interaktif, rujukan di command lain), catatan scaffold (AC-4), `HIDDEN_COMMAND_FILES`, bagian cara memilih agent di `/caf-run` untuk roster dua agent seluruh-repo. Selebihnya tidak berubah satu byte pun. Isi agent, skill, `tools:`, `## Input`, `## Output`, `## Retry Logic`, golden `frozen-kinds` tidak boleh berubah. Nama nilai state (`qaRetryCount`, `validatorRetryCount`, `reviewerRetryCount`) tidak berubah.
- Kosakata disalin dari teks yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T8. Entri tak terduga berubah (di luar daftar T1): STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk A2: data roster tidak cukup untuk mengenali dua agent seluruh-repo tanpa flag baru), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Golden lama (`pre-sdd03b3`, `pre-sdd03c1`, `pre-sdd03c2`, `pre-sdd03c3`, `pre-sdd03f`, `pre-sdd03c2b`) tidak diregenerasi. Test lama yang menyebut nama berkas atau nama command yang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Cari `caf-run-pipeline` dan `caf-plan-ticket` di semua berkas test dan helper, bukan hanya yang namanya jelas terkait.
- README.md, CLAUDE.md, CAF.md: ubah hanya rujukan nama command di bagian perilaku saat ini dan bagian yang disebut AC-10; catatan sejarah tiket tidak ditulis ulang; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A4, AC-7, AC-9): Audit baca-saja, catat di `verify-report.md`: semua tempat `caf-run-pipeline` dan `caf-plan-ticket` muncul di `src/`, `test/` (termasuk helper), README.md, CLAUDE.md, CAF.md, dan teks interaktif `agents()`; bagaimana builder bagian cara memilih agent mendapat data roster dan scope (dan apakah roster dua agent seluruh-repo dapat dikenali dari sana); konteks `AGENTS.md` "max 3x"; kalimat retry di `/caf-run-pipeline`; entri snapshot yang diperkirakan berubah; apakah `INDEX.md`, `piv-workflow.md`, `agent-handoff.md`, atau teks hasil lain menyebut nama command.
- [ ] T2 (AC-1, AC-2, AC-3, AC-5, AC-6): Simpan ke `test/fixtures/pre-sdd03c2c/`: daftar berkas scaffold default tiap fixture; render `/caf-run-pipeline` (gate `qa` dan `validator`, MONOREPO, SINGLE_REPO default dan tiap `--role`), `/caf-plan-ticket`, `/caf-review`, `/caf-fix-review`; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-8): Tulis test merah untuk tiap AC otomatis.
- [ ] T4 (AC-1, AC-2, AC-6, AC-7): Ganti nama command di berkas yang ditulis, judul, pesan, prompt interaktif, dan rujukan di command lain.
- [ ] T5 (AC-3): Bagian cara memilih agent untuk roster dua agent seluruh-repo.
- [ ] T6 (AC-4): Catatan scaffold di repo yang sudah punya `caf-run-pipeline.md`.
- [ ] T7 (AC-5): `caf-plan-ticket.md` ke `HIDDEN_COMMAND_FILES`; builder tetap.
- [ ] T8 (AC-8, AC-9): Pastikan laporan `curate` repo lama tak berubah; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T9 (AC-11): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T10 (AC-10): Perbarui README.md, CLAUDE.md, CAF.md.
- [ ] T11: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, baris `git grep` yang dibiarkan beserta alasan, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md, CAF.md (T10).

## Di luar tugas ini
Rename `caf-verify` dan peringatan pointer skill usang (03c2d), `/caf-run` menerima deskripsi bebas, perubahan perilaku `/caf-run` selain nama dan routing repo tunggal, nama command webhook, `/caf-plan`, `/caf-complete-drafts`, kalimat retry, isi agent dan skill, penghapusan builder `/caf-plan-ticket`, orchestrator.

## Coverage
- AC-1, AC-2 → T2, T3, T4
- AC-3 → T2, T3, T5
- AC-4 → T3, T6
- AC-5 → T2, T3, T7
- AC-6 → T2, T3, T4
- AC-7 → T1, T3, T4
- AC-8 → T3, T8
- AC-9 → T1, T8
- AC-10 → T10
- AC-11 → T9
