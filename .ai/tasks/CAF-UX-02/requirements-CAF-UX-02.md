## Ticket: CAF-UX-02 (internal, pra-tracker)
## Status: READY FOR PLAN

## Latar Belakang

Phase 2 dari 3 fase UX redesign. Gabungin `sync-agents` + `audit` jadi satu command
`curate`. `export` TETAP terpisah (keputusan sebelumnya — blast radius beda, risk
profile beda).

Dasar penggabungan (dari discovery Phase 1): dua-duanya sama-sama "review/extend konten
existing, never overwrite, non-destruktif" — audit itu read-only report yang temukan apa
yang perlu di-curate, sync-agents yang benerin (insert section yang hilang, per-confirm).

## Desain yang diusulkan (perlu konfirmasi via PLAN sebelum implement)

Alur natural: `curate` bare → jalankan audit report dulu (read-only), lalu KALAU ada gap
yang bisa di-sync (missing section di SYNCABLE_SECTIONS), tawarin lanjut ke sync-agents
flow (per-section confirm, existing behavior TIDAK berubah). Dua flag buat kasus spesifik:
- `curate --audit-only` — cuma report, exit code 1 kalau ada gap wajib (persis behavior
  `audit` sekarang, buat dipakai di CI gate — JANGAN ubah exit-code semantic ini)
- `curate --sync-only` — skip audit report, langsung ke sync-agents flow (buat orang yang
  udah tau mau sync, gak perlu liat report dulu)

Sesuai keputusan approach interactive: **default non-interaktif kalau ada flag eksplisit**
(`--audit-only`/`--sync-only` = non-interaktif penuh), **interaktif cuma kalau kosong**
(`curate` bare = audit report + tanya lanjut sync per-section, sesuai UX sync-agents yang
udah ada).

## Scope

**In scope:**
- Command baru `curate` yang gabungin fungsi `audit` + `sync-agents`
- Flag `--audit-only`, `--sync-only`
- Behavior audit report DAN sync-agents flow itu sendiri TIDAK berubah — cuma cara
  aksesnya yang digabung
- Update semua referensi ke nama command lama (`audit`, `sync-agents`) — sama kelas resiko
  kayak Phase 1, WAJIB grep-audit final

**Eksplisit di luar scope:**
- `export` — tetap terpisah, gak disentuh
- Phase 3 (`scaffold`)
- Perubahan logic audit/sync-agents itu sendiri di luar cara aksesnya

## Acceptance Criteria

### AC1 — Command `curate` baru
- [ ] `curate` bare: audit report dulu, lalu (kalau ada gap syncable) tawarin lanjut ke
      sync-agents flow interaktif
- [ ] `curate --audit-only`: persis behavior `audit` sekarang (termasuk exit code 1 kalau
      ada gap wajib — WAJIB dites eksplisit, ini dipakai CI gate)
- [ ] `curate --sync-only`: persis behavior `sync-agents` sekarang

### AC2 — Command lama dihapus, referensi diupdate
- [ ] `audit`/`sync-agents` sebagai command terpisah dihapus dari CLI
- [ ] Update SEMUA referensi (README, CAF.md, error message hardcoded, dan APAPUN lain
      yang ketemu pas grep — jangan cuma andalkan daftar dari discovery lama, itu discovery
      buat `reference-docs`, bukan buat `audit`/`sync-agents`, kemungkinan ada titik beda)
- [ ] Grep-audit final wajib, sama seperti Phase 1

### AC3 — Verifikasi fungsional
- [ ] `curate --audit-only` di scratch repo dengan gap sengaja dibuat → exit code 1,
      output report SECARA STRUKTURAL identik (gaps yang sama, layer yang sama,
      exit-code semantic yang sama) dengan `audit` versi lama — BUKAN byte-for-byte,
      karena string "next command" di report emang harus berubah jadi
      `caf-init curate --sync-only` (nama command lama udah gak ada)
- [ ] `curate --sync-only` di scratch repo dengan section hilang sengaja → behavior
      identik sama `sync-agents` versi lama (per-confirm, sync-state.json ke-update)
- [ ] `curate` bare end-to-end: report muncul dulu, lanjut ke sync flow kalau user setuju
- [ ] **Exit-code khusus mode bare/`--sync-only`**: WAJIB `undefined`/0 di akhir proses,
      GAK PEDULI hasil internal `audit()` — reset ini terjadi di awal (begitu tau
      `mode !== 'audit-only'`), bukan "nanti direset setelah sync selesai". Test eksplisit:
      jalankan `curate` bare di scratch dengan gap yang SENGAJA TIDAK di-fix user (user
      declined semua tawaran sync) → exit code tetap harus 0/undefined, bukan 1

## Non-negotiable constraints
- Exit code semantic `--audit-only` TIDAK boleh berubah (CI gate bergantung ke ini)
- `sync-agents` behavior (never overwrite, per-confirm, decision persisted) TIDAK berubah
- Grep-audit final wajib sebelum declare done