# Verify Report — CAF-INIT-SINGLE-REPO

## Ticket: CAF-INIT-SINGLE-REPO
## Status: SUCCESS

Working tree belum di-commit dan belum di-push (sesuai batasan).

## Attempt Log

| # | Aksi | Hasil |
|---|---|---|
| 0 | Baseline `npm test` di `main` (0.1.7) sebelum perubahan | 78/78 lulus |
| 0 | Rekam snapshot MONOREPO dari kode `main` → `test/fixtures/snapshots/mono-pnpm.json` | terekam |
| 1 | Implement + `npm test` | 105/105 lulus |
| 1 | Diff tingkat CLI: scaffold monorepo penuh dengan kode `HEAD` vs working tree (35 file) | **GAGAL** — `.caf/workflows/piv-workflow.md` dapat baris baru `- [ ] Implementer — NOT present…` (akibat `caf-implementer` masuk `KNOWN_ROLES`) |
| 2 | Fix `src/utils/read-agent-roster.js:19, 49-57` (role `singleRepoOnly` hanya muncul kalau file-nya ada); `piv-workflow.md` + `agent-handoff.md` ditambahkan ke snapshot, snapshot direkam ulang dari kode `HEAD` (bagian lama diverifikasi identik dulu) | `npm test` 105/105; diff 35 file MONOREPO = kosong |

2 attempt dari maksimal 3.

## Acceptance Criteria

- [x] **AC1 — CLI di repo Nuxt single package: scaffold lengkap, tanpa error, tanpa placeholder tersisa**
  - Deteksi: `src/utils/repo-context.js:179-211` (`detectRepoContext`), app root `:155-162`.
  - Agent SINGLE_REPO: `src/commands/agents.js:278-291` (`buildSingleRepoCandidates`), cabang `:340-366`.
  - Validasi pasca-render: `src/utils/placeholder-check.js:33-42`, dipanggil dari `src/util.js:59`.
  - Test: `test/single-repo-scaffold.test.js:83` (Setup + Agents + Task Completion + Workflow pada
    salinan `test/fixtures/single-nuxt`), `:125`.
  - "Tanpa placeholder" = tidak ada `{{…}}` di luar token runtime (Keputusan 1A). Yang tersisa di
    output hanya `{{TICKET-ID}}` (AGENTS.md, `.caf/tasks/README.md`) dan `{{feature-name}}`
    (`caf-planner.md`).
- [x] **AC2 — Hasil MONOREPO identik dengan sebelum perubahan**
  - Test snapshot: `test/repo-context.test.js:80` (deteksi + 16 file ter-render, direkam dari `HEAD`).
  - Manual: scaffold monorepo penuh (Setup, Agents semua role, `/caf-run-pipeline`, `/caf-fix-review`,
    `/caf-review`, Task Completion, Workflow) dengan kode `HEAD` vs working tree → `diff -r` 35 file
    kosong. Satu-satunya beda ada di konsol: baris baru `mode: MONOREPO`.
- [x] **AC3 — `--mode` berfungsi dan terdokumentasi di `--help`/README**
  - Flag: `src/index.js:16-22, 63, 136, 183`; diteruskan lewat `src/commands/scaffold.js` ke semua target.
  - README: `README.md:107, 110-125, 146, 193`.
  - Test: `test/repo-context.test.js:105, 119, 130`; `test/single-repo-scaffold.test.js:291` (CLI nyata:
    `--help` tiga command, override dua arah, nilai tidak valid → exit ≠ 0).
- [x] **AC4 — CAF.md memuat Langkah 2b dan `{{REPO_MODE}}`**
  - `CAF.md:38` (Langkah 2b), `:42` (tabel), `:791` (Lampiran A); rujukan di `:308`, `:416`.
- [x] **AC5 — Semua test baru lulus** (27 test baru, total 105)
  - single package → SINGLE_REPO, 1 app: `test/repo-context.test.js:34`
  - pnpm monorepo → MONOREPO + regression: `:67`, `:80`
  - `--mode` mengalahkan deteksi: `:105`, `:119`
  - output SINGLE_REPO tanpa placeholder: `test/single-repo-scaffold.test.js:83`, `:272`
  - fallback package manager dari lockfile: `test/repo-context.test.js:138`, `:153`, `:158`
- [x] **AC6 — Slug agent tidak pernah kosong** — `src/templates/agent-md.js:27-35`; test `test/single-repo-scaffold.test.js:205`.
- [x] **AC7 — Invariant `curate sync` utuh untuk kind baru** — `implementer` di `KNOWN_KINDS`
  (`src/utils/agent-sections.js:82`), `TOOLS_BY_KIND` (`src/templates/agent-md.js:237`), Input/Output
  bercabang nyata; test byte-identik setelah sync `test/single-repo-scaffold.test.js:225`. Gate `DRIFT`
  di `agents-sync.js` tidak disentuh.

Tambahan dari ticket:
- Opsi scope per direktori (c2): `--scope` `src/index.js:65`, validasi `src/commands/agents.js:244-270`,
  render `src/templates/agent-md.js:553`, whitelist commit `src/commands/agents.js:529` +
  `src/templates/run-pipeline-command.js:215`; test `:155`, `:169`, `:179`.
- Nama fallback ke folder: `src/utils/repo-context.js:157`; test `test/repo-context.test.js:163`.
- Single package bukan warning lagi: `src/steps/02-detect-stack.js:87-103`; test `test/repo-context.test.js:53`.

## Quality Gate

| Gate | Perintah | Hasil |
|---|---|---|
| test | `npm test` (`node --test test/*.test.js`) | PASS — 105/105 |
| lint | — | **GAP: tidak ada script lint di `package.json`** |
| typecheck | — | **GAP: tidak ada script typecheck (project JS murni, tanpa `tsc`/JSDoc check)** |
| build | — | tidak ada build step (bukan gap: CLI dijalankan langsung dari `src/`) |

Tidak ada gate palsu yang dibuat.

## Deviasi dari Plan / Ticket

1. **Premis ticket.** CLI di `main` tidak gagal pada single package dan tidak punya placeholder
   `{{APP_1}}`/`{{apps_dir}}` (itu hanya di `CAF.md`). Yang diperbaiki adalah gap nyata: slug kosong,
   tidak ada implementer, scope `./**`, mode implisit, tanpa validator, tanpa test.
2. **`{{` tetap ada di output** (Keputusan 1A, disetujui): `{{TICKET-ID}}`, `{{feature-name}}` adalah
   token runtime; allowlist di `src/utils/placeholder-check.js:10`.
3. **Aturan MONOREPO lebih luas dari ticket** (Keputusan 3A): `package.json` di `apps/*`/`packages/*`
   tanpa marker tetap dianggap MONOREPO (`src/utils/repo-context.js:200`).
4. **Urutan lockfile** pnpm → yarn → bun → npm (kode lama), bukan urutan ticket; tanpa field dan tanpa
   lockfile → `null`/`TODO` meski tipe ticket non-null (Keputusan 4).
5. **`RepoContext` membawa field tambahan** (`modeSource`, `monorepoTool`, `confidence`,
   `globAppCount`; app membawa `framework`, `packageManager`) — dipakai `detectStack` dan template.
6. **Tidak ada sistem placeholder di CLI** — `{{REPO_MODE}}` hanya di `CAF.md`; di CLI berupa
   `stack.mode` + baris `Repo mode: SINGLE_REPO` di `CLAUDE.md` (`src/templates/claude-md.js:56`).
7. **Validator dipasang di `writeIfAbsent`** (semua generator, termasuk dry-run), bukan per-command.
   `export` di-opt-out (`src/commands/export.js:203`) karena menyalin file milik user.
8. **Roster workflow** (di luar plan, ditemukan saat verify): `src/utils/read-agent-roster.js` — pada
   repo ber-implementer, `caf-frontend`/`caf-backend` yang absen tidak lagi ditulis "NOT present".
9. **`CAF.md` struktur folder (`:643` dst.) tidak diberi varian SINGLE_REPO terpisah** — cukup dirujuk
   dari Langkah 2b, Layer 1 dan tabel agent. Diagram pipeline/orchestration tetap versi `{{APP_1}}`.
10. **Pesan warning baru** untuk `--mode mono` tanpa workspace package
    (`src/steps/02-detect-stack.js:89`); warning lama untuk monorepo terdeteksi tidak diubah.

## Catatan / Gap Terbuka

- **Planner `## Input` di SINGLE_REPO masih menyebut `## Frontend Tasks`/`## Backend Tasks` dan
  `caf-frontend.md`/`caf-backend.md`.** Section itu kind-only dan syncable; membuatnya mode-aware
  akan mengubah output MONOREPO atau membuat `curate sync` menimpanya. Butuh keputusan desain
  terpisah (mis. teks netral untuk dua mode).
- **caf-orchestrator belum me-route `caf-implementer`.** CLI mencetak peringatan
  (`src/commands/agents.js:350-358`); perubahan orchestrator di luar scope.
- **Mode tidak dipersistenkan** — `--mode` harus diulang di tiap run (`scaffold`, `docs`, `curate`).
- **`bun.lock`** (format teks baru Bun) belum dikenali — hanya `bun.lockb`.
- `--scope` variadic: pada bare `scaffold`, pakai bentuk koma (`--scope a,b`) agar tidak terbaca
  sebagai argumen `[target]` (terdokumentasi di `--help` dan README).
- Alur interaktif `golden-examples` dan `adr` tidak diuji otomatis (prompt bertingkat); kodenya hanya
  menerima parameter `mode` tambahan.
- Fixture baru: `test/fixtures/single-nuxt/`, `test/fixtures/mono-pnpm/`,
  `test/fixtures/snapshots/mono-pnpm.json`; helper `test/helpers/mono-snapshot.js`.

## Addendum — `--role` (follow-up setelah review, 2026-10-02)

Permintaan: project SINGLE_REPO yang jalan lewat caf-orchestrator butuh `caf-frontend.md`, bukan
`caf-implementer.md`.

- Flag `--role <implementer|frontend|backend>` di `scaffold` (`src/index.js`), diteruskan lewat
  `src/commands/scaffold.js` ke `agents()`.
- `buildSingleRepoCandidates(app, scopeDirs, role)` + `SINGLE_REPO_ROLES` di `src/commands/agents.js`:
  agent implementasi yang satu itu dibuat dengan kind `frontend`/`backend` → `caf-frontend.md` /
  `caf-backend.md`. Scope (seluruh repo atau `--scope`), verify checklist (script root, tanpa
  `--filter`) dan whitelist commit sama seperti implementer. Default tetap `implementer`.
- Role dipilih user, tidak ditebak dari framework. `--role` ditolak di MONOREPO (exit 1, tidak ada
  yang ditulis); nilai lain ditolak commander.
- Dokumen: README (tabel flag + bagian Repo mode), `CAF.md` Langkah 2b, `CLAUDE.md`.
- Test baru (3) di `test/single-repo-scaffold.test.js`: `--role frontend` end-to-end, default/
  validasi role, penolakan di MONOREPO; plus cek `--help` dan exit code di test CLI.
- Gate: `npm test` 108/108 (1 attempt). Diff scaffold monorepo penuh `HEAD` vs working tree diulang:
  35 file identik.
- Efek samping positif: dengan `--role frontend`, teks Planner `## Frontend Tasks` /
  `caf-frontend.md` jadi konsisten dengan agent yang ada. Gap Planner tetap berlaku untuk role
  `implementer`.
