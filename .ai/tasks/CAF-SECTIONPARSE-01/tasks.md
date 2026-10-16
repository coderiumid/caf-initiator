# Tasks: CAF-SECTIONPARSE-01

> Tidak ada STOP item — root cause dan pendekatan fix sudah jelas dari
> investigasi sesi sebelumnya. Langsung eksekusi, checkpoint tetap wajib
> sebelum sentuh file di luar `caf-initiator`.

## Task 1 — Reproduksi Bug (Test Dulu, Sebelum Fix)
- [ ] Buat fixture test dengan isi section `## Report Format` PERSIS seperti
      `caf-auditor.md` (contoh `verify-report.md` dengan heading `##` di
      dalam fenced code block)
- [ ] Test `replaceSectionBody` terhadap fixture ini — konfirmasi GAGAL
      (reproduksi bug: section kegandaan) di kode SEBELUM fix
- [ ] Ini jadi bukti bug benar-benar direproduksi, bukan diasumsikan dari
      laporan sesi sebelumnya

## Task 2 — Cek Scope Fungsi yang Terpengaruh
- [ ] Baca `src/utils/agent-sections.js` — identifikasi semua fungsi yang
      melakukan boundary detection, cek apakah ada duplikasi logic
- [ ] Baca `src/utils/section-diff.js` (`extractSection`, `hashSection`) —
      cek apakah pakai boundary-detection yang sama atau terpisah
- [ ] Laporkan temuan sebelum lanjut Task 3 — kalau ternyata ada lebih dari
      2 tempat yang perlu di-fix (di luar dugaan design.md), STOP dan
      laporkan dulu, jangan langsung perluas scope sendiri

## Task 3 — Implementasi Fix
- [ ] Tambah fenced-code-block-aware boundary detection sesuai `design.md`
- [ ] Terapkan ke SEMUA fungsi yang teridentifikasi di Task 2
- [ ] Test dari Task 1 sekarang harus PASS

## Task 4 — Regression Test Penuh
- [ ] Jalankan seluruh test suite `CAF-CURATE-DIFF-01` (37 test sebelumnya)
- [ ] Semua harus tetap PASS — kalau ada yang FAIL, itu tanda fix ini
      mengubah behavior section normal, STOP dan investigasi sebelum lanjut
- [ ] Tambah test baru dari Task 1 ke test suite permanen

## Task 5 — Verifikasi Tambahan (Opsional, Kalau Waktu Memungkinkan)
- [ ] Integration test: `curate sync` end-to-end terhadap fixture yang
      meniru file lengkap (bukan cuma satu section terisolasi)

## Task 6 — Dokumentasi
- [ ] Catatan singkat di `CLAUDE.md`/README relevan: section boundary
      detector sekarang fenced-code-block-aware — kalau ada agent def baru
      yang isi section-nya perlu menyertakan contoh markdown dengan heading,
      WAJIB dibungkus fenced code block, bukan indentasi biasa (batasan yang
      didokumentasikan di `design.md`, bukan di-generalisasi lebih jauh)

## Definition of Done
- Bug direproduksi via test SEBELUM fix, lalu PASS SESUDAH fix (Task 1+3)
- Semua fungsi yang terpengaruh (Task 2) sudah di-fix, bukan cuma satu
- 37 test lama + test baru — 100% pass
- Tidak ada perubahan ke repo `coderium-web-v2`/`umkm-pos` di ticket ini
  (retry sync itu sesi terpisah setelah ticket ini `SUCCESS`)