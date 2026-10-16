## Ticket: CAF-MULTIAPP-01
## Pola Kerja: PIV, retry max 3x per task verify

---

### PLAN — baca dulu kode terkait sebelum ubah apapun

1. Baca ulang penuh: `src/commands/agents.js` (`FIXED_ROLES`, `pickRoleApps`, `candidateApps`,
   `buildCandidates`, `implementationAppPaths`, `appPaths`), `src/templates/agent-md.js`
   (`buildAgentMd`, `buildVerifyChecklist`, `buildInputSection`, `agentSlug`), dan
   `src/templates/run-pipeline-command.js` (`implementationSection`, `commitScopeList`,
   `buildRunPipelineMd`).
2. Konfirmasi bentuk data existing: `roleApp[role]` saat ini `App | null`. Rencana: jadi
   `App[]` (array kosong kalau role di-skip, bukan `null`) — pastikan semua consumer di-cek satu
   per satu (`buildCandidates`, `implementationAppPaths`, `appPaths`) supaya tidak ada `.path`
   dipanggil langsung di atas array tanpa `.map`/`.flatMap`.
3. Tentukan exact wording instruksi app-tag (AC2/AC4) — draft dulu, laporkan, baru lanjut kalau
   sudah confirm gak ambigu dengan pola `implementationSection()` yang sudah ada.

---

### IMPLEMENT

4. **AC1** — `src/commands/agents.js`:
   - `pickRoleApps(apps)`: kalau `apps.length === 1` → auto-assign `[apps[0]]` ke tiap role tanpa
     prompt. Kalau `apps.length > 1` → prompt `multiselect` per role (bisa pilih 0..N app),
     `roleApp[role]` = array hasil pilihan (bisa `[]`).
   - Update semua pemakai `roleApp[role]` supaya konsisten terima array (lihat langkah 5 & 8).

5. **AC5** — `src/commands/agents.js`, `implementationAppPaths`:
   ```js
   const implementationAppPaths = FIXED_ROLES
     .flatMap((role) => roleApp[role] || [])
     .map((app) => app.path);
   ```
   Pastikan hasil ini tetap dipakai persis di tempat yang sama (`appNames` untuk kandidat
   `qa`/`reviewer`).

6. **AC2** — `src/templates/agent-md.js`:
   - `buildAgentMd({ scope, ... })`: terima `scope` sebagai array `{ path, framework }` (atau
     reuse langsung array `App`).
   - Tambah helper `buildScopeSection(apps)`:
     - `apps.length === 1` → return string identik format lama.
     - `apps.length > 1` → return list scope (satu baris per app) + paragraf instruksi app-tag
       (baca tag `(app-path)` di tiap task line, cocokkan ke scope, STOP+tanya kalau gak cocok/
       gak ada tag).
   - `src/commands/agents.js` (`buildCandidates`): untuk kandidat role frontend/backend, `scope`
     yang dikirim ke `buildAgentMd` sekarang array app dari `roleApp[role]`, bukan 1 app.

7. **AC3** — `src/templates/agent-md.js`, `buildVerifyChecklist`:
   - Ubah signature jadi terima array `{ scripts, packageManager, packageName, appPath }`.
   - 1 item → render checklist flat, identik format lama (tidak ada header app).
   - >1 item → render per-app dengan header (`#### <appPath>`), tiap grup pakai
     `buildVerifyChecklist` lama (extract logic existing jadi helper single-app, dipanggil per
     item dalam loop).
   - `src/commands/agents.js`: untuk kandidat frontend/backend, hitung
     `scripts`/`packageManager`/`packageName` **per app** di `roleApp[role]` (loop
     `matchVerifyScripts`/`readPackageName` per app), kumpulkan jadi array sebelum dikirim ke
     `buildAgentMd`.

8. **AC4** — `src/templates/agent-md.js`, `buildInputSection('planner', ...)` atau bagian body
   `caf-planner.md` yang relevan:
   - Tambah instruksi: sebelum menulis section Frontend/Backend Tasks, baca `## Scope` di
     `caf-frontend.md`/`caf-backend.md` — kalau list >1 app, app-tag wajib per baris; kalau 1
     app, tidak pakai tag (format lama).
   - Sertakan contoh format tag persis seperti didiskusikan: `` - [ ] (apps/web) ... ``.

9. **AC6** — `src/commands/agents.js` + `src/templates/run-pipeline-command.js`:
   - `appPaths` dict: `role -> path[]` (ambil dari `roleApp[role].map(a => a.path)`, bukan 1
     path).
   - `commitScopeList()`: loop per role, per path dalam array-nya, render 1 baris whitelist per
     app (format lama tetap kalau array-nya panjang 1).

---

### VERIFY

10. [x] **Regresi 1-app** — scratch dir project non-monorepo dummy (`/tmp/single-app-test`,
    Vue + `packageManager: pnpm`), digenerate dengan kode BARU vs kode LAMA (`git stash` src/
    sementara, generate ke `/tmp/single-app-test-old` dengan flow prompt lama, `git stash pop`).
    `diff` kedua `caf-frontend.md` hasilnya → **identical**. Regresi 1-app confirmed.

11. [x] **Multi-app real-shape** — scratch monorepo dummy (`apps/web` + `apps/landing` Vue,
    `apps/api` NestJS, meniru struktur nyata `umkm-pos`) via `caf-init scaffold agents` penuh
    (prompt di-drive lewat `prompts.inject`, bukan cuma unit call). Konfirmasi:
    - `caf-frontend.md`: scope list 2 path (`apps/web/**`, `apps/landing/**`), verify checklist
      2 grup dengan header `#### apps/web` / `#### apps/landing`, instruksi app-tag ada.
    - `caf-backend.md` (1 app, `apps/api`): format lama persis — 1 baris scope, checklist flat,
      TIDAK ada tag/list/header.
    - `caf-planner.md`: section "App-tag requirement — multi-app Frontend/Backend agents" ada.
    - Catatan: belum dijalankan langsung ke copy `umkm-pos` asli (butuh clone terpisah) — scratch
      dummy di atas sudah menutupi bentuk struktur yang sama (2 frontend + 1 backend app, sama
      persis dengan kasus `umkm-pos` yang jadi alasan checkpoint ini). Kalau user mau verifikasi
      1:1 ke `umkm-pos`, bisa clone/copy manual dan re-run `scaffold agents` di sana.

12. [x] **QA/Reviewer appNames** — run kedua (`multiapp-test2`, kandidat `qa`+`reviewer`
    ditambahkan) confirm nyata: `caf-qa.md` Input section berisi
    `` `verify-report.md` from the implementation agent (apps/web, apps/landing, apps/api) `` —
    ketiga app path muncul, bukan cuma 1 per role.

13. [x] **`/caf-run-pipeline`** — run kedua dengan `generateRunPipeline: true` menghasilkan
    `caf-run-pipeline.md` nyata. Section 7.1 Scope whitelist confirm punya baris terpisah:
    `` `caf-frontend`: `apps/web/` `` dan `` `caf-frontend`: `apps/landing/` `` (2 baris untuk 1
    role yang sama), plus `` `caf-backend`: `apps/api/` ``.

14. [ ] **`caf-init audit`/`curate`** — belum dijalankan di hasil scratch. TODO, non-blocking
    (audit/curate adalah compliance check tambahan, bukan bagian dari kontrak fungsional yang
    diubah checkpoint ini).

15. Retry max 3x per item verify yang gagal — tidak ada yang gagal di verifikasi yang sudah
    dijalankan (10-13).

### Status implementasi (checkpoint ini)
AC1-AC6 diimplementasikan dan diverifikasi fungsional penuh: regresi 1-app byte-identik terhadap
kode lama (10), scope/verify-checklist/app-tag multi-app render sesuai desain (11), appNames
QA/Reviewer ikut semua app (12), `/caf-run-pipeline` scope whitelist per-app (13). Item 14
(`caf-init audit`/`curate`) belum dijalankan — non-blocking, bisa disusulkan sebelum PR dibuka
kalau mau kelengkapan penuh.

Branch: `feat/CAF-MULTIAPP-01-multi-app-agents`. Belum di-commit — menunggu review/AC dari user
sebelum commit.

---

### Eksplisit TIDAK termasuk checkpoint ini
- Perubahan apapun di repo `caf-orchestrator` (`task-router.ts`, `agents.modelOverrides`,
  `TaskAgent` union).
- Solusi #1 (multi-named-agent per app, mis. `caf-frontend-admin`/`caf-frontend-web`).
- Migrasi retroaktif `.claude/agents/` `umkm-pos` yang sudah dipakai user secara langsung (hanya
  scratch copy yang dipakai untuk verifikasi).
- Perubahan ke jalur `extraApps`/kind `implementation` yang sudah ada.
