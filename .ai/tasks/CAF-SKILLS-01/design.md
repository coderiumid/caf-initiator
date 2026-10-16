# Design: CAF-SKILLS-01 — Skills untuk CAF (v1)

- Status: **PLAN — menunggu persetujuan manusia.** Belum ada kode yang diubah.
- Tanggal: 2026-10-07
- Baseline terverifikasi: `npm test` = 124 lulus, 0 gagal (dijalankan di repo asli, tree bersih).
- Catatan format: dua folder tugas terbaru (`CAF-COMPLETE-DRAFTS-01`, `CAF-INIT-SINGLE-REPO`) tidak
  punya `design.md`. Format ditiru dari `CAF-CURATE-DIFF-01/design.md` dan
  `CAF-SECTIONPARSE-01/design.md`; `tasks.md` ditiru dari `CAF-INIT-SINGLE-REPO/tasks.md`.

## 1. Hasil Q1 — efek mendaftarkan `Skills` di `TEMPLATE_SECTION_ORDER` tanpa `SYNCABLE_SECTIONS`

**Kesimpulan: aman. Tidak ada efek pada audit, sync, check-drafts, atau baseline. Pendaftaran
justru wajib supaya penyisipan pointer (D8) mendarat di tempat yang benar.**

### 1.1 Telusur kode

| File | Yang diiterasi | Bukti |
|---|---|---|
| `src/commands/audit.js` | `Object.keys(SYNCABLE_SECTIONS)` | `audit.js:195`; import di `audit.js:7` tidak memuat `TEMPLATE_SECTION_ORDER` |
| `src/commands/agents-sync.js` | `Object.keys(SYNCABLE_SECTIONS)` | `agents-sync.js:69`; gerbang DRIFT `agents-sync.js:88-91` |
| `src/commands/check-drafts.js` | `Object.keys(SYNCABLE_SECTIONS)` | `check-drafts.js:69` |
| `src/commands/curate-baseline.js` | `Object.keys(SYNCABLE_SECTIONS)` | `curate-baseline.js:54` |
| `src/utils/agent-sections.js` | `TEMPLATE_SECTION_ORDER` dibaca **hanya** oleh `insertSection` | `agent-sections.js:129,132,140` |
| `test/section-boundary-fenced-code.test.js` | elemen terakhir harus `Report Format` | `:88-89` |

Pembaca lain `TEMPLATE_SECTION_ORDER` di `src/`: **TIDAK DITEMUKAN** (`grep -rn TEMPLATE_SECTION_ORDER src test`).
`audit.js:38` memakai `canonicalHeaders(kind)`, tetapi hanya untuk `claude-md`, `agents-md`,
`agent-handoff-md`, `piv-workflow-md`, `task-completion-md` (`canonical-sections.js:32-54`), bukan
untuk file agent.

### 1.2 Eksperimen (salinan di `/tmp`, repo asli tidak disentuh)

Susunan: `caf-old` = salinan HEAD; `caf-new` = HEAD + satu baris `'Skills',` setelah `'Output',`
di `TEMPLATE_SECTION_ORDER`. Target: salinan fixture `single-nuxt` dan `mono-pnpm`, di-scaffold
dengan `caf-old` (11 dan 10 file agent, semua kind termasuk pm, ux-designer, auditor, devops).
Tiap target punya dua varian: tanpa manifest ("repo versi lama") dan dengan manifest
(`curate baseline --yes`). `## Skills` disisipkan lewat `insertSection` milik `caf-new`.

Perintah yang dibandingkan (stdout + exit code, ANSI dibuang): `curate --audit-only`,
`curate --sync-only --dry-run`, `curate --check-drafts`, `curate baseline --dry-run`.

| Perbandingan | Hasil |
|---|---|
| `caf-old` vs `caf-new`, 8 varian (pendaftaran saja) | **identik** di semua varian |
| Sebelum vs sesudah `## Skills` disisipkan, 4 varian | **identik** (termasuk `55 in-sync, 4 drift`, exit 1 = exit 1) |
| `## Skills` dipaksa masuk ke **semua** agent, termasuk pm/ux/auditor | **identik** dengan baseline |
| Jumlah baris `DRIFT` (mono, bermanifest) | 8 sebelum, 8 sesudah (AC-7 terpenuhi) |
| Tree target sebelum vs sesudah keempat perintah | tidak berubah |
| `npm test` di `caf-new` | 124 lulus (snapshot MONOREPO tetap identik) |
| Sisip kedua kalinya | 0 file berubah (idempoten) |

### 1.3 Efek yang memang ada (ketiganya di `insertSection`)

1. **Tanpa pendaftaran, penyisipan salah tempat.** `indexOf('Skills')` = -1, loop pertama
   (`agent-sections.js:131-137`) tidak pernah cocok, loop kedua (`:139-145`) memilih section
   terdaftar pertama. Terbukti: dengan `caf-old`, `## Skills` mendarat di baris 16, **sebelum**
   `## Role` (baris 23). Jadi pendaftaran adalah prasyarat D8.
2. **Jangkar sisip section lain bergeser.** Bila sebuah agent sudah punya `## Skills` lalu
   `curate sync` menyisipkan section syncable yang hilang (diuji: `Working Pattern (PIV)`):
   `caf-old` menaruhnya di antara `Output` dan `Skills`; `caf-new` menaruhnya setelah `Skills`
   (urutan sesuai template). Isi section lain tidak berubah di kedua kasus.
3. **Posisi terhadap `## Constraints`.** `Constraints` tidak terdaftar, jadi `insertSection`
   menaruh `Skills` langsung setelah `Output`, yaitu **sebelum** `Constraints` (planner). Lihat
   keputusan urutan di FR-5.

Kosmetik: `insertSection` menulis blok `['', '## Skills', body, '']` (`agent-sections.js:148`)
tepat sebelum heading berikutnya, sehingga ada **dua** baris kosong sebelum `## Skills`
(generate baru: satu). Ini perilaku lama untuk semua sisipan sync. Tidak diubah, karena mengubah
`insertSection` berarti mengubah keluaran `curate sync`. Hash section lain tidak terpengaruh:
`sectionBody` melakukan `trim()` (`agent-sections.js:122`) dan `hashSection` menormalkan
(`section-diff.js:29-36`).

## 2. Konflik requirements vs kode (dan konflik internal requirements)

| ID | Konflik | Bukti | Usulan |
|---|---|---|---|
| K1 | **FR-9 vs D6.** FR-9: "skill universal berawalan `caf-`". D6 menamai `scope-discipline` dan `no-guess` tanpa awalan | requirements §4 D6, §5 FR-9 | Design memakai nama D6 apa adanya. Nama ada di satu tabel konstanta, jadi ganti nama = satu baris. **Butuh keputusan (H1)** |
| K2 | **FR-5/D5 "abaikan skill … berisi TODO" tidak bisa dipakai mentah.** `no-guess`, `caf-escalate`, `caf-verify` memang harus menyebut kata `TODO`, sehingga aturan itu mematikan skill yang sudah lengkap. Selain itu kata `TODO` di `## Skills` menambah hitungan INFO tiap agent (`check-drafts.js:234`); eksperimen: `caf-qa.md` 5 menjadi 6 | `check-drafts.js:234` | Gerbang runtime = **banner DRAFT saja**. Generator menjamin "ada TODO terbuka berarti ada banner"; `check-drafts` memberi WARN bila keadaan itu dilanggar. **Butuh keputusan (H2)** |
| K3 | **FR-7 "WARN bila banner hilang" bertabrakan dengan AC-9a.** AC-9a menuntut keluaran generator langsung `FOUND`, jadi skill konstan lahir **tanpa** banner. Bila skill masuk `BANNER_EXPECTED` (`check-drafts.js:39-40`), keempat skill konstan WARN selamanya | `check-drafts.js:39-40,227-233` | Tafsir: WARN hanya bila skill **punya baris TODO terbuka tetapi tidak punya banner**. **Butuh konfirmasi (H3)** |
| K4 | **Invariant 4 ("jangan `fs.writeFileSync` langsung") vs D8 ("meniru `agents-sync.js:127-146`").** Presedennya sendiri menulis lewat `fs.writeFileSync` (`agents-sync.js:152`), dan `writeIfAbsent` tanpa `overwrite` tidak bisa mengubah file yang sudah ada (`util.js:55-58`) | `agents-sync.js:152`, `util.js:49-68` | Lihat FR-6: `writeIfAbsent(..., { overwrite: true, validatePlaceholders: false })` setelah placeholder-check pada blok yang disisipkan. **Butuh konfirmasi (H4)** |
| K5 | **FR-3 "collision check" kosong untuk skill.** `detectLegacyCollision` melihat basename; untuk `.../caf-verify/SKILL.md` basename = `SKILL.md`, tidak berawalan `caf-`, hasil selalu `null` | `collision-check.js:12-18` | Sesuai catatan FR-9. Pemeriksaan tingkat folder ditambahkan (FR-9) dan dipanggil sebelum `writeIfAbsentGuarded` |
| K6 | **AC-5 menyebut `makeRepo`**, padahal itu fungsi lokal, bukan helper bersama | `test/repo-context.test.js:22-30` | Test baru mendefinisikan `makeRepo` lokalnya sendiri; file test lama tidak disentuh |
| K7 | **Help `--force`** menyatakan "only used by the agents target" | `src/index.js:59-64` | Teks help diperbarui (agents, skills) |
| K8 | **§9 mencantumkan `discovery-commands.js` dan `audit.js` (bersyarat) sebagai file yang berubah** | eksperimen §1.2 | Keduanya **tidak perlu diubah**: pm/ux tidak pernah dianggap "missing" |
| K9 | **Komentar basi** menyebut parser "fence-unaware" dan `Report Format` "last on purpose"; test menuntut `Report Format` tetap terakhir | `agent-sections.js:22-23`, `test/section-boundary-fenced-code.test.js:88-89` | `Skills` disisipkan di tengah (setelah `Output`). Komentar basi tetap tiket terpisah (§10.3 requirements) |
| K10 | **§2 requirements:** versi `claude` belum dicatat | requirements `:18` | Di mesin ini `claude --version` = `2.1.292 (Claude Code)`. Belum tentu versi yang dipakai uji umkm-pos. **Butuh konfirmasi (H8)** |

Rujukan baris di requirements yang **cocok** dengan kode: `scaffold.js:29,130-131`,
`agent-md.js:496-506`, `agent-md.js:635`, `agent-sections.js:13-26`, `agents.js:504-516`,
`complete-drafts.js:19-38`, `complete-drafts-command.js:169,216-217`, `check-drafts.js:100`,
`agents-sync.js:127-146`, `util.js:55-58`, `agent-md.js:90-102`.

## 3. Keputusan implementasi per FR

### FR-1 — target `scaffold skills`
- `src/commands/scaffold.js`: entri `skills` di `TARGETS` (setelah `feature-catalog-sync`,
  `scaffold.js:29`) dan `case 'skills'` di `switch` (`scaffold.js:130-131`). **Tidak** masuk
  `CHAIN_ORDER` (`scaffold.js:37`), jadi `test/complete-drafts.test.js:127` tetap lulus.
- `src/index.js`: help ikut otomatis lewat `Object.keys(TARGETS)` (`index.js:46,49`); perbarui
  teks `--force` (`index.js:59-64`).
- **`--skill-dir` tidak dibuat di v1** (FR-1 menandainya opsional). Alasan: `.claude/skills/`
  adalah lokasi yang ditemukan Claude Code untuk sesi manual (latar belakang butir 3); direktori
  lain mematahkan tujuan itu, dan `curate` tidak punya flag padanan sehingga `check-drafts` tidak
  akan tahu ke mana mencari. Satu konstanta `SKILLS_DIR = '.claude/skills'`. (H5)

### FR-2 — template murni (`src/templates/skill-md.js`, baru)
- Ekspor: `SKILLS_DIR`, `SKILL_NAMES` (urutan tetap), `SKILLS_BY_KIND`, `skillsForKind(kind)`,
  `skillPath(name)`, `SKILL_DRAFT_BANNER`, `hasSkillDraftBanner(content)`,
  `countOpenSkillTodos(content)`, lima `build*Skill()`, dan `buildSkillFiles({ mode, apps })`
  yang mengembalikan `[{ name, relPath, content, draft }]` dalam urutan `SKILL_NAMES`.
- Determinisme: tanpa tanggal, tanpa `readdir`. Apps **wajib disortir menurut `path`** di dalam
  builder; pengurutan apps di `repo-context.js`: **TIDAK DITEMUKAN** (`grep -n sort
  src/utils/repo-context.js` kosong), dan `test/helpers/mono-snapshot.js:39` menyortir sendiri
  karena alasan yang sama.
- Arah import: `skill-md.js` mengimpor `agent-md.js`; `agent-md.js` **tidak** mengimpor
  `skill-md.js` (tanpa siklus; `agent-sections.js` sudah mengimpor `agent-md.js`,
  `agent-sections.js:3-11`).

### FR-3 — jalur tulis
- Tiap `SKILL.md`: pemeriksaan folder (FR-9) lalu `writeIfAbsentGuarded(filePath, content,
  { dryRun, overwrite }, collisions)` (`collision-check.js:25-32`). Placeholder guard dan dry-run
  ikut dari `writeIfAbsent` (`util.js:59-63`).
- `--force` (`overwrite`) hanya berlaku untuk file `SKILL.md`. **Tidak pernah** berlaku untuk
  penyisipan pointer ke agent.

### FR-4 — `caf-verify` dari deteksi
- Data: `detectStack({ dir, mode })`; per app `matchVerifyScripts(dir, app.path)`
  (`package-scripts.js:20-33`, exact-match sudah didahulukan di `:30`), `readPackageName`
  (`package-scripts.js:43-47`) hanya saat MONOREPO, `app.packageManager || stack.packageManager`.
  Rumus yang sama dengan `agents.js:480-486`.
- Render: **pakai ulang `buildVerifyChecklist`** (`agent-md.js:68-83`), yang saat ini tidak
  diekspor. Perubahan di `agent-md.js` hanya menambah kata `export`. Akibatnya daftar command di
  skill dan di `## Verify Checklist` agent berasal dari satu fungsi dan tidak bisa berbeda bentuk.
  MONOREPO otomatis dikelompokkan per `#### <appPath>` dengan command ber-`--filter`
  (`runner-command.js:19-34`).
- DRAFT: `draft = /\bTODO\b/.test(checklist)`. Bila `draft`, banner disisipkan.
- Konsekuensi yang perlu disadari (H9): slot yang tidak punya script (mis. tidak ada `typecheck`)
  membuat `caf-verify` DRAFT, sehingga agent mengabaikannya sampai manusia menyelesaikan barisnya.
  Kedua fixture repo ini pun menghasilkan DRAFT (`test/fixtures/single-nuxt/package.json:4-9`
  tanpa `test`; `test/fixtures/mono-pnpm/apps/web/package.json:3` tanpa `typecheck`).
- Catatan (bukan lingkup tiket ini): pada SINGLE_REPO dengan package manager tak terdeteksi,
  `verifyCommand` mengeluarkan `npm run <script>` (`runner-command.js:20`). Itu tebakan yang sudah
  ada di Verify Checklist agent; skill mewarisinya. Dicatat sebagai tiket sampingan.

### FR-5 — section opsional `## Skills`
- `agent-md.js`: `buildSkillsBody(skillPaths)` (isi saja) dan `buildSkillsSection(skillPaths = [])`
  yang mengembalikan `''` bila kosong, selain itu `\n## Skills\n${body}\n` (bentuk yang sama
  dengan `buildBatasanSection`, `agent-md.js:496-506`).
- `buildAgentMd({ ..., skills = [] })`; baris `agent-md.js:635` menjadi
  `${buildSkillsSection(skills)}${buildBatasanSection(kind)}`. Tanpa newline baru. Dengan
  `skills = []` hasilnya identik byte demi byte.
- **Urutan: `Skills` sebelum `Constraints`.** Alasan: `insertSection` menaruh `Skills` langsung
  setelah `Output` (§1.3 butir 3). Dengan urutan ini agent yang baru di-generate dan agent lama
  yang disisipi punya urutan section yang sama. (H7)
- `skills` berisi path relatif repo, bukan nama. Tidak ada key `skills:` di frontmatter
  (`buildFrontmatter`, `agent-md.js:530-545`, tidak disentuh). `TOOLS_BY_KIND`
  (`agent-md.js:231-243`) tidak disentuh.

### FR-6 — pointer ke agent yang sudah ada
- `agent-sections.js`: `'Skills'` ditambahkan ke `TEMPLATE_SECTION_ORDER` setelah `'Output'`
  (`agent-sections.js:18`). `SYNCABLE_SECTIONS` (`:52-60`) tidak disentuh.
- Algoritma di §6.

### FR-7 — `check-drafts`
- `listDraftFiles` (`complete-drafts.js:27-33`): tambah glob `${SKILLS_DIR}/*/SKILL.md`. Hasil
  glob sudah disortir (`complete-drafts.js:37`).
- `check-drafts.js`, fungsi baru `checkSkillPointers(dir, agentFiles, findings)`: ambil isi
  `## Skills` lewat `extractSection` (`section-diff.js:19-24`); pointer = span backtick
  (`backtickSpans`, `check-drafts.js:48-50`) yang berakhiran `/SKILL.md`.
  - file tidak ada: **FAIL** (bisa dibuktikan kode);
  - file ada dan `hasSkillDraftBanner`: **WARN** ("agent akan mengabaikan skill ini");
  - pointer menunjuk `caf-piv`: **WARN** (skill sesi manual, Q4).
- Per file skill di loop utama (`check-drafts.js:217-236`):
  - placeholder: sudah berlaku untuk semua draft (`:221-223`), tanpa perubahan;
  - `SCRIPT_CHECKED` (`:37-38`) diperluas ke file skill, sehingga command di `caf-verify` yang
    script-nya tidak ada menjadi FAIL (bisa dibuktikan kode);
  - punya baris TODO terbuka tetapi tanpa banner: **WARN** (tafsir K3);
  - INFO: untuk file skill dihitung dengan `countOpenSkillTodos` (baris yang **diawali** `TODO`
    setelah penanda daftar opsional), bukan `\bTODO\b` (`:234`), supaya `no-guess` yang menyebut
    kata TODO di tengah kalimat tidak dilaporkan "masih terbuka" selamanya.
- `BANNER_EXPECTED` (`:39-40`) **tidak** diperluas ke skill (K3).
- Tetap read-only: tidak ada pemanggilan tulis baru.

### FR-8 — `/caf-complete-drafts`
- `complete-drafts-command.js:169`: tambahkan kalimat "biarkan `## Skills` apa adanya; pointer
  dikelola `caf-init scaffold skills`".
- `:216-217`: "`git diff` hanya menyentuh dokumen; di agent hanya Role, Scope, Verify Checklist.
  Section `## Skills` yang ditambahkan `caf-init scaffold skills` bukan untuk diedit."
- `check-drafts.js:100`: ganti "only Role, Scope and Verify Checklist are meant to be edited"
  menjadi "tracked sections are never meant to be edited" (tanpa daftar salinan tangan).
- Blok baru di langkah 3 (isi ringkas): lakukan `Glob` `.claude/skills/*/SKILL.md` **sekarang**;
  hanya skill berbanner DRAFT yang boleh diisi; baris TODO diisi hanya dengan script yang benar-benar
  ada di `package.json`; jika tidak ada script, tulis itu sebagai fakta dan tanyakan ke user;
  jangan hapus banner; jangan ubah skill tanpa banner; jangan buat skill baru; jangan tambah
  pointer ke agent.
- Daftar section terlarang tetap dirender dari `Object.keys(SYNCABLE_SECTIONS)`
  (`complete-drafts-command.js:93-95`), tidak disalin tangan.
- `listDraftFiles` tetap satu-satunya inventaris; skill yang sudah ada saat generate ikut
  tercantum di "Drafts found at generation time" (`:125`), dan blok baru menyuruh glob ulang.

### FR-9 — tabrakan nama tingkat folder
- `collision-check.js`: fungsi baru `detectSkillDirCollision(skillsDirPath, name)`. Untuk nama
  berawalan `caf-`: tabrakan bila folder `<name tanpa caf->/` ada. Untuk nama tanpa awalan:
  tabrakan bila folder `caf-<name>/` ada. Hasil: path folder lawan atau `null`.
- Tabrakan: skill itu tidak ditulis, tidak mendapat pointer, dicatat, dan `process.exitCode = 1`.
  Pesan dicetak sendiri oleh `skills.js`; `reportCollisions` tidak dipakai karena teksnya khusus
  untuk rename pra-`caf-` (`collision-check.js:44,50-56`).

### FR-10 — dokumentasi
- `README.md`: bagian `scaffold skills`; baris `--force` yang hilang dari tabel opsi
  (`README.md:100-109`); lisensi `UNLICENSED` (`README.md:404`) vs `"license": "MIT"`
  (`package.json:29`).
- `CLAUDE.md` repo: bagian baru tentang `## Skills` non-syncable, satu tabel pemetaan, aturan
  banner.
- `CAF.md`: bagian skills (belum ada sama sekali; `grep -ni skill CAF.md`: **TIDAK DITEMUKAN**),
  temuan `--agent` vs `skills:`, larangan `--bare`.

## 4. Pemetaan skill ke agent (Q2, final untuk disetujui)

Satu tabel konstanta `SKILLS_BY_KIND` di `skill-md.js`. Urutan pointer mengikuti `SKILL_NAMES`.

| Kind | Tools (`agent-md.js:231-243`) | Skill | Beda dari usulan Q2 |
|---|---|---|---|
| `frontend`, `backend`, `implementer`, `implementation` | Read, Write, Edit, Bash | `caf-verify`, `scope-discipline`, `no-guess`, `caf-escalate` | sama |
| `qa` | Read, Write, Bash | `caf-verify`, `no-guess` | sama |
| `planner` | Read, Write | `scope-discipline`, `no-guess` | sama |
| `reviewer` | Read, Write, Bash | `scope-discipline`, `no-guess` | sama |
| `documentation` | Read, Write, Edit | `scope-discipline`, `no-guess` | **+`no-guess`** |
| `architect` | Read, Write | `scope-discipline`, `no-guess` | **baru** (Q2: kosong) |
| `auditor`, `devops`, `pm`, `ux-designer` | (lihat tabel) | kosong | sama |

Alasan:
- `caf-escalate` hanya untuk kind implementasi. QA dan Reviewer punya kontrak eskalasi sendiri
  yang di-parse orchestrator (`agent-md.js:453-473`), Planner punya aturan headless
  (`agent-md.js:496-506`). Skill umum di sana berisiko bertabrakan.
- `caf-verify` tidak untuk Reviewer: Bash-nya untuk membaca diff (`agent-md.js:253-255`).
- `documentation` + `no-guess` dan `architect`: keduanya penulis artefak (kelas yang sama dengan
  Planner) dan kesalahan khasnya adalah mengarang fakta. **Ini penyimpangan dari Q2 dan butuh
  persetujuan (H6).** Bila ditolak, cukup hapus dua entri tabel.
- `caf-piv` tidak ada di tabel mana pun. Dijaga test ("tidak ada kind yang memetakan ke
  `caf-piv`").
- Agent dengan nama file tak dikenal jatuh ke `implementation` (`agent-sections.js:91-93`), jadi
  akan ditawari 4 skill. Untuk file seperti itu prompt D8 memakai `initial: false` dan menyebut
  "kind tidak dikenali" (H10).

## 5. Outline isi tiap skill

Aturan bersama untuk empat skill yang dirujuk agent:
1. Tidak ada kalimat "tunggu persetujuan/konfirmasi di chat" (Q4; headless tidak punya chat).
2. Tidak mendefinisikan nama file laporan atau kata status. Selalu merujuk ke agent definition.
3. Kalimat penutup: bila skill bertentangan dengan agent definition, agent definition menang.
4. Tidak ada baris yang **diawali** `TODO`, tidak ada contoh `<pm> run <script>` fiktif, dan tidak
   ada kata `DRAFT` di 15 baris pertama (kecuali banner asli). Ketiganya dijaga test.

Frontmatter tiap skill: `name` (= nama folder) dan `description` saja.

### 5.1 `caf-verify` (dari deteksi; satu-satunya yang bisa DRAFT)
- description: "Verification commands for this repo (lint, typecheck, test, build). Use before
  claiming any code change is done, and whenever asked to verify, test or check work."
- Isi:
  1. (bila DRAFT) banner: "> DRAFT generated by caf-initiator — NOT active. Agents skip this
     skill until every `TODO` line below is resolved and this banner is removed by a human."
  2. "Commands detected from `package.json` (repo mode: `<MODE>`):" lalu keluaran
     `buildVerifyChecklist`.
  3. Aturan:
     - Jalankan setiap command yang relevan dengan perubahanmu; di monorepo hanya workspace yang
       disentuh.
     - Laporkan apa yang benar-benar dijalankan dan hasil aslinya. Jangan menulis "passes" untuk
       command yang tidak dijalankan.
     - Check yang gagal diperbaiki di kode, bukan dengan melewati, mematikan, atau melonggarkan
       check (tanpa `--no-verify`, tanpa menghapus test).
     - Baris bertanda `TODO` berarti script itu tidak terdeteksi: jangan mengarang command;
       nyatakan check itu tidak dijalankan.
     - Jika agent definition punya `Verify Checklist` sendiri, daftar itu yang menang; bentuk
       laporan (nama file, kata status) ditentukan agent definition.

### 5.2 `scope-discipline` (konstan)
- description: "Keep a change inside the task's scope. Use for every code or document change in
  this repo: before editing a file, when tempted to refactor or fix something nearby, or when a
  task seems to need a file outside the assigned area."
- Isi:
  1. Ketahui scope sebelum edit pertama: section Scope di agent definition; di luar agent, file
     yang disebut tugas.
  2. Sentuh hanya yang dibutuhkan tugas. Tanpa refactor sambil lewat, rename, reformat, bump
     dependency.
  3. Hal rusak di luar tugas: catat sebagai temuan di keluaranmu, jangan diperbaiki.
  4. Tugas tidak bisa selesai tanpa file di luar scope: berhenti **sebelum** mengedit file itu,
     laporkan file mana dan mengapa. Jangan melebarkan scope sendiri.
  5. Lockfile, konfigurasi CI, file env/secret: jangan disentuh kecuali tugas memintanya secara
     eksplisit.
  6. Sebelum selesai: daftar file yang berubah dan pastikan tiap file milik tugas.

### 5.3 `no-guess` (konstan)
- description: "Do not invent facts about this codebase. Use whenever you are about to state or
  rely on something you have not read in the repo: a file path, function or script name, API
  field, config value, convention, or requirement."
- Isi:
  1. Klaim tentang kode butuh bukti yang dibaca di sesi ini: sebut `path/to/file.ext:line`.
  2. Sebelum memakai nama (file, fungsi, script, env var, endpoint, field): buka atau cari dulu.
     Tidak ketemu berarti tidak ada; katakan begitu.
  3. Celah requirement (tiket ambigu, kriteria hilang, aturan bisnis) bukan untuk diisi sendiri.
     Jangan diam-diam memilih default yang "masuk akal".
  4. Yang tidak bisa diverifikasi ditulis sebagai item terbuka eksplisit (`TODO: <apa yang tidak
     diketahui, di mana sudah dicari>`) di artefak dan disebut di laporan. Cara eskalasi: ikuti
     agent definition; di sesi manual, tanya user.
  5. Tandai inferensi sebagai inferensi.
  6. Jangan menyajikan keluaran command yang tidak dijalankan atau isi file yang tidak dibuka.

### 5.4 `caf-escalate` (konstan; hanya kind implementasi)
- description: "When and how to stop and hand a task back to a human. Use when verification
  keeps failing, the task is blocked, the plan no longer matches the code, or a decision is
  needed that is not yours to make."
- Isi:
  1. Berhenti dan eskalasi bila: verifikasi yang sama gagal setelah batas retry di agent
     definition (bawaan 3; jangan mengulang perbaikan yang sama); tugas butuh perubahan di luar
     scope atau bertentangan dengan requirements/ADR/konvensi; butuh keputusan manusia (perilaku
     produk, keamanan, migrasi atau operasi destruktif, dependency baru, kredensial); input wajib
     hilang atau saling bertentangan.
  2. Caranya, sebagai agent CAF: ikuti `Retry Logic`/`Constraints` di agent definition persis;
     di situlah nama file laporan dan kata status didefinisikan, skill ini tidak mengubahnya.
     Jangan mengakhiri run hanya dengan pertanyaan di chat.
  3. Caranya, di sesi manual: berhenti dan beri tahu user.
  4. Isi eskalasi: apa yang dicoba (tiap percobaan + error asli), apa yang menghalangi, keputusan
     spesifik yang dibutuhkan, opsi bila ada.
  5. Biarkan working tree apa adanya: tanpa stub atau test dimatikan supaya terlihat hijau, tanpa
     commit/push.

### 5.5 `caf-piv` (konstan; khusus sesi manual, tidak pernah ditunjuk agent)
- description: "Plan-Implement-Verify workflow for manual coding sessions in this repo. Use when
  the user asks for a code change, bug fix, feature or refactor directly in chat (not through a
  CAF agent or the caf-orchestrator pipeline)."
- Isi:
  1. Pembuka: hanya untuk sesi interaktif dengan manusia. Agent CAF punya Working Pattern
     sendiri; jangan terapkan ini di run agent/headless.
  2. PLAN: baca dulu (`CLAUDE.md`, `AGENTS.md`, kode terkait, `.caf/knowledge/` bila ada).
     Nyatakan tujuan, file yang akan disentuh, cara verifikasi, pertanyaan terbuka. Lalu berhenti
     dan tunggu persetujuan user. Perubahan sepele yang sudah dieja user: rencana satu baris,
     lanjut.
  3. IMPLEMENT: hanya sesuai rencana. Rencana ternyata salah: kembali ke PLAN dan beri tahu user.
     Terapkan `scope-discipline` dan `no-guess`.
  4. VERIFY: jalankan command di `caf-verify`; laporkan hasil asli; belum selesai sebelum
     verifikasi jalan atau dinyatakan eksplisit apa yang tidak bisa dijalankan dan mengapa.
  5. Jangan commit/push kecuali diminta.

## 6. Wording final section `## Skills`

Isi (`buildSkillsBody`), contoh untuk kind `qa`. Blok di bawah dipagari karena memuat heading
contoh (invariant 9):

```
## Skills
Before you start, `Read` every skill file listed here and apply it for the whole task:

- `.claude/skills/caf-verify/SKILL.md`
- `.claude/skills/no-guess/SKILL.md`

Skip a listed skill if its file is missing or still starts with a `DRAFT` banner: it is not
ready, so apply none of it. If a skill conflicts with this agent definition, this agent
definition wins.
```

Catatan:
- Tidak ada kata `TODO` (K2). Tidak ada baris `## ` di dalam isi.
- "Before you start … for the whole task" ditulis untuk AC-9c (tugas yang tidak menyinggung skill).
- Wording ini belum punya deteksi drift (Q7, diterima untuk v1). Perubahan wording setelah AC-9
  tidak akan menjangkau agent yang sudah disisipi.

## 7. Algoritma penyisipan pointer (D8)

Di `src/commands/skills.js`, setelah langkah tulis skill:

```
tersedia = nama skill yang SKILL.md-nya ada di disk sekarang,
           atau hasil tulisnya 'dry-run' (akan ada pada run nyata)
           (skill yang bertabrakan atau gagal ditulis tidak masuk)

untuk tiap file di <agentDir>/*.md, urutan readdir().sort():
  kind    = detectKind(file)
  wanted  = skillsForKind(kind) ∩ tersedia, urutan SKILL_NAMES
  jika wanted kosong            → lewati tanpa pesan
  raw = readFileSafe(file); { lines, sections } = parseSections(raw)
  jika ada section 'Skills'     → lewati; cetak "already has ## Skills — left untouched"
                                  (bila pointernya berbeda dari wanted: cetak selisihnya
                                   sebagai catatan; TIDAK PERNAH mengedit)
  body = buildSkillsBody(wanted.map(skillPath))
  assertNoUnresolvedPlaceholders(body, file)      # hanya blok milik kita
  cetak preview (file, body)
  jika dryRun                   → cetak "would add ## Skills to <file>"; lanjut (tanpa prompt)
  confirm `Add section "## Skills" to <file>?`
      initial: true bila kind dikenali, false bila jatuh ke fallback 'implementation'
  jika ditolak                  → lewati (tidak disimpan; run berikutnya bertanya lagi)
  baca ulang file; jika berubah sejak dibaca atau kini punya 'Skills' → lewati dengan pesan
  next = insertSection(lines, sections, 'Skills', body)
  writeIfAbsent(file, next, { overwrite: true, validatePlaceholders: false })
```

Jaminan:
- **Tidak pernah menimpa isi:** `next` adalah `raw` plus satu blok. Test: buang blok yang
  disisipkan dari `next`, hasilnya harus sama dengan `raw` byte demi byte.
- **Idempoten:** run kedua, semua `SKILL.md` di-skip (`util.js:55-58`) dan semua agent sudah
  punya `Skills`; tidak ada prompt, tidak ada tulis. Terbukti di eksperimen §1.2.
- **Manifest tidak disentuh:** `Skills` bukan section syncable; hash section lain tidak berubah
  (§1.3). Tidak ada jalur tulis baru di `curate sync` (invariant 3).
- **`.sync-state`:** tidak dipakai. Penolakan tidak diingat karena `scaffold skills`
  explicit-only; menjalankannya lagi adalah permintaan eksplisit.
- **Placeholder check hanya pada blok kita:** isi agent lain milik user dan bisa memuat `{{...}}`
  miliknya sendiri; memvalidasi seluruh file bisa membuat penyisipan gagal karena hal yang bukan
  salah kita.

`scaffold agents` untuk agent **baru** (`agents.js:504-516`): oper
`skills: skillsForKind(candidate.kind)` yang disaring ke skill yang `SKILL.md`-nya sudah ada di
disk, dipetakan ke path. Tanpa prompt baru (urutan `prompts.inject` di test tidak berubah). Di
repo tanpa `.claude/skills/`, hasilnya `[]` dan keluaran identik dengan sekarang.

Bila belum ada file agent sama sekali: `scaffold skills` menulis skill lalu mencetak "no agent
definitions yet — `scaffold agents` will add the pointers when it generates them".

## 8. Strategi test per AC

File test baru saja; file test lama dan fixture tidak diubah.

| AC | Test | Cara |
|---|---|---|
| AC-1 | seluruh suite | `npm test`; `git diff --stat test/fixtures/snapshots/` harus kosong. Tambahan `test/skills-section.test.js`: untuk setiap `KNOWN_KINDS` + `implementation`, `buildAgentMd` tanpa `skills` sama byte dengan `skills: []` |
| AC-2 | `test/skills-scaffold.test.js` | salin fixture `single-nuxt` dan `mono-pnpm`, snapshot tree, `skillsTarget({ dryRun: true })`, snapshot harus identik (pola `snapshotTree`, `test/complete-drafts.test.js:39-47`) |
| AC-3 | sama | run nyata menulis 5 `SKILL.md`; run kedua: snapshot tree identik, tidak ada prompt yang terpakai |
| AC-4 | `test/skills-pointer.test.js` | agent dibuat lewat `buildAgentMd` tanpa `skills` (= keluaran versi lama, dijamin snapshot). `auditAgentDefinitions` sebelum vs sesudah sisip: `deepEqual` pada `entries` dan `sectionCounts`; `agentsSync({ dryRun: true })`: `drifted`/`needsAttention` sama. Dua varian: tanpa manifest dan dengan `curateBaseline` |
| AC-5 | `test/skills-scaffold.test.js` | repo kosong (helper `makeRepo` lokal): tidak throw; `caf-verify` memuat `TODO` dan `hasSkillDraftBanner` benar. Deteksi di repo kosong sudah dicoba: `SINGLE_REPO`, `packageManager: null`, semua slot `null` |
| AC-6 | `test/skills-check-drafts.test.js` | hapus satu `SKILL.md`: FAIL; pointer ke `caf-verify` DRAFT: WARN; snapshot tree sebelum/sesudah `checkDrafts` identik |
| AC-7 | `test/skills-pointer.test.js` | agent `caf-pm.md`/`caf-ux-designer.md` (dari `buildPmAgentMd`/`buildUxDesignerAgentMd`): `sectionCounts.DRIFT` sama sebelum/sesudah `scaffold skills`; kedua file tidak berubah byte |
| AC-8 | `test/skills-templates.test.js` | `findUnresolvedPlaceholders` kosong untuk kelima skill, pada SINGLE_REPO, MONOREPO, dan repo kosong |
| AC-9 | manual, di umkm-pos | tidak bisa dijalankan dari repo ini (butuh `claude` nyata dan repo umkm-pos). Dicatat sebagai task manusia; hasilnya masuk `verify-report.md` |

Test tambahan di luar AC:
- determinisme: dua kali `buildSkillFiles` sama; urutan apps dibalik, hasil sama;
- `caf-piv` tidak dipetakan ke kind mana pun; setiap nama di `SKILLS_BY_KIND` ada di `SKILL_NAMES`;
- skill konstan: 0 baris TODO terbuka, tanpa banner, tanpa kalimat menunggu konfirmasi;
- `insertSection` untuk `Skills`: mendarat setelah `Output`, sebelum `Constraints` (planner) dan
  sebelum `Working Pattern (PIV)`;
- sisipan: byte di luar blok tidak berubah; tolak prompt: file tidak berubah;
- tabrakan folder `caf-x/` vs `x/` dua arah: tidak ditulis, exit code 1;
- `listDraftFiles` memuat skill; `buildCompleteDraftsMd` masih merender daftar terlarang dari
  `SYNCABLE_SECTIONS`.

## 9. Yang butuh keputusan manusia

| ID | Keputusan | Rekomendasi |
|---|---|---|
| H1 | Nama `scope-discipline`/`no-guess` (D6) vs awalan `caf-` wajib (FR-9) | Ganti ke `caf-scope-discipline`/`caf-no-guess`: kepemilikan jelas, tabrakan dengan skill buatan user mustahil. Design saat ini memakai nama D6 |
| H2 | Aturan agent: banner DRAFT saja, tanpa "berisi TODO" | Setuju banner saja (K2) |
| H3 | Arti "WARN bila banner hilang" | WARN bila ada TODO terbuka tanpa banner (K3) |
| H4 | Jalur tulis pointer: `writeIfAbsent(overwrite: true)` | Setuju; alternatif `fs.writeFileSync` seperti `agents-sync.js:152` melanggar invariant 4 |
| H5 | `--skill-dir` ditiadakan di v1 | Setuju |
| H6 | Pemetaan: `architect` dapat 2 skill, `documentation` dapat `no-guess` | Setuju; bila ragu kembali ke Q2 persis |
| H7 | `Skills` sebelum `Constraints` | Setuju (konsisten dengan `insertSection`) |
| H8 | Versi `claude` saat uji umkm-pos | Mohon dicatat; mesin ini `2.1.292` |
| H9 | `caf-verify` DRAFT bila satu slot saja tidak punya script | Terima untuk v1 sesuai D5; pantau di AC-9 |
| H10 | Agent dengan kind tak dikenal: prompt default "No" | Setuju |
| H11 | AC-9 harus dijalankan manusia di umkm-pos | Tidak bisa diotomasi dari sini |

## 10. Temuan sampingan (di luar lingkup, usul tiket terpisah)

1. **`## Input` milik qa/reviewer terbaca DRIFT tepat setelah `curate baseline` di MONOREPO.**
   Isi di-generate dengan `appNames` (`agents.js:514`), template pembanding kind-only
   (`agent-sections.js:54`). Baseline = isi sekarang ≠ template, hasilnya DRIFT, dan
   `curate --sync-only` akan menggantinya dengan versi generik. Terlihat di eksperimen: "would
   update `## Input` in caf-qa.md (DRIFT)". Sudah ada sebelum tiket ini.
2. `verifyCommand` menebak `npm` saat package manager tidak terdeteksi di root scope
   (`runner-command.js:20`).
3. Urutan `stack.apps` tidak disortir di `repo-context.js` (sejalan dengan §10.5 requirements).
