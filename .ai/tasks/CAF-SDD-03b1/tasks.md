# CAF-SDD-03b1 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-03b1`, dari main terbaru. Working tree bersih. SDD-03a, 03a2, 02, 02b harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- `qa` tidak diubah: builder, tools, 15 golden `frozen-kinds`, dan test 03a2 tetap. Perubahan test lama hanya pada daftar literal dan hitungan kind yang tercantum di requirements bagian 3 (enam file); tidak ada asersi lain yang diubah.
- Snapshot `mono-pnpm.json` tidak boleh berubah. Bila berubah, STOP `NEEDS_HUMAN`.
- Teks template lain (planner, frontend, backend, reviewer, kind lain) tidak boleh berubah satu byte pun.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Kind tidak boleh setengah jadi: `KNOWN_KINDS`, builder, tools, skill mapping, dan penyembunyian masuk dalam satu commit yang lengkap.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, Q-2): Audit baca-saja. Catat di `verify-report.md`: (a) mekanisme `HIDDEN_CANDIDATE_KINDS` dan jalur memilih kind tersembunyi; (b) seluruh section template `qa` dan nasibnya di validator (dibawa, diubah, dibuang); (c) cara `qa` menjalankan Verify Checklist dan mencatat gap; (d) regex `Status:` untuk `qa-report`; (e) pemetaan skill `qa`; (f) tempat lain yang menghitung atau mendaftar kind (test, README, CLAUDE.md).
- [ ] T2 (AC-1 sampai AC-8): Tulis test yang gagal terlebih dulu: deteksi dan `KNOWN_KINDS` (AC-1), tabel tools (AC-2), tersembunyi dan scaffold default (AC-3), token isi agent (AC-4, AC-5, AC-6), skill mapping dan pointer (AC-7), render, baseline, sync tanpa DRIFT di dua fixture (AC-8).
- [ ] T3 (AC-1, AC-2, AC-3, AC-7): Tambah kind `validator` ke `KNOWN_KINDS`, tools, dan pemetaan skill. Jangan masukkan ke `buildCandidates()`. Tabel literal tools validator di test baru. Perbarui daftar literal dan hitungan di enam file test yang diizinkan (K1, K2, K3).
- [ ] T4 (AC-4, AC-5, AC-6, AC-8): Tulis builder agent `validator` (teks Inggris, mengikuti gaya template lain): section sesuai keputusan T1(b), validasi per AC, aturan status dan bukti, daftar perintah yang boleh, larangan mengedit, format `validate-report.md`. Semua section ber-track harus IN_SYNC setelah baseline (`Input` validator berbasis kind saja, tanpa daftar app; `## Verify Checklist` memakai pembangun checklist yang sama dengan agent implementasi tanpa mengubah output implementer).
- [ ] T4b (AC-11): Hubungkan `## Verify Checklist` validator ke pembangun checklist implementer; bila itu menuntut perubahan output implementer atau snapshot, STOP `NEEDS_HUMAN`.
- [ ] T5 (AC-9, AC-10): `npm test` penuh; 15 golden dan test 03a2 tak berubah; snapshot tak tersentuh.
- [ ] T6 (AC-12): Perbarui CLAUDE.md dan README.
- [ ] T7: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC `command` dilaporkan sebagai `command`). Catatan: hasil T1(a sampai f), keputusan tiap section `qa`, jawaban Q-1 dan Q-2, test lama yang diubah beserta alasan, hal tak terduga.

## Docs Tasks
- CLAUDE.md dan README (T6).

## Di luar tugas ini
Rename atau penghapusan `qa`, reviewer baru, `/caf-plan`, perubahan orchestrator, pencabutan banner `caf-traceability`, fallback `implementation`, SINGLE_REPO, penghapusan agent/command lain.