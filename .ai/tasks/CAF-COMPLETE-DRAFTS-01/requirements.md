# Ticket: CAF-COMPLETE-DRAFTS-01

## Judul
Pelengkapan draft berbantuan AI (`/caf-complete-drafts`) dengan pagar deterministik (`curate --check-drafts`)

## Problem
Setelah `caf-init scaffold`, hampir semua file hasil generate masih berisi `TODO`. User ingin
memakai AI (mis. Claude) untuk melengkapinya, tanpa melanggar aturan CAF: section agent terlacak
tidak boleh diubah, script tidak boleh dikarang, dan golden example / ADR / PRD / business context
adalah keputusan manusia.

## Keputusan desain
- **CLI tidak memanggil AI.** `caf-init` meng-generate slash command yang dijalankan user di AI
  runner-nya (pola yang sama dengan `feature-catalog-sync` dan `audit-scan`), lalu menyediakan
  pemeriksaan deterministik sesudahnya. Tanpa API key, tanpa dependency baru.
- **Pembanding section terlacak = baseline manifest, bukan template.** `Input` qa/reviewer di
  monorepo memuat nama app saat generate, jadi template kind-only tidak bisa jadi acuan.
- **Baseline direkam sebelum AI bekerja.** Manifest tidak ditulis saat generate
  (`agents-sync.js`/`curate-baseline.js` saja yang menulis), sehingga agent baru berstatus
  `UNTRACKED`. Generator menawarkan `curateBaseline` (hash saja, isi file tidak diubah).
- **Batas yang jujur.** Pagar mekanis hanya untuk hal yang bisa dibuktikan kode. Kebenaran isi
  bisnis dijaga lewat instruksi "tanya dulu, kalau tidak dijawab biarkan TODO" dan review user.

## Acceptance Criteria
- [ ] AC1 — `caf-init scaffold complete-drafts` menulis `.claude/commands/caf-complete-drafts.md`,
      tidak pernah menimpa, dan `--dry-run` tidak menulis apa pun
- [ ] AC2 — Command hasil generate: sadar-mode, daftar section terlarang berasal dari
      `SYNCABLE_SECTIONS`, ada langkah STOP menunggu jawaban user, `allowed-tools` tanpa commit/push
- [ ] AC3 — Baseline ditawarkan dan direkam tanpa mengubah isi file mana pun
- [ ] AC4 — `caf-init curate --check-drafts` read-only; FAIL (exit 1) untuk: section terlacak
      berubah/dihapus, script fiktif, placeholder tersisa, path golden example tidak ada
- [ ] AC5 — Tanpa baseline: WARN, bukan lulus palsu dan bukan FAIL palsu
- [ ] AC6 — Langkah baru menjadi langkah terakhir bare `scaffold`; file output lama MONOREPO tetap identik
- [ ] AC7 — Terdokumentasi di `--help` dan README

## Di luar scope
- CLI memanggil AI langsung (`claude -p` / API).
- Validasi kebenaran isi bisnis.
- Menulis baseline otomatis saat `scaffold agents`.
- Pemeriksaan frontmatter agent (`tools:`) — tidak tercakup baseline.

## Quality gate tersedia
Hanya `npm test`. Lint dan typecheck tidak ada di `package.json` (gap, bukan gate).
