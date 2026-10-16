# CAF-SDD-03c2 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`. Bila belum, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03c2` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya: roster default dan mekanisme penyembunyi, pesan catatan scaffold (AC-3), teks `/caf-run-pipeline` (gate, aturan status spec), teks `/caf-plan` (aturan berhenti), `## Input` reviewer dan planner, rujukan usang di `caf-review.md`, `caf-fix-review.md`, `INDEX.md`. Selebihnya tidak berubah satu byte pun. Isi skill, `tools:`, `## Skills`, `## Retry Logic`, `## Output`, `## Constraints`, kind `qa`, dan golden `frozen-kinds` tidak boleh berubah.
- Kosakata disalin dari teks agent dan template yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T9. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk fixture atau golden yang mengunci `qa` di roster dan tidak termasuk daftar T1), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Cari teks yang berubah (`caf-qa`, `qa-report`, `plan-ticket`, `discovery`, `PM Agent`, `INDEX.md`) di semua berkas test, bukan hanya test yang namanya jelas terkait.
- README.md dan CLAUDE.md: ubah hanya bagian yang disebut AC-14; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A7, AC-13): Audit baca-saja, catat di `verify-report.md`: lokasi mekanisme penyembunyi `validator` dan `/caf-plan`; daftar kind roster tiap stack dan semua test/fixture/golden yang mengunci `qa` di roster; builder dan cabang `/caf-run-pipeline` yang menentukan nama gate dan berkas laporan; teks `/caf-plan` sekarang dan apakah sudah memuat aturan berhenti; builder dan section yang di-track untuk `## Input` reviewer dan planner; perilaku `scaffold agents` pada repo yang punya `caf-qa.md`; teks reviewer tentang `## Proposed Spec Changes`; semua kemunculan `.caf/discovery/`, `/caf-discovery-start`, `/caf-review-ticket`, "PM Agent" di `src/` dan test; entri snapshot yang diperkirakan berubah.
- [ ] T2 (AC-1, AC-2, AC-5, AC-6, AC-9): Simpan ke `test/fixtures/pre-sdd03c2/`: daftar berkas scaffold default mono-pnpm dan single-nuxt, render `/caf-run-pipeline`, `/caf-plan-ticket`, `/caf-complete-drafts`, `/caf-review`, `/caf-fix-review`, `INDEX.md`, reviewer, dan planner; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-12): Tulis test merah untuk tiap AC otomatis.
- [ ] T4 (AC-1, AC-2, AC-4): Ganti `qa` dengan `validator` di roster default; cabut penyembunyian `validator` dan `/caf-plan`.
- [ ] T5 (AC-3): Perilaku scaffold di repo yang sudah punya `caf-qa.md` dan catatannya.
- [ ] T6 (AC-6, AC-7): Ubah teks `/caf-run-pipeline` (gate per roster; aturan status spec; usulan perubahan spec).
- [ ] T7 (AC-8): Tambah atau uji aturan berhenti di `/caf-plan`.
- [ ] T8 (AC-9, AC-10, AC-11): Ubah `## Input` reviewer dan planner; hapus rujukan usang; pastikan `curate sync` hanya menulis `## Input`.
- [ ] T9 (AC-12, AC-13): Uji scaffold lengkap + `curate --audit-only`; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T10 (AC-15): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T11 (AC-14): Perbarui README.md dan CLAUDE.md.
- [ ] T12: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, baris `git grep` yang dibiarkan beserta alasan, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md (T11).

## Di luar tugas ini
Rename `/caf-run-pipeline` dan `caf-verify`, pencabutan `/caf-plan-ticket`, planner `## Constraints`, kata "qa" di orchestrator, `SINGLE_REPO`, `--role`, penghapusan `implementer`, fallback kind tak dikenal, penghapusan `caf-qa` dari repo mana pun, isi skill, `tools:`, `## Skills`, `## Retry Logic`, orchestrator.

## Coverage
- AC-1, AC-2, AC-4 → T3, T4
- AC-3 → T3, T5
- AC-5 → T2, T3
- AC-6 → T2, T3, T6
- AC-7 → T3, T6
- AC-8 → T3, T7
- AC-9 → T2, T3, T8
- AC-10, AC-11 → T3, T8
- AC-12 → T3, T9
- AC-13 → T1, T9
- AC-14 → T11
- AC-15 → T10
