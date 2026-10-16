# Tasks: CAF-INIT-SINGLE-REPO

Status: DONE — plan disetujui, implement + verify selesai. Lihat `verify-report.md` (termasuk deviasi).
Asumsi: Keputusan 1A, 2A, 3A, 4 (urutan kode), 5 (`--scope`), 6 di `requirements.md`.

## 0. Baseline (sebelum mengubah kode)
- [x] Buat fixture di `test/fixtures/`: `single-nuxt/` (package.json + `pnpm-lock.yaml`),
      `mono-pnpm/` (`pnpm-workspace.yaml` + `apps/web`, `apps/api`), `single-noname/`,
      varian lockfile (`yarn.lock`, `package-lock.json`, `bun.lockb`, field `packageManager`)
- [x] Rekam snapshot output MONOREPO dari `main` (hasil `detectStack` + render `buildClaudeMd`,
      `buildAgentMd`, `buildRunPipelineMd`) sebagai pembanding byte-identik untuk AC2

## 1. Detektor terpusat (a)
- [x] `src/utils/repo-context.js`: `detectRepoContext({ dir, mode })` → `{ mode, pkgManager, apps }`;
      pindahkan `MONOREPO_TOOL_FILES`, `detectPackageManager`, `findApps` + parser workspace
      dari `src/steps/02-detect-stack.js:6-11, 29-39, 100-161`
- [x] `name` fallback ke nama folder repo
- [x] `src/steps/02-detect-stack.js`: delegasi ke detektor, tambah `mode` di return, bentuk lama
      tetap; hapus warning single-package (`:210-215`), ganti baris log `mode: SINGLE_REPO|MONOREPO`
      di samping baris `monorepo:` lama

## 2. Flag (b, c2)
- [x] `src/index.js`: `--mode <single|mono>` di `scaffold`, `docs`, `curate`; validasi nilai
- [x] `src/index.js`: `--scope <dir...>` di `scaffold`
- [x] Teruskan `mode` ke 8 pemanggil `detectStack` (`setup.js:21`, `golden-examples.js:82`,
      `adr.js:47`, `agents.js:254`, `task-completion.js:43`, `feature-catalog-sync.js:32`,
      `reference-docs.js:109`, `audit.js:291`) lewat `scaffold.js` `TARGETS`/`runScaffoldTarget`

## 3. Template per mode (c, c2, d)
- [x] `src/templates/agent-md.js`: guard `slugifyAppPath('.')`; kind `implementer` di
      `CAF_PREFIXED_KINDS`, `TOOLS_BY_KIND`, dan cabang nyata di tiap builder section
- [x] `src/utils/agent-sections.js`: `implementer` di `KNOWN_KINDS`
- [x] `src/commands/agents.js`: cabang SINGLE_REPO — lewati `pickRoleApps`/`pickExtraApps`,
      kandidat `planner`/`implementer`/`qa`/`reviewer` (+ kandidat lain yang sudah ada), scope dari
      `--scope` atau seluruh repo; peringatan routing orchestrator
- [x] `src/templates/run-pipeline-command.js`: whitelist commit per direktori scope (tanpa `./`)
- [x] `src/templates/claude-md.js`: SINGLE_REPO — baris `Repo mode`, `## Apps` pakai nama package;
      cabang MONOREPO tidak disentuh; header `##` tidak berubah (`canonical-sections.js:35`)
- [x] `src/utils/placeholder-check.js` + pemanggilan di jalur tulis generator (dry-run ikut)

## 4. Dokumen (e)
- [x] `CAF.md`: "Langkah 2b — Tentukan Mode Repo" setelah `:36`; catatan SINGLE_REPO di Layer 1
      dan tabel agent; baris `{{REPO_MODE}}` di Lampiran A
- [ ] `CAF.md`: varian SINGLE_REPO terpisah di diagram struktur folder — TIDAK dikerjakan, cukup
      dirujuk dari Langkah 2b (lihat deviasi 9 di `verify-report.md`)
- [x] `README.md`: `--mode`/`--scope` di tabel `scaffold` (`:100-106`), `docs`, `curate`;
      hapus `--workspace-glob` yang tidak ada (`:94`)
- [x] `CLAUDE.md` repo: catat detektor terpusat + kind `implementer`

## 5. Test baru (`test/repo-context.test.js`, `test/single-repo-scaffold.test.js`)
- [x] single package tanpa workspaces → `SINGLE_REPO`, `apps.length === 1`, `path === '.'`
- [x] pnpm monorepo → `MONOREPO`, sama dengan snapshot baseline
- [x] `mode: 'single'` pada monorepo dan `mode: 'mono'` pada single mengalahkan deteksi
- [x] output scaffold SINGLE_REPO lolos validator placeholder
- [x] fallback package manager: field `packageManager` menang; tiap lockfile; tanpa keduanya → `null`
- [x] fallback nama ke nama folder
- [x] `agentSlug` tidak pernah kosong
- [x] `detectKind('caf-implementer.md') === 'implementer'`; `curate sync` pada file implementer
      yang baru di-generate → file byte-identik
- [x] `--scope` → Scope + whitelist commit per direktori; default → satu scope repo

## 6. Verify
- [x] `npm test` (satu-satunya gate yang ada; lint/typecheck = gap, dilaporkan)
- [x] E2E manual: `node src/index.js scaffold --dir <fixture> --dry-run` untuk single + mono
- [x] Diff snapshot MONOREPO sebelum/sesudah = kosong
- [x] `verify-report.md` (status, attempt log, AC + file:baris, gate, deviasi). Maks 3 retry →
      `NEEDS_HUMAN`
- [x] Tidak commit, tidak push
