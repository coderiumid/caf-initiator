# Verify report — CAF-INIT-DOCS-REMOVE

Perintah memakai `node src/index.js` (bin `caf-init` dari `package.json`), sesuai D5. AC-6 dihapus oleh amendment-1 (tidak ada lint/build di `package.json`).
Output scaffold/curate di bawah dipotong dari kode warna ANSI.

## Hasil per AC

### AC-1 — `docs` tidak ada di help — LULUS
```
$ node src/index.js --help | grep -cE '^\s+docs\b'
0
```

### AC-3 — `scaffold` tanpa target sampai selesai, tanpa dokumen docs — LULUS
Fixture `test/fixtures/mono-pnpm` disalin ke direktori temporer. Prompt dijawab dengan Enter (`printf '\r'` berulang).
```
$ node src/index.js scaffold --dir <tmp>/ac3     # exit=0
scaffold — summary
  ✓ Setup — 5 written, 0 skipped (already exist)
  ✓ Golden Examples Selector — 0 written, 0 skipped (already exist)
  ✓ ADR Draft Generator — 0 written, 0 skipped (already exist)
  ✓ Agent Definitions Scaffolder — 0 written, 0 skipped (already exist)
  ✓ Task Completion Generator — 1 written, 0 skipped (already exist)
  ✓ Workflow Docs Generator — 0 written, 0 skipped (already exist)
  ✓ AI Draft Completion Command Generator — 1 written, 0 skipped (already exist)
$ find <tmp>/ac3 -type f -not -path '*/apps/*'
.caf/knowledge/INDEX.md  .caf/tasks/README.md  .caf/workflows/task-completion.md
.claude/commands/caf-complete-drafts.md  .gitignore  AGENTS.md  CLAUDE.md  README.md
package.json  pnpm-lock.yaml  pnpm-workspace.yaml
$ ls <tmp>/ac3/docs
ls: No such file or directory
```
Catatan: Enter saja memilih nol agent dan nol golden example (default prompt), jadi langkah itu "0 written". Pengujian ini membuktikan rantai selesai dengan exit 0 dan tanpa `docs/`; ia tidak membuktikan isi agent.

### AC-4 — `curate --audit-only` — LULUS
Fixture sama, ditambah `scaffold agents` (planner, validator, reviewer, frontend, backend; jawaban `a` + Enter) dan `scaffold workflow`.
```
$ node src/index.js curate --audit-only --dir <tmp>/ac4     # exit=0
Layer 1 (Knowledge Base)
  ✓ CLAUDE.md — already in sync
  ✓ AGENTS.md — already in sync
  ✓ .caf/knowledge/INDEX.md — already in sync
Layer 2 ... (UNTRACKED per section, belum ada manifest; bukan gap)
Summary: 0 required gap(s), 0 optional document(s) missing, ...
$ <laporan> | grep -ciE "docs/|prd\b|erd\.|system-overview|api-contract|testing-strategy|caf-init docs"
0
```
Sebelum perubahan, laporan yang sama memuat 5 gap `missing (optional)` dengan `syncCommand: caf-init docs`.

### AC-5 — test — LULUS
```
$ npm test
# tests 1037   # pass 1037   # fail 0   # cancelled 0   # skipped 0
```
Tidak ada test khusus `docs`/`reference-docs` sebelumnya. Test yang disesuaikan: `single-repo-scaffold` (`--mode` pada `scaffold`, `curate`), `sdd03f-stale-text` (optionalGaps tidak lagi memuat `docs/testing-strategy.md`), `complete-drafts` (`listDraftFiles` tidak lagi memuat `docs/product/prd.md`).

### AC-7 — `complete-drafts` — LULUS
`scaffold complete-drafts --help` tidak punya daftar target; daftarnya ada di `listDraftFiles`. Hasil di repo AC-4 sesudah perubahan:
```
[ 'CLAUDE.md', 'AGENTS.md', '.caf/tasks/README.md', '.caf/workflows/task-completion.md' ]
```
(plus agent, `RULES.md`, ADR, skill bila ada). Tidak memuat dokumen docs. Daftar tidak kosong.

### AC-2, AC-8, AC-9, AC-10
Ditulis setelah Task 7 (lihat bagian "Task 7" di bawah).

## Klasifikasi fixture (D3)

Sebelum perubahan, `grep -rlF "caf-init docs" test/fixtures` menemukan 14 file, ditambah 4 laporan curate (`syncCommand: "caf-init docs"`). Teks yang dihapus Task 4 (blok dokumen docs di `/caf-complete-drafts`) ada di 20 file lain. Tidak satu pun dikunci sha256 (`caf-design`, `caf-spec`, dsb. tidak disentuh; seluruh test lulus).

### Golongan (a) — diperbarui, hanya baris terkait (26 file unik, +38/−178; 12 file ada di dua commit)
| Commit | File | Perubahan |
|---|---|---|
| `dfaa48f` | `pre-sdd03c1/curate-old-repo.{mono-pnpm,single-nuxt}.json`, `pre-sdd03g/curate.{known-only,with-custom}.json` | hapus 5 entri gap `docs/...` (`syncCommand: "caf-init docs"`), `optionalGaps` 5 → 0. Output `curate` nyata berubah. |
| `5e17ef9` | 20 file: `pre-sdd03b3/commands.*`, `pre-sdd03c2/commands.*`, `pre-sdd03c2c/commands.*` (4), `pre-sdd03c2b/*` (4), `pre-sdd03c3/*` (4), `pre-sdd03g/scaffold.*` (4) | hapus 2 blok teks di `caf-complete-drafts.md`: blok `docs/architecture/system-overview.md, docs/testing-strategy.md, docs/api-contract.md, docs/schema/erd.md` dan 2 baris `docs/product/prd.md` / `docs/product/features/*.md` di "Never invent". Satu baris JSON per file berubah. |
| `170516b` | 14 file: `pre-sdd03c2/index.*` (2), `pre-sdd03c3/*` (4), `pre-sdd03g/scaffold.*` (4), `pre-sdd03c2b/*` (4) | hapus penutup INDEX.md: "Run `caf-init docs` to generate empty placeholders ... (optional ... never a hard requirement)." |

Diff lengkap: `git show dfaa48f 5e17ef9 170516b -- test/fixtures`. Contoh (`curate-old-repo.mono-pnpm.json`):
```
-          {
-            "status": "gap",
-            "filePath": "docs/product/prd.md",
-            "message": "missing (optional)",
-            "syncCommand": "caf-init docs",
-            "severity": "optional"
-          },   (x5: prd, system-overview, erd, testing-strategy, api-contract)
-    "optionalGaps": 5,
+    "optionalGaps": 0,
```
Format JSON tiap file dipertahankan (indent 1 spasi di `pre-sdd03c3/*`, 2 spasi lainnya); `git diff --numstat` hanya menunjukkan baris terkait.

**Penyimpangan dari D3, perlu persetujuan:** D3 mendefinisikan golongan (a) sebagai fixture yang memuat `caf-init docs`. Ke-20 file di baris `5e17ef9` tidak memuat string itu; mereka berubah karena Task 4 ("keluarkan dokumen docs dari daftar target complete-drafts") mengubah teks `/caf-complete-drafts`. Aku mengklasifikasikannya (a) karena itu instruksi kepada AI/pengguna yang berubah nyata, dan perubahannya murni penghapusan baris. Bila kamu menganggapnya di luar D3, balikkan commit `5e17ef9` dan target complete-drafts tetap menyebut dokumen docs.

### Golongan (b) — dibiarkan
- `snapshots/mono-pnpm.json` (planner `## Input`, D1; tidak memuat INDEX.md atau complete-drafts).
- Semua `pre-sdd*/planner.*.json` (`Optional — Layer 1 reference docs`, D1), `pre-sdd05a/run-pipeline.json`, `pre-sdd03c2/run-pipeline.json` (cocok regex `scaffold.*docs` karena kata lain; tidak memuat `caf-init docs`).
- `frozen-kinds/architect.*` (memuat `system-overview` sebagai petunjuk pasif); `pm.*`, `ux-designer.*` (`prd.md`, discovery).
- `pre-sdd03b3/commands.*` baris `caf-feature-catalog-sync.md` (menyebut `docs/feature-catalog.md`, bukan salah satu dari enam dokumen).

## Temuan di luar scope
1. `src/templates/discovery-commands.js:35-36, 58-59` menyebut `docs/product/prd.md` untuk agent PM/UX (tidak lagi di-scaffold). Golden `frozen-kinds` memegangnya (D6).
2. Planner `## Input` (`agent-md.js:86, 119-147`) dan skill `caf-design` (`skill-md.js:443`) tetap menyebut path docs sebagai bacaan pasif (D1, D2). Pengecualian AC-8.
3. **Harus selesai sebelum `npm publish`:** `.caf/knowledge/INDEX.md` tetap berisi tabel status 5 dokumen docs (`KNOWLEDGE_INDEX_DOCS`) dan `scaffold` menulisnya. Tabel itu menampilkan ✗ missing untuk dokumen yang tidak bisa lagi di-scaffold. Hanya baris "Run `caf-init docs`" yang dihapus (Task 5). Bahan tiket penyederhanaan `knowledge/`, empat titik keterkaitan:
   1. `test/sdd03c2b-planner-clarify.test.js:319` membandingkan INDEX.md dengan golden sampai heading `## Reference Documents`.
   2. `test/sdd03c2-validator-default.test.js:385` mensyaratkan teks `Reference Documents`.
   3. `src/steps/04-generate-drafts.js:6,54-55` memakai `KNOWLEDGE_INDEX_DOCS` dan `exists()` per dokumen; ekspor itu di `knowledge-index-md.js` ikut jadi kode mati.
   4. Laporan `curate` Layer 1: `audit.js:91` memeriksa INDEX.md dengan daftar heading kanonik kosong (`canonical-sections.js`, cabang default). Bila seluruh section `## Reference Documents` dihapus, file tak punya heading `##` dan baris `✓ INDEX.md` hilang dari laporan; bila heading dipertahankan, laporan tetap.
   14 golden INDEX.md juga ikut berubah (sama dengan `170516b`).
4. `listDraftFiles`/`INDEX.md` masih memakai ekspor `KNOWLEDGE_INDEX_DOCS`; `src/commands/audit.js` masih punya mekanisme `severity: 'optional'` (`optionalGaps`) walau tak ada lagi entri optional. Dibiarkan agar bentuk laporan tidak berubah.
5. `CAF.md:73-108, 223, 352-377, 494-496, 585-587, 928` masih menjelaskan dokumen docs sebagai konsep Layer 1 opsional (pasif, P2). `src/templates/task-completion-md.js:62` memakai `api-contract.md` sebagai contoh bebas.
6. Tidak ada `CHANGELOG.md` (D5: tidak dibuat). Tidak ada lint/build.
7. Satu commit tambahan di luar daftar task: `CAF-INIT-DOCS-REMOVE: drop PRD from the complete-drafts console hints` (dua pesan konsol di `complete-drafts.js` dan `check-drafts.js` masih menyebut PRD sebagai sesuatu yang ditanyakan command). Akibat langsung Task 4.
8. `pm.single-nuxt` dkk. dan `test/discovery-sections.test.js` tidak disentuh.

## Task 7 — AC-2, AC-8, AC-9, AC-10

### AC-2 — LULUS (versi D5)
```
$ grep -rnF "caf-init docs" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai .
(0 baris; per direktori: src 0, README.md 0, CLAUDE.md 0, CAF.md 0, test 0)
```
Regex asli requirements (`scaffold.*docs|layer 1 reference`) masih menemukan sisa yang sah, dikecualikan oleh D1/D2/D3(b):
- `src/templates/agent-md.js:86,119` dan `test/sdd02d`/`sdd02e` + golden/snapshot planner: heading planner `Optional — Layer 1 reference docs` (D1).
- `src/templates/knowledge-index-md.js:26` dan golden INDEX.md: kalimat "Status bridge into Layer 1 reference documents" (petunjuk pasif, P2).
- `CAF.md:494, 928`: spesifikasi CAF, bukan output caf-init (P2).
- `README.md:119`: catatan penghapusan (kata `scaffolded` + `docs`).

### AC-8 (versi D5) — LULUS dengan pengecualian
Tidak ada template yang menyuruh menjalankan `caf-init docs` (0 hasil di `src`) atau menyatakan dokumen docs wajib. Pengecualian eksplisit D1 (planner `## Input`) dan D2 (`caf-design`, `skill-md.js:443`) tetap menyebut path docs sebagai bacaan opsional.

### AC-9 — LULUS (versi D5)
README tidak lagi mendokumentasikan `docs` sebagai command aktif (entri TOC, baris tabel command, bagian `### caf-init docs` dan sebutan `--mode` dihapus). `README.md:119` mencatat penghapusannya. Tidak ada CHANGELOG (D5). Penghapusan juga tercatat di pesan commit `c7a1277`.
```
$ grep -niE "docs" README.md
5/88/119: kalimat umum, catatan penghapusan; 353-354: aturan check-drafts untuk file milik pengguna di docs/
```

### AC-10 — LULUS
```
$ git status --short            (kosong sebelum commit laporan ini)
$ git log --oneline origin/HEAD..HEAD
10 commit lokal (daftar di laporan akhir); tidak ada push, publish, atau PR.
```
File yang berubah: `src/` (index, audit, complete-drafts, check-drafts, 2 template; 2 file dihapus), `test/` (3 test, 26 fixture golongan a), `README.md`, `CLAUDE.md`, `CAF.md` (D6), `.ai/tasks/CAF-INIT-DOCS-REMOVE/`. Tidak ada file di luar scope; `requirements.md` tidak diedit.

## Task 8 — dibatalkan (opsi C)

Task 8 (hapus tabel status 5 dokumen docs dari template INDEX.md) dibatalkan atas keputusan manusia. Tidak ada kode yang diubah. Alasan: perubahannya merembet ke dua test (`sdd03c2b-planner-clarify.test.js:319`, `sdd03c2-validator-default.test.js:385`), step 04 (`KNOWLEDGE_INDEX_DOCS`), dan laporan `curate` Layer 1, sehingga melewati syarat "hanya template INDEX.md dan golden-nya". Penyelesaiannya dipindah ke tiket penyederhanaan `knowledge/` (temuan 3 di atas). Test dan AC tidak dijalankan ulang karena tidak ada kode yang berubah sejak laporan terakhir.

# Task 10-11 — scaffold `knowledge/` dan `tasks/` (Amendment 2)

Perintah memakai `node src/index.js`. Commit sebelum Task 10: `d8fe450`. Rentang review: `d8fe450..HEAD`.
Pengecekan manual: salinan fixture `mono-pnpm` di direktori scratchpad, `scaffold` penuh lewat CLI sebenarnya (pty, Enter di setiap prompt, satu agent dipilih: Planner).

## Hasil `npm test` (setelah Task 10 dan perbaikan `1c11924`)
```
$ npm test
# tests 1037
# pass 1037
# fail 0
# skipped 0
```
Sebelum perubahan (HEAD `c2e2d5b`): 1037 lulus. Jumlah tidak berubah: tidak ada test yang dihapus, hanya diedit. Sempat ada 2 test merah di commit `4083f09` (`complete-drafts.test.js`), diperbaiki di `1c11924`.

## Scaffold penuh di salinan fixture (satu agent dipilih)
Hasil `.caf/` dan `.claude/`:
```
.caf/.generate-manifest.json
.caf/tasks/README.md
.caf/workflows/{agent-handoff,piv-workflow,task-completion}.md
.claude/agents/caf-planner.md
.claude/commands/{caf-complete-drafts,caf-plan}.md
```
Tidak ada `.caf/knowledge/` sama sekali (bukan folder kosong, bukan `INDEX.md`). Ringkasan scaffold: `Setup — 4 written` (CLAUDE.md, AGENTS.md, tasks/README.md, .gitignore; sebelumnya 5).

## Perubahan kode (diff)
```diff
diff --git a/src/commands/audit.js b/src/commands/audit.js
--- a/src/commands/audit.js
+++ b/src/commands/audit.js
@@ -87,12 +87,6 @@ function auditKnowledgeBase(dir, stack) {
   entries.push(
     ...auditSingleFile(dir, 'AGENTS.md', 'agents-md', { createCommand: 'caf-init scaffold', partialSyncCommand: null })
   );
-  entries.push(
-    ...auditSingleFile(dir, path.join('.caf', 'knowledge', 'INDEX.md'), 'knowledge-index-md', {
-      createCommand: 'caf-init scaffold',
-      partialSyncCommand: null,
-    })
-  );
 
   // RULES.md is a mandatory pair for every non-empty .caf/knowledge/golden-examples/{{app}}/
   // folder (CAF.md Layer 1) — same rule golden-examples.js already enforces.
diff --git a/src/steps/04-generate-drafts.js b/src/steps/04-generate-drafts.js
--- a/src/steps/04-generate-drafts.js
+++ b/src/steps/04-generate-drafts.js
@@ -1,9 +1,8 @@
 import path from 'node:path';
-import { appendLinesIfMissing, ensureDir, exists, section, writeIfAbsent } from '../util.js';
+import { appendLinesIfMissing, section, writeIfAbsent } from '../util.js';
 import { buildClaudeMd } from '../templates/claude-md.js';
 import { buildAgentsMd } from '../templates/agents-md.js';
 import { buildTasksReadme } from '../templates/tasks-readme.js';
-import { buildKnowledgeIndexMd, KNOWLEDGE_INDEX_DOCS } from '../templates/knowledge-index-md.js';
 
 /**
  * Step 4: generate draft knowledge-base files. Never overwrites existing files.
@@ -47,13 +46,5 @@ export function generateDrafts({ dir, dryRun, stack, tracker }) {
     gitignorePath
   );
 
-  ensureDir(path.join(dir, '.caf', 'knowledge', 'decisions'), { dryRun });
-  ensureDir(path.join(dir, '.caf', 'knowledge', 'golden-examples'), { dryRun });
-
-  const indexPath = path.join(dir, '.caf', 'knowledge', 'INDEX.md');
-  const items = KNOWLEDGE_INDEX_DOCS.map((doc) => ({ ...doc, exists: exists(path.join(dir, doc.path)) }));
-  const indexMd = buildKnowledgeIndexMd({ items });
-  track(writeIfAbsent(indexPath, indexMd, { dryRun }), indexPath);
-
   return { written, skipped };
 }
diff --git a/src/templates/knowledge-index-md.js b/src/templates/knowledge-index-md.js
deleted file mode 100644
--- a/src/templates/knowledge-index-md.js
+++ /dev/null
@@ -1,37 +0,0 @@
-// .caf/knowledge/INDEX.md — a status bridge into the project-owned docs/ reference material
-// (CAF.md AC2). CAF never writes into docs/; this file just links to the standard optional docs
-// and reports ✓/✗ so an agent can see at a glance what's available without probing the
-// filesystem itself.
-export const KNOWLEDGE_INDEX_DOCS = [
-  { label: 'PRD', path: 'docs/product/prd.md' },
-  { label: 'System Overview', path: 'docs/architecture/system-overview.md' },
-  { label: 'ERD', path: 'docs/schema/erd.md' },
-  { label: 'Testing Strategy', path: 'docs/testing-strategy.md' },
-  { label: 'API Contract', path: 'docs/api-contract.md' },
-];
-
-function statusRow({ label, path: relPath, exists }) {
-  const mark = exists ? '✓ present' : '✗ missing';
-  return `| ${label} | \`${relPath}\` | ${mark} |`;
-}
-
-/**
- * `items` — KNOWLEDGE_INDEX_DOCS entries annotated with `exists` (caller checks the filesystem;
- * this module stays pure/testable).
- */
-export function buildKnowledgeIndexMd({ items }) {
-  const rows = items.map(statusRow).join('\n');
-  return `# Knowledge Index
-
-> Status bridge into Layer 1 reference documents in \`docs/\` — project-owned, read-only for CAF
-> (see CAF.md Layer 1). This file is generated by \`caf-initiator\`, but the content of the
-> documents linked below is NOT — that remains the responsibility of the Product/Architecture
-> team, read when available, never a hard requirement before the pipeline runs.
-
-## Reference Documents
-
-| Dokumen | Path | Status |
-|---|---|---|
-${rows}
-`;
-}
```

## Perubahan test (diff)
```diff
diff --git a/test/complete-drafts.test.js b/test/complete-drafts.test.js
index 25aadb6..6bf4ebd 100644
--- a/test/complete-drafts.test.js
+++ b/test/complete-drafts.test.js
@@ -171,6 +171,7 @@ test('listDraftFiles: only files that exist, including RULES.md, and never the d
   const dir = await scaffold({ withCommand: false });
   fs.mkdirSync(path.join(dir, 'docs', 'product'), { recursive: true });
   fs.writeFileSync(path.join(dir, 'docs', 'product', 'prd.md'), '# PRD\n');
+  fs.mkdirSync(path.join(dir, '.caf', 'knowledge', 'golden-examples'), { recursive: true });
   fs.writeFileSync(path.join(dir, '.caf', 'knowledge', 'golden-examples', 'RULES.md'), buildRulesMd({ entries: [] }));
   const drafts = await listDraftFiles(dir);
   assert.ok(!drafts.includes('docs/product/prd.md'));
@@ -248,6 +249,7 @@ test('check-drafts: leftover placeholder fails; runtime tokens do not', async ()
 test('check-drafts: golden-example path must exist (FAIL); a missing path cited in prose is only a WARN', async () => {
   const dir = await scaffold();
   const rules = '.caf/knowledge/golden-examples/RULES.md';
+  fs.mkdirSync(path.join(dir, '.caf', 'knowledge', 'golden-examples'), { recursive: true });
   fs.writeFileSync(
     path.join(dir, rules),
     buildRulesMd({
diff --git a/test/sdd03c2-validator-default.test.js b/test/sdd03c2-validator-default.test.js
index 4445593..aef6b2c 100644
--- a/test/sdd03c2-validator-default.test.js
+++ b/test/sdd03c2-validator-default.test.js
@@ -378,19 +378,12 @@ for (const fixture of FIXTURE_NAMES) {
     assert.match(input, /App-tag requirement/);
   });
 
-  test(`AC-11: ${fixture} — INDEX.md does not name the PM Agent, the review commands not /caf-review-ticket`, async () => {
+  test(`AC-11: ${fixture} — INDEX.md is no longer scaffolded (CAF-INIT-DOCS-REMOVE), the review commands do not name /caf-review-ticket`, async () => {
     const set = await renderDefaultFileSet({ fixture });
-    const index = read(set.dir, '.caf/knowledge/INDEX.md');
-    assert.ok(!/PM Agent/.test(index));
-    assert.ok(index.includes('Reference Documents'), 'the rest of the file is there');
+    assert.ok(!fs.existsSync(path.join(set.dir, '.caf/knowledge/INDEX.md')));
     for (const name of ['caf-review.md', 'caf-fix-review.md']) {
       assert.ok(!/caf-review-ticket/.test(read(set.dir, `.claude/commands/${name}`)), name);
     }
-    const old = golden(`index.${fixture}.json`).content;
-    const lines = old.split('\n').filter((l) => !/PM Agent/.test(l));
-    for (const line of lines.filter((l) => l.trim() && !/^per-feature drafts|^necessarily final|^\*\*Difference|^the opposite/.test(l))) {
-      assert.ok(index.includes(line), `still present: ${line}`);
-    }
   });
 }
 
diff --git a/test/sdd03c2b-planner-clarify.test.js b/test/sdd03c2b-planner-clarify.test.js
index 4bc3245..e780ec6 100644
--- a/test/sdd03c2b-planner-clarify.test.js
+++ b/test/sdd03c2b-planner-clarify.test.js
@@ -120,7 +120,7 @@ for (const id of DEFAULT_IDS) {
 // ---------------------------------------------------------------------------------------------
 
 for (const { id } of CONTENT_VARIANTS) {
-  test(`AC-4: ${id} — the planner differs from the pre-ticket golden in ## Output and ## Constraints only; every other file, agents included, is byte-identical (INDEX.md aside: AC-7)`, () => {
+  test(`AC-4: ${id} — the planner differs from the pre-ticket golden in ## Output and ## Constraints only; every other file, agents included, is byte-identical`, () => {
     const before = golden(id);
     const after = now[id];
     // CAF-SDD-03c2c: /caf-plan-ticket is not written and /caf-run-pipeline is /caf-run.
@@ -141,7 +141,7 @@ for (const { id } of CONTENT_VARIANTS) {
     assert.match(newPlanner, /^tools: \[Read, Write, Glob, Grep\]$/m);
 
     for (const rel of Object.keys(before.files)) {
-      if (rel === PLANNER || rel === INDEX) continue;
+      if (rel === PLANNER) continue;
       assert.equal(after.files[rel], before.files[rel], `${rel} must stay byte-identical`);
     }
   });
@@ -309,16 +309,9 @@ for (const fixture of FIXTURE_NAMES) {
 // ---------------------------------------------------------------------------------------------
 
 for (const id of DEFAULT_IDS) {
-  test(`AC-7: ${id} — INDEX.md has no reference to .caf/discovery/ and is otherwise the pre-ticket text`, () => {
-    const index = now[id].files[INDEX];
-    assert.doesNotMatch(index, /\.caf\/discovery/);
-    assert.doesNotMatch(index, /Discovery/);
-    const old = golden(id).files[INDEX];
-    assert.match(old, /\.caf\/discovery\//, 'the golden still has the reference');
-    const from = old.indexOf('**Difference from');
-    const to = old.indexOf('## Reference Documents');
-    assert.ok(from > 0 && to > from);
-    assert.equal(index, old.slice(0, from) + old.slice(to));
+  test(`AC-7: ${id} — INDEX.md is no longer scaffolded, so it holds no .caf/discovery/ reference (CAF-INIT-DOCS-REMOVE)`, () => {
+    assert.equal(INDEX in now[id].files, false);
+    assert.equal(INDEX in golden(id).files, false);
   });
 }
 
diff --git a/test/sdd03c3-single-repo-roster.test.js b/test/sdd03c3-single-repo-roster.test.js
index 30a071c..b5419d1 100644
--- a/test/sdd03c3-single-repo-roster.test.js
+++ b/test/sdd03c3-single-repo-roster.test.js
@@ -59,9 +59,10 @@ const RUN_PIPELINE = '.claude/commands/caf-run.md';
 const COMPLETE_DRAFTS = '.claude/commands/caf-complete-drafts.md';
 const HANDOFF = '.caf/workflows/agent-handoff.md';
 const PIV = '.caf/workflows/piv-workflow.md';
-// The two files CAF-SDD-03c2b changed on purpose (the planner's Output and Constraints, INDEX.md):
-// test/sdd03c2b-planner-clarify.test.js compares them against a golden of its own.
-const CHANGED_BY_03C2B = ['.claude/agents/caf-planner.md', '.caf/knowledge/INDEX.md'];
+// The file CAF-SDD-03c2b changed on purpose (the planner's Output and Constraints):
+// test/sdd03c2b-planner-clarify.test.js compares it against a golden of its own. (INDEX.md, the
+// other file it changed, is no longer scaffolded and is gone from the goldens.)
+const CHANGED_BY_03C2B = ['.claude/agents/caf-planner.md'];
 
 /** Lines printed by `fn` (colour codes removed), console.log restored afterwards. */
 async function printed(fn) {
diff --git a/test/single-repo-scaffold.test.js b/test/single-repo-scaffold.test.js
index 910e1cc..5d0f357 100644
--- a/test/single-repo-scaffold.test.js
+++ b/test/single-repo-scaffold.test.js
@@ -89,7 +89,6 @@ test('SINGLE_REPO scaffold on a Nuxt single package is complete and leaves no un
     'CLAUDE.md',
     'AGENTS.md',
     '.caf/tasks/README.md',
-    '.caf/knowledge/INDEX.md',
     '.claude/agents/caf-planner.md',
     '.claude/agents/caf-frontend.md',
     '.claude/agents/caf-backend.md',
@@ -105,8 +104,10 @@ test('SINGLE_REPO scaffold on a Nuxt single package is complete and leaves no un
   assert.deepEqual(generated.filter((f) => path.basename(f) === 'CLAUDE.md'), ['CLAUDE.md']);
   assert.ok(!generated.includes('.claude/agents/caf-implementer.md'));
   assert.ok(!generated.includes('.claude/agents/.md'));
-  // golden-examples has no per-app subfolder in SINGLE_REPO.
-  assert.deepEqual(fs.readdirSync(path.join(dir, '.caf', 'knowledge', 'golden-examples')), []);
+  // Neither INDEX.md nor the empty knowledge/ folders are scaffolded (CAF-INIT-DOCS-REMOVE):
+  // `scaffold golden-examples` and `scaffold adr` create their folder when they write.
+  assert.ok(!generated.includes('.caf/knowledge/INDEX.md'));
+  assert.ok(!fs.existsSync(path.join(dir, '.caf', 'knowledge')));
 
   for (const file of generated) {
     const content = fs.readFileSync(path.join(dir, file), 'utf8');
```

## Perubahan fixture (32 file, hanya penghapusan baris)
```
 pre-sdd03c1/curate-old-repo.mono-pnpm.json           | 7 -------
 pre-sdd03c1/curate-old-repo.single-nuxt.json         | 7 -------
 pre-sdd03c1/mono-pnpm.auto.json                      | 4 ----
 pre-sdd03c1/mono-pnpm.single.json                    | 4 ----
 pre-sdd03c1/single-nuxt.auto.backend.json            | 4 ----
 pre-sdd03c1/single-nuxt.auto.frontend.json           | 4 ----
 pre-sdd03c1/single-nuxt.auto.json                    | 4 ----
 pre-sdd03c1/single-nuxt.mono.json                    | 4 ----
 pre-sdd03c2/file-set.mono-pnpm.json                  | 4 ----
 pre-sdd03c2/file-set.single-nuxt.json                | 4 ----
 pre-sdd03c2/index.mono-pnpm.json                     | 4 ----
 pre-sdd03c2/index.single-nuxt.json                   | 4 ----
 pre-sdd03c2b/mono-pnpm.default.json                  | 1 -
 pre-sdd03c2b/single-nuxt.backend.json                | 1 -
 pre-sdd03c2b/single-nuxt.default.json                | 1 -
 pre-sdd03c2b/single-nuxt.frontend.json               | 1 -
 pre-sdd03c2c/file-set.mono-pnpm.auto.json            | 4 ----
 pre-sdd03c2c/file-set.mono-pnpm.single.json          | 4 ----
 pre-sdd03c2c/file-set.single-nuxt.auto.backend.json  | 4 ----
 pre-sdd03c2c/file-set.single-nuxt.auto.frontend.json | 4 ----
 pre-sdd03c2c/file-set.single-nuxt.auto.json          | 4 ----
 pre-sdd03c2c/file-set.single-nuxt.mono.json          | 4 ----
 pre-sdd03c3/mono-pnpm.default.json                   | 1 -
 pre-sdd03c3/single-nuxt.backend.json                 | 1 -
 pre-sdd03c3/single-nuxt.default.json                 | 1 -
 pre-sdd03c3/single-nuxt.frontend.json                | 1 -
 pre-sdd03g/curate.known-only.json                    | 7 -------
 pre-sdd03g/curate.with-custom.json                   | 7 -------
 pre-sdd03g/scaffold.mono-pnpm.default.json           | 1 -
 pre-sdd03g/scaffold.single-nuxt.backend.json         | 1 -
 pre-sdd03g/scaffold.single-nuxt.default.json         | 1 -
 pre-sdd03g/scaffold.single-nuxt.frontend.json        | 1 -
 32 files changed, 104 deletions(-)
```
Tidak ada file di luar daftar yang disetujui. Snapshot beku (`snapshots/mono-pnpm.json`), `frozen-kinds`, `legacy-manifest` dan file ber-sha256 tidak ada di `git diff --name-only d8fe450..HEAD`. Jenis perubahan, satu contoh tiap jenis:

Daftar `files` + `dirs` (`pre-sdd03c1/mono-pnpm.auto.json`):
```diff
diff --git a/test/fixtures/pre-sdd03c1/mono-pnpm.auto.json b/test/fixtures/pre-sdd03c1/mono-pnpm.auto.json
@@ -45 +44,0 @@
-    ".caf/knowledge/INDEX.md",
@@ -77,3 +75,0 @@
-    "knowledge",
-    "knowledge/decisions",
-    "knowledge/golden-examples",
```
Peta `files` (`pre-sdd03c2b/single-nuxt.default.json`, isi INDEX.md dipotong):
```diff
diff --git a/test/fixtures/pre-sdd03c2b/single-nuxt.default.json b/test/fixtures/pre-sdd03c2b/single-nuxt.default.json
@@ -27 +26,0 @@
-    ".caf/knowledge/INDEX.md": "# Knowledge Index\n\n> Status bridge into Layer 1 reference documents in `docs/` — project-owned, read-only
```
Laporan curate (`pre-sdd03c1/curate-old-repo.mono-pnpm.json`):
```diff
diff --git a/test/fixtures/pre-sdd03c1/curate-old-repo.mono-pnpm.json b/test/fixtures/pre-sdd03c1/curate-old-repo.mono-pnpm.json
@@ -52,7 +51,0 @@
-          },
-          {
-            "status": "ok",
-            "filePath": ".caf/knowledge/INDEX.md",
-            "message": "already in sync",
-            "syncCommand": null,
-            "severity": "required"
```
Dihapus utuh (golden satu-satunya isi INDEX.md; test yang memakainya sudah diganti): `pre-sdd03c2/index.mono-pnpm.json`, `pre-sdd03c2/index.single-nuxt.json`.

## AC-11 sampai AC-16 (Amendment 2) — hasil setelah Task 10

### AC-11 — LULUS
`inventory-report-2.md` bagian 2 mengklasifikasikan tujuh item (README, INDEX.md, dua folder kosong, RULES.md, ADR, folder per tiket) dengan bukti file dan baris. Pemeriksaan: hasil scaffold nyata (bagian 1 laporan) hanya berisi `tasks/README.md` dan `knowledge/INDEX.md` plus dua folder kosong; semuanya ada di tabel. Batas: perilaku interaktif `scaffold golden-examples` dan `scaffold adr` dibaca dari kode, tidak dijalankan.

### AC-12 — LULUS, dengan satu pengecualian yang diuji
```
$ (di salinan fixture hasil scaffold penuh)  grep -rlsE "TODO" .caf/tasks .caf/knowledge
(tidak ada output; exit 2 karena .caf/knowledge tidak ada, bukan karena kecocokan)
```
Pengecualian, tracker `null` (butir 6), diuji tanpa mengubah apa pun:
- **Lewat CLI:** salinan `mono-pnpm` tanpa `README.md` (tidak ada sinyal tracker), `scaffold` penuh, Escape di prompt tracker. Hasil: `cancelled by user`, `no tracker selected — stopping`, `chain stopped — Setup did not complete (no-tracker)`. **Tidak ada `.caf/tasks/README.md` yang ditulis**; `.caf/` tidak dibuat. Jadi cabang `tracker: null` tidak bisa dicapai lewat CLI: `setup.js:24-27` berhenti sebelum `generateDrafts`.
- **Panggilan langsung** `generateDrafts({{..., tracker: {{ tracker: null }}}})` (hanya di skrip uji): menulis `.caf/tasks/README.md` dengan satu baris `TODO`: `.caf/tasks/README.md:7: ... from the tracker (**TODO: fill in tracker**)`. Itu satu-satunya `TODO` yang mungkin ada di dua folder ini, dan hanya lewat pemanggilan di luar CLI (tes, kode lain).
- Kesimpulan: pengecualian AC-12 ada, tetapi tidak terjangkau oleh pengguna. Tidak ada perubahan kode.

### AC-13 — LULUS
```
$ find .caf -mindepth 1    (salinan fixture hasil scaffold penuh)
.caf/.generate-manifest.json  .caf/tasks  .caf/tasks/README.md
.caf/workflows  .caf/workflows/agent-handoff.md  .caf/workflows/piv-workflow.md  .caf/workflows/task-completion.md
```
Sesuai keputusan checkpoint: tidak ada `knowledge/`, `decisions/`, `golden-examples/`, tidak ada `tasks/<TICKET>/`.

### AC-14 (versi baru) — LULUS
```
$ node src/index.js curate --audit-only --dir <salinan hasil scaffold>      # exit=0
Layer 1 (Knowledge Base)
  ✓ CLAUDE.md — already in sync
  ✓ AGENTS.md — already in sync
Summary
  0 required gap(s), 0 optional document(s) missing, 0 need manual review ...
```
Tanpa entri `INDEX.md`. Repo lama yang masih punya `.caf/knowledge/INDEX.md` (diuji dengan menaruh file itu): exit 0, tidak ada baris tentang `INDEX.md`, tidak ditandai apa pun.

### AC-15 — LULUS
```
$ npm test                      # 1037 pass, 0 fail, 0 skipped
$ git diff --stat d8fe450..HEAD # 40 files changed, 18 insertions(+), 184 deletions(-)  (sebelum laporan ini)
```
Daftar file: 3 di `src/` (`audit.js`, `04-generate-drafts.js`, `knowledge-index-md.js` dihapus); 5 test (`complete-drafts`, `sdd03c2`, `sdd03c2b`, `sdd03c3`, `single-repo-scaffold`), semuanya dari daftar yang disetujui; 32 fixture. Tidak ada snapshot beku atau file ber-sha256. Tidak ada test dilewati.

### AC-16 — LULUS
`inventory-report-2.md` bagian 4: perintah grep, daftar referensi `.caf/tasks` (per tiket), pernyataan nol untuk `.caf/knowledge`.

## Task 12 dan verifikasi akhir (HEAD `938d70e`, semua dijalankan ulang)

Task 12 mengubah `README.md` dan `CAF.md` saja: pohon scaffold dan baris Setup tidak lagi menyebut `INDEX.md`, `knowledge/` ditulis "dibuat saat pertama dipakai", paragraf Layer 1 di `CAF.md` tidak lagi mengklaim indeks ✓/✗, dan ada satu kalimat di README bahwa `INDEX.md` lama dibiarkan dan diabaikan `curate`. Tanpa `CHANGELOG.md`.

| AC | Perintah | Hasil |
|---|---|---|
| AC-1 | `node src/index.js --help \| grep -cE '^\s+docs\b'` | `0` — LULUS |
| AC-2 | `grep -rn "caf-init docs" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.ai .` | `0` baris — LULUS |
| AC-3 | `scaffold` penuh di salinan fixture, satu agent | exit 0, `.caf/` berisi 7 entri (lihat AC-13) — LULUS |
| AC-4 | `curate --audit-only` pada hasil scaffold | exit 0, laporan tidak menyebut dokumen docs — LULUS |
| AC-5 | `npm test` | 1037 pass, 0 fail, 0 skipped — LULUS |
| AC-7 | `scaffold --help` | `complete-drafts` ada di daftar target; `check-drafts` pada hasil scaffold: `5 draft(s) checked — 0 fail, 0 warn` — LULUS |
| AC-8 | `grep -rniE "docs/(prd\|feature-spec\|...)\|caf-init docs" src` | 2 baris: `agent-md.js:147` (D1, planner `## Input`), `skill-md.js:443` (D2, `caf-design`) — LULUS dengan pengecualian D1/D2 |
| AC-9 | `grep -niE docs README.md` | `docs` tidak ada sebagai command aktif; baris 118 mencatat penghapusan — LULUS |
| AC-10 | `git status --short`, `git log origin/HEAD..HEAD` | working tree bersih; 17 commit lokal, tanpa push — LULUS |
| AC-11 | baca `inventory-report-2.md` | semua item terklasifikasi — LULUS |
| AC-12 | `grep -rlsE TODO .caf/tasks .caf/knowledge` | tanpa output — LULUS; pengecualian tracker `null`: lihat bagian AC-12 di atas |
| AC-13 | `find .caf -mindepth 1` | `.generate-manifest.json`, `tasks/README.md`, tiga file `workflows/`; tanpa `knowledge/` — LULUS |
| AC-14 | `curate --audit-only` | exit 0, `0 required gap(s)`, tanpa entri `INDEX.md` — LULUS |
| AC-15 | `npm test`; `git diff --name-only d8fe450..HEAD` | lulus; hanya 3 file `src/`, 5 test yang disetujui, 32 fixture, README, CAF.md, dokumen tiket; tanpa snapshot beku, `frozen-kinds`, `legacy-manifest`, atau test ber-sha256 — LULUS |
| AC-16 | baca `inventory-report-2.md` bagian 4 | perintah grep dan daftar referensi ada — LULUS |

AC-6 tetap dihapus (amendment-1).

## Temuan di luar scope (tidak diubah)
1. **Banner `DRAFT — must be reviewed` di `tasks/README.md`**: file itu berisi teks final (nol `TODO` bila tracker terdeteksi), tetapi bannernya menyuruh pengguna meninjaunya. `check-drafts` tidak memeriksa banner file ini (`BANNER_EXPECTED` tidak mencakupnya).
2. **Pointer `claude-md.js:89-90`** ke `.caf/knowledge/golden-examples/` dan `.caf/knowledge/decisions/` tanpa kata bersyarat: di repo baru kedua folder tidak ada sampai `scaffold golden-examples`/`scaffold adr` dijalankan.
3. **Draf `RULES.md`/ADR awal**: apakah perlu dibuat di awal scaffold atau hanya lewat `scaffold golden-examples`/`adr` dan `/caf-complete-drafts`. Isi `TODO` di kedua file memang rancangan alur `complete-drafts`; bukan cangkang yang perlu dihapus.
4. **Cabang `tracker: null` tak terjangkau**: `tasks-readme.js:10` mempertahankan `TODO: fill in tracker`, tetapi `setup.js:24-27` berhenti sebelum `generateDrafts`. Kode mati lewat CLI; hanya terpanggil dari test atau kode lain.
5. **`README.md` dan `CLAUDE.md` memuat narasi sejarah** yang menyebut `INDEX.md` (`CLAUDE.md` bagian 03c2/03c2b, bagian "Commands"). Tidak diedit karena Task 12 hanya mencakup README dan `CAF.md`, dan bagian itu menjelaskan keadaan di tiketnya sendiri.
6. **Tabel Status baseline helper**: `renderDefaultFileSet` tidak menjalankan `task-completion`, sehingga hasilnya punya satu gap lain di `curate`; bukan masalah produk.
