# CAF-INIT-DOCS-REMOVE — Hapus command `docs` dari caf-init

Repo target: `caf-initiator`
Lokasi artifact: `.ai/tasks/CAF-INIT-DOCS-REMOVE/`
Satu tiket, tujuh task (lihat `tasks.md`). Jangan dipecah menjadi tiket lain.

## 1. Outcomes

- `caf-init` tidak lagi punya command `docs`. Setup CAF menjadi lebih sederhana: tidak ada lagi dokumen referensi opsional (PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy) yang di-scaffold sebagai file kosong/TODO.
- Command lain (`scaffold`, `export`, `curate`, `complete-drafts`) tetap berfungsi dan tidak menampilkan atau mengandalkan dokumen docs.
- Tidak ada referensi yatim (kode, template, teks help, test, README) yang menunjuk ke command atau dokumen yang sudah dihapus.

## 2. Scope

### Di dalam scope
- Menghapus command `docs`: registrasi, implementasi, template dokumen, opsi, teks help, dan test-nya.
- Menyesuaikan `curate` agar audit tidak melaporkan dokumen Layer 1 sebagai hilang atau tidak patuh.
- Menyesuaikan `complete-drafts` agar dokumen docs tidak lagi menjadi targetnya.
- Membersihkan petunjuk di template agent/skill yang menyuruh agent membaca dokumen docs.
- Memperbarui test, README, dan CHANGELOG.

### Di luar scope (jangan dikerjakan, laporkan saja bila ditemukan)
- Perlindungan file saat upgrade (manifest hash).
- Penyederhanaan scaffold untuk `knowledge/` dan `tasks/`.
- Pengecekan apakah Golden Examples, ADR, Task Completion, dan Workflow menghasilkan cangkang TODO.
- Pembersihan file docs di proyek yang sudah ter-scaffold (misalnya umkm-pos).
- Penomoran ulang Layer 2–4.
- Perubahan pada orchestrator atau repo lain.

## 3. Constraints dan asumsi

- Hanya commit lokal. Tidak ada push, tidak ada npm publish. Review dan merge dilakukan manusia.
- Paket belum dipublish ke npm, jadi tidak perlu masa deprecation atau alias untuk command lama.
- Command `docs` dideskripsikan di `caf-init --help` sebagai "scaffold optional Layer 1 reference docs ... all read-only/optional, never required for the pipeline to run". Asumsi: tidak ada bagian pipeline yang bergantung padanya. **Asumsi ini harus dibuktikan di Task 1**, bukan dianggap benar.
- `/caf-complete-drafts` termasuk 5 command final CAF. Command itu tidak boleh rusak atau hilang sebagai efek samping tiket ini.
- Command test, lint, dan build ditentukan dari `package.json` repo (Task 1 mencatatnya). Jangan mengarang perintah.
- Agent tidak mengedit file di luar scope di atas. Bila perlu, laporkan sebagai temuan.

## 4. Keputusan yang sudah final

- Fokus hanya command `docs`. Penyederhanaan `knowledge/` dan `tasks/` adalah tiket lain.
- Semua pekerjaan dalam satu tiket.
- Task 1 adalah pemeriksaan read-only dan harus selesai serta dilaporkan sebelum Task 2 dimulai.

## 5. Pertanyaan terbuka

- **Q1 — Penomoran Layer.** Jika Layer 1 hanya dipakai oleh `docs`, apakah Layer 1 ditandai "tidak dipakai" dengan penomoran Layer 2–4 dibiarkan, atau dinomori ulang?
  **Default yang dipakai bila tidak dijawab:** tandai Layer 1 "tidak dipakai", jangan nomori ulang (lebih aman dan murah).
- **Q2 — `complete-drafts`.** Apakah target `complete-drafts` selain dokumen docs? Dijawab oleh Task 1. Jika dokumen docs adalah satu-satunya target, **berhenti dan laporkan** (lihat AC-7).

## 6. Acceptance criteria

- **AC-1.** Command `docs` tidak muncul di daftar command `caf-init --help`.
  Verify: command: `caf-init --help | grep -cE '^\s+docs\b'` | expect: `0`
- **AC-2.** Tidak ada sisa referensi ke command `docs` atau ke keenam dokumen (PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy) sebagai output `caf-init` di kode, template, teks help, README, dan test. Pengecualian yang sah (misalnya catatan di CHANGELOG) dicantumkan di laporan Task 6.
  Verify: command: `grep -rniE "caf-init docs|scaffold.*docs|layer 1 reference" --exclude-dir=node_modules --exclude-dir=.git --exclude=CHANGELOG.md --exclude-dir=.ai .` | expect: tidak ada output
- **AC-3.** `scaffold` tanpa target berjalan sampai selesai di direktori temporer, tanpa error dan tanpa membuat dokumen docs.
  Verify: command: jalankan `scaffold` di direktori temporer kosong (mode non-interaktif atau jawaban skip bila perlu), lalu `ls` direktori hasilnya | expect: exit code 0 dan tidak ada PRD/Feature Spec/system-overview/api-contract/ERD/testing-strategy
- **AC-4.** `curate --audit-only` pada fixture proyek ter-scaffold berjalan tanpa error dan tidak melaporkan dokumen Layer 1 sebagai hilang atau tidak patuh.
  Verify: command: `caf-init curate --audit-only` di fixture | expect: exit code 0 dan laporan tidak menyebut dokumen docs
- **AC-5.** Semua test yang ada lulus setelah perubahan, dan test yang khusus untuk `docs` sudah dihapus atau diganti.
  Verify: command: `<test-cmd dari package.json>` | expect: lulus, tanpa test yang dilewati karena perubahan ini
- **AC-6.** Lint dan build (bila ada di `package.json`) lulus.
  Verify: command: `<lint-cmd>` dan `<build-cmd>` dari `package.json` | expect: exit code 0
- **AC-7.** `complete-drafts` masih berfungsi dengan target selain dokumen docs. Bila ternyata dokumen docs adalah satu-satunya targetnya, pekerjaan berhenti dan dilaporkan tanpa memutuskan sendiri, karena `/caf-complete-drafts` termasuk 5 command final.
  Verify: command: `caf-init scaffold complete-drafts --help` dan inspeksi daftar targetnya | expect: daftar target tidak kosong dan tidak memuat dokumen docs
- **AC-8.** Template agent dan skill tidak lagi menyuruh agent membaca dokumen docs.
  Verify: command: `grep -rniE "docs/(prd|feature-spec|system-overview|api-contract|erd|testing-strategy)" templates src` (sesuaikan path dengan struktur repo) | expect: tidak ada output
- **AC-9.** README dan CHANGELOG mencatat bahwa `docs` dihapus.
  Verify: command: `grep -niE "docs" CHANGELOG.md README.md` | expect: ada catatan penghapusan di CHANGELOG, dan README tidak lagi mendokumentasikan `caf-init docs` sebagai command aktif
- **AC-10.** Hanya commit lokal. Tidak ada push atau publish. Perubahan terbatas pada scope di bagian 2.
  Verify: command: `git status` dan `git log origin/HEAD..HEAD --stat` | expect: working tree bersih, semua perubahan berupa commit lokal, tidak ada file di luar scope