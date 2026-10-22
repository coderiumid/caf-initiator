# Amendment 2 — CAF-INIT-DOCS-REMOVE (perluasan scope)

Status: keputusan manusia (Ganjar). Branch dan tiket tetap sama. Menambah Task 9–12 dan AC-11–AC-16. Task 8 (tabel status INDEX.md) yang dibatalkan di Amendment 1 diambil alih oleh amendment ini.
Hal yang tidak diubah: aturan eksekusi di tasks.md, prinsip P1/P2 di Amendment 1, dan AC-1 sampai AC-10 untuk pekerjaan yang sudah selesai.

## Latar belakang

Setelah command `docs` dihapus, masalah yang sama ada di `.caf/knowledge/` dan `.caf/tasks/`: file hasil scaffold yang isinya cangkang TODO, yang membebani pengguna baru dan bisa disalahbaca agent. Tujuan: setup CAF tidak lagi menaruh file kosong di repo.

## Aturan penentu

Sebuah file hanya boleh di-scaffold bila:
- **(a)** sudah berisi konten nyata saat dibuat, atau
- **(b)** ada agent atau command yang pasti menulis ke sana pada penggunaan normal.

Selain itu, jangan di-scaffold. Agent atau command membuatnya saat dibutuhkan.

## Di luar scope

- Fitur baru: menurunkan satu file knowledge dari isi repo (README, struktur monorepo, CI). Itu tiket lain.
- Pembersihan file yang sudah ter-scaffold di proyek yang ada (umkm-pos).
- Manifest hash untuk perlindungan upgrade.
- Cangkang di luar `knowledge/` dan `tasks/` (Golden Examples, ADR, Workflow): catat di laporan, jangan diubah.
- Perubahan di repo `caf-orchestrator`. Hanya dibaca.

## Task 9 — Inventaris scaffold `knowledge/` dan `tasks/` (read-only)

- Telusuri langkah scaffold dan generator yang menulis ke `.caf/knowledge/` dan `.caf/tasks/` (termasuk `INDEX.md`, `04-generate-drafts`, `task-completion`).
- Untuk setiap file yang di-scaffold, klasifikasikan: (a) konten nyata, (b) ditulis agent/command saat penggunaan normal, (c) cangkang TODO, (d) lainnya. Sertakan bukti (file, baris, contoh isi).
- Untuk setiap file kategori (c), catat apa yang bergantung padanya: `curate`/audit, test, golden, fixture, template agent/skill, `INDEX.md`, file yang dikunci sha256.
- **Cek `caf-orchestrator`** secara read-only: cari referensi ke `.caf/knowledge` dan `.caf/tasks` dan catat apakah orchestrator membaca atau mengasumsikan folder atau file itu ada. Jika repo orchestrator tidak tersedia di mesin ini, jangan dilewati. Tulis perintah grep yang harus dijalankan manusia dan tandai Task 9 sebagai menunggu hasil itu.
- Catat dampak ke `INDEX.md`: tabel status dokumen docs, empat titik keterkaitan dari laporan Task 8 (dua test, step 04 + `KNOWLEDGE_INDEX_DOCS`, laporan curate Layer 1), dan apakah `INDEX.md` sendiri termasuk cangkang.
- Estimasi dampak: jumlah golden dan fixture yang berubah per opsi.
- Tulis `inventory-report-2.md` di folder tiket, berisi tabel klasifikasi dan rekomendasi per file (hapus dari scaffold / pertahankan / jadikan on-demand).

**CHECKPOINT WAJIB.** Setelah `inventory-report-2.md` di-commit, BERHENTI dan tampilkan ringkasannya. Jangan lanjut ke Task 10 sebelum manusia memutuskan. Ini berlaku apa pun hasilnya.

## Task 10 — Hentikan scaffold cangkang TODO (dikerjakan hanya setelah checkpoint disetujui)

- Terapkan keputusan per file dari `inventory-report-2.md` yang sudah disetujui manusia.
- Termasuk keputusan soal tabel status di `INDEX.md` dan perilaku laporan curate Layer 1.
- Edit test dan golden hanya yang tercantum di laporan yang disetujui. Larangan regenerate untuk meloloskan test tetap berlaku. Perubahan harus penghapusan atau penyesuaian yang disengaja, dengan diff dilampirkan di `verify-report.md`.
- Jangan mengubah file yang dikunci sha256 kecuali disetujui eksplisit.

## Task 11 — Test dan verifikasi

- Jalankan `npm test` dan semua perintah Verify AC-11 sampai AC-16 serta ulang AC-2 sampai AC-10.
- Uji manual: `scaffold` penuh di salinan fixture, dengan satu agent dipilih, lalu periksa isi `.caf/`.
- Perbarui `verify-report.md` dengan perintah dan output asli.

## Task 12 — Dokumentasi

- Perbarui README dan `CAF.md` bagian yang menjelaskan isi scaffold dan model Layer, sesuai hasil Task 10.
- Tanpa membuat CHANGELOG.md.

## Acceptance criteria tambahan

- **AC-11.** Setiap file yang di-scaffold ke `.caf/knowledge/` dan `.caf/tasks/` punya klasifikasi dan bukti di `inventory-report-2.md`.
  Verify: command: baca `inventory-report-2.md` | expect: tidak ada file ter-scaffold yang tidak terklasifikasi.
- **AC-12.** Setelah perubahan, `scaffold` penuh di direktori temporer tidak membuat file di `.caf/knowledge/` atau `.caf/tasks/` yang isinya hanya cangkang TODO.
  Verify: command: `scaffold` di salinan fixture lalu `grep -rlE "TODO" .caf/knowledge .caf/tasks` | expect: tidak ada output, kecuali file yang disetujui eksplisit di checkpoint.
- **AC-13.** Folder atau file yang menurut klasifikasi dibuat oleh agent saat berjalan (kategori b) tidak ikut di-scaffold sebagai cangkang.
  Verify: command: `ls -R .caf` setelah `scaffold` di salinan fixture | expect: sesuai keputusan checkpoint.
- **AC-14.** `curate --audit-only` pada hasil scaffold baru exit 0 dan tidak melaporkan file yang sengaja tidak di-scaffold sebagai hilang atau tidak patuh.
  Verify: command: `node <bin> curate --audit-only` | expect: exit code 0, tanpa entri missing untuk file tersebut.
- **AC-15.** `npm test` lulus tanpa test dilewati. Test yang diedit hanya yang tercantum di laporan yang disetujui, dan tidak ada file yang dikunci sha256 berubah tanpa persetujuan eksplisit.
  Verify: command: `npm test` dan `git diff --stat <commit-sebelum-Task-10>..HEAD` | expect: lulus, daftar file sesuai persetujuan.
- **AC-16.** Hasil pengecekan `caf-orchestrator` terhadap `.caf/knowledge` dan `.caf/tasks` tercatat di `inventory-report-2.md`, dan tidak ada ketergantungan yang diabaikan.
  Verify: command: baca bagian orchestrator di `inventory-report-2.md` | expect: ada daftar referensi (atau pernyataan nol) beserta perintah pencarian yang dipakai.

## Aturan tambahan

- Branch yang sama. Satu commit per task. Awalan commit tetap `CAF-INIT-DOCS-REMOVE:`. Beri sub-label pada pesan commit pekerjaan baru, misalnya `CAF-INIT-DOCS-REMOVE (knowledge/tasks):`, supaya review bisa dipisah menurut rentang commit.
- Hanya commit lokal. Tidak ada push, publish, atau PR.
- Task 9 selesai tidak berarti Task 10 boleh dimulai: checkpoint wajib berlaku.