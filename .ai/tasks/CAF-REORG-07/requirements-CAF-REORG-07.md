## Ticket: CAF-REORG-07 (internal, pra-tracker)
## Status: READY FOR IMPLEMENT (scope kecil — investigasi ringan + fix satu putaran)

## Latar Belakang

`frontend`/`backend` dikecualikan dari `CAF_PREFIXED_KINDS` sejak CAF-REORG-01, sengaja,
nunggu `caf-orchestrator` diupdate bareng (Checkpoint 4). Checkpoint 4B sudah selesai —
`caf-orchestrator` sekarang full cutover, cuma kenal `caf-frontend`/`caf-backend`. Karena
perubahan itu ada di source code `caf-orchestrator` sendiri (bukan config per-project),
setiap instance `caf-orchestrator` baru yang di-clone dari sekarang otomatis udah expect
nama prefixed — jadi constraint "tunggu koordinasi" udah gak relevan lagi.

Project BARU yang di-`scaffold` hari ini masih dapat `frontend.md`/`backend.md` tanpa
prefix — bakal gagal spawn kalau disambungkan ke `caf-orchestrator` manapun yang udah
di-cutover, persis insiden `GAN-60` pertama.

## Scope

**In scope:**
- Tambah `frontend`, `backend` ke `CAF_PREFIXED_KINDS` di `agent-md.js`
- Investigasi ringan: cari tempat lain di `caf-initiator` yang mungkin masih
  special-case literal `frontend`/`backend` DI LUAR array membership check ini (misal di
  golden-examples app-detection, template content, dokumentasi yang di-generate) — jangan
  asumsi cuma 1 titik ini doang, sesuai pola yang berulang kali kejadian sesi ini
- Update referensi dokumentasi (`README.md`, `CAF.md`) kalau ada yang eksplisit nyebut
  `frontend.md`/`backend.md` gak pakai prefix sebagai contoh

**Eksplisit di luar scope:**
- `caf-orchestrator-cms` — beda konteks (`website-cms-v2` gak punya Backend Agent),
  gak otomatis kena dampak ini
- Perubahan lain di luar penambahan prefix ini

## Acceptance Criteria

### AC1 — Investigasi
- [ ] Konfirmasi: apakah cuma `CAF_PREFIXED_KINDS` array yang perlu diubah, atau ada
      logic lain yang literal cek string `'frontend'`/`'backend'` buat behavior khusus
      (bukan cuma exclusion dari prefix) yang perlu ikut disesuaikan
- [ ] Cek dampak ke `golden-examples` (app-detection pakai nama app, bukan nama role —
      pastikan gak ketuker)

### AC2 — Fix
- [ ] `frontend`, `backend` masuk `CAF_PREFIXED_KINDS`
- [ ] Update dokumentasi yang perlu

### AC3 — Verifikasi fungsional
- [ ] Generate scratch project baru dari nol, konfirmasi `.claude/agents/` sekarang
      berisi `caf-frontend.md`/`caf-backend.md` (bukan tanpa prefix)
- [ ] Konfirmasi 10 agent semua konsisten prefix sekarang (8 lama + 2 baru)
- [ ] Regression check: `caf-init curate --audit-only` di scratch itu, 0 gap wajib

## Non-negotiable constraints
- Verifikasi fungsional wajib, bukan cuma baca kode
- Ini TIDAK retroactive ke `umkm-pos` (udah di-handle manual lewat 04A) — cuma buat
  project baru ke depan