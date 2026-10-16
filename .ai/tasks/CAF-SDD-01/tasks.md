# CAF-SDD-01 — Tasks
Repo: `caf-initiator` (Node ESM, tanpa build step). Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti skill existing, lalu catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-01`. Jangan menyentuh `caf-orchestrator` atau `caf-website`.
- Jangan mengubah isi `caf-spec.source.md`; template dipakai apa adanya.
- Jangan regenerate `test/fixtures/snapshots/mono-pnpm.json`. Bila test snapshot gagal, berhenti: `Status: NEEDS_HUMAN`.
- Setelah tiap task, jalankan test yang relevan; sebelum selesai jalankan `npm test`.

## Tasks
- [x] T1 (AC-1, AC-6): Cari generator skill existing (`scaffold skills`, mis. di `src/commands/` dan `src/templates/`). Catat polanya (lokasi builder, daftar skill, cara menulis frontmatter) di `verify-report.md`.
- [x] T2 (AC-1, AC-6): Buat builder skill `caf-spec` sebagai fungsi murni `build*()` mengembalikan string, isinya dari `caf-spec.source.md`. Perhatikan: isi memuat blok code fence ```` ```markdown ```` dan backtick inline, jadi escape dengan benar di template literal. Pastikan heading `##` di dalam fence tetap aman bagi `parseSections` (fence-aware).
- [x] T3 (AC-1, AC-2, AC-3): Daftarkan skill `caf-spec` di generator `scaffold skills` lewat `writeIfAbsent`, tanpa `--force`. Dry-run lewat helper yang sama.
- [x] T4 (AC-4): Tambahkan `caf-spec` ke pemetaan kind ke skill untuk `planner`. Pastikan aturan "tidak menulis pointer ke skill DRAFT" tetap berlaku sehingga `## Skills` planner tidak berubah. Jangan mengedit agent yang sudah punya `## Skills`.
- [x] T5 (AC-5): Verifikasi `curate --check-drafts` pada fixture (`test/fixtures/mono-pnpm/` dan `test/fixtures/single-nuxt/`) setelah scaffold skills: tidak ada FAIL baru. Catat hasilnya.
- [x] T6 (AC-1 sampai AC-6): Tulis test baru di `test/` (gaya `node --test`, ikuti test skill yang ada): file tertulis dengan frontmatter dan banner; tidak menimpa; dry-run; pemetaan planner; tanpa pointer ke DRAFT; panjang maksimal 90 baris.
- [x] T7 (AC-7): Jalankan `npm test` penuh dan `git diff --stat`; konfirmasi snapshot tidak berubah.
- [x] T8: Tulis `verify-report.md` (format Layer 3: Status, Attempt Log, Acceptance Criteria dengan bukti file/baris, Quality Gate, Catatan). Isi Q-1 dan Q-2 dengan keputusan yang kamu ambil bila ada, sebagai usulan; jangan mengubah `requirements.md`.

## Docs Tasks
- Tambahkan satu baris di README/CLAUDE.md initiator hanya bila daftar skill disebut di sana. Bila tidak, lewati.

## Di luar tugas ini (jangan dikerjakan)
Template planner/verify/validate baru, rename kind, penghapusan agent atau command, perubahan orchestrator, dokumentasi website.