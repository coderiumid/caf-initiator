# Inventory Report 2 — scaffold `.caf/knowledge/` dan `.caf/tasks/` (Task 9)

Read-only. Tidak ada kode, test, golden, atau `requirements.md`/amendment yang diubah.
Dasar: `amendment-2.md`, aturan penentu (a) konten nyata saat dibuat, (b) agent/command pasti menulis ke sana pada penggunaan normal. Selain itu: jangan di-scaffold.

Metode: (1) baca semua penulis ke dua folder di `src/`; (2) jalankan scaffold nyata lewat `test/helpers/default-file-set.js` (`renderDefaultFileSet`) untuk `mono-pnpm` dan `single-nuxt`, lalu hitung `TODO`/`DRAFT` per file; (3) `curate --audit-only` pada hasilnya, dengan dan tanpa `INDEX.md`; (4) grep repo `../caf-orchestrator`.

## 1. Penulis ke dua folder

| Penulis | Lokasi | Menulis |
|---|---|---|
| Step 04 `generateDrafts` | `src/steps/04-generate-drafts.js:29-31` | `.caf/tasks/README.md` (`buildTasksReadme`) |
| Step 04 | `:50` | folder kosong `.caf/knowledge/decisions/` (`ensureDir`) |
| Step 04 | `:51` | folder kosong `.caf/knowledge/golden-examples/` (`ensureDir`) |
| Step 04 | `:53-56` | `.caf/knowledge/INDEX.md` (`buildKnowledgeIndexMd`, `KNOWLEDGE_INDEX_DOCS`) |
| `scaffold golden-examples` | `src/commands/golden-examples.js:95-96,167` | `.caf/knowledge/golden-examples/[<app>/]RULES.md`, hanya setelah pengguna memilih file |
| `scaffold adr` | `src/commands/adr.js:97-105` | `.caf/knowledge/decisions/NNN-*.md`, hanya setelah pengguna memilih keputusan |
| `task-completion.js` | `:61` | `.caf/workflows/task-completion.md` — di luar dua folder ini |

`src/commands/task-completion.js` tidak menulis ke `knowledge/` atau `tasks/` (hanya `.caf/workflows/`). Tidak ada penulis lain: grep `.caf/(knowledge|tasks)` di `src/` hanya menemukan yang tercantum di atas, plus teks template (bukan penulisan file).

Hasil scaffold nyata (kedua fixture identik):
```
.caf/knowledge/INDEX.md   721B  TODO×0  DRAFT×0
.caf/tasks/README.md     1047B  TODO×0  DRAFT×1
dirs: .caf/knowledge/{decisions,golden-examples}/ (kosong), .caf/tasks/, .caf/workflows/
```
`.caf/tasks/<TICKET>/` tidak pernah di-scaffold.

## 2. Klasifikasi

Kategori: (a) konten nyata, (b) ditulis agent/command saat pemakaian normal, (c) cangkang TODO, (d) lainnya.

| # | Item | Kat. | Bukti | Rekomendasi |
|---|---|---|---|---|
| 1 | `.caf/tasks/README.md` | **(a)** | 1047B: struktur folder per tiket, tujuh artefak (`requirements.md` … `review-notes.md`), nama branch `ai-agent/{{TICKET-ID}}`, rujukan ke `CAF.md` Layer 3. Satu baris `> **DRAFT — must be reviewed.**` (`tasks-readme.js:1-2`). `TODO` hanya muncul bila tracker `null` (`tasks-readme.js:10`: `tracker \|\| 'TODO: fill in tracker'`; `03-detect-tracker.js:48` mengembalikan `tracker: null` bila pengguna membatalkan prompt). Bukan cangkang. | **Pertahankan.** Lihat catatan 3.1 (duplikasi dan banner). |
| 2 | `.caf/knowledge/INDEX.md` | **(d)** | 721B, tanpa `TODO`/`DRAFT`. Isinya tabel lima baris `docs/...` dengan penanda `✓ present`/`✗ missing` (`knowledge-index-md.js:5-11,28-35`). Setelah command `docs` dihapus tidak ada command yang membuat kelima file itu, jadi repo baru selalu menampilkan 5× `✗ missing`. Tidak ada agent, command, template, atau orchestrator yang membaca `INDEX.md` (lihat bagian 3 dan 4). Gagal (a) dan (b). | **Hapus dari scaffold** (butuh keputusan soal audit, bagian 5). |
| 3 | `.caf/knowledge/decisions/` (folder kosong) | **(b)** | `ensureDir` di step 04:50; tidak berisi file. `scaffold adr` membuatnya sendiri lewat `writeIfAbsent` → `fs.mkdirSync(dirname, {recursive:true})` (`util.js`), dan `nextAdrNumber` menangani folder yang belum ada (`adr.js:14`). Git tidak melacak folder kosong. | **On-demand** (hapus `ensureDir`). |
| 4 | `.caf/knowledge/golden-examples/` (folder kosong) | **(b)** | Sama: `ensureDir` step 04:51; `golden-examples.js:96-97` dan `dirHasContent` (`util.js:10-11`) menangani folder yang belum ada. | **On-demand** (hapus `ensureDir`). |
| 5 | `.caf/knowledge/golden-examples/**/RULES.md` | **(b)** dengan isi **(c)** | Ditulis `scaffold golden-examples` hanya setelah pengguna memilih file. Berisi `TODO` untuk alasan, Do, Don't (`golden-example-rules-md.js:12-47`) dengan banner DRAFT. | **Catat, jangan ubah** (di luar scope per amendment; konten human-owned, dilindungi `check-drafts`). |
| 6 | `.caf/knowledge/decisions/*.md` (ADR) | **(b)** dengan isi **(c)** | Ditulis `scaffold adr` hanya setelah pengguna memilih keputusan; Decision/Alternatives/Consequences `TODO` (`adr.js` template:22-41). | **Catat, jangan ubah** (sama dengan 5). |
| 7 | `.caf/tasks/<TICKET>/*` | **(b)** | Tidak di-scaffold. Ditulis planner, implementasi, validator, reviewer (`agent-md.js`, `run-command.js`, `plan-command.js`) dan orchestrator (`orchestration-state.ts:76` memakai `mkdir recursive`). | Sudah on-demand. Tidak ada perubahan. |

Catatan pembatasan scope: amendment menyebut "Golden Examples, ADR, Workflow" sebagai di luar scope, padahal item 5-6 berada di bawah `.caf/knowledge/`. Laporan ini memperlakukan keduanya sebagai di luar scope (hanya dicatat). **Perlu konfirmasi Anda bila maksudnya lain.**

### 2.1 Jawaban: apakah `INDEX.md` termasuk cangkang?
Bukan cangkang TODO secara harfiah (nol `TODO`), tetapi tidak lolos aturan (a)/(b): isinya hanya status file milik pengguna di `docs/` yang kini tidak dibuat tool ini, dan tidak ada konsumen. Kategori (d), dengan rekomendasi yang sama seperti (c).

## 3. Ketergantungan per item

### 3.1 `.caf/tasks/README.md` (rekomendasi: pertahankan)
- Template: `claude-md.js:91` ("See `.caf/tasks/README.md` for the artifact handoff structure") — pointer dari `CLAUDE.md` yang dihasilkan.
- `complete-drafts.js:23` (daftar tetap `listDraftFiles`) → masuk inventaris `/caf-complete-drafts` dan `check-drafts`.
- `check-drafts.js:46-47`: `BANNER_EXPECTED` tidak mencakup README ini, jadi banner tidak diperiksa.
- Test: `single-repo-scaffold.test.js:92`, `sdd05a-caf-design.test.js:427`, `sdd05b-caf-breakdown.test.js:387` (golden `tasks-readme.json`), helper `mono-snapshot.js:100`, `since-05a.js`, `since-05b.js`, `record-sdd05a.mjs`, `record-sdd05b.mjs`.
- Snapshot beku `test/fixtures/snapshots/mono-pnpm.json` memuat entri `.caf/tasks/README.md`.
- Fixture: 29 file memuat `tasks/README` atau `# .caf/tasks/`.
- Duplikasi: isi struktur artefak yang sama ada di `.caf/workflows/agent-handoff.md` (`agent-handoff-md.js:47`) dan `CAF.md` Layer 3.
- Temuan kecil, tidak diubah: banner `DRAFT — must be reviewed` pada file yang isinya final menyuruh pengguna meninjau dokumen non-TODO.

### 3.2 `.caf/knowledge/INDEX.md` (rekomendasi: hapus dari scaffold)
- `curate`/audit: `audit.js:91-95` memeriksa `INDEX.md` sebagai **required** (`auditSingleFile(..., 'knowledge-index-md', createCommand: 'caf-init scaffold')`). Diukur: pada hasil scaffold, `curate --audit-only` melaporkan `✓ .caf/knowledge/INDEX.md — already in sync`; setelah `INDEX.md` dihapus melaporkan `✗ .caf/knowledge/INDEX.md — missing` dan menambah satu "required gap" (exit code 1 di `--audit-only`). Jadi menghapus dari scaffold **tanpa** mengubah `audit.js` membuat AC-14 gagal.
  - Catatan baseline: pada hasil `renderDefaultFileSet` sudah ada 1 required gap lain (`task-completion.md`, karena helper tidak menjalankan `task-completion`). Itu bukan akibat INDEX.md; perbandingan di atas dihitung dari selisih (1 → 2).
- Step 04: `04-generate-drafts.js:6,52-55` (`KNOWLEDGE_INDEX_DOCS`, `exists` per entri).
- Template/helper: `knowledge-index-md.js` (satu-satunya pemakai `KNOWLEDGE_INDEX_DOCS`).
- Laporan curate Layer 1: baris `✓ .caf/knowledge/INDEX.md` di bagian "Layer 1 (Knowledge Base)".
- Test yang menyebut `knowledge/INDEX`: `sdd03c2b-planner-clarify.test.js:47,144,308-316` (AC-7), `sdd03c2-validator-default.test.js:381-383` (AC-11), `sdd03c3-single-repo-roster.test.js:62-64` (`CHANGED_BY_03C2B`), `single-repo-scaffold.test.js:92`. Dua yang pertama membandingkan *isi* INDEX; dua terakhir hanya daftar path.
- Fixture: 32 file memuat `knowledge/INDEX` atau `Knowledge Index` (bagian 6). Snapshot beku `mono-pnpm.json` **tidak** memuat entri `INDEX.md` (diperiksa: tidak ada kunci `INDEX` atau `knowledge` di `files`).
- Dokumentasi: `CAF.md:366,412,828`, `README.md:88,127`, `CLAUDE.md:664,712,784` menyebut `INDEX.md`.
- File yang dikunci sha256: **tidak ada** untuk INDEX.md atau tasks README. Test ber-sha256 (`sdd02*`, `sdd03f`, `sdd05a/b`, `sdd10`) mengunci teks skill/planner, bukan kedua file ini. (`sdd05a/b` memegang golden `tasks-readme.json` sebagai teks, bukan hash.)
- Template agent/skill: tidak ada yang merujuk `INDEX.md` (grep `INDEX.md` di `src/` hanya menemukan step 04, template-nya, dan audit).

### 3.3 Folder kosong `decisions/` dan `golden-examples/` (rekomendasi: on-demand)
- Test: `single-repo-scaffold.test.js:109` mengharuskan `golden-examples/` ada dan kosong (`fs.readdirSync(...)` melempar bila folder tidak ada). `complete-drafts.test.js:174` menulis ke folder itu sendiri (menyiapkan fixture, perlu dicek saat Task 10 apakah `mkdir` sudah ada).
- Fixture/golden: folder kosong tidak muncul di daftar file mana pun (`file-set.*` hanya berisi file). Jadi 0 golden berubah karena folder. **[Salah, dikoreksi di Task 11: lihat "Koreksi laporan" di bawah.]**
- Template/audit: `audit.js:100-103` memakai `dirHasContent` yang mengembalikan `false` untuk folder yang tidak ada → aman. `curate` tidak melaporkan folder kosong yang hilang.
- Teks yang menyebut path (planner `## Input` dan `## Output`, `CLAUDE.md` template, `AGENTS.md` template, `complete-drafts-command.js:195-197`, `skill-md.js:243,322`) memakai kata "if they exist"/"holds ADRs" — tidak mengasumsikan folder ada. Pengecualian yang perlu dibaca ulang saat Task 10: `claude-md.js:89-90` ("See `.caf/knowledge/golden-examples/` for code references", "See `.caf/knowledge/decisions/` for ADRs") — pointer tanpa kata bersyarat, akan menunjuk folder yang belum ada.

## 4. Cek `caf-orchestrator` (read-only)

Repo tersedia di `../caf-orchestrator` (HEAD `9125c0c`, merge PR #29 release v0.2.0). Tidak dilewati.

Perintah yang dipakai (dari root `caf-orchestrator`):
```
grep -rnE "\.caf/(knowledge|tasks)|caf/knowledge|INDEX\.md|golden-examples|knowledge/decisions" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist .
grep -rn "knowledge" src tests caf.config.example.yaml
grep -rnE "mkdir|ensureDir|tasks/README" src
```

### `.caf/knowledge`
**Nol referensi** di `src/`, `tests/`, `caf.config.example.yaml`. Satu-satunya kemunculan kata `knowledge` di `src`/`tests` adalah `acknowledged` di `webhooks.ts:593` dan `acknowledges` di `github-webhook-routing.test.ts:122` (bukan path). Referensi `.caf/knowledge` hanya di dokumen `.ai/tasks/CAF-DASHBOARD-01` dan `CAF-DASHBOARD-02` milik orchestrator, yang menyatakan repo orchestrator sendiri tidak memakai konvensi itu. Orchestrator tidak membaca dan tidak mengasumsikan folder atau file di `.caf/knowledge/` ada.

### `.caf/tasks`
Orchestrator membaca dan menulis **per tiket**, tidak pernah README atau folder induk sebagai prasyarat:

| Referensi | Lokasi | Sifat |
|---|---|---|
| `taskDir(workspace, key)` = `.caf/tasks/<KEY>` | `src/infrastructure/reports/report-reader.ts:12` | helper path |
| `requirements.md`, `tasks.md`, `verify-report.md`, `validate-report.md`, `qa-report.md`, `review-notes.md`, `fix-review-log.md` | `report-reader.ts:17,21`, `run-agent-pipeline.use-case.ts:135`, `run-pr-review.use-case.ts:101,106,120,150,209` | dibaca lewat `readIfExists` (aman bila tidak ada), atau disuruh ditulis ke agent |
| `orchestration-state.json` | `orchestration-state.ts:76` | **orchestrator menulis**, dengan `mkdir(dir, {recursive:true})` — folder dibuat sendiri |
| watcher | `orchestration-state-watcher.ts:39`: glob `${workspaceDir}/**/.caf/tasks/*/orchestration-state.json` | glob; folder tidak ada = tidak ada hasil, tanpa error |
| aturan izin validator | `src/config/schema.ts:57`: `Edit(.caf/tasks/**)` | pola izin tulis, bukan pemeriksaan keberadaan |
| tests | banyak `taskDir: ... /.caf/tasks/${key}` (stub), `report-reader.sdd04b.test.ts:51` ("returns undefined when missing") | mock/fixture sendiri |

Tidak ada referensi ke `.caf/tasks/README.md` (grep `tasks/README` = 0). Tidak ada pemeriksaan keberadaan `.caf/tasks/` sebagai folder. Kesimpulan: menghapus `README.md` atau `INDEX.md` dari scaffold tidak merusak orchestrator.

Batas pernyataan ini: hasil di atas dari kode pada HEAD `9125c0c` di mesin ini, tanpa menjalankan test orchestrator. **Tidak ada hasil yang menunggu manusia**; Task 9 tidak diblokir untuk bagian ini.

## 5. Dampak ke `INDEX.md` (permintaan amendment)

- Tabel status lima dokumen docs: baris `PRD`, `System Overview`, `ERD`, `Testing Strategy`, `API Contract` (`knowledge-index-md.js:7-11`). Seluruh isi bermakna file ini ada di tabel itu; paragraf pengantar menyebut "Layer 1 reference documents in `docs/`" (`:26`, yang dikecualikan di Task 7 sebagai P2).
- Empat titik keterkaitan dari laporan Task 8, diverifikasi ulang:
  1. `sdd03c2b-planner-clarify.test.js:319` (AC-7, bandingkan isi dengan golden).
  2. `sdd03c2-validator-default.test.js:385` (AC-11).
  3. Step 04 + `KNOWLEDGE_INDEX_DOCS` (`04-generate-drafts.js:6,52`).
  4. Laporan curate Layer 1 (`audit.js:91-95`, required).
- Dua opsi untuk `INDEX.md`:
  - **I-1 hapus dari scaffold**: ubah step 04 (hapus blok `:52-56`), `audit.js:91-95` (hapus pemeriksaan INDEX, atau ubah ke optional), `knowledge-index-md.js` (hapus/tinggalkan sebagai kode mati), test `sdd03c2b` AC-7 dan `sdd03c2` AC-11, `single-repo-scaffold` daftar `generated`, `sdd03c3` konstanta `CHANGED_BY_03C2B`, 32 fixture + snapshot beku. Konsekuensi `curate`: tanpa perubahan `audit.js`, repo baru melapor `✗ INDEX.md — missing` (lihat 3.2).
  - **I-2 pertahankan, tabel diubah**: sempit, tetapi itulah yang dibatalkan di Task 8 karena merembet ke empat titik yang sama. Tidak mengatasi masalah "file tanpa konsumen".
- Perilaku laporan curate Layer 1 yang perlu diputuskan untuk I-1: (i) hapus entri `INDEX.md` dari `auditKnowledgeBase`; atau (ii) jadikan severity `optional` (tidak menggagalkan exit code, seperti `OPTIONAL_DOCS` sebelumnya). Rekomendasi: (i), karena file yang tidak lagi di-scaffold tidak boleh dituntut. Repo lama yang masih punya `INDEX.md` tidak diaudit lagi, tanpa kerugian (tidak ada konsumen).

## 6. Estimasi dampak golden dan fixture per opsi

Dihitung dengan `grep -rlE` pada `test/fixtures` (semua direktori `pre-sdd*`, `snapshots`, `frozen-kinds`, `legacy-manifest`, `mono-pnpm`, `single-nuxt`):

| Opsi | Cakupan | Fixture yang berubah | Test yang berubah |
|---|---|---|---|
| **A** (rekomendasi) | Hapus `INDEX.md` + `ensureDir` dua folder dari scaffold; pertahankan `tasks/README.md` | 32 file (`knowledge/INDEX` atau `Knowledge Index`): `pre-sdd03c1` 8, `pre-sdd03c2` 4, `pre-sdd03c2b` 4, `pre-sdd03c2c` 6, `pre-sdd03c3` 4, `pre-sdd03g` 6 (snapshot beku tidak berubah) | `sdd03c2b` (AC-7), `sdd03c2` (AC-11), `sdd03c3` (konstanta), `single-repo-scaffold` (dua titik: `:92` dan `:109`), `curate` Layer 1 (`audit.js`) |
| **B** | A + hapus `tasks/README.md` dari scaffold | 35 file (union INDEX dan README; ditambah `pre-sdd05a/tasks-readme.json`, `pre-sdd05b/tasks-readme.json`, `snapshots/mono-pnpm.json`) | A + `sdd05a`, `sdd05b` (golden `tasks-readme.json` dan `buildTasksReadme`), helper `mono-snapshot.js`, `since-05a/05b.js`, `record-sdd05*.mjs`; `claude-md.js:91` dan `complete-drafts.js:23` |
| **C** | Hanya hapus dua `ensureDir` | ~~0 fixture~~ 14 file `file-set` (baris `dirs`, lihat "Koreksi laporan") | `single-repo-scaffold.test.js:109`; cek `complete-drafts.test.js:174` |

Catatan: `snapshots/mono-pnpm.json` memuat `.caf/tasks/README.md` tetapi bukan `INDEX.md`. Opsi A tidak menyentuh snapshot beku; opsi B menyentuhnya (hapus satu entri) dan perlu persetujuan eksplisit dengan diff terlampir.

Angka bersifat jumlah file yang *memuat* path atau frasa, bukan jumlah baris yang diubah; sebagian besar adalah `file-set.*`/daftar path (hapus satu entri), sebagian berisi isi INDEX penuh (hapus satu entri berisi teks).

## 7. Rekomendasi per file (ringkas)

| Item | Keputusan yang direkomendasikan |
|---|---|
| `.caf/tasks/README.md` | **Pertahankan** (a). Opsional (di luar rekomendasi): hapus banner DRAFT pada file yang tidak berisi TODO. |
| `.caf/knowledge/INDEX.md` | **Hapus dari scaffold**; hapus pemeriksaannya dari `curate` Layer 1 (opsi (i)). |
| `.caf/knowledge/decisions/` kosong | **On-demand** (hapus `ensureDir`). Perlu keputusan soal pointer `claude-md.js:90`. |
| `.caf/knowledge/golden-examples/` kosong | **On-demand** (hapus `ensureDir`). Perlu keputusan soal pointer `claude-md.js:89`. |
| `golden-examples/**/RULES.md`, ADR | **Catat saja**, tidak diubah (di luar scope; konfirmasi bila berbeda). |
| `.caf/tasks/<TICKET>/*` | Sudah on-demand. |

## 8. Pertanyaan yang butuh keputusan manusia (checkpoint)

1. **Opsi A, B, atau C** (bagian 6)? Rekomendasi: A.
2. **`INDEX.md`**: I-1 (hapus) atau I-2? Dan untuk I-1, `curate` Layer 1: (i) hapus entri, atau (ii) severity optional? Rekomendasi: I-1 + (i).
3. **Pointer di `claude-md.js:89-90`** ("See `.caf/knowledge/golden-examples/`…", "See `.caf/knowledge/decisions/`…") menjadi menunjuk folder yang belum ada bila `ensureDir` dihapus. Pilihan: (x) biarkan, atau (y) ubah kalimat menjadi bersyarat ("when it exists"). (y) mengubah template `CLAUDE.md`: kalimat itu ada di snapshot beku `mono-pnpm.json` dan 13 file fixture (`grep -rl` pada kalimat `golden-examples/\` for code references`), jadi butuh persetujuan eksplisit. Bila (x), pointer ke folder yang belum ada tetap ada sampai `scaffold adr`/`golden-examples` dijalankan.
4. **Banner DRAFT di `tasks/README.md`**: dibiarkan (di luar scope) atau diubah?
5. **Scope RULES.md dan ADR**: benar dicatat saja, walau berada di `.caf/knowledge/`?
6. Perintah Verify AC-12 (`grep -rlE "TODO" .caf/knowledge .caf/tasks`): pada scaffold baru saat ini `TODO` hanya muncul di `tasks/README.md` bila tracker `null`. Disarankan diganti agar skenario itu diuji eksplisit; jika tidak, AC-12 sudah lulus hari ini untuk kasus tracker terdeteksi, tanpa perubahan apa pun.

## 9. Status AC

- **AC-11**: terpenuhi — tabel bagian 2 mengklasifikasikan seluruh file dan folder yang ditulis ke `.caf/knowledge/` dan `.caf/tasks/`, dengan bukti. Yang belum bisa dibuktikan: pemakaian `scaffold golden-examples`/`adr` secara interaktif (dibaca dari kode, tidak dijalankan).
- **AC-16**: terpenuhi — bagian 4 memuat perintah grep, daftar referensi, dan pernyataan nol untuk `.caf/knowledge`.
- Task 9 tidak menunggu hasil grep manusia (repo orchestrator tersedia).

## Keputusan checkpoint

Dari Ganjar, atas laporan ini. Menggantikan rekomendasi di atas bila berbeda.

1. **Opsi A.** Hapus `.caf/knowledge/INDEX.md` dan dua `ensureDir` (`decisions/`, `golden-examples/`) dari scaffold. `tasks/README.md` dipertahankan.
2. **`curate` Layer 1.** Hapus entri `INDEX.md` dari `audit.js` (dan `canonical-sections.js` bila perlu). `curate` tidak boleh melaporkan `INDEX.md` sebagai missing. `INDEX.md` di proyek yang sudah ter-scaffold dibiarkan, tidak ditandai apa pun. `KNOWLEDGE_INDEX_DOCS` dan pengecekannya di step 04 dibersihkan bila tidak ada konsumen lain.
3. **Pointer `claude-md.js:89-90` tidak diubah.** Syarat: `scaffold golden-examples` dan `scaffold adr` membuat folder tujuannya sendiri. Diverifikasi di awal Task 10: keduanya menulis lewat `writeIfAbsent`, yang memanggil `fs.mkdirSync(path.dirname(filePath), { recursive: true })` (`src/util.js`), dan `nextAdrNumber` menangani folder yang belum ada (`adr.js:14`). Syarat terpenuhi.
4. **Banner `DRAFT — must be reviewed` di `tasks/README.md` tidak diubah.**
5. **`RULES.md` dan ADR hanya dicatat.** Isi `TODO` di keduanya memang rancangan alur `complete-drafts` (diisi lewat `/caf-complete-drafts`, dijaga `check-drafts`).
6. **Tracker `null`** diuji eksplisit; hasilnya dicatat di `verify-report.md` sebagai pengecualian AC-12. Tidak ada perubahan karenanya.

Persetujuan perubahan test/fixture: test `sdd03c2b` AC-7, `sdd03c2` AC-11, `sdd03c3`, `single-repo-scaffold` (dua titik), dan `audit.js`; 32 fixture yang terdampak opsi A. Hanya baris terkait, diff dilampirkan di `verify-report.md`. Larangan regenerate tetap berlaku. **Berhenti dan lapor** bila snapshot beku, file yang dikunci sha256, atau file di luar daftar ini ikut berubah.

**AC-14 diubah:** `curate --audit-only` pada hasil scaffold baru exit 0 dan tidak melaporkan `INDEX.md` sebagai missing.

## Koreksi laporan (Task 11)

Dua klaim di bagian 3.3 dan tabel bagian 6 salah dan dikoreksi di sini:

1. **"Folder kosong tidak muncul di golden mana pun / 0 fixture berubah."** Salah. 14 golden `file-set` (`pre-sdd03c1` 6, `pre-sdd03c2` 2, `pre-sdd03c2c` 6) mencatat daftar folder dalam array `dirs` (`"knowledge"`, `"knowledge/decisions"`, `"knowledge/golden-examples"`). Pencarian saya memakai kata `knowledge/INDEX`, jadi baris `dirs` tidak ketahuan. Akibat: dua test `sdd03c1` AC-3 dan `sdd03c2c` AC-1 dan `sdd03c2` AC-1/2 gagal sampai baris itu dihapus. Dampaknya tetap di 32 file fixture yang sama yang sudah disetujui; tidak ada file fixture baru. Opsi C sendiri berdampak pada 14 file itu, bukan 0.
2. **Daftar test yang terdampak** tidak menyebut `test/complete-drafts.test.js`. Dua test di sana menulis `RULES.md` ke `.caf/knowledge/golden-examples/` yang dulu dibuat `ensureDir`. Sudah diperbaiki setelah persetujuan (hanya `mkdirSync`, commit `1c11924`).
