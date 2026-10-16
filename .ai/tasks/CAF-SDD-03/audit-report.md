# Audit SDD-03 — caf-initiator (READ-ONLY)

**Commit:** `df230a936b54be3a5ec48b39c3d49123c602e63e` · **Branch:** `ai-agent/CAF-SDD-01` · **Tanggal audit:** 2026-10-12

Tree bersih sebelum dan sesudah audit. Tidak ada file kode yang diubah; salinan fixture hanya di scratchpad.

## Daftar isi

1. [Ringkasan](#1-ringkasan)
2. [Bagian A–J](#a-kind-hak-akses-file-lama)
3. [Matriks dampak](#3-matriks-dampak)
4. [Pemecahan tiket](#4-pemecahan-tiket)
5. [Tidak diketahui / dilewati](#5-tidak-diketahui--dilewati)

---

## 1. Ringkasan

1. Baseline `npm test`: **206 lulus, 0 gagal**.
2. **Risiko #1:** kind yang dihapus dari `KNOWN_KINDS` jatuh ke `implementation` (`src/utils/agent-sections.js:96`). Bila section punya baseline, `curate sync` membacanya `DRIFT` dan menimpa `Allowed Tools`/`Input`/`Output` dengan teks Read+Write+Edit+Bash.
3. **Risiko #2:** rename qa → validator tidak punya jalur migrasi. Manifest berkunci path file, dan builder hari ini merender `validator` sebagai `tools: [Read]` dengan Retry Logic `verify-report`/`SUCCESS` (kontrak salah).
4. **Risiko #3:** SINGLE_REPO default ke `implementer` (`src/commands/agents.js:371`). Membuangnya berarti `scaffold agents` tanpa `--role` tidak punya agent implementasi, sehingga `/caf-run` tidak pernah ditawarkan.
5. Command verifikasi: tidak ada template yang menambah argumen setelah `--`. Exact-match script terbukti, tetapi fallback pattern masih bisa memilih `test:watch`.
6. Rename skill: pointer `## Skills` yang sudah ada tidak pernah diedit dan tidak ada deteksi pointer usang.
7. `discovery-commands.js` dan `audit-report-format.js` diimpor `agent-md.js`; keduanya tidak boleh dihapus selama kind lama masih dikenali.
8. Snapshot MONOREPO: 13 dari 16 kunci file akan berubah; 3 kunci tidak tersentuh keenam perubahan.

---

## A. Kind, hak akses, file lama

### A1. Lokasi

| Item | Lokasi | Isi |
|---|---|---|
| `KNOWN_KINDS` | `src/utils/agent-sections.js:85` | planner, architect, frontend, backend, implementer, qa, reviewer, documentation, auditor, pm, ux-designer, devops |
| `detectKind()` | `src/utils/agent-sections.js:87-97` | buang prefix `caf-` bila sisanya ada di `KNOWN_KINDS`; selain itu → `'implementation'` (`:96`) |
| `HIDDEN_CANDIDATE_KINDS` | `src/commands/agents.js:41`, dipakai `:416` | `['devops']`; hanya menyaring pilihan menu |
| `TOOLS_BY_KIND` | `src/templates/agent-md.js:231-243` | lihat tabel A2 |
| Fallback tools | `src/templates/agent-md.js:268-270` | kind tak dikenal → `['Read']` |
| Tools Discovery | `src/templates/discovery-commands.js:253` (frontmatter `[Read, Write]`), `:188-202` (body) | pm/ux tidak lewat `TOOLS_BY_KIND` |
| `CAF_PREFIXED_KINDS` | `src/templates/agent-md.js:21` | tanpa `devops` → file bernama `devops.md` |
| `IMPLEMENTATION_KINDS` | `src/templates/agent-md.js:25` | frontend, backend, implementation, implementer |

### A2. Kind dihapus dari `KNOWN_KINDS`, file lama masih ada

Simulasi in-memory: file dirender dengan builder sekarang, baseline = isi file, lalu dibandingkan dengan template `implementation`.

| Kind (file) | Tools asli | Status section setelah jatuh ke `implementation` | Eskalasi? |
|---|---|---|---|
| qa (`caf-qa.md`) | Read, Write, Bash | Allowed Tools, Input, Output, Retry Logic = DRIFT; Report Format dilewati | Ya (+Edit). Retry Logic menjadi `verify-report`/`SUCCESS`, kontrak QA rusak |
| documentation | Read, Write, Edit | Allowed Tools, Input, Output = DRIFT | Ya (+Bash) |
| architect | Read, Write | Allowed Tools, Input, Output = DRIFT | Ya (+Edit, +Bash) |
| devops (`devops.md`) | Read, Bash | Allowed Tools, Input, Output = DRIFT | Ya (+Write, +Edit); terburuk bersama auditor |
| auditor | Read, Bash | Allowed Tools, Input, Output = DRIFT; What to Look For dan Report Format dilewati | Ya (+Write, +Edit) |
| pm / ux-designer | Read, Write | kelima section = DRIFT | Ya (+Edit, +Bash); larangan tulis ke tracker (`discovery-commands.js:197-202`) ikut hilang |
| implementer | Read, Write, Edit, Bash | semua IN_SYNC | Tidak; isi identik dengan `implementation` |

Jalur kode:

| Jalur | Perilaku | Bukti |
|---|---|---|
| `curate sync` | `DRIFT` → body section ditimpa dan manifest di-rebaseline | `src/commands/agents-sync.js:63`, `:88-105` |
| `curate audit` | melaporkan gap "safe to auto-sync" lalu menawarkan sync | `src/commands/audit.js:190`, `:209-215`; `src/commands/curate.js:29-46` |
| `curate baseline` | merekam isi apa adanya, lalu run berikutnya menjadi DRIFT | `src/commands/curate-baseline.js:50-62` |
| `--check-drafts` | read-only; DRIFT tidak dilaporkan, hanya CUSTOMIZATION/CONFLICT yang FAIL | `src/commands/check-drafts.js:104` |
| `scaffold skills` | menawarkan 4 skill implementasi (termasuk `caf-escalate`) ke file lama, default jawaban No | `src/commands/skills.js:121`, `:152-160`, `:173` |
| `scaffold agents` | tidak membaca file lama; `writeIfAbsent` melewatinya | `src/commands/agents.js:522` |
| `export` | menyalin semua `*.md` tanpa `detectKind` | `src/commands/export.js:194-204` |
| `complete-drafts` | inventaris `agents/*.md` tanpa `detectKind`, lalu memanggil `curateBaseline` | `src/commands/complete-drafts.js:30`, `:108` |

Batas eskalasi:

- Sync hanya menimpa body section (`agent-sections.js:162-168`). Frontmatter `tools:` yang dipaksakan harness Claude Code tidak berubah.
- Yang melebar adalah teks kontrak: "The frontmatter `tools` above is the list that applies: Read, Write, Edit, Bash" (`agent-md.js:285`).
- Untuk Cline, teks itu satu-satunya kontrol ("model compliance only", `src/utils/runner-targets.js:17`).
- Sync hanya menulis section ber-baseline. Tanpa manifest semuanya `UNTRACKED` dan tidak ditulis (`agents-sync.js:88-91`).

### A3. Kemunculan nama lama

Kolom: qa · documentation · architect · devops · implementer · auditor · pm · ux-designer · discovery · audit. Grep case-insensitive. `audit` mencakup `curate audit`, `architect` mencakup "architecture", dan `\bpm\b` mencakup "package manager" (itulah sumber hit `pm` di `claude-md.js`, `task-completion.js`, `package-scripts.js`).

**src/**

| File | Hitungan | Total |
|---|---|---|
| `templates/agent-md.js` | 29·9·10·7·7·18·5·5·29·31 | 150 |
| `templates/discovery-commands.js` | 0·0·0·0·0·1·29·12·66·3 | 111 |
| `templates/audit-commands.js` | 0·0·0·0·0·23·0·0·0·87 | 110 |
| `commands/agents.js` | 7·7·8·8·13·9·8·5·28·16 | 109 |
| `templates/run-pipeline-command.js` | 26·33·17·0·0·0·0·0·2·4 | 82 |
| `utils/agent-sections.js` | 1·1·1·14·3·7·6·6·11·8 | 58 |
| `templates/discovery-to-ticket.js` | 0·0·0·0·0·2·4·0·36·4 | 46 |
| `templates/ticket-preview-commands.js` | 17·2·12·0·0·0·0·0·2·0 | 33 |
| `templates/audit-report-format.js` | 0·1·1·0·0·9·0·0·0·20 | 31 |
| `utils/read-agent-roster.js` | 2·2·2·0·8·3·3·2·0·3 | 25 |
| `commands/audit.js` | 0·0·1·0·0·0·0·0·0·20 | 21 |
| `commands/feature-catalog-sync.js` | 0·0·17·0·0·0·0·0·0·1 | 18 |
| `templates/agent-handoff-md.js` | 1·0·0·0·0·3·2·2·2·6 | 16 |
| `index.js` | 0·0·1·0·4·0·0·0·0·11 | 16 |
| `commands/curate.js` | hanya `audit` | 14 |
| `templates/feature-catalog.js` | 0·3·9·0·0·0·0·0·0·2 | 14 |
| `templates/skill-md.js` | 3·1·1·1·1·1·1·1·0·1 | 11 |
| `templates/artifact-by-role.js` | 2·1·1·0·1·1·0·0·0·2 | 8 |
| `commands/setup.js` | hanya `audit` | 7 |
| `templates/complete-drafts-command.js` | 1·0·1·0·0·0·4·0·0·1 | 7 |
| `utils/canonical-sections.js` | 2·2·2 | 6 |
| `templates/knowledge-index-md.js`, `steps/04-generate-drafts.js`, `templates/claude-md.js` | campuran | 6 masing-masing |
| `templates/review-command.js` | hanya `audit` | 5 |
| `templates/fix-review-command.js`, `tasks-readme.js`, `reference-docs-md.js`, `commands/reference-docs.js`, `steps/01-audit-existing-tools.js`, `utils/architecture-signatures.js` | campuran | 3 masing-masing |
| `templates/piv-workflow-md.js`, `task-completion-md.js` | — | 2 masing-masing |
| `commands/adr.js`, `curate-baseline.js`, `skills.js`, `task-completion.js`, `workflow.js`, `utils/generate-manifest.js`, `package-scripts.js`, `read-caf-config.js` | — | 1 masing-masing |

**test/**

| File | Total | Dominan |
|---|---|---|
| `fixtures/snapshots/mono-pnpm.json` | 167 | qa 58, documentation 31, audit 28, architect 23 |
| `discovery-sections.test.js` | 88 | discovery 25, pm 22, ux 16 |
| `single-repo-scaffold.test.js` | 67 | implementer 54 |
| `devops-kind-detection.test.js` | 58 | devops 37 |
| `retry-logic-role-aware.test.js` | 56 | discovery 27, pm 13 |
| `skills-pointer.test.js` | 49 | qa 22 |
| `reviewer-report-format.test.js` | 40 | audit 20, auditor 11 |
| `section-boundary-fenced-code.test.js` | 30 | audit 17, auditor 13 |
| `qa-report-format.test.js` | 26 | qa 23 |
| `skills-scaffold.test.js` | 13 | qa 7 |
| `skills-templates.test.js` | 12 | merata |
| `devops-menu-hidden.test.js` | 11 | devops 11 |
| `audit-agent-sections.test.js` | 9 | hanya `audit` |
| `skills-check-drafts.test.js` | 8 | qa 4 |
| `complete-drafts.test.js` | 5 | qa 3 |
| `skills-section.test.js`, `helpers/mono-snapshot.js` | 4 masing-masing | — |
| `skills-spec.test.js` | 1 | — |

### A4. Mekanisme terkecil "dikenali tapi tidak ditulis"

- **Biarkan `KNOWN_KINDS` dan semua cabang builder utuh.** Itulah yang membuat file lama dibandingkan dengan template-nya sendiri.
- **Tambah satu daftar kind pensiun dan saring di sisi penawaran.** Pola `HIDDEN_CANDIDATE_KINDS` sudah ada dan diuji: `agents.js:41`, `:416`, `test/devops-menu-hidden.test.js`.
- **Hentikan penulisan command pendamping.** Titiknya: `PREVIEW_COMMANDS` (`agents.js:43-48`) dan blok `auditorPicked` / `pmPicked` (`agents.js:710-756`).
- **Bekukan builder kind pensiun byte-for-byte.** Perubahan teks membuat file lama DRIFT lalu ditimpa.
- **Penghapusan penuh di rilis berikutnya butuh "kind tak dikenal → lewati".** Fallback `implementation` di `agent-sections.js:96` adalah akar risikonya, tetapi `skills.js:121` bergantung padanya, jadi perlu keputusan terpisah.

---

## B. Command verifikasi

### B1. Penyusun

| Peran | Lokasi |
|---|---|
| Bentuk command | `src/utils/runner-command.js:19-34` (`verifyCommand`) |
| Pemilihan script | `src/utils/package-scripts.js:5-10` (pola), `:30` (pencocokan) |
| Nama workspace | `src/utils/package-scripts.js:43-47` |
| `## Verify Checklist` agent | `src/templates/agent-md.js:37-44`, `:48-61`, `:68-83` |
| `task-completion.md` | `src/templates/task-completion-md.js:10-17`, `:54-57` |
| Skill `caf-verify` | memakai `buildVerifyChecklist` (`skill-md.js:1`, `skills.js:29-37`) |
| Pemeriksa | `src/commands/check-drafts.js:33-39` |

### B2. Argumen setelah `--` dan bentuk persis

Tidak ada template yang menambahkan argumen setelah `--`: grep `run <script> -- ` dan ` -- --` di `src/`, `README.md`, `CAF.md` kosong. Asal `-- --ci` di umkm-pos tidak diketahui (lihat bagian 5).

Bentuk yang dihasilkan (dievaluasi langsung dari `verifyCommand`, script `test`):

| PM | MONOREPO (`packageName` terisi) | SINGLE_REPO |
|---|---|---|
| pnpm | `pnpm --filter @mono/api run test` | `pnpm run test` |
| npm | `npm run test --workspace @mono/api` | `npm run test` |
| yarn | `yarn workspace @mono/api run test` | `yarn run test` |
| bun | `bun run --filter @mono/api test` | `bun run test` |
| tidak terdeteksi | baris TODO (`runner-command.js:31-32`, `:37-42`) | `npm run test` |

- Baris terakhir kolom SINGLE_REPO adalah tebakan PM: `runner-command.js:20` memakai `packageManager || 'npm'`. README mengakuinya di `:357`.
- `COMMAND_PATTERNS` di check-drafts memakai `(?<script>\S+)` tanpa jangkar akhir, jadi `run test -- --ci` tulisan tangan lolos selama script `test` ada.

### B3. Exact-match dulu

Terbukti di `package-scripts.js:30`: `scripts.find(name === slot) || scripts.find(pattern.test(name)) || null`.

- Uji `{test:watch, pretest, test, lint-staged, lint}` (urutan itu) menghasilkan `test: 'test'`, `lint: 'lint'`.
- **Celah:** bila tidak ada `test` persis, fallback pattern tetap memilih. Uji `{test:watch}` saja menghasilkan `test: 'test:watch'`, lalu ditulis sebagai gate. Pola `/test/i` juga cocok dengan `pretest` dan `test:e2e`.

### B4. Script tidak ada / typecheck menempel di build

- Slot kosong menjadi baris TODO, bukan command: `agent-md.js:38-40`, `task-completion-md.js:11-13`, plus `## Infrastructure Gap Notes` (`:19-33`, `:43-45`).
- Uji `{build: "tsc --noEmit && vite build", "test:ci": ...}`: `typecheck` = null dan ditulis TODO. Pola hanya mencocokkan nama script (`:7`), tidak membaca isinya.
- Tanpa `package.json`: semua slot null dan semua baris TODO.

---

## C. Command slash

### C1. 13 command

| Command | Builder | `allowed-tools` | Pemanggil | Test |
|---|---|---|---|---|
| `caf-plan-ticket` | `ticket-preview-commands.js:154` | `Read, Write, Grep, Glob, Bash(ls:*), Bash(git branch:*), Bash(git status:*)` (`:159`) | `agents.js:44`, otomatis bila planner dipilih (`:533-547`) | tidak ada |
| `caf-design-ticket` | `:205` | `Read, Write, Grep, Glob, Bash(ls:*)` (`:210`) | `agents.js:45` | tidak ada |
| `caf-qa-check` | `:272` | `Read, Write, Grep, Glob, Bash` (`:281`), Bash tak dibatasi | `agents.js:46` | tidak ada |
| `caf-review-ticket` | `:349` | `Read, Write, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git branch:*), Bash(ls:*)` (`:355`) | `agents.js:47` | tidak ada |
| `caf-run-pipeline` | `run-pipeline-command.js:239` | `:32-54`: Read, Write, Grep, Glob, Task, git status/branch/checkout/ls-remote/log/diff/add/commit/fetch/merge-base/push/show, gh pr create/list, gh repo view, ls | `agents.js:592-611`, opt-in default No, syarat planner + implementasi (`:570`) | `single-repo-scaffold`, `skills-scaffold`, `helpers/mono-snapshot.js`, snapshot |
| `caf-fix-review` | `fix-review-command.js:252` | `:23-33`: Read, Grep, Glob, Task, git branch, gh pr list/view, gh repo view, `Bash(gh api:*)` | `agents.js:646-664`, opt-in | `single-repo-scaffold`, `skills-scaffold`, snapshot (teks) |
| `caf-review` | `review-command.js:279` | `:23-35`: Read, Grep, Glob, Task, gh pr view/list/diff, gh repo view, gh api user/permission/reviews | `agents.js:689-707`, opt-in | `skills-scaffold`, `single-repo-scaffold` |
| `caf-audit-scan` | `audit-commands.js:26` | `Read, Write, Bash` (`:28`) | `agents.js:717-721` | `reviewer-report-format` (golden string), snapshot |
| `caf-audit-to-ticket` | `audit-commands.js:300` | per tracker: `:133`, `:172`, `:227`, `:276` | `agents.js:723-727` | `discovery-sections`, snapshot |
| `caf-discovery-start` | `discovery-commands.js:67` | `Read, Write, Glob, Bash(ls:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Task` (`:69`) | `agents.js:739-746` | `discovery-sections`, snapshot |
| `caf-discovery-to-ticket` | `discovery-to-ticket.js:165` | per tracker: `:41`, `:65`, `:102`, `:133` | `agents.js:748-752` | `discovery-sections` |
| `caf-feature-catalog-sync` | `feature-catalog.js:106` | `Read, Write, Edit, Grep, Glob, Bash` (`:115`) | `feature-catalog-sync.js:72`; target `scaffold.js:30`, `:135` | tidak ada |
| `caf-complete-drafts` | `complete-drafts-command.js:87` | `:26-40`: Read, Edit, Write, Grep, Glob, git status/diff, ls, `<pm> run`, caf-init curate | `complete-drafts.js:72`; `CHAIN_ORDER` (`scaffold.js:42`) | `complete-drafts`, `skills-check-drafts` |

Nasib `caf-plan-ticket` tidak disebut di keputusan (lihat bagian 5).

### C2. `ticket-preview-commands.js`

- Satu-satunya pengimpor: `agents.js:21-26`.
- Bila design/qa-check/review-ticket dibuang, tiga builder (`:205`, `:272`, `:349`) menjadi kode mati.
- `buildPlanTicketMd` dan helper bersama (`previewCommandMd` `:102`, `ticketSection` `:82`, `nonDestructiveRule` `:55`, `agentSourceOfTruth` `:69`) bisa dipakai `/caf-plan`. Secara struktur cocok: wrapper main-thread yang membaca `caf-planner.md`.
- Yang ikut diubah: nama file `caf-plan-ticket.md` (`agents.js:44`), referensi silang `ticket-preview-commands.js:223`, dan `CAF.md:711`.

### C3. `architecture-signatures.js`

- Hanya diimpor `src/commands/feature-catalog-sync.js:8`. **Calon kode mati.**
- Ikut mati: `templates/feature-catalog.js` (pengimpor tunggal `feature-catalog-sync.js:9`) dan `commands/feature-catalog-sync.js` (pengimpor tunggal `scaffold.js:11`).
- Sisa yang harus dibersihkan:
  - `audit.js:134-149` melaporkan gap opsional dengan `syncCommand: 'caf-init scaffold feature-catalog-sync'`.
  - Help `--command-dir` di `index.js:56`.
  - `discovery-commands.js:189` menyebut `docs/product/feature-catalog.md`.
- **Bukan kode mati walau command-nya dibuang:**
  - `discovery-commands.js` dipakai `agent-md.js:4` untuk `DISCOVERY_*`.
  - `audit-report-format.js` dipakai `agent-md.js:3`.

### C4. Rename `/caf-run-pipeline` → `/caf-run`

| File | Hit | Catatan |
|---|---|---|
| `src/commands/agents.js` | 14 | nama file output `:607`, prompt `:595`, peringatan `:380`, `:572-587` |
| `src/templates/run-pipeline-command.js` | 10 | teks body `:168`, `:315`, `:484`, `:631` |
| `src/templates/fix-review-command.js` | 7 | `:10`, `:95`, `:113` |
| `src/templates/review-command.js` | 2 | `:22`, `:116` |
| `src/templates/ticket-preview-commands.js` | 2 | komentar `:19-20` |
| `test/single-repo-scaffold.test.js` | 9 | — |
| `test/helpers/mono-snapshot.js` | 4 | kunci `.claude/commands/caf-run-pipeline.md` (`:91`) |
| `test/fixtures/snapshots/mono-pnpm.json` | 6 | nama kunci + 5 di body |
| `test/skills-scaffold.test.js` | 1 | — |
| `README.md` | 1 | `:329` |
| `CAF.md` | 2 | salah satunya `:68` |
| `CLAUDE.md` | 1 | — |

- Tidak ada teks di repo ini yang dikonsumsi orchestrator berdasarkan nama command itu.
- Repo target: `caf-run-pipeline.md` lama tidak dikenali. `detectLegacyCollision` hanya membandingkan `caf-x` dengan `x` (`collision-check.js:12-18`), jadi `caf-run.md` ditulis berdampingan dan dua command hidup bersama.

---

## D. SINGLE_REPO

### D1. Pembentukan `caf-implementer`

| Hal | Bukti |
|---|---|
| Kandidat | `buildSingleRepoCandidates` (`agents.js:288-304`), disisipkan sebelum `qa` (`:302-303`) |
| Default role | `roleOpt \|\| 'implementer'` (`agents.js:371`); `SINGLE_REPO_ROLES` (`:277`) |
| Nama file | `agentSlug` → `caf-implementer` (`agent-md.js:21`, `:34`) |
| `--scope` | `normalizeScopeDirs` (`agents.js:245-272`) → `buildDirScopeSection` (`agent-md.js:583-594`) → whitelist commit (`agents.js:562-568`) |
| `--role` | CLI `index.js:73-80`; validasi `agents.js:344-352` |
| Peringatan | `agents.js:374-384` |
| Roster | `singleRepoOnly` dan `hasImplementer` (`read-agent-roster.js:19`, `:52-57`) |
| Lain | `artifact-by-role.js:8`, `skill-md.js:35`, `agent-md.js:25`, `:237`, `:251` |

Rantai yang bergantung:

- **agents:** tawaran `/caf-run-pipeline` butuh `implementationRoles.length > 0` (`agents.js:556-570`).
- **workflow:** baris roster.
- **skills:** pemetaan kind ke skill.

### D2. Bila implementer dibuang

- Jalur yang masih memakainya: semua baris D1, ditambah README `:158`, `:333`, `:351`.
- Perilaku `scaffold agents` tanpa `--role` hari ini: selalu implementer. Kode tidak punya jalur "tanpa agent implementasi" atau "wajib pilih role".
- Menghapus `implementer` dari `SINGLE_REPO_ROLES` tanpa mengganti default membuat `buildSingleRepoCandidates` melempar error (`agents.js:289-291`).
- Default pengganti belum diputuskan. Role "never inferred from the framework" (`agents.js:286`).
- File `caf-implementer.md` lama: bila kind dihapus, jatuh ke `implementation` dengan isi identik (A2), jadi tidak ada eskalasi. Tetapi roster memperlakukannya sebagai `custom` dan baris "NOT present" untuk frontend/backend muncul lagi (`read-agent-roster.js:52-59`).

---

## E. Section tracking dan manifest

### E1. Kunci manifest

- Bentuk: `files[<relPath>].sections[<header>].hash` (`generate-manifest.js:43`, `:53-59`). `relPath` = `<agentDir>/<file>` (`agents-sync.js:59`, `audit.js:187`, `curate-baseline.js:46`). Jadi kuncinya **path file**, bukan nama agent atau kind.
- Sync-state terpisah, berkunci nama file (`sync-state.js:29`, `:36`).
- Tidak ada kode yang menghapus entri manifest; penulis hanya `setSectionBaseline`.

Dampak rename qa → validator:

| Hal | Hasil |
|---|---|
| Entri `.claude/agents/caf-qa.md` | tetap di manifest. Yatim hanya bila file dihapus; tidak pernah dibersihkan |
| `caf-validator.md` baru | `UNTRACKED` sampai `curate baseline` |
| `caf-qa.md` lama | tetap dipindai (semua `*.md`, `agents-sync.js:19-25`) dan dibandingkan dengan template kind `qa` selama `qa` masih di `KNOWN_KINDS` |
| Template `qa` diubah | file lama menjadi DRIFT lalu ditimpa. Contoh pemicu: `Agent: caf-qa` di `agent-md.js:359` diganti |
| `git mv caf-qa.md caf-validator.md` | baseline tidak ikut pindah; file menjadi UNTRACKED dan isinya tetap menyebut `caf-qa` |
| Tabrakan nama | tidak terdeteksi (`collision-check.js:15-17`); dua agent hidup bersama |

### E2. Builder bercabang per kind

| Builder | Cabang | Fallback | Lokasi |
|---|---|---|---|
| `buildToolsSection` | Discovery; `TOOLS_BY_KIND` + `TOOLS_RATIONALE` | `Read` + rationale TODO | `agent-md.js:276-293` |
| `buildInputSection` | Discovery, planner, architect, `IMPLEMENTATION_KINDS`, qa, reviewer, documentation, auditor | satu baris TODO (`:221`) | `:108-222` |
| `buildOutputSection` | Discovery, auditor, `implementation` → frontend, `ARTIFACT_BY_ROLE` | TODO (`:552`) | `:540-555` |
| `buildRetryLogicSection` | Discovery, qa, reviewer | teks Delivery `verify-report`/`SUCCESS` | `:480-491` |
| `buildReportFormatSection` | reviewer, qa, auditor | `null` | `:386-407` |
| `buildWhatToLookForSection` | auditor | `null` | `:304-307` |
| `buildWorkingPatternSection` | konstan | — | `:434-440` |

Tidak syncable tetapi bercabang kind: `buildBatasanSection` (planner, `:496`), `buildAuditContractSections` (`:413-430`), `toolsForKind` untuk frontmatter (`:268`).

**Kind baru `validator` lewat builder hari ini** (simulasi):

- `detectKind('caf-validator.md')` = `implementation`.
- `agentSlug` = `validator`, tanpa prefix.
- Frontmatter `tools: [Read]`; Input dan Output TODO.
- Retry Logic = `verify-report` + `SUCCESS`, pola CAF-RETRYLOGIC-01.
- Report Format `null`; skill `[]`.

Jadi `validator` butuh cabang nyata di semua builder itu, plus `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, `ARTIFACT_BY_ROLE`, `SKILLS_BY_KIND`, `KNOWN_ROLES`, dan `PREVIEW_COMMANDS`.

Catatan lain:

- Kind dibuang: lihat A2.
- Kind dilipat (architect → skill planner): bila `buildInputSection('planner')` berubah, `caf-planner.md` lama yang ber-baseline menjadi DRIFT dan ditimpa. Ini sah, tetapi teks baru harus benar untuk semua repo terpasang.

### E3. Repo campuran file lama dan baru

| Sub-command | Perilaku |
|---|---|
| `curate audit` | semua `*.md` diaudit per `detectKind`; tanpa peringatan duplikasi peran. Status `UNTRACKED`, `CUSTOMIZATION`, `CONFLICT` hanya "manual review" (`audit.js:211`), tidak menggagalkan exit code |
| `curate sync` | hanya DRIFT yang ditulis; section hilang ditanya per section (`agents-sync.js:127-140`). File lama di-sync selama kind-nya dikenali |
| `curate baseline` | merekam semua file. Bahaya hanya bila kind sudah tidak dikenali |
| `--check-drafts` | WARN untuk UNTRACKED (`check-drafts.js:115-123`); FAIL untuk section ber-baseline yang dihapus (`:86-92`) atau diubah (`:104-112`) |
| Layer 3-4 | `canonicalHeaders` memakai `DUMMY_ROSTER` berslug lama tanpa prefix (`canonical-sections.js:11-22`); hanya nama header yang dipakai |

README `:256-261` mencatat dua DRIFT palsu yang sudah diketahui:

- `Input` QA/Reviewer di monorepo, karena `appNames` tidak bisa dipulihkan (`agent-md.js:103-108`, `:189`).
- `Working Pattern (PIV)` pm/ux.

Yang pertama diwarisi `validator`.

---

## F. Rename skill

### F1. Pointer `## Skills`

| Hal | Bukti |
|---|---|
| Path | `skillPath(name)` = `.claude/skills/<name>/SKILL.md` (`skill-md.js:16`, `:48-50`) |
| Body | `buildSkillsBody` (`agent-md.js:514-526`) |
| Agent baru | `usableSkillPaths` (`skills.js:45-52`), dipanggil `agents.js:518` |
| Agent lama | `addSkillPointers` (`skills.js:102-193`) |
| Agent yang sudah punya `## Skills` | **tidak pernah diedit** (`skills.js:129-139`); hanya mencetak "not listed there: …" (`:132-137`) |
| Pencocokan | substring path pada body (`skills.js:133`) |
| Pemeriksa | pointer ke file hilang = FAIL; ke skill DRAFT = WARN (`check-drafts.js:130-155`) |

Dampak pada repo yang agent-nya sudah menunjuk `caf-verify` (mis. umkm-pos):

1. `scaffold skills` menulis `caf-self-verify/` di samping `caf-verify/`. `detectSkillDirCollision` hanya membandingkan `caf-x` dengan `x` (`collision-check.js:26-31`), jadi tidak ada tabrakan. Dua skill verifikasi aktif untuk sesi manual.
2. Pointer lama tetap ke `caf-verify`. Selama folder itu ada, tidak ada FAIL, dan isinya tidak diperbarui lagi (`writeIfAbsent`).
3. Bila folder lama dihapus, `--check-drafts` FAIL (`check-drafts.js:139-145`). Agent diinstruksikan melewati skill yang filenya hilang (`agent-md.js:522-524`), jadi verifikasi hilang diam-diam.
4. **Tidak ada deteksi pointer usang.** Satu-satunya petunjuk adalah pesan kuning `skills.js:136`.
5. Skill lain menyebut nama ini di body (`skill-md.js:235`, `caf-piv`); `name:` frontmatter di `:118`; map builder di `:341`.

### F2. Daftar dan pembacanya

`SKILL_NAMES` (`skill-md.js:20`): caf-verify, caf-scope-discipline, caf-no-guess, caf-escalate, caf-piv, caf-spec.

`SKILLS_BY_KIND` (`skill-md.js:32-42`):

| Kind | Skill |
|---|---|
| frontend, backend, implementer, implementation | caf-verify, caf-scope-discipline, caf-no-guess, caf-escalate |
| qa | caf-verify, caf-no-guess |
| planner | caf-scope-discipline, caf-no-guess, caf-spec |
| reviewer, architect, documentation | caf-scope-discipline, caf-no-guess |
| auditor, devops, pm, ux-designer | tidak ada |

Pembaca:

- **src:** `skills.js:10-19`, `:103`, `:121`; `agents.js:13` (lewat `usableSkillPaths`); `check-drafts.js:11-17`; `complete-drafts.js:12`.
- **test** (hit `caf-verify`): `skills-scaffold` 14, `skills-check-drafts` 11, `skills-templates` 11 (tabel persis di test `:68`), `skills-pointer` 9, `skills-section` 1.
- **docs:** README 3 (`:166`, `:182`, `:202`), CAF.md 4, CLAUDE.md 1.
- `skill-md.js:311` sudah memakai kata "the validator".

---

## G. Kontrak reviewer yang diduplikasi

| Item | Lokasi |
|---|---|
| Skeleton `Verdict:` | `agent-md.js:318-343`; baris nilai di `:325`, aturan di `:340-342` |
| Retry Logic reviewer | `agent-md.js:465-473` |
| Input reviewer (menyebut `qa-report.md` dari "QA Agent") | `agent-md.js:192-204` |
| Salinan regex report-reader.ts | `test/reviewer-report-format.test.js:187` (`VERDICT_LINE`), `:191-197` (loose), `:202-209` (strict) |
| Test penjaga | `:212-227` (kedua parser), `:229-237` (CDR-43), `:120` (builder = isi file), `:98`, `:104` (auditor byte-for-byte; `null` untuk kind lain) |
| Kontrak QA | `agent-md.js:353-384`; salinan regex `test/qa-report-format.test.js:33-38` |

Yang harus berubah bersamaan bila template reviewer diubah:

1. `buildReviewerReportFormat` dan `REVIEWER_RETRY_LOGIC`.
2. Salinan regex dan string pengganti `'Verdict: APPROVE | CHANGES REQUESTED | DEFER'` di test `:221`.
3. `report-reader.ts` di caf-orchestrator (repo lain).
4. Kunci snapshot `.claude/agents/caf-reviewer.md`.
5. Teks parser di `piv-workflow-md.js:43-45`.
6. Gate reviewer di `run-pipeline-command.js:415`.
7. Input reviewer (`qa-report.md` / "QA Agent") bila artefak validator berganti nama.

Temuan samping: `piv-workflow-md.js:43-44` menulis token `PASS`/`NEEDS_HUMAN` untuk QA dan `READY_FOR_HUMAN_REVIEW`/`NEEDS_CHANGES` untuk Reviewer. Ini bertentangan dengan `agent-md.js:360` (`PASS | FAIL`) dan `:325` (`APPROVE | CHANGES REQUESTED | DEFER`). Tidak ada test yang menjaganya.

`test :104` mengunci "null untuk semua kind kecuali auditor/reviewer/qa", jadi menambah `validator` mengubah test itu.

---

## H. Template workflow dan teks retry

### H1. Roster

- Sumber: `readAgentRoster(agentDirPath)` (`workflow.js:16`) → `KNOWN_ROLES` (`read-agent-roster.js:11-26`), dicocokkan dengan nama file di disk.
- `piv-workflow.md`: checklist dari `roster.known` (`piv-workflow-md.js:14`). Role yang tidak ada ditulis "NOT present … TODO" (`:3`).
- `agent-handoff.md`: hanya role `present` (`agent-handoff-md.js:34-35`). File di luar `KNOWN_ROLES` masuk "Additional Agents (Custom) — artifact format not yet standard" (`:23-31`).

| Sebutan | Lokasi |
|---|---|
| qa | `read-agent-roster.js:20`; `piv-workflow-md.js:38`, `:43`; `workflow.js:26` (`readMaxRetries(dir,'qa')`, kunci `agents.qa.maxRetries` di `caf.config.yaml`); `artifact-by-role.js:9` |
| documentation | `read-agent-roster.js:22`; `artifact-by-role.js:11`; `task-completion-md.js:59-62` (hanya judul section, bukan agent) |
| discovery | `agent-handoff-md.js:10-11`; `read-agent-roster.js:23-24` |
| audit | `agent-handoff-md.js:12`; `read-agent-roster.js:25` |
| architect | `read-agent-roster.js:13`; `artifact-by-role.js:5` |

Konsekuensi:

- Role yang dihapus dari `KNOWN_ROLES` membuat file lamanya turun ke "Custom/TODO". Ini bertentangan dengan "tetap dikenali".
- Role yang dibiarkan membuat proyek baru mendapat baris "NOT present" untuk role yang sudah dibuang.
- `singleRepoOnly` (`:19`, `:54`) adalah pola yang sudah ada untuk "tampil hanya bila filenya ada".

### H2. Teks "3x"

| Lokasi | Teks | Masuk file ter-generate? |
|---|---|---|
| `agent-md.js:488` | `retry up to 3x` (Retry Logic default) | ya, syncable; mengubahnya membuat semua agent implementasi ber-baseline menjadi DRIFT |
| `discovery-commands.js:179` | `retry up to 3x` | ya (pm/ux, kind pensiun; bekukan) |
| `agents-md.js:16` | `retry (max 3x)` | ya, `AGENTS.md` |
| `piv-workflow-md.js:27` | `fix and retry (max 3x)` | ya |
| `piv-workflow-md.js:37` | `Implementation (Frontend/Backend): max 3x (CAF.md default)` | ya |
| `run-pipeline-command.js:378` | `implement → verify → fix, max 3x` | ya |
| `CAF.md:269` | `fix and retry (max 3x)` | spec |
| `CAF.md:287` | `self-verify (retry max 3x)` | spec |
| `CAF.md:417` | `retry up to N times` | spec (sudah netral) |
| README | tidak ada "3x"/"max 3" | — |

Gate QA/Reviewer di `/caf-run-pipeline` sudah `= 1` (`run-pipeline-command.js:165`, `:608`). `piv-workflow-md.js:8-10` membaca `maxRetries` dari config atau menulis TODO, tidak menebak. Mana dari baris di atas yang termasuk "gate" adalah keputusan; kode tidak membedakannya.

---

## I. Test dan snapshot

### I1. Klasifikasi (21 file)

Kelas: (a) agent/command dibuang · (b) rename qa → validator · (c) snapshot MONOREPO · (d) netral.

| File | Kelas | Rekomendasi |
|---|---|---|
| `agents-sync-drift` | d | pertahankan |
| `audit-agent-sections` | d | pertahankan |
| `curate-baseline` | d | pertahankan |
| `generate-manifest` | d | pertahankan |
| `section-diff` | d | pertahankan |
| `skills-spec` | d | pertahankan |
| `repo-context` | c (`:70`) | pertahankan; berubah hanya lewat keputusan snapshot |
| `complete-drafts` | a ringan + b | pertahankan; sesuaikan kandidat dan `CHAIN_ORDER`/`TARGETS` (`:126`) |
| `devops-kind-detection` | a | ubah menjadi "masih dikenali, tidak ditulis". Ini test anti-eskalasi; **jangan dihapus sebelum rilis penghapusan penuh** |
| `devops-menu-hidden` | a | ubah menjadi pola umum "kind pensiun disembunyikan"; hapus di rilis penuh |
| `discovery-sections` | a | ubah menjadi "masih dikenali" (IN_SYNC, sync tidak menimpa); hapus di rilis penuh |
| `retry-logic-role-aware` | a + b | bagian Discovery seperti di atas; bagian Delivery tambah `validator`. Pertahankan |
| `section-boundary-fenced-code` | a (fixture auditor) | pertahankan parser fence; pindahkan fixture ke reviewer/validator, yang juga punya fence |
| `reviewer-report-format` | a (golden auditor `:54-96`, `:98`) + b (`:104`) | pertahankan regex; golden auditor dibekukan lalu dihapus di rilis penuh |
| `qa-report-format` | b | ubah untuk validator. Simpan versi `qa` sebagai "masih dikenali" selama `caf-qa.md` lama didukung |
| `single-repo-scaffold` | a (implementer, 54 hit) + rename `/caf-run` | tulis ulang untuk default baru; `:260`, `:271` menjadi "masih dikenali" |
| `skills-templates` | a + b + rename skill | ubah tabel persis (`:68`) dan nama skill (`:51`) |
| `skills-pointer` | b + rename skill | ubah; tambah kasus pointer usang |
| `skills-scaffold` | rename skill + implementer + rename command | ubah |
| `skills-check-drafts` | rename skill + b | ubah |
| `skills-section` | b ringan | ubah; iterasi `KNOWN_KINDS` mengikuti otomatis |

Pengguna `helpers/mono-snapshot.js` (hanya `silenced` atau fixture): `complete-drafts`, `single-repo-scaffold`, `skills-*`. Hanya `repo-context` yang membandingkan snapshot.

### I2. Kunci `mono-pnpm.json` yang berubah

| Kunci | Berubah? | Sebab |
|---|---|---|
| `stack.*` | tidak | deteksi tidak disentuh |
| `files > CLAUDE.md` | tidak | 0 hit nama lama |
| `files > AGENTS.md` | hanya bila "max 3x" dikoreksi | `agents-md.js:16` |
| `files > .caf/tasks/README.md` | ya | `qa-report.md ← QA Agent` (`tasks-readme.js:21`); 1 hit architect |
| `files > .claude/commands/caf-run-pipeline.md` | ya, **nama kunci dan isi** | rename; 28 qa, 15 documentation, 6 architect; `hasArchitect`/`hasDocumentation` (`mono-snapshot.js:95-96`) |
| `files > .caf/workflows/task-completion.md` | tidak | hit "documentation" hanya judul section, bukan agent |
| `files > .caf/workflows/piv-workflow.md` | ya | roster, QA gate, 3x |
| `files > .caf/workflows/agent-handoff.md` | ya | tabel roster |
| `…/caf-planner.md` | ya | Input menyebut discovery (6 hit); lipatan architect; 3x |
| `…/caf-frontend.md`, `…/caf-backend.md` | ya | Input menyebut Architect (`agent-md.js:182`); 3x |
| `…/caf-reviewer.md` | ya | `qa-report.md from the QA Agent`; template reviewer |
| `…/caf-qa.md` | kunci hilang → `caf-validator.md` | rename |
| `…/caf-architect.md`, `caf-documentation.md`, `caf-auditor.md`, `devops.md` | kunci hilang | renderer mengiterasi semua `buildCandidates` (`mono-snapshot.js:54-78`) |

Tidak ada kunci `caf-implementer`, `caf-pm`, `caf-ux-designer` (`mono-snapshot.js:55`). 0 hit `caf-verify` di snapshot, jadi rename skill tidak menyentuhnya.

### I3. Baseline

`npm test` sekali: **tests 206, pass 206, fail 0**, skipped 0, sekitar 0,93 detik.

---

## J. Dokumentasi basi (README)

| Baris | Teks | Catatan |
|---|---|---|
| `:394-396` | "MIT. See LICENSE" | konsisten dengan `LICENSE` (MIT, © 2026 Coderium) dan `package.json`; tidak ada bukti basi (lihat bagian 5) |
| `:72` | `git clone https://github.com/coderiumid/caf-initiator.git` | sama dengan `git remote` dan `package.json`; sama, lihat bagian 5 |
| `:155`, `:323`, `:361` | `--force` | `:155` menyebut "agent definitions and their commands"; daftar command menyusut |
| `:253`, `:256-261` | UNTRACKED dan "Known issue" PM/UX Designer, QA/Reviewer | bagian Discovery harus dihapus atau ditandai legacy; QA → Validator |
| `:138` | baris tabel `feature-catalog-sync` | hapus |
| `:143` | "Agents on offer: … Architect … QA … Documentation, Auditor, PM, UX Designer" | menjadi 5 agent |
| `:158`, `:351-353` | `--role <implementer\|…>`, `caf-implementer` | ikut D2 |
| `:166`, `:182`, `:202` | `caf-verify` | menjadi `caf-self-verify` |
| `:173` | "Auditor, PM and UX Designer agents get no skills" | hapus |
| `:241` | "What to Look For (Auditor only) and Report Format (Auditor, Reviewer, QA)" | perbarui |
| `:329` | `/caf-run-pipeline` | menjadi `/caf-run` |
| `:333` | orchestrator memanggil `caf-qa`, `caf-documentation` | bergantung repo orchestrator |
| `:101` | ignore rule `.caf/discovery/*/`, `.caf/audits/*/` | masih ditulis `04-generate-drafts.js:33-41`; keputusan terpisah |
| — | "interactive menu" | **tidak ditemukan** di README (grep `menu` kosong) |

Di luar README: `CAF.md` punya 18 hit nama lama (termasuk `:68`, `:711`). `CLAUDE.md` proyek memuat bagian Discovery, devops, dan implementer yang akan basi.

---

## 3. Matriks dampak

| Perubahan | File src | File test | Snapshot | Repo target terpasang | Risiko |
|---|---|---|---|---|---|
| Rename qa → validator | `agent-sections.js`, `agent-md.js` (semua builder), `artifact-by-role.js`, `skill-md.js`, `read-agent-roster.js`, `agents.js`, `run-pipeline-command.js`, `workflow.js`, `piv-workflow-md.js`, `tasks-readme.js`, `canonical-sections.js`, `ticket-preview-commands.js` | `qa-report-format`, `reviewer-report-format`, `retry-logic-role-aware`, `skills-*` (5), `complete-drafts`, `single-repo-scaffold` | `caf-qa.md` → kunci baru; reviewer, run, piv, handoff, tasks README | `caf-qa.md` tetap; `caf-validator.md` UNTRACKED; dua agent berdampingan; nama yang dipanggil orchestrator tidak diketahui | **Tinggi** |
| Buang 6 agent | `agents.js:130-237`, `agent-md.js`, `agent-sections.js`, `read-agent-roster.js`, `agent-handoff-md.js`, `skill-md.js`, `artifact-by-role.js` | `devops-*` (2), `discovery-sections`, `retry-logic-role-aware`, `section-boundary-fenced-code`, `reviewer-report-format`, `skills-templates` | 4 kunci agent hilang; frontend, backend, planner, piv, handoff berubah | file lama: eskalasi teks lewat sync bila kind keluar dari `KNOWN_KINDS` (A2) | **Tinggi** |
| Buang 8 command | `agents.js:43-48`, `:710-756`; `scaffold.js:11`, `:30`, `:135`; `audit.js:134-149`; `index.js:56`; mati: `feature-catalog*.js`, `architecture-signatures.js`, `audit-commands.js`, `discovery-to-ticket.js`, 3 builder preview | `discovery-sections`, `reviewer-report-format` (teks golden) | tidak langsung (command itu tidak ada di snapshot) | file command lama tinggal, tidak diperbarui; referensi silang dari agent lama tetap hidup | Sedang |
| Rename `/caf-run` | 5 file src (35 hit) | `single-repo-scaffold`, `skills-scaffold`, `helpers/mono-snapshot.js` | nama kunci + 5 hit body | dua command berdampingan, tanpa deteksi | Rendah-sedang |
| Rename `caf-self-verify` | `skill-md.js` (9), `skills.js` (1) | 5 file `skills-*` (46 hit) | tidak ada | pointer usang tanpa deteksi; dua skill verifikasi; FAIL hanya bila folder lama dihapus | Sedang |
| SINGLE_REPO tanpa implementer | `agents.js:274-304`, `:371-392`; `index.js:67-80`; `read-agent-roster.js`; `agent-md.js`; `skill-md.js`; `artifact-by-role.js` | `single-repo-scaffold` (17 test), `skills-scaffold`, `complete-drafts` | tidak ada | `caf-implementer.md` lama tidak eskalasi, tetapi roster berubah; default baru belum diputuskan | **Tinggi** (perilaku) |

---

## 4. Pemecahan tiket

### SDD-03a — fondasi aman

File tersentuh: `utils/agent-sections.js`, `templates/agent-md.js`, `templates/artifact-by-role.js`, `templates/skill-md.js`, `utils/read-agent-roster.js`, `commands/agents.js` (hanya penambahan), `templates/ticket-preview-commands.js`, `templates/piv-workflow-md.js`, plus test `qa-report-format`, `reviewer-report-format`, `skills-templates`, `skills-section`, `devops-kind-detection`, dan test baru.

Urutan:

1. Tulis test penjaga lebih dulu, sebelum kode berubah. Untuk setiap kind lama: file ter-generate + baseline → `curate sync` membiarkannya byte-identik, dan `detectKind` tidak pernah mengembalikan `implementation`. Polanya sudah ada di `devops-kind-detection.test.js:121`.
2. Tambah daftar kind pensiun. `KNOWN_KINDS` dan builder lama tidak disentuh.
3. Tambah `validator` sekaligus di semua tempat dalam satu commit: `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, `TOOLS_BY_KIND` + rationale, cabang Input/Output/Retry/ReportFormat, `ARTIFACT_BY_ROLE`, `SKILLS_BY_KIND`, `KNOWN_ROLES`. Tambah test "builder = isi file" dan salinan regex.
4. Ubah template reviewer bersama salinan regex-nya, dan selaraskan `piv-workflow-md.js:43-45`.
5. Tambah builder `/caf-plan` (lihat C2). Belum menghapus apa pun.
6. Putuskan dan uji perilaku `caf-qa.md` lama.

### SDD-03b — berhenti menulis

File tersentuh: `commands/agents.js`, `commands/scaffold.js`, `commands/audit.js`, `index.js`, `templates/run-pipeline-command.js` (+ rename file), `fix-review-command.js`, `review-command.js`, `skill-md.js`, `skills.js`, `agents-md.js`, `tasks-readme.js`, `canonical-sections.js`, file mati (C3), semua test kelas a/b, snapshot, `helpers/mono-snapshot.js`, README, CAF.md, CLAUDE.md.

Urutan:

1. Saring kandidat pensiun dari menu dan dari `PREVIEW_COMMANDS`; hapus blok auditor/pm.
2. SINGLE_REPO: tetapkan default baru. `caf-implementer.md` lama tetap dikenali.
3. Rename `/caf-run` dan `caf-self-verify`, plus peringatan untuk file atau pointer lama.
4. `allowed-tools`: `caf-qa-check` hilang (Bash bebas); tinjau `Bash(gh api:*)` di `fix-review-command.js:32`.
5. Koreksi teks 3x. Untuk `agent-md.js:488` nyatakan eksplisit bahwa ini memicu DRIFT massal.
6. Hapus kode mati. Jangan sentuh `discovery-commands.js` dan `audit-report-format.js`.
7. Konversi test.
8. Regenerasi snapshot sebagai commit tersendiri dengan keputusan eksplisit, paling akhir.

### Wajib lebih dulu, agar tidak ada jendela hak akses melebar

1. Test penjaga (03a langkah 1) harus merge sebelum perubahan apa pun pada `KNOWN_KINDS` atau builder.
2. Jangan mengeluarkan kind dari `KNOWN_KINDS` di 03a maupun 03b. Itu hanya boleh di rilis penghapusan penuh, dan baru setelah fallback `implementation` (`agent-sections.js:96`) diganti dengan "tak dikenal → lewati".
3. `validator` tidak boleh di-commit setengah. `KNOWN_KINDS` tanpa cabang builder menghasilkan agent `tools: [Read]` dengan kontrak `SUCCESS`. Cabang builder tanpa `KNOWN_KINDS` membuat file dianggap `implementation`.
4. Builder kind pensiun dibekukan. Perubahan teks sekecil apa pun menimpa file lama lewat DRIFT.
5. `discovery-commands.js` dan `audit-report-format.js` tidak boleh ikut pembersihan kode mati selama pm/ux/auditor masih dikenali.

---

## 5. Tidak diketahui / dilewati

| Hal | Alasan |
|---|---|
| Asal `-- --ci` di umkm-pos | tidak ada template yang menghasilkannya; repo umkm-pos tidak diaudit. Kemungkinan tulisan tangan atau hasil AI lewat `/caf-complete-drafts`, tidak terbukti |
| Regex terkini di `report-reader.ts`; apakah orchestrator akan memanggil `caf-validator`; nama artefak (`qa-report.md`?) dan kunci config (`agents.qa.maxRetries`?) | repo caf-orchestrator di luar cakupan; yang ada di sini hanya salinan |
| Nasib `caf-plan-ticket` terhadap `/caf-plan` (rename, pengganti, atau berdampingan) | tidak disebut dalam keputusan |
| Default SINGLE_REPO pengganti `implementer` | belum diputuskan; kode tidak punya jalur alternatif |
| Baris "3x" mana yang termasuk "retry gate default 1" | kode hanya punya gate `= 1` di run-pipeline; sisanya self-retry implementasi |
| Apa yang basi pada lisensi dan URL clone README | keduanya konsisten dengan `LICENSE`, `package.json`, dan `git remote`; nilai yang diinginkan tidak ada di repo |
| "interactive menu" di README | tidak ditemukan; mungkin sudah dihapus atau ada di dokumen lain |
| Keadaan nyata repo target (umkm-pos, coderium-web-v2): ada manifest atau tidak, pointer apa yang terpasang | tidak diakses; dampak diturunkan dari kode |
| Output `scaffold agents --dry-run` end-to-end | perintah interaktif (multiselect `prompts`), tidak dijalankan. Yang dijalankan: `scaffold task-completion --dry-run` dan `scaffold skills --dry-run` pada salinan fixture, serta evaluasi fungsi murni |
| Isi penuh body `run-pipeline-command.js`, `audit-commands.js`, `discovery-to-ticket.js`, `feature-catalog.js`, `review-command.js`, `fix-review-command.js` | hanya frontmatter, allowed-tools, dan baris hasil grep yang dibaca. Referensi silang lain di body mungkin ada |
| Jumlah test per file | grep `^test(` memberi 188, runner melaporkan 206; selisih 18 tidak ditelusuri |
| `scripts/release.sh` dan isi `.ai/tasks/` | tidak dibaca; di luar daftar audit |
