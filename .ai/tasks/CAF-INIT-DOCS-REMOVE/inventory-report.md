# Inventory report — CAF-INIT-DOCS-REMOVE (Task 1, read-only)

## 1. Perintah dari `package.json`

| Jenis | Perintah |
|---|---|
| test | `npm test` = `node --test test/*.test.js` |
| lint | **tidak ada** |
| build | **tidak ada** |
| lain | `start` (`node src/index.js`), `release` (`scripts/release.sh`) |

Akibat: AC-6 ("lint dan build bila ada") vakum, dicatat sebagai "tidak ada di package.json". Tidak ada `CHANGELOG.md` di repo (AC-9, Task 7 harus membuatnya). `caf-init` belum ter-link di PATH; perintah Verify memakai `node src/index.js`.

## 2. Referensi ke `docs` (kategori: hapus / sesuaikan / biarkan)

### src — kode
| File:baris | Isi | Kategori |
|---|---|---|
| `src/index.js:10` | `import { referenceDocs }` | hapus |
| `src/index.js:199-222` | registrasi command `docs` + opsi `--include`, `--feature` | hapus |
| `src/index.js:137` | help `curate`: "Layer 1-4 compliance" | sesuaikan (lihat Q1 di bagian 5) |
| `src/commands/reference-docs.js` (seluruh file) | implementasi | hapus |
| `src/templates/reference-docs-md.js` (seluruh file) | template 6 dokumen | hapus |
| `src/commands/scaffold.js:21-23` | komentar "docs ... excluded" | sesuaikan |
| `src/commands/audit.js:21-23, 115-136` | `OPTIONAL_DOCS` (5 path), `syncCommand: 'caf-init docs'` | hapus (blok 115-136) / sesuaikan komentar |
| `src/commands/audit.js:475-476` | komentar optional-doc gaps | sesuaikan |
| `src/commands/audit.js:393` | layer `Layer 1 (Knowledge Base)` | **biarkan** (lihat bagian 5) |
| `src/commands/complete-drafts.js:11,26,33` | `KNOWLEDGE_INDEX_DOCS` + glob `docs/product/features/*.md` | sesuaikan |
| `src/steps/04-generate-drafts.js:6,54` | membangun `.caf/knowledge/INDEX.md` dari `KNOWLEDGE_INDEX_DOCS` | sesuaikan |
| `src/templates/knowledge-index-md.js` (1-14, 30-41) | `KNOWLEDGE_INDEX_DOCS` (5 dokumen), "Run `caf-init docs`" | sesuaikan |
| `src/templates/complete-drafts-command.js:178-206` | daftar dokumen docs yang harus diisi AI | sesuaikan |
| `src/templates/agent-md.js:86,119-123,147,1184` | Planner `## Input`: "### Optional — Layer 1 reference docs" (feature spec, prd), dan baris `docs/api-contract.md` | sesuaikan (**bagian tracked/syncable**, lihat bagian 4) |
| `src/templates/skill-md.js:443` | skill `caf-design`: "files that exist among `docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md`" | sesuaikan (**terkunci sha256**, lihat bagian 4) |
| `src/templates/task-completion-md.js:62` | contoh "new endpoint → update api-contract.md" | biarkan (contoh bebas, bukan path docs; usul: biarkan) |
| `src/templates/discovery-commands.js:35-36, 58-59` | `docs/product/prd.md` + `feature-catalog.md` untuk agent PM/UX (tidak lagi di-scaffold) | sesuaikan atau biarkan (keputusan manusia; golden `frozen-kinds` memegangnya) |

### README / dokumen
| File:baris | Kategori |
|---|---|
| `README.md:35, 89, 116, 362-364, 574` | hapus / sesuaikan |
| `CLAUDE.md:31, 80` | sesuaikan (di luar daftar scope tiket, lihat bagian 5) |
| `CAF.md:73, 108, 377, 496, 587, 930` | biarkan (spec CAF, bukan output caf-init; `caf-init docs` di baris 377 perlu keputusan) |

### test
| File | Kategori |
|---|---|
| `test/complete-drafts.test.js:172-177` | sesuaikan (menegaskan `docs/product/prd.md` ada di drafts) |
| `test/single-repo-scaffold.test.js:343` | sesuaikan (`['scaffold','docs','curate']` pada `--mode`) |
| `test/sdd03f-stale-text.test.js:271` | sesuaikan (optionalGaps `docs/testing-strategy.md`) |
| `test/sdd02d-planner-audit.test.js:179,410`, `test/sdd02e-planner-read.test.js:440` | sesuaikan (heading planner `### Optional — Layer 1 reference docs`) |
| `test/discovery-sections.test.js:56-85` | bergantung keputusan discovery-commands |
| `test/fixtures/**` (±55 file golden/snapshot; 5 entri `syncCommand: "caf-init docs"` di tiap `pre-sdd03c1/curate-old-repo.*` dan `pre-sdd03g/curate.*`) | **konflik**, lihat bagian 4 |
| tidak ada test khusus `docs`/`reference-docs` | (Task 2 "hapus test khusus docs": tidak ada yang ditemukan) |

### manifest
`src/utils/generate-manifest.js` / `.caf/.generate-manifest.json` hanya mencatat section agent; tidak menyebut `docs`. Tidak perlu diubah.

## 3. `complete-drafts`

Target (`listDraftFiles`): `CLAUDE.md`, `AGENTS.md`, `.caf/tasks/README.md`, `.caf/workflows/task-completion.md`, golden-examples `RULES.md`, ADR `decisions/*.md`, agent `*.md`, skill `SKILL.md`, **plus** dokumen docs (`KNOWLEDGE_INDEX_DOCS` 5 path + `docs/product/features/*.md`).
Dokumen docs **bukan satu-satunya target**. Titik berhenti 1 tidak terpenuhi.
`scaffold complete-drafts --help` tidak punya daftar target; daftar ada di `listDraftFiles` dan di `/caf-complete-drafts` (`complete-drafts-command.js`).

## 4. Konflik dengan aturan repo (perlu keputusan)

1. **Planner `## Input` ada di `SYNCABLE_SECTIONS`.** Menghapus "Optional — Layer 1 reference docs" (AC-8, Task 5) mengubah template bagian tracked. Akibatnya: (a) `test/fixtures/snapshots/mono-pnpm.json` berbeda (CLAUDE.md: jangan regenerate untuk meloloskan test); (b) golden `pre-sdd*/planner.*.json` berubah, helper `since-*.js` harus ditambah; (c) planner yang sudah ada jadi `DRIFT` di `curate sync`; (d) `sdd02d`/`sdd02e` memegang heading itu secara verbatim.
2. **Skill `caf-design` dipegang sha256** (`test/sdd05a-caf-design.test.js`, "never reword it in skill-md.js"; teks = `.ai/tasks/CAF-SDD-05a/caf-design.skill.md` verbatim). Baris 443 harus diubah untuk AC-8, yang melanggar pin itu. Dokumen yang disebut juga bukan docs yang di-scaffold, hanya "files that exist among".
3. **Golden "never regenerate"** (`pre-sdd03c1`, `pre-sdd03g`, `pre-sdd03c2`, `pre-sdd03c3`, dll.) memuat `caf-init docs` dan teks INDEX.md lama. AC-2 tidak mungkin 0 hasil bila fixture dihitung.
4. **Perintah Verify cacat:**
   - AC-8 regex `docs/(prd|feature-spec|system-overview|...)` tidak cocok dengan path nyata (`docs/product/prd.md`, `docs/architecture/system-overview.md`, `docs/schema/erd.md`); hanya `api-contract` dan `testing-strategy` yang cocok. `docs/product/prd.md` lolos grep itu.
   - AC-2 regex `scaffold.*docs` juga kena `README.md:574`, test, dsb. (sah dibersihkan), tetapi `--exclude-dir=.ai` tidak menyingkirkan `test/fixtures`.
   - AC-1 memakai `caf-init`, belum ter-link.
   - AC-4 `curate --audit-only` bukan flag salah, tetapi "laporan tidak menyebut dokumen docs" bergantung entri `OPTIONAL_DOCS` dihapus.

## 5. Temuan tentang model Layer (Q1)

`Layer 1` di `audit.js:393` adalah **seluruh Knowledge Base** (`CLAUDE.md`, `AGENTS.md`, `.caf/knowledge/INDEX.md`, golden-examples, ADR, dst.), bukan hanya dokumen docs. Hanya blok `OPTIONAL_DOCS` (5 entri, severity `optional`, tidak pernah menggagalkan exit code) yang terkait docs. Premis Q1 ("Layer 1 hanya dipakai oleh `docs`") salah. Default "tandai Layer 1 tidak dipakai" tidak bisa diterapkan; usul: Layer 1 tetap, hanya blok `OPTIONAL_DOCS` dihapus.

## 6. Pemeriksaan titik berhenti tasks.md

| Titik berhenti | Hasil |
|---|---|
| docs satu-satunya target `complete-drafts` | tidak terpenuhi |
| pipeline/orchestrator/agent membaca docs sebagai input wajib | tidak terpenuhi: planner "not a hard requirement", `caf-design` "files that exist among" (opsional). Orchestrator di repo lain tidak diperiksa (di luar repo ini) |
| audit curate bergantung Layer 1 tak sederhana | tidak terpenuhi: cukup hapus blok `OPTIONAL_DOCS` |

Tiga titik berhenti baku tidak terpenuhi, tetapi bagian 4 adalah konflik dengan isi repo (aturan 9).
