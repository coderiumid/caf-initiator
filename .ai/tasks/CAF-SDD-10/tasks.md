# CAF-SDD-10 — Tasks
Status: APPROVED. Commit lokal saja; jangan push, merge, atau publish. Lanjut di branch `ai-agent/CAF-SDD-09` (setelah 09). Salin `caf-spec.skill.v4.md` ke `.ai/tasks/CAF-SDD-10/` lebih dulu.

## T1 — Periksa sebelum mengubah `src/`
- `grep -rn "buildSpecSkill\|caf-spec" test src` dan daftar semua test yang membandingkan teks `caf-spec` (A-1) dan golden lama yang memuat teks skill (A-2). Tulis daftar di `verify-report.md`.
- Konfirmasi `.ai/tasks/CAF-SDD-10/caf-spec.skill.v4.md` berakhir dengan satu newline dan tepat enam baris berbeda dari render sekarang (`diff` terhadap `buildSpecSkill()`); bila beda lain, STOP.
- Bila temuan bertentangan dengan AC, STOP sebelum menyentuh `src/`.

## T2 — Fixture v3 dan hash
- Rekam render sekarang ke `test/fixtures/pre-sdd10/caf-spec.v3.SKILL.md` (77 baris) SEBELUM kode berubah; jangan pernah di-regenerate. Hitung sha256 sumber v4.

## T3 — Test lama membaca v3 dari fixture
- `test/sdd02b-spec-v3.test.js` dan `test/sdd02c-spec-active.test.js` (dan yang lain dari daftar T1): bagian yang membandingkan teks skill hidup dengan hash v3 membaca fixture. Asersi dan hash TIDAK dilonggarkan; hanya sumber teksnya. Bila perlu, helper `test/helpers/since-10.js` (v3 → v4 dengan enam penggantian, ditulis lengkap di helper, bukan diimpor dari `src/`), dipakai test yang membandingkan seluruh berkas skill dengan golden lama.
- Catat setiap test yang diubah dan alasannya.

## T4 — Ubah builder dan test baru
- `buildSpecSkill` di `src/templates/skill-md.js` = isi `caf-spec.skill.v4.md` persis (jangan ketik ulang; salin). Komentar di atas builder diperbarui: v4, enam perubahan, sumbernya berkas tiket.
- `test/sdd10-spec-v4.test.js` untuk AC-1, 2, 3, 5, 6.

## T5 — Dokumen dan verifikasi
- `CLAUDE.md`: perbarui kalimat "`caf-spec` is at v3 ..." menjadi v4 dengan ringkasan enam perubahan; ganti kalimat bahwa skill dan planner berbeda dengan sengaja (`-`/`Tidak ada`, `Assumption:`, pengecualian refactor, "Don't 'fix' the skills") menjadi catatan bahwa keduanya sejajar sejak CAF-SDD-10; tambahkan rollout D-4. Jangan menulis ulang bagian riwayat tiket lama.
- `npm test`; catat jumlah file/test sebelum dan sesudah.
- `verify-report.md` dengan baris pertama `Status: SUCCESS|NEEDS_HUMAN`, satu baris bukti per AC, daftar test yang diubah (T3). Commit TERAKHIR.