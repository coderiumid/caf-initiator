# Tasks: CAF-FORCE-REBASELINE-01

## Task 1 — Desain Interface
- [ ] Baca `curate-baseline.js` — pahami struktur command existing
- [ ] Putuskan: flag baru `curate baseline --force <file> <section>` (scoped
      ke satu section spesifik, lebih aman) vs command terpisah
      `curate rebaseline`. Rekomendasi: flag `--force` dengan target
      spesifik (file + section wajib disebut, TIDAK ada mode "force semua
      CONFLICT sekaligus" — supaya user sadar section mana yang di-accept)
- [ ] Laporkan keputusan ke user sebelum lanjut implementasi (bukan STOP
      besar, tapi konfirmasi cepat karena ini nentuin UX command)

## Task 2 — Implementasi
- [ ] Command/flag menerima target section spesifik (file + heading), tolak
      kalau statusnya bukan `CONFLICT`
- [ ] Tampilkan preview SEBELUM konfirmasi: isi current section (yang akan
      jadi baseline baru), status target setelah re-baseline (`IN_SYNC` atau
      `CUSTOMIZATION`, hitung dari perbandingan ke template)
- [ ] Minta konfirmasi eksplisit (y/n atau `--yes` untuk skip di script)
- [ ] Tulis hash current sebagai baseline baru ke manifest — HANYA manifest,
      tidak ada write ke file manapun

## Task 3 — Test
- [ ] Unit test: re-baseline section `CONFLICT` → manifest terupdate, isi
      file byte-for-byte tidak berubah
- [ ] Unit test: re-baseline section `DRIFT`/`IN_SYNC`/`UNTRACKED` → ditolak
      dengan pesan jelas (bukan silent no-op)
- [ ] Unit test: setelah re-baseline, `curate audit` melaporkan status yang
      benar (`IN_SYNC` kalau current == template, `CUSTOMIZATION` kalau
      tidak) — test kedua kondisi, jangan asumsi cuma satu skenario
- [ ] Regression: 64 test lama tetap pass

## Task 4 — Dokumentasi
- [ ] README — tambahkan command/flag baru ke tabel `curate` options
- [ ] CLAUDE.md — catatan kapan menggunakan ini (kasus `CAF-SECTIONPARSE-01`
      sebagai contoh nyata)

## Definition of Done
- Kapabilitas re-baseline `CONFLICT` ada, teruji, tidak pernah menulis isi
  file
- Ditolak untuk status selain `CONFLICT`
- 64 test lama + test baru — 100% pass
- Tidak ada perubahan ke `coderium-web-v2`/`umkm-pos` di ticket ini