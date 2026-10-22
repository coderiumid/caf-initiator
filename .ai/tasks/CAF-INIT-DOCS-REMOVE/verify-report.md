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
3. `.caf/knowledge/INDEX.md` tetap berisi tabel status 5 dokumen docs (`KNOWLEDGE_INDEX_DOCS`) dan `scaffold` menulisnya. Hanya baris "Run `caf-init docs`" yang dihapus. Tabel status kini menampilkan ✗ missing untuk dokumen yang tidak bisa lagi di-scaffold. Keputusan manusia (bagian dari penyederhanaan `knowledge/`).
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
