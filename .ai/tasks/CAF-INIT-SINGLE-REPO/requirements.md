# Ticket: CAF-INIT-SINGLE-REPO

## Judul
Dukungan mode `SINGLE_REPO` eksplisit di caf-initiator (detektor terpusat, `--mode`, template per mode, validasi placeholder)

## Problem (hasil telusur — berbeda sebagian dari premis ticket)

Premis ticket: pada repo single package deteksi gagal, daftar app kosong, placeholder
`{{APP_1}}`/`{{APP_2}}`/`{{apps_dir}}` tidak terisi, scaffold berhenti/rusak.

Hasil reproduksi di fixture Nuxt 3 single package (`website-cms-v2`, `pnpm-lock.yaml`, tanpa
workspaces) pada `main` (0.1.7):

- `scaffold` (Setup) **tidak gagal**: `monorepo: no`, `apps found: 1 — website-cms-v2 (.) — Nuxt`,
  `CLAUDE.md` ter-render `Type: single app`. Fallback single package sudah ada di
  `src/steps/02-detect-stack.js:180-189`.
- `{{APP_1}}`/`{{APP_2}}`/`{{apps_dir}}` **tidak ada di kode CLI** — template CLI adalah template
  literal JS, bukan sistem placeholder. Token itu hanya ada di `CAF.md` (alur "AI membaca
  dokumen"): `CAF.md:251, 274-289, 381-388, 480-483, 565, 580, 599, 619-638, 665, 756-758`.
  Jadi gejala "placeholder tidak terisi" berasal dari alur dokumen, bukan alur CLI.

Yang benar-benar rusak / kurang di CLI untuk single package:

1. **Slug agent kosong** — `agentSlug('implementation', { path: '.' })` menghasilkan `""`
   (`src/templates/agent-md.js:6-13, 21-24`; terverifikasi). Kalau app tunggal tidak di-assign ke
   `frontend`/`backend` lalu dipilih di "extra apps", file ditulis sebagai `.claude/agents/.md`
   dengan frontmatter `name:` kosong.
2. **Tidak ada jalur "implementer"** — `src/commands/agents.js:61` (`FIXED_ROLES`) dan `:76-93`
   (`pickRoleApps`) memaksa app tunggal dipilih sebagai `frontend` lalu `backend` lewat dua prompt
   multiselect. Kalau dilewati, tidak ada agent implementasi sama sekali.
3. **Scope ter-render `./**`** — `src/commands/agents.js:156`, `src/templates/agent-md.js:539`;
   commit whitelist `/caf-run-pipeline` jadi `` `./` `` (`src/templates/run-pipeline-command.js:212`).
4. **Mode tidak eksplisit & tidak bisa di-override** — `isMonorepo` dihitung inline
   (`02-detect-stack.js:178`), tidak ada `--mode` (`src/index.js:27-50`).
5. **Single package diperlakukan sebagai warning** — `02-detect-stack.js:210-215` mencetak
   `warning: ... treating repo as single-package`. Seharusnya bukan warning.
6. **Tidak ada validasi pasca-render** dan **tidak ada test sama sekali** untuk deteksi stack
   (`test/` hanya mencakup curate/section).
7. `CAF.md` tidak punya langkah penentuan mode (`CAF.md:29-36`) dan Lampiran A tanpa `{{REPO_MODE}}`.

## Semua titik yang mengasumsikan monorepo

| # | File:baris | Asumsi | Aksi |
|---|---|---|---|
| 1 | `src/steps/02-detect-stack.js:6-11` | daftar marker monorepo | pindah ke detektor terpusat |
| 2 | `src/steps/02-detect-stack.js:29-39` | deteksi package manager | pindah ke detektor terpusat, urutan tetap |
| 3 | `src/steps/02-detect-stack.js:126-161` | `findApps` tebak `apps/*`, `packages/*` (`:135-138`) | hanya jalan di MONOREPO |
| 4 | `src/steps/02-detect-stack.js:166-232` | `isMonorepo` inline `:178`, fallback single `:180-189`, log `:193`, warning `:210-215` | delegasi ke detektor, tambah `mode`, hapus warning single |
| 5 | `src/commands/agents.js:61` | `FIXED_ROLES = frontend/backend` | cabang SINGLE_REPO (lihat Keputusan 2) |
| 6 | `src/commands/agents.js:76-93` | `pickRoleApps` prompt dua role | SINGLE_REPO: lewati |
| 7 | `src/commands/agents.js:95-121` | `pickExtraApps` (app di luar role) | SINGLE_REPO: tidak dipanggil |
| 8 | `src/commands/agents.js:156` | scope `` `${path}/**` `` → `./**` | SINGLE_REPO: scope repo / `--scope` |
| 9 | `src/commands/agents.js:339, 345` | `stack.isMonorepo ? readPackageName : null` | tetap (sudah benar) |
| 10 | `src/commands/agents.js:416-418` | `appPaths` → `['.']` | SINGLE_REPO: pakai daftar scope |
| 11 | `src/templates/agent-md.js:6-13, 21-24` | `slugifyAppPath` strip `apps/`/`packages/`; `.` → `""` | guard path `.` |
| 12 | `src/templates/agent-md.js:538-549` | `buildScopeSection` `` `${path}/**` `` | cabang scope per direktori |
| 13 | `src/templates/run-pipeline-command.js:210-218` | whitelist `` `${appPath}/` `` → `./` | render per direktori scope |
| 14 | `src/templates/claude-md.js:9-28, 48, 53-55` | `verifyNote`, baris Type, `## Apps` berisi `` `.` `` | SINGLE_REPO: tampilkan nama + mode |
| 15 | `src/commands/golden-examples.js:67-77, 95, 121, 159` | `pickApp`; path `.` → tanpa subfolder | sudah benar — hanya dikunci test |
| 16 | `src/commands/audit.js:96-103` | loop `stack.apps`, `.` → root golden-examples | sudah benar — tidak diubah |
| 17 | `src/commands/task-completion.js:20-22, 53` | `!isMonorepo` → whole repo | sudah benar — tidak diubah |
| 18 | `src/commands/adr.js:30` | `apps.length <= 1` → whole repo | sudah benar — tidak diubah |
| 19 | `src/commands/reference-docs.js:22-27` | FE+BE dalam satu repo | sudah benar — tidak diubah |
| 20 | `src/utils/decision-signatures.js:9-16` | ADR monorepo tool hanya kalau ada | sudah benar — tidak diubah |
| 21 | `src/utils/canonical-sections.js:35` | `buildClaudeMd({ isMonorepo: false, apps: [] })` untuk header | header tidak boleh berubah |
| 22 | `src/index.js:27-67` | tidak ada `--mode`; `explicitGlobs: undefined` `:56` | tambah `--mode`, `--scope` |
| 23 | Pemanggil `detectStack` tanpa mode: `setup.js:21`, `golden-examples.js:82`, `adr.js:47`, `agents.js:254`, `task-completion.js:43`, `feature-catalog-sync.js:32`, `reference-docs.js:109`, `audit.js:291` | tiap command deteksi ulang sendiri | teruskan `mode` |
| 24 | `README.md:94` | menyebut `--workspace-glob` yang tidak ada di `src/index.js` | perbaiki sekalian dokumentasi `--mode` |
| 25 | `CAF.md:29-36, 251, 274-289, 381-388, 473-483, 565-599, 619-638, 665, 756-758` | `{{APP_N}}`, `{{apps_dir}}` tanpa varian single | Langkah 2b + Lampiran A |

## Desain

**Detektor terpusat** — file baru `src/utils/repo-context.js`, `detectRepoContext({ dir, mode })`
(murni, tanpa `console.log`), mengembalikan `{ mode, pkgManager, apps }` sesuai interface ticket
(app tetap membawa `framework`/`packageManager` sebagai field tambahan karena dipakai template).
`detectStack` memanggilnya dan tetap mengembalikan bentuk lama (`isMonorepo`, `monorepoTool`,
`packageManager`, `apps`, `database`, `confidence`) + `mode` — pemanggil lama tidak pecah.

**Flag** — `--mode <single|mono>` di `scaffold` (bare + semua target), `docs`, `curate`; nilai
lain → error + exit 1. `--scope <dirs...>` di `scaffold` (dipakai target `agents`, SINGLE_REPO saja).

**Validasi pasca-render** — `src/utils/placeholder-check.js`, dipanggil sebelum tulis di jalur
`writeIfAbsent` generator; gagal dengan pesan `unresolved placeholder {{X}} in <file>`. Dry-run
ikut tervalidasi (lewat helper yang sama).

## Keputusan yang butuh persetujuan

1. **`{{TICKET-ID}}` vs aturan "tidak boleh ada `{{`".** Output hari ini sengaja memuat token
   runtime literal: `{{TICKET-ID}}` (`src/templates/agents-md.js:36`, `tasks-readme.js:11,16`,
   `reference-docs-md.js:124`) dan `{{feature-name}}` (`agent-md.js:139`). Token ini bukan
   placeholder generate-time; diisi per ticket saat runtime.
   - **A (rekomendasi):** validator pakai allowlist token runtime (`TICKET-ID`, `feature-name`,
     `slug`, `DATE`, `NUMBER`); test memeriksa "tidak ada `{{…}}` di luar allowlist". Output
     MONOREPO byte-identik.
   - B: ganti jadi `{TICKET-ID}` di semua mode → test literal `{{` lulus, tapi output MONOREPO
     berubah (melanggar batasan).
   - C: ganti hanya di SINGLE_REPO → teks bercabang per mode tanpa alasan fungsional.
2. **Nama agent "implementer".** `agents.js:56-60` menyatakan caf-orchestrator hanya mengenal
   `caf-frontend`/`caf-backend` dan melarang role ketiga.
   - **A (rekomendasi):** kind baru `implementer` → `caf-implementer.md`, sesuai ticket. Wajib
     masuk `KNOWN_KINDS` + `TOOLS_BY_KIND` + cabang nyata di tiap builder `SYNCABLE_SECTIONS`
     (aturan CLAUDE.md, kalau tidak → misdeteksi/DRIFT palsu). CLI cetak peringatan bahwa
     orchestrator belum me-route role ini sampai orchestrator di-update.
   - B: SINGLE_REPO auto-assign app tunggal ke `frontend`/`backend` dari framework
     (Nuxt → frontend). Kompatibel dengan orchestrator hari ini, tapi nama file bukan
     "implementer" dan framework tak dikenal tetap harus ditanya.
3. **Aturan MONOREPO.** Hari ini `isMonorepo = marker || workspaces || glob tebakan
   `apps/*`,`packages/*` menemukan package.json` (`02-detect-stack.js:178`). Ticket: hanya marker.
   - **A (rekomendasi):** pertahankan glob tebakan sebagai sinyal MONOREPO tambahan → nol
     perubahan untuk repo yang hari ini terdeteksi monorepo. Dicatat sebagai deviasi.
   - B: ikuti ticket persis → repo tanpa marker tapi punya `apps/*/package.json` pindah ke
     SINGLE_REPO (perubahan perilaku jalur monorepo).
4. **Urutan lockfile.** Kode: pnpm → yarn → bun → npm. Ticket: pnpm → npm → yarn → bun. Beda hanya
   kalau ada >1 lockfile. Rekomendasi: pertahankan urutan kode. Tanpa `packageManager` dan tanpa
   lockfile → tetap `null` → `TODO` (tidak menebak), walau tipe ticket non-null.
5. **Bentuk opsi c2.** Rekomendasi: `--scope <dir...>` (mis. `--scope domain application
   infrastructure`); direktori yang tidak ada → error. Default tanpa flag: satu scope seluruh
   repo. Dipakai di Scope `caf-implementer` dan whitelist commit `/caf-run-pipeline`. Di MONOREPO
   flag ditolak dengan pesan jelas.
6. **`{{REPO_MODE}}`.** CLI tidak punya sistem placeholder, jadi: field `mode` di hasil deteksi +
   baris `Repo mode: SINGLE_REPO` di `CLAUDE.md` **hanya** pada SINGLE_REPO (MONOREPO
   byte-identik); `{{REPO_MODE}}` ditambahkan ke `CAF.md` Lampiran A + Langkah 2b.

## Acceptance Criteria

- [ ] AC1 — CLI di fixture Nuxt single package: scaffold lengkap, tanpa error, tanpa placeholder tersisa (per Keputusan 1)
- [ ] AC2 — Output MONOREPO byte-identik dengan sebelum perubahan (snapshot dari `main` vs sesudah)
- [ ] AC3 — `--mode single|mono` mengalahkan deteksi; tampil di `--help` dan README
- [ ] AC4 — `CAF.md` memuat "Langkah 2b — Tentukan Mode Repo" dan baris `{{REPO_MODE}}` di Lampiran A
- [ ] AC5 — Test baru lulus: single fixture, pnpm monorepo regression, override `--mode`, tanpa `{{`, fallback lockfile
- [ ] AC6 — Slug agent tidak pernah kosong untuk path `.`
- [ ] AC7 — Invariant `curate sync` (hanya menulis `DRIFT`) utuh; kind baru punya test "file tidak berubah setelah sync"

## Di luar scope

- Perubahan caf-orchestrator agar me-route `caf-implementer`.
- Persistensi mode ke file config (mode ditentukan ulang tiap run; `--mode` harus diulang).
- Dukungan `bun.lock` (format teks baru) — hanya dilaporkan.
- Non-JS repo (tanpa `package.json`).

## Quality gate tersedia

`package.json` hanya punya `test` (`node --test test/*.test.js`). **Lint dan typecheck tidak
ada** → dilaporkan sebagai gap, tidak dibuat gate palsu. Baseline: 78 test lulus di `main`.
