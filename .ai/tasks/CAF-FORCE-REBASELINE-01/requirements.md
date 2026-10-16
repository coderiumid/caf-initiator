# Ticket: CAF-FORCE-REBASELINE-01 — Re-baseline Paksa untuk Section `CONFLICT`

## Latar Belakang
`curate baseline` saat ini cuma menangani section berstatus `UNTRACKED`
(belum pernah ada baseline sama sekali). Section berstatus `CONFLICT` (baik
`current` maupun `template` berbeda dari baseline lama) tidak tertangani
sama sekali — `curate sync` sengaja menolak menulisnya (safety invariant),
tapi tidak ada mekanisme untuk keluar dari status `CONFLICT` selain edit
manifest manual.

Kasus konkret: `caf-auditor.md` `## Report Format` di `coderium-web-v2` dan
`umkm-pos` berstatus `CONFLICT` karena baseline lamanya direkam memakai
parser yang buggy (`CAF-SECTIONPARSE-01`, sudah di-fix) — hash baseline itu
dari konten yang ke-truncate, bukan konten asli. Sudah diverifikasi (`git
log`/`git show` di kedua repo): tidak ada edit asing di antara baseline lama
dan sekarang, isi section itu memang sengaja di-translate ke English oleh
user. Aman untuk direkam ulang sebagai baseline baru.

## Apa yang Diminta
Command/flag baru untuk secara eksplisit merekam ulang baseline sebuah
section yang berstatus `CONFLICT`, TANPA mengubah isi file — sama seperti
`curate baseline` untuk `UNTRACKED`, tapi untuk kasus yang sudah punya
baseline (lama) dan perlu ditimpa secara sadar.

## Acceptance Criteria
- [ ] Ada cara eksplisit untuk re-baseline section `CONFLICT` (command baru,
      atau flag tambahan di `curate baseline` — putuskan di Task 1 mana yang
      lebih konsisten dengan desain existing)
- [ ] Re-baseline TIDAK PERNAH mengubah isi file — hanya manifest (prinsip
      yang sama seperti `curate baseline` untuk `UNTRACKED`, sudah teruji di
      `CAF-CURATE-DIFF-01`)
- [ ] WAJIB ada langkah konfirmasi eksplisit sebelum re-baseline (bukan
      command yang jalan diam-diam) — mengingat ini "menerima" state
      `CONFLICT` sebagai baseline baru, keputusan yang harus disadari, bukan
      default
- [ ] Setelah re-baseline: `curate audit` melaporkan section itu `IN_SYNC`
      atau `CUSTOMIZATION` tergantung apakah current match template atau
      tidak (bukan otomatis `IN_SYNC` — itu tergantung kondisi aktual saat
      itu, jangan diasumsikan)
- [ ] TIDAK BOLEH bisa dipakai untuk section `DRIFT`/`IN_SYNC`/`UNTRACKED` —
      cuma untuk `CONFLICT` (untuk status lain, mekanisme yang sudah ada
      sudah cukup: `curate sync` untuk `DRIFT`, `curate baseline` untuk
      `UNTRACKED`)
- [ ] Regression: seluruh test suite sebelumnya (64 test) tetap 100% pass

## Eksplisit Out of Scope
- Menjalankan re-baseline ini beneran ke `coderium-web-v2`/`umkm-pos` —
  sesi terpisah, SETELAH kapabilitas ini `SUCCESS` di `caf-initiator`
- Auto-detect "section ini aman di-re-baseline karena riwayat git bersih" —
  itu keputusan manusia (seperti yang sudah dilakukan manual untuk
  `caf-auditor.md`), bukan sesuatu yang tool ini coba otomasi