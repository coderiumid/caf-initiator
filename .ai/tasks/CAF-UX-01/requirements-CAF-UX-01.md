## Ticket: CAF-UX-01 (internal, pra-tracker)
## Status: READY FOR IMPLEMENT (discovery udah cukup dari laporan sebelumnya, gak perlu
## PLAN terpisah — scope-nya kecil dan lokasinya udah diketahui persis)

## Latar Belakang

Phase 1 dari 3 fase UX redesign `caf-init` (docs → curate → scaffold, urutan disepakati).
Ini yang paling kecil: `reference-docs` command di-rename jadi `docs`. TIDAK ada
perubahan fungsional/behavior — murni rename CLI command name.

## Scope

**In scope:** rename command `reference-docs` → `docs`, update SEMUA titik yang
mereferensikan nama lama (dari Bagian 4 discovery report sebelumnya):
- `audit.js` — `syncCommand` string yang nyetak `'caf-init reference-docs'` sebagai
  instruksi ke user
- `README.md` — dokumentasi command
- `CAF.md:294` — referensi command
- Cek ulang: apakah ada pesan error/log lain yang hardcode `reference-docs` yang belum
  ke-list di discovery report (grep ulang buat mastiin, jangan cuma percaya list lama)

**Eksplisit di luar scope:**
- Perubahan behavior/fungsi `docs` command itu sendiri (output, prompt, dst — semua tetap
  sama persis kayak `reference-docs` sekarang)
- Phase 2 (`curate`) dan Phase 3 (`scaffold`)
- Backward-compat alias untuk nama lama — TIDAK dibuat, karena Bagian 4 discovery
  konfirmasi gak ada CI/script eksternal yang gantung ke nama lama

## Acceptance Criteria

### AC1 — Rename command
- [ ] Definisi command di commander (atau setara) diganti dari `reference-docs` ke `docs`
- [ ] Semua flag/opsi yang ada sekarang (`--include`, `--feature`, dst) tetap sama persis

### AC2 — Update semua referensi
- [ ] `audit.js` syncCommand string diupdate
- [ ] `README.md` diupdate
- [ ] `CAF.md:294` diupdate
- [ ] Grep ulang seluruh repo untuk `reference-docs` (case-sensitive dan tidak), pastikan
      nol referensi tersisa yang seharusnya diupdate (bedakan dari referensi yang memang
      historical/changelog kalau ada)

### AC3 — Behavior tidak berubah
- [ ] Jalankan `docs` command di scratch repo, konfirmasi output identik persis
      (file yang sama, isi yang sama, prompt yang sama) dengan `reference-docs` versi lama

## Non-negotiable constraints
- Verifikasi fungsional: jalankan nyata, bukan cuma baca kode
- Grep-audit final wajib sebelum declare done — ini kelas bug yang udah 3x kejadian sesi
  ini (nama agent, path, sekarang berpotensi nama command), jangan sampai jadi yang keempat