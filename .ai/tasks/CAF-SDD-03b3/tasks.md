# CAF-SDD-03b3 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-03b3`, dari main terbaru. Working tree bersih. SDD-03b2 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- `/caf-plan` tersembunyi: tidak masuk scaffold default dan tidak ada di snapshot. Command lain selain `/caf-review` dan `/caf-fix-review` tidak boleh berubah satu byte pun.
- `/caf-review` dan `/caf-fix-review`: ubah hanya section yang sudah ada; tanpa header baru; nama, argumen, dan penanda keluaran webhook tidak berubah.
- Test lama hanya boleh berubah bila mengunci teks dua command itu pada section yang berubah; daftarkan tiap perubahan. Selain itu: STOP `NEEDS_HUMAN`.
- Snapshot hanya diregenerasi di T7 dengan aturan AC-8. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Kind atau command tidak boleh setengah jadi: builder, pemetaan harness (bila ada), dan test masuk dalam satu commit yang lengkap.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, Q-2): Audit baca-saja. Catat di `verify-report.md`: (a) cara command dibuat, strukturnya, frontmatter, dan harness yang didukung; (b) apakah command ter-track `curate` dan bisa di-sync; (c) bagaimana `/caf-plan-ticket` mendapat isi ticket dan memanggil agent; (d) seluruh section `/caf-review` dan `/caf-fix-review`, argumen, dan penanda keluaran yang dibaca webhook; (e) section yang akan berubah (tanpa header baru); (f) test yang mengunci teks dua command itu; (g) entri snapshot yang memuat teks tersebut.
- [ ] T2 (AC-4 sampai AC-7): Sebelum mengubah `src/`, simpan render semua command saat ini (kedua fixture) ke `test/fixtures/pre-sdd03b3/` (skrip sekali pakai di scratchpad, tidak di-commit). Commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-7): Tulis test yang gagal terlebih dulu: builder dan token `/caf-plan` (AC-1, AC-2), tidak ikut scaffold default (AC-3), command lain identik (AC-4), token dan penanda `/caf-review` (AC-5), token dan penanda `/caf-fix-review` (AC-6), section lain identik dan sync (AC-7).
- [ ] T4 (AC-1, AC-2, AC-3, AC-4): Tulis builder `/caf-plan` (teks Inggris, gaya command lain, ringkas), tanpa memasukkannya ke scaffold default.
- [ ] T5 (AC-5, AC-6, AC-7): Ubah `/caf-review` dan `/caf-fix-review` pada section hasil T1(e).
- [ ] T6 (AC-9): `npm test` penuh; periksa test lama yang berubah sesuai T1(f).
- [ ] T7 (AC-8): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1(g); catat tiap entri yang berubah.
- [ ] T8 (AC-10): Perbarui CLAUDE.md dan README.
- [ ] T9: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC `command` dilaporkan sebagai `command`). Catatan: hasil T1(a sampai g), test lama yang diubah beserta alasan, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- CLAUDE.md dan README (T8).

## Di luar tugas ini
Menghapus atau berhenti menulis `/caf-plan-ticket` dan command yang dibuang, rename `/caf-run-pipeline`, menyambungkan `/caf-plan` ke scaffold default, perubahan kontrak webhook, orchestrator, template agent.