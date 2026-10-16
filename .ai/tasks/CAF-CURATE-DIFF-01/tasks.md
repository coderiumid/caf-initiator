# Tasks: CAF-CURATE-DIFF-01 — Content-Level Diff untuk `curate`

> Sama seperti pola `CAF-WSMODE-01`: Task 0 adalah gate, bukan tugas coding.
> 4 STOP item di `requirements.md` BELUM terjawab eksplisit sampai pesan
> terakhir — jangan lanjut ke Task 1 tanpa itu.

## Task 0 — Resolusi STOP Items — SUDAH TERJAWAB (2026-09-03)
Keputusan final (rekomendasi draft diambil apa adanya, dikonfirmasi user):
- [x] Lokasi manifest: `.caf/.generate-manifest.json` (file terpisah)
- [x] Strategi backfill: Opsi (a) — flag `UNTRACKED` + review manual via
      `curate baseline`, bukan menebak dari timestamp git
- [x] Granularitas hash: per section penuh
- [x] UX conflict report: print terminal ala `git status`, TIDAK perlu
      command `curate diff` terpisah — lihat Task 6 (jadi no-op)

**Boleh lanjut ke Task 1.**

## Task 1 — Hash Section & Fungsi Perbandingan Inti
- [ ] Fungsi ekstrak section dari file `.md` (heading → sebelum heading
      level sama/lebih tinggi berikutnya)
- [ ] Fungsi hash SHA-256 dengan normalisasi whitespace minimal (sesuai
      keputusan Task 0 granularitas)
- [ ] Fungsi `compareSection(baseline, current, template)` → salah satu dari
      5 status: `IN_SYNC` / `DRIFT` / `CUSTOMIZATION` / `CONFLICT` / `UNTRACKED`
      (`UNTRACKED` kalau baseline tidak ada di manifest sama sekali)
- [ ] Unit test: seluruh kombinasi baseline/current/template → status yang
      benar, termasuk edge case whitespace-only diff (harus tetap `IN_SYNC`)

## Task 2 — Manifest Read/Write
- [ ] Implementasi baca/tulis manifest sesuai keputusan Task 0 (lokasi & format)
- [ ] Fungsi update manifest setelah section berhasil di-sync
- [ ] Unit test: manifest baru (project belum pernah punya) → semua section
      dibaca sebagai `UNTRACKED`, tidak crash

## Task 3 — `curate audit` (Ubah, dari per-file jadi per-section)
- [ ] Baca semua file `.claude/agents/*.md` (dan `.opencode/agent/*.md` kalau
      relevan) di project target
- [ ] Untuk tiap section yang dikenal (daftar section standar dari template
      — cek dulu daftar section apa saja yang didukung `curate` saat ini),
      jalankan `compareSection`
- [ ] Output laporan: ringkasan jumlah section per status, detail per file+
      section untuk yang bukan `IN_SYNC`
- [ ] Regression test: project yang sudah full in-sync (hasil Task 1-2 test)
      → laporan bersih, tidak ada false-positive

## Task 4 — `curate sync` (Ubah — hanya sync status `DRIFT`)
- [ ] `DRIFT` → tulis ulang section dengan isi dari template, update manifest
- [ ] `CONFLICT` dan `CUSTOMIZATION` → SKIP total, tidak ditulis apapun,
      tapi tetap muncul di laporan akhir run (bukan silent-skip)
- [ ] `UNTRACKED` → SKIP, arahkan user ke `curate baseline` (Task 5)
- [ ] Unit test: section `DRIFT` ter-update, section `CUSTOMIZATION` sama
      sekali tidak berubah (byte-for-byte assert), section `CONFLICT` sama
      sekali tidak berubah
- [ ] Integration test: reproduksi skenario CDR-38 persis (section lama
      tanpa `SUCCESS` + template sudah diperbaiki) → `curate sync` berhasil
      benerin otomatis tanpa manual patch

## Task 5 — `curate baseline` (Command Baru, untuk Backfill)
- [ ] Hanya relevan kalau Task 0 milih Opsi (a) untuk strategi backfill
- [ ] Command baru: terima kondisi section APA ADANYA di file target sebagai
      baseline pertama kali, TIDAK mengubah isi file, cuma menulis manifest
- [ ] Harus ada konfirmasi/prompt sebelum menulis (bukan langsung eksekusi
      tanpa review) — user perlu sadar section mana yang baru saja jadi
      baseline
- [ ] Unit test: jalankan di project fixture tanpa manifest → manifest baru
      tertulis persis sesuai isi file saat ini, isi file tidak berubah sama
      sekali

## Task 6 — Command Diff Terpisah — TIDAK PERLU (sesuai keputusan Task 0)
Keputusan final: UX conflict report cukup print terminal ala `git status` di
`curate audit`/`curate sync` (Task 3/4). Tidak perlu command `curate diff`
tambahan. Task ini di-skip, dipertahankan di sini cuma sebagai catatan bahwa
opsi itu sudah dipertimbangkan dan sengaja tidak diambil — supaya sesi
implementasi tidak bingung kenapa nomor task loncat.

## Task 7 — Verifikasi Regresi & Dokumentasi
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` (atau setara di
      `caf-initiator`, cek script yang benar-benar ada)
- [ ] Regression: `curate` behavior lama untuk section yang BELUM PERNAH ada
      sama sekali (bukan section existing yang drift) — harus tetap seperti
      sebelumnya (nambah section baru), tidak berubah oleh fitur ini
- [ ] Update dokumentasi `caf-initiator` (README/CLAUDE.md yang relevan) —
      jelaskan konsep 5 status section, command `curate baseline` baru,
      dan alur backfill untuk project existing

## Task 8 — Migrasi Project yang Sudah Ada (Terpisah, Setelah Fitur Jadi)
> Eksplisit di luar scope implementasi fitur ini sendiri (lihat
> `requirements.md`). Dicatat di sini cuma sebagai pengingat urutan kerja
> berikutnya, BUKAN bagian dari Definition of Done ticket ini:
- `coderium-web-v2` dan `umkm-pos` masih perlu dijalankan `curate baseline`
  supaya mulai ter-track manifest-nya — ini ticket/task terpisah setelah
  CAF-CURATE-DIFF-01 selesai dan dirilis

## Definition of Done (Task 1-7 saja, TIDAK termasuk Task 8)
- Semua quality gate PASS
- 4 STOP item Task 0 terjawab dan terekam
- Skenario CDR-38 (drift section existing) terbukti bisa di-auto-sync tanpa
  manual patch — dites end-to-end, bukan cuma unit test komponen
- Customization user terbukti TIDAK PERNAH ke-overwrite dalam kondisi apapun
  yang diuji — ini kriteria paling kritis, butuh bukti eksplisit di
  `verify-report.md`, bukan cuma "tidak ada test yang gagal"
- Behavior lama (section belum pernah ada) tidak berubah — regression test
  eksplisit membuktikan ini