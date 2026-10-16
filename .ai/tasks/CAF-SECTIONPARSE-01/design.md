# Design: CAF-SECTIONPARSE-01 — Fix Section Boundary Parser

## Root Cause
Section boundary detector (di `src/utils/agent-sections.js`, dipakai oleh
`replaceSectionBody` dan kemungkinan juga `extractSection`/`hashSection` di
`src/utils/section-diff.js` — perlu dicek dua-duanya) mencari batas section
berikutnya dengan matching baris yang diawali `^##\s` di SELURUH isi section,
termasuk baris yang secara semantik ada di dalam fenced code block (\`\`\`),
bukan heading asli di level markdown dokumen.

## Pendekatan Fix
Tambah state tracking "sedang di dalam fenced code block" saat parsing
baris demi baris:
```
inFencedBlock = false
for setiap baris:
  jika baris match /^```/ → toggle inFencedBlock
  jika baris match /^##\s/ DAN TIDAK inFencedBlock → ini heading asli,
    kandidat batas section
  selain itu → bagian dari isi section, lanjut
```
Ini pendekatan standar buat markdown-aware parsing (sama prinsipnya kayak
kenapa syntax highlighter/linter markdown nggak nganggep teks di dalam code
block sebagai instruksi dokumen).

**Catatan tambahan (perlu dicek saat implementasi, bukan diasumsikan)**:
kalau ternyata ada juga kasus heading tiruan di **luar** fenced code block
(mis. contoh markdown yang sengaja ditulis tanpa code fence, pakai indentasi
biasa) — itu di luar cakupan fix minimal ini. Laporkan sebagai temuan
terpisah kalau ketemu, jangan coba generalisasi fix jadi terlalu kompleks di
ticket yang sama (mis. full markdown AST parser) tanpa keputusan eksplisit
soal itu perlu atau nggak.

## Scope Perubahan
- `src/utils/agent-sections.js` — `replaceSectionBody` (dan fungsi lain yang
  share boundary-detection logic yang sama, cek dulu apakah ada duplikasi
  logic atau satu fungsi dipakai bersama)
- `src/utils/section-diff.js` — `extractSection`/`hashSection` (Task 1 di
  `CAF-CURATE-DIFF-01`) — WAJIB dicek apakah pakai boundary-detection yang
  sama atau logic terpisah. Kalau terpisah dan juga naive, perlu fix yang
  sama di sini juga — kalau tidak, hash section utuh (termasuk heading
  tiruan) sebenarnya "benar" secara hash (nggak salah COMPARE), tapi
  `replaceSectionBody`-nya yang salah TULIS. Perlu dipastikan dua fungsi ini
  konsisten mendefinisikan "batas section" dengan cara yang sama, atau
  sengaja beda dengan alasan yang jelas.

## Testing Strategy
- Unit test boundary detector: section dengan heading tiruan di fenced code
  block → batas terdeteksi benar (di heading section asli berikutnya, bukan
  di heading tiruan)
- Unit test `replaceSectionBody`: reproduksi PERSIS struktur `caf-auditor.md`
  (pakai isi section asli, bukan versi disederhanakan, supaya test ini
  benar-benar jadi regression guard untuk kasus nyata) — sebelum fix FAIL,
  sesudah fix PASS, hasilnya tidak ada duplikasi konten
- Full regression: seluruh test suite `CAF-CURATE-DIFF-01` (37 test yang
  sudah ada) tetap 100% pass — fix ini tidak boleh mengubah behavior untuk
  section normal (tanpa heading tiruan)
- Integration test tambahan (opsional, kalau waktu memungkinkan): jalankan
  `curate sync` end-to-end terhadap fixture yang meniru struktur
  `caf-auditor.md` lengkap dengan section lain di sekitarnya, verifikasi
  seluruh file (bukan cuma satu section) hasilnya benar