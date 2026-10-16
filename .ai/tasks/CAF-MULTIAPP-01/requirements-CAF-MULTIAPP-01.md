## Ticket: CAF-MULTIAPP-01 (internal, pra-tracker)
## Status: READY FOR PLAN

## Latar Belakang

`caf-frontend`/`caf-backend` yang di-generate `caf-init scaffold agents` saat ini cuma bisa
di-assign ke **satu app** per role (`FIXED_ROLES = ['frontend', 'backend']` di
`src/commands/agents.js`, `pickRoleApps()` pakai prompt `select` single-pick). Di monorepo dengan
lebih dari satu app frontend/backend (contoh nyata: `umkm-pos` — `apps/web` + `apps/landing`
frontend, `apps/api` backend), app kedua (`apps/landing`) gak punya agent yang meng-cover-nya sama
sekali, atau harus dipaksa lewat jalur `extraApps`/kind `implementation` yang **tidak dikenal
`caf-orchestrator`** (routing otomatis via webhook Linear).

Dari sesi brainstorming (lihat riwayat percakapan), dua opsi dibahas:
- **Solusi #1** — banyak agent bernama per-app (`caf-frontend-admin`, `caf-frontend-web`, dst).
  Blast radius besar: `caf-orchestrator` (`task-router.ts`) hardcode
  `TaskAgent = 'caf-frontend' | 'caf-backend'`, section header parsing (`## Frontend Tasks`),
  dan `agents.modelOverrides` key — semua harus jadi dynamic per-slug.
- **Solusi #2 (dipilih)** — `caf-frontend`/`caf-backend` masing-masing jadi "lebih pintar": tetap
  1 agent per role, tapi scope-nya bisa cover >1 app. `caf-orchestrator` **tidak disentuh sama
  sekali** — union type, section header, dan `modelOverrides` key tetap 2 role tetap seperti
  sekarang. Task line di `tasks.md` dikasih tag app (contoh: `- [ ] (apps/web) Fix validasi
  email`) supaya agent tahu app mana yang dimaksud per task, mengikuti pola yang sudah ada di
  `implementationSection()` (`src/templates/run-pipeline-command.js`) untuk kandidat
  `extraApps`.

Checkpoint ini mengimplementasikan Solusi #2.

## Scope

**In scope:** semua perubahan di repo `caf-initiator` (generator + template + prompt agent) yang
diperlukan supaya 1 role (`frontend` atau `backend`) bisa di-assign ke lebih dari satu app, dan
agent yang dihasilkan tahu cara membaca app-tag dari `tasks.md`.

**Constraint desain wajib — additive, bukan breaking:**
- Project **non-monorepo** (1 app terdeteksi, `path: '.'`), atau role yang cuma di-assign **1
  app** di monorepo — hasil generate-nya harus **identik** dengan behavior sebelum perubahan ini
  (tanpa app-tag, tanpa list scope, tanpa section verify-checklist per-app). Ini regresi wajib
  di-cek, bukan opsional.
- Fitur multi-app baru aktif kalau role itu benar-benar di-assign >1 app.

**Eksplisit di luar scope:**
- `caf-orchestrator` — `task-router.ts` (`TaskAgent` union, `SECTION_HEADERS`), `agents.modelOverrides`
  di `caf.config.yaml` — **TIDAK ADA PERUBAHAN**. Kontraknya (2 role tetap, section header tetap
  `Frontend Tasks`/`Backend Tasks`) harus tetap valid setelah checkpoint ini.
- Solusi #1 (multi-named-agent per app) — tidak diimplementasikan.
- Jalur `extraApps`/kind `implementation` yang sudah ada (agent per-app di luar `FIXED_ROLES`,
  cuma jalan manual via `/caf-run-pipeline`) — dibiarkan seperti sekarang, tetap sebagai fallback
  terpisah, bukan digantikan.
- Migrasi retroaktif project yang sudah di-generate (misal `umkm-pos`) — checkpoint ini cuma
  mengubah generator-nya. Regenerasi/addendum manual ke `umkm-pos` boleh dilakukan sebagai bagian
  dari verifikasi (AC7), tapi bukan tujuan utama checkpoint.

## Acceptance Criteria

### AC1 — `pickRoleApps()` jadi multi-select, auto-skip kalau kandidat cuma 1
- [ ] `src/commands/agents.js` — ganti prompt `type: 'select'` per role jadi `type: 'multiselect'`
- [ ] Kalau `apps.length === 1` (dari `candidateApps()`) → **skip prompt**, auto-assign app itu
      ke role tanpa nanya (behavior lama: user gak pernah ditanya kalau cuma ada 1 kandidat app
      utuh di repo — non-monorepo persis kasus ini)
- [ ] `roleApp[role]` sekarang array app (bisa kosong `[]`, bukan lagi `null`) — update semua
      pemakai (`buildCandidates`, `implementationAppPaths`, dst — lihat AC5)

### AC2 — `buildAgentMd()` scope terima array app
- [ ] `src/templates/agent-md.js` — `candidate.scope` (dibangun di `buildCandidates()`,
      `src/commands/agents.js`) terima array app, bukan 1 app
- [ ] Render kalau `apps.length === 1`: **identik** format lama (`` `${app.path}/**` ``, single
      baris) — no drift buat project yang cuma 1 app per role
- [ ] Render kalau `apps.length > 1`: list scope per app (contoh: `` `apps/web/**`, `apps/landing/**` ``)
      + section instruksi baru: agent WAJIB baca app-tag `(app-path)` di tiap baris task
      `tasks.md`, cocokkan ke salah satu scope di atas sebelum edit file; kalau task tidak ada
      tag atau tag tidak cocok scope manapun → **STOP, tanya user**, jangan menebak (pola sama
      persis dengan `implementationSection()` di `run-pipeline-command.js`)

### AC3 — `buildVerifyChecklist()` terima array app
- [ ] `src/templates/agent-md.js` — parameter `scripts`/`packageManager`/`packageName` di
      `buildAgentMd()` jadi array `{ scripts, packageManager, packageName, appPath }` per app
      (dari `matchVerifyScripts()`/`readPackageName()` dipanggil per app di `agents.js`)
- [ ] Render kalau 1 app: **identik** format lama (1 checklist flat, tanpa header per-app)
- [ ] Render kalau >1 app: checklist dikelompokkan per app (header `#### apps/web`, `#### apps/landing`,
      dst), tiap grup isinya `verifyLine()` seperti sekarang — agent jalanin checklist app yang
      **benar-benar disentuh** di run itu, bukan wajib semua app tiap kali (instruksi ini masuk ke
      teks sebelum/sesudah checklist)

### AC4 — `caf-planner` wajib tahu kapan harus nulis app-tag
- [ ] `src/templates/agent-md.js` — `buildInputSection('planner', ...)` atau body `caf-planner.md`
      hasil generate: tambah instruksi eksplisit — sebelum nulis section `## Frontend Tasks`/
      `## Backend Tasks`, Planner **wajib baca `## Scope` di agent file terkait**
      (`caf-frontend.md`/`caf-backend.md`) dulu. Kalau Scope-nya list >1 app → **setiap baris
      task WAJIB** diawali tag `(app-path)`. Kalau Scope-nya 1 app → **tidak pakai tag** (format
      lama, tetap seperti sekarang)
- [ ] Ini instruksi struktural (bukan cuma dokumentasi command manual) — harus masuk ke isi
      `caf-planner.md` sendiri, karena `caf-orchestrator` men-spawn Planner langsung tanpa lewat
      `/caf-run-pipeline`

### AC5 — `implementationAppPaths`/`appNames` ikut ke QA & Reviewer
- [ ] `src/commands/agents.js` — `implementationAppPaths` (dipakai jadi `appNames` buat QA/Reviewer,
      lihat `buildInputSection('qa'/'reviewer', appNames)` di `agent-md.js`) sekarang dihitung dari
      `roleApp[role]` yang array (AC1) — ganti `.filter(Boolean).map(a => a.path)` jadi
      `.flatMap(apps => apps.map(a => a.path))` (atau setara), supaya semua app dari kedua role
      ikut ke-list, bukan cuma 1 per role

### AC6 — `run-pipeline-command.js`: `appPaths` per role jadi array
- [ ] `src/commands/agents.js` — `appPaths` dict (dipakai buat `buildRunPipelineMd()`) sekarang
      `role -> path` tunggal; ubah jadi `role -> path[]`
- [ ] `src/templates/run-pipeline-command.js` — `commitScopeList()` render N baris per role
      (bukan 1 baris) kalau role itu punya >1 app; format lama (1 baris) tetap kalau cuma 1 app

### AC7 — Verifikasi fungsional nyata (bukan cuma baca kode)
- [ ] Scratch test non-monorepo: `caf-init scaffold agents` di project 1-app dummy — confirm
      output `caf-frontend.md`/`caf-backend.md`/`tasks.md`-instruksi **byte-identik** (atau
      setara) dengan hasil sebelum perubahan ini (regresi wajib)
- [ ] Scratch test monorepo multi-app: pakai `umkm-pos` (`apps/web` + `apps/landing` sebagai
      kandidat frontend, `apps/api` sebagai backend) sebagai target nyata — jalankan
      `caf-init scaffold agents` ke direktori scratch (BUKAN langsung timpa `.claude/agents/`
      `umkm-pos` yang sudah dipakai user — `writeIfAbsent` mencegah overwrite, tapi tetap generate
      ke folder terpisah dulu untuk verifikasi), pilih `apps/web` + `apps/landing` ke role
      frontend, confirm: `caf-frontend.md` list 2 scope, verify checklist 2 grup, instruksi
      app-tag muncul; `caf-backend.md` (`apps/api` doang) tetap format lama (1 app, no tag)
- [ ] `caf-init audit`/`curate` di kedua hasil scratch di atas — pastikan tidak muncul gap baru
      yang tidak diharapkan dari perubahan ini

## Non-negotiable constraints
- `writeIfAbsent` tidak boleh diubah behaviornya.
- Regresi 1-app (non-monorepo maupun role dengan 1 app di monorepo) **wajib** byte-identik/setara
  dengan behavior sebelum checkpoint ini — ini bukan opsional, jadi bagian dari Definition of Done.
- `caf-orchestrator` **tidak boleh disentuh** di checkpoint ini (repo terpisah, keputusan eksplisit
  dari brainstorming — lihat Latar Belakang).
- Verifikasi fungsional wajib jalan nyata ke scratch dir (dan idealnya `umkm-pos` sebagai target
  monorepo real yang sudah punya 2 app frontend), bukan cuma baca kode.
- AC2/AC3/AC4 melibatkan keputusan format teks (exact wording instruksi app-tag) — kalau ambigu,
  laporkan dan tunggu keputusan, jangan pilih sendiri tanpa konfirmasi.
