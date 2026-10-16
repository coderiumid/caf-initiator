# Tasks: CAF-RETRYLOGIC-01

> Tidak ada STOP item desain besar — pola fix-nya sudah ada preseden persis
> (`buildWhatToLookForSection(kind)`/`buildReportFormatSection(kind)`).
> Langsung eksekusi, checkpoint di titik yang berisiko regresi.

## Task 1 — Investigasi Kind & Konfirmasi Scope
- [ ] Baca `agent-md.js` — cari daftar `kind` yang valid (semua nilai yang
      dipakai untuk generate agent def: `frontend`, `backend`, `qa`,
      `reviewer`, `pm`, `ux-designer`, `auditor`, `architect`,
      `documentation`, `devops`, dst — ambil dari kode, jangan asumsi dari
      nama file di repo target)
  * (Nama-nama di atas hanyalah dugaan awal berdasarkan nama file yang
      muncul di CDR-38/sesi-sesi sebelumnya — WAJIB diverifikasi ke kode
      sebelum dipakai, jangan langsung dipakai sebagai daftar final)
- [ ] Konfirmasi persis `kind` mana yang termasuk "Discovery" (butuh
      Open-Questions-style retry) — dugaan: `pm`, `ux-designer`. Cek juga
      apakah ada `kind` lain yang polanya sama (baca `Output`/`Input`
      section builder mereka — kalau outputnya bukan `verify-report.md`,
      kemungkinan mereka juga masuk kategori ini)
- [ ] Laporkan hasil investigasi ke user sebelum lanjut Task 2 — kalau
      ternyata ada lebih dari 2 kategori (bukan cuma Discovery vs Delivery
      biner), STOP dan diskusikan dulu, jangan asumsi biner

## Task 2 — Implementasi `buildRetryLogicSection(kind)`
- [ ] Ubah signature jadi menerima `kind`
- [ ] Percabangan: kategori Discovery → Open-Questions-style; kategori lain
      → tetap output yang sudah ada sekarang (copy persis, jangan ditulis
      ulang dari ingatan — supaya behavior existing dijamin identik)
- [ ] Update semua call-site `buildRetryLogicSection()` (tanpa argumen) jadi
      `buildRetryLogicSection(kind)` — cek semua tempat yang manggil fungsi
      ini, termasuk kalau ada di luar `agent-md.js`

## Task 3 — Update Section Tracking (`curate audit`/`sync`)
- [ ] Cek `canonical-sections.js`/`agent-sections.js` — pastikan
      perbandingan `Retry Logic` terhadap template sekarang pakai versi yang
      sesuai `kind` file yang diperiksa, bukan template generik tunggal
      (pola yang sama seperti `Report Format`/`What to Look For` yang sudah
      Auditor-aware — ikuti pola itu persis)

## Task 4 — Regression Test
- [ ] Test baru: `buildRetryLogicSection('pm')`/`('ux-designer')`
      menghasilkan Open-Questions-style, TIDAK menyebut `verify-report.md`
- [ ] Test baru: `buildRetryLogicSection('frontend')` (atau kind Delivery
      lain) — output IDENTIK dengan sebelum fix (byte-for-byte, sama pola
      seperti test refactor `CAF-SECTIONPARSE-01`)
- [ ] Jalankan seluruh test suite lama (38 test) — 100% pass, 0 regresi
- [ ] Test `curate audit`: fixture agent Discovery dengan `Retry Logic`
      Open-Questions-style yang sudah benar → status `IN_SYNC` (bukan
      `DRIFT`/`CONFLICT` — ini pembuktian langsung bahwa gap yang ditemukan
      minggu ini sekarang benar-benar tertutup)

## Task 5 — Dokumentasi
- [ ] Update README — pindahkan `Retry Logic` dari kategori "kind-only/
      constant" ke ditandai role-aware, sebutkan kategori Discovery vs
      lainnya secara eksplisit
- [ ] `CLAUDE.md` (kalau relevan) — catatan singkat soal kenapa perubahan
      ini dilakukan (root cause insiden minggu ini), untuk konteks siapa pun
      yang baca riwayat project ini nanti

## Definition of Done
- `kind` Discovery dan Delivery menghasilkan `Retry Logic` yang benar sesuai
  perannya masing-masing, dibuktikan test eksplisit
- Kind existing (Delivery dan sejenisnya) TIDAK regresi — byte-for-byte
  identik dengan sebelum fix
- `curate audit` terhadap fixture Discovery yang benar → `IN_SYNC`, bukan
  `DRIFT`/`CONFLICT` — bukti gap tertutup
- 38 test lama + test baru — 100% pass
- Tidak ada perubahan ke `coderium-web-v2`/`umkm-pos` di ticket ini