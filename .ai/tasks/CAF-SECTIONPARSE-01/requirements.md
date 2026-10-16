# Ticket: CAF-SECTIONPARSE-01 — Fix Section Boundary Parser (Embedded Heading Bug)

## Latar Belakang
Ditemukan saat retry `curate sync` di `coderium-web-v2` (follow-up
`CAF-BASELINE-ROLLOUT-01`): `src/utils/agent-sections.js` (fungsi
`replaceSectionBody`/section splitter) mendeteksi batas section dengan
naive matching `^##` di seluruh isi section, tanpa sadar bahwa isi section
bisa berisi **contoh konten** yang punya heading tiruan di dalamnya.

Kasus konkret: `caf-auditor.md` section `## Report Format` isinya berupa
contoh template `verify-report.md` (`## Audit: <DATE>`, `## Summary`, dst).
Parser salah membaca heading contoh itu sebagai batas section asli, sehingga
`replaceSectionBody` cuma nulis ulang sampai heading tiruan pertama, lalu
sisa konten lama numpuk lagi di akhir file — section-nya **kegandaan**
(data corruption), bukan cuma gagal ke-update.

Dikonfirmasi: bug ini mempengaruhi `coderium-web-v2` DAN `umkm-pos` (struktur
`caf-auditor.md` identik di keduanya). `umkm-pos` belum sempat kena karena
sesi sync dihentikan sebelum sampai ke file itu. 3 file lain (`pm.md`,
`qa.md`, `reviewer.md`) sudah dikonfirmasi sync bersih (single-hunk diff,
tidak ada duplikasi) sebelum sesi itu di-revert total.

## Apa yang Diminta
Perbaiki section boundary detection supaya heading di dalam **fenced code
block** (atau bentuk "contoh konten" lain yang relevan) tidak dianggap
sebagai batas section asli.

## Acceptance Criteria
- [ ] Reproduksi bug: test baru yang memakai fixture PERSIS struktur
      `caf-auditor.md` (section berisi contoh `verify-report.md` dengan
      heading `##` di dalam fenced code block) — sebelum fix, test ini FAIL
      (section kegandaan); sesudah fix, PASS
- [ ] `replaceSectionBody` pada section dengan heading tiruan di dalam
      fenced code block menghasilkan output yang benar — section tergantikan
      utuh, tidak ada duplikasi konten di akhir file
- [ ] Regression: semua section YANG TIDAK punya heading tiruan (mayoritas
      kasus existing) tetap berperilaku identik dengan sebelum fix — jalankan
      ulang seluruh test suite `CAF-CURATE-DIFF-01`, harus tetap 100% pass
- [ ] `curate audit` — deteksi status section (bukan cuma `sync`) juga perlu
      dicek: apakah `compareSection`/hashing section punya bug serupa (ikut
      salah hash gara-gara heading tiruan), atau cuma `replaceSectionBody`
      yang kena. Verifikasi keduanya, jangan asumsi cuma satu fungsi yang
      bermasalah.
- [ ] Setelah fix: retry `curate sync` di `coderium-web-v2` (khusus section
      `## Report Format` yang sebelumnya gagal) dan `umkm-pos` (semua yang
      masih pending) — dilakukan SETELAH fix ini `SUCCESS`, sebagai sesi
      terpisah (lihat "Out of Scope")

## Eksplisit Out of Scope
- Retry `curate sync` di `coderium-web-v2`/`umkm-pos` — sesi terpisah setelah
  fix ini selesai dan diverifikasi
- Perbaikan UX `--yes`/non-interactive flag untuk `curate sync` (temuan
  minor #2 dari sesi sebelumnya) — item follow-up terpisah, bukan bagian
  dari bug fix ini
- Perubahan section apapun di 6 file agent def yang sudah ter-baseline —
  ticket ini murni fix di `caf-initiator`, tidak menyentuh repo target