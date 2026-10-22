# Amendment 1 — CAF-INIT-DOCS-REMOVE

Dasar: hasil Task 1 (`inventory-report.md`, commit f65a0fb).
Status: keputusan manusia. Bagian di `requirements.md` dan `tasks.md` yang bertentangan dengan dokumen ini digantikan olehnya. Sisanya tetap berlaku.

## Koreksi premis (kesalahan di requirements.md awal)

- Q1 salah premis: "Layer 1" di audit adalah seluruh Knowledge Base (CLAUDE.md, AGENTS.md, INDEX.md, golden-examples, ADR), bukan hanya dokumen docs.
- Perintah Verify cacat: regex AC-8 tidak cocok dengan path nyata, `caf-init` belum ter-link, `package.json` tidak punya lint/build, dan `CHANGELOG.md` tidak ada.

## Prinsip pemisah

- **P1 — Instruksi aktif.** Teks yang menyuruh pengguna atau agent menjalankan `caf-init docs`, atau menyatakan dokumen docs sebagai wajib, harus dihapus atau diubah. Teks seperti itu menunjuk ke command yang sudah tidak ada.
- **P2 — Petunjuk pasif.** Teks "baca bila ada" dibiarkan. Pengguna masih boleh punya `docs/` buatan sendiri, dan agent yang tidak menemukan file itu tidak rugi apa-apa.

## Keputusan

**D1 — Planner `## Input` dan snapshot: tidak diubah.**
Heading "Optional — Layer 1 reference docs" tetap (P2). Jangan regenerate `test/fixtures/snapshots/mono-pnpm.json` atau golden `pre-sdd*`, dan jangan ubah test sdd02d/sdd02e. Alasan: planner yang sudah ter-scaffold tidak jadi DRIFT, dan larangan regenerate di CLAUDE.md tidak dilanggar.

**D2 — Skill `caf-design`: tidak diubah.**
Baris 443 di `src/templates/skill-md.js` tetap (P2, dan teksnya dikunci sha256). Dicatat sebagai pengecualian AC-8.

**D3 — Fixture yang memuat `caf-init docs`.**
Klasifikasikan file di `test/fixtures` yang memuatnya ke dua golongan dan tulis klasifikasinya di `verify-report.md`:
- (a) fixture yang memuat output nyata yang berubah akibat penghapusan, yaitu teks help atau instruksi kepada pengguna (P1);
- (b) sisanya.

Golongan (a) boleh diperbarui. Hanya baris yang terkait, dan diff-nya dilampirkan di `verify-report.md`. Ini pengecualian terbatas dari larangan regenerate, karena perubahannya disengaja. Golongan (b) dibiarkan.
**Berhenti dan lapor** bila golongan (a) menyentuh file yang dikunci sha256, atau butuh perubahan lebih dari penghapusan atau penggantian baris itu.

**D4 — Q1 diganti.**
Layer 1 tetap utuh. Hanya blok `OPTIONAL_DOCS` di `src/commands/audit.js:115-136` yang dihapus, beserta test terkait. Tidak ada penandaan "tidak dipakai".

**D5 — Perintah Verify dikoreksi.**
- Ganti `caf-init` dengan `node <path bin dari package.json>` di semua perintah Verify.
- AC-2: `grep -rn "caf-init docs"` dengan `--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai`. Hasil yang diharapkan: nol di `src`, `README`, `CLAUDE.md`, `CAF.md`, dan template. Sisa di `test/fixtures` hanya yang sah menurut D3 golongan (b).
- AC-6 dihapus. Tidak ada lint/build di repo, jangan menambahkannya.
- AC-8 diganti: tidak ada template yang menyatakan dokumen docs wajib atau menyuruh menjalankan `caf-init docs`. Pengecualian eksplisit: planner `## Input` (D1) dan `caf-design` (D2).
- AC-9: **jangan membuat `CHANGELOG.md`.** Paket belum dipublish. Catat penghapusan di README dan di pesan commit.

**D6 — Scope tambahan.**
- Masuk scope (P1): hapus atau ubah sebutan `caf-init docs` di `CLAUDE.md` (baris 31 dan 80) dan `CAF.md` (baris 377).
- Tidak disentuh: `discovery-commands.js`, karena frozen-kinds memegangnya. Catat sebagai temuan di luar scope.

**D7 — Commit artifact tiket.**
Sebagai commit pertama yang terpisah, sebelum Task 2, commit `requirements.md`, `tasks.md`, dan `amendment-1.md` dengan pesan "CAF-INIT-DOCS-REMOVE: add ticket artifacts". Dengan begitu AC-10 (working tree bersih) bisa terpenuhi.

## Dampak ke tasks.md

- Task 3: hanya hapus `OPTIONAL_DOCS` (D4).
- Task 5: dipersempit. Tidak mengubah planner `## Input` dan `caf-design` (D1, D2). Mencakup `CLAUDE.md` dan `CAF.md` (D6) serta klasifikasi fixture (D3).
- Task 6: tanpa lint/build. Pakai perintah Verify yang sudah dikoreksi (D5).
- Task 7: README saja, tanpa `CHANGELOG.md` (D5).