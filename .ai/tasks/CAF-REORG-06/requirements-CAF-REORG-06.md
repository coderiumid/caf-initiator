## Ticket: CAF-REORG-06 (internal, pra-tracker)
## Status: READY FOR PLAN

## Latar Belakang

4 item backlog `caf-initiator` yang sudah lama tercatat, digabung jadi satu checkpoint atas
pilihan eksplisit (bukan digabung karena related secara kode — cuma AC2 yang dua
sub-itemnya related satu sama lain). UX redesign `caf-init` (7 subcommand →
`scaffold`/`curate`/`docs`) SENGAJA tidak masuk sini — itu jauh lebih besar, checkpoint
terpisah kalau nanti digarap.

## Scope

**In scope:** AC1-AC4 di bawah, semua di repo `caf-initiator`. AC1 dan AC2 juga perlu
addendum kecil ke `umkm-pos` (repo yang udah kena dampak, terpisah dari perbaikan
generator-nya).

**Eksplisit di luar scope:**
- UX redesign `caf-init` (`scaffold`/`curate`/`docs`)
- `caf-orchestrator-cms` (04C, sudah diputuskan skip)
- Duplicate jobId investigation (item backlog terpisah, gak terkait `caf-initiator`)
- Log cosmetic prefix di `caf-orchestrator` (item backlog terpisah)

## Acceptance Criteria

### AC1 — `.gitignore` untuk `.caf/tasks/`
- [ ] Cek dulu: apakah `caf-initiator` men-generate `.gitignore` project, atau cuma
      append ke yang udah ada? Investigasi struktur nyata sebelum implement.
- [ ] Pattern yang diinginkan: ignore subfolder per-ticket (`.caf/tasks/*/`), TAPI
      `tasks/README.md` tetap ke-track git (`!.caf/tasks/README.md`)
- [ ] `writeIfAbsent`-style safety: kalau `.gitignore` udah ada, append tanpa duplicate
      entry kalau dijalankan berkali-kali
- [ ] Addendum kecil ke `umkm-pos`: tambahkan pattern yang sama ke `.gitignore` repo itu
      juga (perbaikan generator gak retroactive ke project yang udah di-generate)

### AC2 — `KNOWN_ROLES`/`ARTIFACT_BY_ROLE` lengkapi `pm`/`ux-designer`
- [ ] `read-agent-roster.js` — `KNOWN_ROLES` tambah `pm`, `ux-designer`
- [ ] `agent-handoff-md.js` — `ARTIFACT_BY_ROLE` tambah key `pm`, `ux-designer` dengan
      artifact yang sesuai (kemungkinan `prd.md`/`flow.md` per Layer 3 discovery, konfirmasi
      dulu ke `CAF.md` sebelum nulis)
- [ ] WAJIB dua-duanya sekaligus, sesuai catatan lama — kalau cuma satu yang dibenerin,
      itu bikin gap baru, bukan nutup gap lama
- [ ] Test/verifikasi: `workflow()` yang baca roster untuk role ini sekarang jalan benar,
      gak fallback ke behavior yang salah

### AC3 — Golden-examples pattern-matching, dukung konvensi nama file
- [ ] Investigasi struktur `PATTERN_CATEGORIES` yang ada sekarang (folder-literal based)
- [ ] Desain tambahan: dukung deteksi berbasis suffix nama file (`*.controller.ts`,
      `*.service.ts`, `*.repository.ts`, dst) sebagai fallback/tambahan, BUKAN pengganti
      deteksi folder-based yang sudah ada
- [ ] Jangan hardcode spesifik-NestJS — desain supaya cukup generic buat stack lain juga
      (laporkan dulu rancangan sebelum implement, ini butuh judgment call)
- [ ] Verifikasi ke `umkm-pos` nyata: kategori Controller/Repository yang sebelumnya
      kelewat sekarang harus kedeteksi

### AC4 — `reference-docs.js` vs prinsip "tidak menulis ke `docs/`" [PERLU INVESTIGASI DULU]
- [ ] Cek isi nyata yang ditulis `reference-docs.js` sekarang — placeholder kosong, atau
      skeleton dengan struktur/header yang berguna?
- [ ] **Rekomendasi awal saya (bukan keputusan final):** karena `.caf/knowledge/INDEX.md`
      (dari CAF-REORG-01) udah berfungsi sebagai jembatan ke `docs/` (status ✓/✗ per
      dokumen) tanpa melanggar prinsip "tidak pernah menulis ke docs/", kemungkinan
      `reference-docs.js` udah redundant — cukup dihapus behavior nulis ke `docs/`-nya,
      biarkan `INDEX.md` yang jadi satu-satunya mekanisme bridging
- [ ] TAPI kalau ternyata skeleton yang ditulis `reference-docs.js` punya value asli
      (bukan cuma file kosong — ada struktur section yang bermanfaat), opsi lain: pindahkan
      isinya ke tempat yang gak melanggar prinsip (misal `.caf/knowledge/templates/`,
      direferensikan dari `INDEX.md` sebagai starting point yang bisa di-copy manual)
- [ ] Keputusan final BARU diambil setelah lihat isi kode asli — laporkan dulu sebelum
      pilih opsi mana

## Non-negotiable constraints
- `writeIfAbsent` tidak boleh diubah behaviornya
- TODO fields tetap TODO
- Verifikasi fungsional wajib (jalankan nyata ke scratch/umkm-pos, bukan cuma baca kode)
- AC3 dan AC4 involve judgment call desain — kalau ambigu, laporkan dan tunggu keputusan,
  jangan pilih sendiri