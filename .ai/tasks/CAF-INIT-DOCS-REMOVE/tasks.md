# Tasks — CAF-INIT-DOCS-REMOVE

Satu tiket, tujuh task, dikerjakan berurutan. Hanya commit lokal. Satu commit per task, pesan commit diawali `CAF-INIT-DOCS-REMOVE:`.
Task 1 read-only dan wajib dilaporkan sebelum Task 2 dimulai.

## Task 1 — Inventaris referensi (read-only, tanpa mengubah file)

Tujuan: membuktikan asumsi bahwa command `docs` tidak dibutuhkan bagian lain.

- [ ] Catat perintah test, lint, dan build dari `package.json`.
- [ ] Cari semua referensi ke command `docs`, ke "Layer 1", dan ke keenam dokumen (PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy) di kode, template, test, README, dan manifest.
- [ ] Cek target apa saja yang dimiliki `complete-drafts` dan apakah dokumen docs termasuk di dalamnya.
- [ ] Cek bagaimana `curate` memakai model Layer 1–4 dan apakah Layer 1 dihitung dalam audit kepatuhan.
- [ ] Cek apakah template agent atau skill menyebut path dokumen docs sebagai sumber bacaan.
- [ ] Tulis `inventory-report.md` di folder tiket: daftar file, nomor baris, dan kategori (hapus / sesuaikan / biarkan).

Keluaran: `inventory-report.md`.

**Titik berhenti.** Berhenti dan lapor ke manusia, tanpa lanjut, bila salah satu ini benar:
- dokumen docs adalah satu-satunya target `complete-drafts`;
- bagian pipeline, orchestrator, atau agent ternyata membaca dokumen docs sebagai input wajib;
- audit `curate` bergantung pada Layer 1 dengan cara yang tidak bisa disesuaikan secara sederhana.

## Task 2 — Hapus command `docs`

- [ ] Hapus registrasi command, implementasi, template dokumen, opsi terkait, dan teks help.
- [ ] Hapus test yang khusus untuk `docs`.
- [ ] Pastikan `caf-init --help` tidak lagi menampilkan `docs`.

Verifikasi: AC-1.

## Task 3 — Sesuaikan `curate`

- [ ] Audit tidak melaporkan dokumen Layer 1 sebagai hilang atau tidak patuh.
- [ ] Penomoran Layer 2–4 tidak diubah. Layer 1 ditandai "tidak dipakai" di teks yang relevan (default Q1 di `requirements.md`, kecuali manusia memutuskan lain).
- [ ] Perbarui fixture dan test `curate` bila perlu.

Verifikasi: AC-4.

## Task 4 — Sesuaikan `complete-drafts`

- [ ] Keluarkan dokumen docs dari daftar target.
- [ ] Jangan mengubah perilaku target lain.
- [ ] Bila Task 1 menemukan docs sebagai satu-satunya target, jangan lanjut. Lapor.

Verifikasi: AC-7.

## Task 5 — Bersihkan template agent dan skill

- [ ] Hapus atau ubah petunjuk yang menyuruh agent membaca dokumen docs yang tidak lagi ada.
- [ ] Jangan mengubah isi template di luar baris yang terkait.

Verifikasi: AC-8.

## Task 6 — Test dan verifikasi

- [ ] Perbarui test yang masih menyebut `docs`.
- [ ] Jalankan test, lint, dan build.
- [ ] Uji manual: `scaffold` tanpa target di direktori temporer sampai selesai (AC-3).
- [ ] Uji manual: `curate --audit-only` pada fixture (AC-4).
- [ ] Jalankan pencarian sisa referensi (AC-2) dan catat pengecualian yang sah.
- [ ] Tulis `verify-report.md`: hasil tiap AC, perintah yang dijalankan, dan outputnya.

Verifikasi: AC-2, AC-3, AC-4, AC-5, AC-6.

## Task 7 — Dokumentasi dan catatan rilis

- [ ] README: hapus `docs` dari daftar command.
- [ ] CHANGELOG: catat bahwa `docs` dihapus. Paket belum dipublish, jadi tanpa catatan deprecation.
- [ ] Verifikasi akhir: `git status` bersih, hanya commit lokal, tidak ada file di luar scope (AC-10).

Verifikasi: AC-9, AC-10.

## Aturan eksekusi

- Retry per task mengikuti default pipeline (1).
- Bila menemukan hal di luar scope (manifest hash, penyederhanaan `knowledge/` dan `tasks/`, cangkang TODO di langkah scaffold lain, pembersihan umkm-pos), catat di `verify-report.md` bagian "Temuan di luar scope". Jangan dikerjakan.
- Jangan mengedit `requirements.md`. Deviasi atau usulan perubahan dilaporkan, manusia yang memutuskan.