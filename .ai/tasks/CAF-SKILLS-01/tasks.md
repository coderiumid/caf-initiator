# Tasks: CAF-SKILLS-01

Status: **PLAN — belum disetujui.** Jangan mulai Implement sebelum keputusan H1-H7, H10 di
`design.md` §9 dijawab. Asumsi bila disetujui apa adanya: nama skill sesuai D6, banner sebagai
satu-satunya gerbang, tanpa `--skill-dir`.

Aturan untuk semua task:
- Setelah **setiap** task: `npm test` harus lulus dan `git diff --stat test/fixtures/snapshots/`
  harus kosong. Jika snapshot berubah: berhenti, jangan regenerate.
- File test lama dan fixture tidak diubah. Test baru masuk file baru.
- Tidak commit, tidak push.

## 0. Baseline (tanpa perubahan kode)
- [ ] Catat `npm test` = 124 lulus dan `git status --short` kosong
- Verifikasi: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"`

## 1. Builder section + parameter `skills = []` (risiko snapshot, paling awal)
- File: `src/templates/agent-md.js`
  - `buildSkillsBody(skillPaths)`, `buildSkillsSection(skillPaths = [])` (`''` bila kosong)
  - `buildAgentMd({ ..., skills = [] })`; baris `:635` menjadi
    `${buildSkillsSection(skills)}${buildBatasanSection(kind)}` tanpa newline baru
  - `export` pada `buildVerifyChecklist` (`:68`), tanpa perubahan isi
- Test baru: `test/skills-section.test.js`
  - `buildSkillsSection([])` = `''`
  - untuk tiap `KNOWN_KINDS` + `implementation`: tanpa `skills` sama byte dengan `skills: []`
  - dengan skill: `parseSections` melihat header `Skills`; letaknya setelah `Output`, sebelum
    `Constraints` (planner) dan `Working Pattern (PIV)`
  - frontmatter tidak memuat `skills:`; `tools:` tidak memuat `Skill`
  - hash setiap section di `SYNCABLE_SECTIONS` sama dengan dan tanpa `skills`
  - isi section tidak memuat baris `## ` dan tidak memuat kata `TODO`
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 2. Daftarkan `Skills` di `TEMPLATE_SECTION_ORDER`
- File: `src/utils/agent-sections.js` (`'Skills'` setelah `'Output'`, `:18`).
  `SYNCABLE_SECTIONS` tidak disentuh
- Test baru: `test/skills-pointer.test.js` (bagian 1)
  - `Skills` ada di `TEMPLATE_SECTION_ORDER`, tidak ada di `SYNCABLE_SECTIONS`; `Report Format`
    tetap terakhir
  - `insertSection(..., 'Skills', body)`: mendarat setelah `Output`; byte di luar blok tidak berubah
  - AC-4: `auditAgentDefinitions` (`entries`, `sectionCounts`) dan `agentsSync({ dryRun: true })`
    sama sebelum/sesudah sisip, varian tanpa manifest dan dengan `curateBaseline`
  - AC-7: `caf-pm.md`/`caf-ux-designer.md`: `sectionCounts.DRIFT` sama; isi file tidak berubah
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 3. Template skill
- File baru: `src/templates/skill-md.js` (`SKILLS_DIR`, `SKILL_NAMES`, `SKILLS_BY_KIND`,
  `skillsForKind`, `skillPath`, `SKILL_DRAFT_BANNER`, `hasSkillDraftBanner`,
  `countOpenSkillTodos`, lima `build*Skill`, `buildSkillFiles`)
- Test baru: `test/skills-templates.test.js`
  - determinisme: dua kali render sama; urutan `apps` dibalik, hasil sama
  - MONOREPO (fixture `mono-pnpm`): command ber-`--filter` per workspace
  - AC-8: `findUnresolvedPlaceholders` kosong untuk kelima skill (single, mono, repo kosong)
  - `caf-verify`: ada slot kosong berarti `TODO` + banner; keempat slot terisi berarti tanpa banner
  - skill konstan: tanpa banner, 0 baris TODO terbuka, tanpa kata `DRAFT` di 15 baris pertama,
    tanpa kalimat menunggu konfirmasi (kecuali `caf-piv`)
  - `caf-piv` tidak dipetakan ke kind mana pun; setiap nama di `SKILLS_BY_KIND` ada di
    `SKILL_NAMES`; `pm`, `ux-designer`, `auditor`, `devops` kosong
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 4. Command `scaffold skills` (langkah tulis skill)
- File baru: `src/commands/skills.js` (`skillsTarget({ dir, agentDir, dryRun, overwrite, mode })`,
  bagian tulis `SKILL.md` saja)
- File: `src/utils/collision-check.js` (`detectSkillDirCollision`)
- File: `src/commands/scaffold.js` (`TARGETS`, `switch`; **bukan** `CHAIN_ORDER`)
- File: `src/index.js` (teks help `--force`)
- Test baru: `test/skills-scaffold.test.js`
  - AC-2: `--dry-run` pada salinan `single-nuxt` dan `mono-pnpm`: tree identik
  - AC-3 (tulis): run nyata menulis 5 file; run kedua tree identik
  - AC-5: repo tanpa `package.json`: tidak throw; `caf-verify` berisi `TODO` + banner
  - FR-9: folder `verify/` vs `caf-verify/` (dua arah): tidak ditulis, `process.exitCode = 1`
  - `--force`: `SKILL.md` ditimpa; tanpa `--force`: tidak
  - `TARGETS.skills` ada; `CHAIN_ORDER` tidak memuat `skills`
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/` lalu
  `node src/index.js scaffold skills --dir <salinan fixture di /tmp> --dry-run`

## 5. Penyisipan pointer ke agent yang sudah ada (D8)
- File: `src/commands/skills.js` (algoritma `design.md` §7)
- Test: `test/skills-pointer.test.js` (bagian 2)
  - setuju: section tersisip; buang blok, hasil sama byte dengan aslinya
  - tolak: file tidak berubah
  - `--dry-run`: tidak ada prompt terpakai, tree identik
  - AC-3 (penuh): run kedua tanpa prompt dan tanpa perubahan byte
  - agent yang sudah punya `## Skills` (isi berbeda): tidak diedit
  - kind tak dikenal: prompt `initial: false`
  - skill bertabrakan/tidak tertulis: tidak mendapat pointer
  - `--force` tidak memengaruhi file agent
  - belum ada agent: tidak throw, hanya pesan
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 6. `scaffold agents` mengoper `skills` untuk agent baru
- File: `src/commands/agents.js` (`:504-516`; hanya skill yang `SKILL.md`-nya ada di disk; tanpa
  prompt baru)
- Test: `test/skills-scaffold.test.js`
  - repo tanpa `.claude/skills/`: keluaran agent sama byte dengan sebelum perubahan
  - repo dengan skill: agent baru memuat `## Skills` sesuai pemetaan; pm/ux tidak
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/` (perhatikan test yang memakai
  `prompts.inject`: `single-repo-scaffold`, `complete-drafts`)

## 7. `check-drafts` + `listDraftFiles`
- File: `src/commands/complete-drafts.js` (glob skill di `listDraftFiles`, `:27-33`)
- File: `src/commands/check-drafts.js` (`checkSkillPointers`, perluasan `SCRIPT_CHECKED`,
  WARN TODO-tanpa-banner, INFO via `countOpenSkillTodos`, perbaikan kalimat `:100`)
- Test baru: `test/skills-check-drafts.test.js`
  - AC-6: pointer ke file tidak ada: FAIL; pointer ke skill DRAFT: WARN; tree identik
  - pointer ke `caf-piv`: WARN
  - skill dengan TODO terbuka tanpa banner: WARN; skill konstan: tanpa WARN, tanpa INFO
  - command di `caf-verify` yang script-nya tidak ada: FAIL
  - skill segar dari generator di ketiga jenis repo: 0 FAIL
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 8. `/caf-complete-drafts`
- File: `src/templates/complete-drafts-command.js` (blok skill dengan glob runtime; kalimat
  `:169` dan `:216-217`)
- Test: tambahan di `test/skills-check-drafts.test.js`
  - command memuat instruksi glob `.claude/skills/*/SKILL.md`
  - daftar section terlarang masih sama dengan `Object.keys(SYNCABLE_SECTIONS)`
  - keluaran lolos `findUnresolvedPlaceholders`
- Verifikasi: `npm test && git diff --stat test/fixtures/snapshots/`

## 9. Dokumentasi
- File: `README.md` (bagian `scaffold skills`, baris `--force` di tabel `:100-109`, lisensi `:404`)
- File: `CLAUDE.md` (bagian Skills: non-syncable, tabel pemetaan tunggal, aturan banner)
- File: `CAF.md` (bagian skills, temuan `--agent` vs `skills:`, larangan `--bare`)
- Verifikasi: `npm test`; baca ulang ketiga file

## 10. Verify
- [ ] `npm test` (satu-satunya gate; lint/typecheck tidak ada di `package.json`)
- [ ] `git diff --stat test/fixtures/snapshots/` kosong
- [ ] E2E di salinan fixture di `/tmp`: `scaffold skills --dry-run`, run nyata, run kedua;
      `curate --audit-only`, `curate --sync-only --dry-run`, `curate --check-drafts` sebelum dan
      sesudah, dibandingkan (ulang eksperimen `design.md` §1.2 dengan kode final)
- [ ] `verify-report.md`: status, AC + `file:baris`, deviasi dari design. Maks 3 retry, lalu
      `NEEDS_HUMAN`

## 11. AC-9 — dispatch nyata (manusia, di umkm-pos)
- [ ] Catat `claude --version`
- [ ] a. `CASES="E F"` pada `test-skill-preload.sh`: E `FOUND`, F `NOT_FOUND`
- [ ] b. fixture campur (satu skill lengkap, satu DRAFT) dalam satu run
- [ ] c. tugas yang tidak menyinggung skill
- [ ] d. ulang pada agent ber-`Bash` (`caf-qa` atau `caf-frontend`)
- Tidak bisa dijalankan dari repo ini. Bila F tidak konsisten: naikkan D5 menjadi penjaga mekanis
  (pointer baru ditulis setelah banner dihapus) sebelum rilis
