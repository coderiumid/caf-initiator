# Tasks: CAF-DEVOPS-KIND-01

## Task 1 — Investigasi Scope Lengkap
- [ ] Cari SEMUA tempat yang bergantung ke `KNOWN_KINDS` — pastikan
      menambahkan `devops` ke situ tidak punya efek samping tak terduga di
      luar `detectKind()` (mis. ada logic lain yang iterate `KNOWN_KINDS`
      dengan asumsi tertentu)
- [ ] Cek builder `Input`/`Output` untuk kind `devops` — apakah mereka
      punya cabang sendiri (kayak `Allowed Tools`) atau jatuh ke fallback
      generik yang kebetulan masih masuk akal untuk devops? Ini nentuin
      apakah perlu di-guard juga atau aman dibiarkan
- [ ] Laporkan temuan sebelum lanjut Task 2 — kalau ternyata scope-nya lebih
      luas dari dugaan (mis. section lain yang belum kecek), STOP dan
      laporkan dulu

## Task 2 — Tambah `devops` ke `KNOWN_KINDS`
- [ ] Update `KNOWN_KINDS` di `agent-sections.js`
- [ ] Verifikasi `detectKind('caf-devops.md')`/`detectKind('devops.md')`
      sekarang mengembalikan `devops`

## Task 3 — Guard `Allowed Tools` (dan `Input`/`Output` Kalau Perlu, Sesuai Task 1)
- [ ] Tambahkan `devops` + section yang relevan ke guard list (pola sama
      `DISCOVERY_GUARDED_SECTIONS`)
- [ ] Update komentar di kode menjelaskan kenapa (severity keamanan, bukan
      cuma konten generik)

## Task 4 — Test
- [ ] Fixture `caf-devops.md` dengan `Allowed Tools` benar (Read+Bash) →
      `curate audit` tidak menandai `DRIFT` yang akan menimpa jadi versi
      `implementation`
- [ ] Regression: 48 test lama tetap pass
- [ ] Test byte-for-byte: kind lain (Delivery, Discovery) tidak berubah
      sama sekali akibat perubahan ini

## Task 5 — Dokumentasi
- [ ] `open-items.md` — tandai entry `devops` sebagai selesai/di-fix,
      referensikan ticket ini
- [ ] README/CLAUDE.md — catat `devops` di tabel section tracking (guarded),
      sama pola seperti Discovery

## Task 6 — Sembunyikan `devops` dari Menu Pilihan Interaktif
- [ ] Cari daftar opsi agent di `src/commands/agents.js` (interaktif prompt
      saat `caf-init scaffold agents` dijalankan tanpa flag)
- [ ] Hilangkan `devops` dari daftar pilihan yang ditawarkan ke user —
      cek dulu cara paling bersih (flag `hidden`/comment-out/filter list),
      jangan hapus definisi builder-nya (`TOOLS_BY_KIND` dst tetap ada,
      cuma nggak ditawarkan)
- [ ] Cek apakah ada jalur non-interactive (flag eksplisit, mis.
      `--agent devops` kalau ada) yang masih bisa memilih `devops` — kalau
      ada, putuskan: tetap diblokir juga, atau dibiarkan tapi dengan
      warning eksplisit ("agent ini belum matang definisinya"). Laporkan
      opsi mana yang lebih masuk akal, biarkan user putuskan kalau ambigu
- [ ] Verifikasi: jalankan `caf-init scaffold agents` (dry-run) di fixture
      test, konfirmasi `devops` tidak muncul di prompt/daftar

## Definition of Done
- `devops` dikenali benar oleh `detectKind()`
- `Allowed Tools` (dan section lain sesuai Task 1) ter-guard, tidak bisa
  ke-overwrite jadi versi `implementation`
- `devops` tidak lagi muncul di menu pilihan interaktif
- 48 test lama + test baru — 100% pass
- Tidak ada perubahan ke project manapun di luar `caf-initiator`