## Ticket: CAF-REORG-05 (internal, pra-tracker)
## Status: READY FOR PLAN

## Latar Belakang

Ditemukan saat audit CAF-REORG-01 (bukan checkpoint sebelumnya): `caf-init` sama sekali
tidak punya mekanisme untuk mendeteksi kondisi "project sudah punya `.claude/agents/` versi
lama (belum di-rename ke `caf-*`)". `writeIfAbsent` cuma cek apakah PATH BARU (`caf-planner.md`)
sudah ada — tidak pernah cek apakah PATH LAMA (`planner.md`) yang isinya sama secara
konseptual masih ada. Hasilnya: kalau `caf-init` dijalankan ulang di project yang masih
pakai nama lama, dua file akan berdampingan (`planner.md` lama + `caf-planner.md` baru
kosong/generik) — bukan migrasi, tapi duplikasi/orphan.

Ini persis skenario yang bikin CAF-REORG-03 (`umkm-pos`) harus dikerjakan manual (`git mv`
+ patch surgical) di luar `caf-init` sama sekali. Risiko ini nyata untuk project lain yang
belum di-reset, DAN tetap relevan untuk `umkm-pos` sendiri kalau `caf-init` dipakai lagi di
masa depan tanpa kehati-hatian manual yang sama.

**Scope checkpoint ini sengaja SEMPIT (Opsi A dari 2 opsi yang didiskusikan):** cuma
safety-net deteksi + refuse, BUKAN auto-migrasi. Auto-migrasi (rename+patch otomatis) butuh
judgment call yang kita lakukan manual di CAF-REORG-03 — bedain baris struktural (path/name)
vs konten custom yang harus dipreserve. Itu rawan salah kalau diotomasi asal-asalan, dan
scope-nya lebih cocok masuk checkpoint UX redesign (`scaffold`/`curate`/`docs`) yang
terpisah, karena `scaffold` sebagai command tunggal justru butuh mikirin fresh-vs-existing
dari awal desainnya.

## Scope

**In scope:**
- Deteksi: sebelum `caf-init` menulis `caf-<nama>.md`, cek apakah `<nama>.md` (tanpa
  prefix) sudah ada di lokasi yang sama
- Kalau collision terdeteksi: **STOP, jangan tulis apapun**, tampilkan pesan jelas ke user
  (nama file lama yang ketemu, saran migrasi manual/rujuk dokumentasi)
- Berlaku untuk SEMUA 8 agent yang di-prefix + 10 command yang di-prefix (bukan cuma
  `planner` sebagai contoh)

**Eksplisit di luar scope:**
- Auto-migrasi/auto-rename (itu topik checkpoint UX redesign nanti)
- Perubahan struktur command (`scaffold`/`curate`/`docs`) — checkpoint terpisah
- `frontend`/`backend` (mereka memang belum di-prefix di `caf-init`, jadi tidak relevan
  untuk collision-detection prefix — TAPI tetap perlu dicek: apakah ada skenario collision
  lain untuk dua file ini juga, misal kalau `caf-init` generate ulang dan menimpa isi
  `frontend.md`/`backend.md` existing dengan versi generik — ini beda dari collision
  nama-file, tapi sama bahayanya, masukkan sebagai bagian audit PLAN)
- KNOWN_ROLES/pattern-matching backlog (tidak berhubungan, biarkan)

## Acceptance Criteria

### AC1 — Deteksi collision untuk 8 agent prefixed
- [ ] Sebelum `writeIfAbsent(caf-<nama>.md, ...)` dipanggil, cek dulu apakah `<nama>.md`
      (tanpa prefix) exist di `.claude/agents/`
- [ ] Kalau ya: skip write, kumpulkan ke daftar "collision ditemukan", JANGAN exit langsung
      per-file (supaya user dapat laporan lengkap semua collision sekaligus, bukan stop di
      collision pertama)
- [ ] Setelah semua agent diproses: kalau ada collision, tampilkan ringkasan jelas (daftar
      file lama yang ketemu) dan **exit dengan pesan actionable** — bukan cuma warning yang
      gampang kelewat, generate process untuk agent yang collision harus berhenti

### AC2 — Deteksi collision untuk 10 command prefixed
- [ ] Sama seperti AC1, tapi untuk `.claude/commands/`

### AC3 — Audit tambahan: `frontend`/`backend` overwrite risk
- [ ] Cek: apakah `caf-init` generate ulang `frontend.md`/`backend.md` pakai `writeIfAbsent`
      (aman, tidak menimpa) atau ada jalur lain yang bisa menimpa konten existing?
- [ ] Kalau ternyata aman (`writeIfAbsent` sudah cukup karena nama filenya sama persis,
      tidak ada masalah prefix-mismatch seperti 8 agent lain) — cukup konfirmasi dan tutup,
      tidak perlu perubahan kode tambahan
- [ ] Kalau ternyata ada celah — laporkan dulu sebelum implement, jangan asumsi aman

### AC4 — Pesan error yang actionable
- [ ] Pesan collision harus menyebutkan: nama file lama yang ketemu, nama file baru yang
      SEHARUSNYA jadi tujuan, dan instruksi singkat (rujuk ke pola `git mv` + patch manual
      yang sudah divalidasi di CAF-REORG-03 — boleh link ke dokumentasi kalau ada tempatnya)
- [ ] TIDAK melakukan rename otomatis apapun — itu di luar scope

## Non-negotiable constraints
- TIDAK ada auto-migrasi di checkpoint ini — cuma detect + refuse + instruksi
- `writeIfAbsent`/`SYNCABLE_SECTIONS` behavior existing untuk kasus non-collision TIDAK
  boleh berubah — checkpoint ini nambah pengecekan baru, bukan mengubah yang sudah ada
- Verifikasi harus fungsional: jalankan `caf-init` beneran ke scratch repo yang sengaja
  dikondisikan collision (ada `planner.md` lama), buktikan behavior refuse-nya jalan nyata