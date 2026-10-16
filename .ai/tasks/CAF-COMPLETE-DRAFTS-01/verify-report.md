# Verify Report — CAF-COMPLETE-DRAFTS-01

## Ticket: CAF-COMPLETE-DRAFTS-01
## Status: SUCCESS

Dikerjakan di branch `main`, di atas working tree CAF-INIT-SINGLE-REPO. Belum di-commit.

## Attempt Log

| # | Aksi | Hasil |
|---|---|---|
| 1 | Implement + `npm test` | 124/124 lulus (108 sebelumnya + 16 baru) |
| 1 | E2E manual di salinan `test/fixtures/single-nuxt`: scaffold → `complete-drafts` → `curate --check-drafts` | 0 fail, 0 warn, exit 0 |
| 1 | Pelanggaran disengaja (edit `## Retry Logic`, script `lint:fix`/`type-check`, `{{APP_1}}`, path fiktif) | 4 FAIL + 1 WARN, pesan menunjuk file dan section |
| 1 | Diff scaffold monorepo penuh, kode `HEAD` vs working tree | 35 file identik |

1 attempt dari maksimal 3.

## Acceptance Criteria

- [x] **AC1 — generator menulis command, tidak menimpa, dry-run tidak menulis**
  - `src/commands/complete-drafts.js:50` (`completeDrafts`), tulis lewat `writeIfAbsentGuarded`.
  - Test: `test/complete-drafts.test.js:131`, `:153`.
- [x] **AC2 — isi command**
  - `src/templates/complete-drafts-command.js:86`; `allowed-tools` `:25`; section terlarang dari
    `SYNCABLE_SECTIONS` `:93`; STOP `:147`.
  - Test: `:89`, `:113`.
- [x] **AC3 — baseline ditawarkan, isi file tidak berubah**
  - `src/commands/complete-drafts.js:84-111`, memakai `curateBaseline` yang sudah ada.
  - Test: `:131` (pohon file sebelum/sesudah: hanya bertambah command + manifest).
- [x] **AC4 — `curate --check-drafts` read-only, FAIL untuk pelanggaran yang bisa dibuktikan**
  - `src/commands/check-drafts.js:195`; section terlacak `:60`; script `:128`; RULES.md `:168`;
    exit code `:257`. Flag: `src/index.js:148, 172-180`.
  - Test: `:181` (read-only), `:191`, `:207`, `:225`, `:241`, `:249`, `:280` (monorepo, scope per workspace).
- [x] **AC5 — tanpa baseline: WARN** — `src/commands/check-drafts.js:105-113`; test `:215`.
- [x] **AC6 — langkah terakhir chain; MONOREPO identik** — `src/commands/scaffold.js:33, 37, 132`;
  test `:126`; snapshot `test/repo-context.test.js:80` + diff manual 35 file.
- [x] **AC7 — `--help` dan README** — test `:312`; README bagian `scaffold complete-drafts` dan
  `curate --check-drafts`.

## Quality Gate

| Gate | Perintah | Hasil |
|---|---|---|
| test | `npm test` | PASS — 124/124 |
| lint | — | GAP: tidak ada script lint |
| typecheck | — | GAP: tidak ada script typecheck |

## Deviasi dari Plan

- `listDraftFiles` diletakkan di `complete-drafts.js` dan dipakai juga oleh `check-drafts.js`
  (satu inventaris untuk keduanya) — di plan belum disebut sebagai fungsi bersama.
- Tambahan cek "section terlacak dihapus" (FAIL) — tidak ada di tabel plan.
- `CHAIN_ORDER` di-export supaya bisa dites.

## Yang TIDAK terverifikasi

- **Perilaku AI saat menjalankan `/caf-complete-drafts`.** Isi command hanya diuji secara
  struktural. Apakah Claude benar-benar berhenti untuk bertanya dan tidak mengarang, hanya bisa
  dilihat dengan menjalankannya di project nyata.
- **Kebenaran isi bisnis** tidak dicek oleh apa pun, by design.

## Keterbatasan yang diketahui

- `allowed-tools` mengizinkan `caf-init curate` dan `npx caf-init curate`. Kalau `caf-init`
  dijalankan dari source (`node <path>/src/index.js`), AI akan diminta izin atau meminta user
  menjalankan pengecekan sendiri.
- Frontmatter agent (`tools:`) tidak tercakup baseline; perubahan di situ hanya terlihat di diff.
- Cek path di prosa hanya WARN dan hanya untuk token ber-backtick yang berbentuk path file.
- Kalau user menolak tawaran baseline, editan section terlacak tidak terdeteksi (dilaporkan WARN).
- Langkah baru menambah satu prompt konfirmasi di akhir bare `scaffold` untuk kedua mode.
