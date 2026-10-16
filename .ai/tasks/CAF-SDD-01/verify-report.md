# Verify Report

Ticket: CAF-SDD-01
Status: SUCCESS

## Attempt Log
- Baseline (sebelum perubahan, `main` @ ca70d44): `npm test` 191/191 lulus.
- Attempt 1: builder + registrasi + pemetaan planner. `npm test` 179/191, 12 gagal. Semua 12 adalah test lama yang mengunci daftar lama secara harfiah (5 skill, `drafts` hanya `caf-verify`, tabel pemetaan planner). Test snapshot `mono-pnpm.json` (`test/repo-context.test.js`) LULUS, tidak tersentuh.
- Attempt 2: ekspektasi test lama disesuaikan + `test/skills-spec.test.js` baru. 203/204, 1 gagal (`skills-pointer.test.js`: filter test sendiri menganggap hanya `caf-verify` yang DRAFT).
- Attempt 3: filter itu digeneralkan ke `result.drafts`. `npm test` 204/204 lulus. Commit 32031ce.
- Lanjutan v2 (keputusan Ganjar, sumber `caf-spec.source.v2.md`), attempt 1: `npm test` 206/206 lulus pada percobaan pertama. Lihat bagian "Lanjutan v2" di bawah; bagian itu menggantikan hal yang bertentangan di atasnya (nomor baris, jumlah baris, Catatan 3 butir pelonggaran, Catatan 4a/4b).

## Acceptance Criteria
- AC-1 PASS — `src/templates/skill-md.js:246` (`SPEC_DRAFT_BANNER`), `:253` (`buildSpecSkill`), `:338` (terdaftar di `buildSkillFiles`), `:20` (`SKILL_NAMES`). Test: `AC-1: scaffold skills writes caf-spec with its frontmatter and the 3-line DRAFT banner — single-nuxt | mono-pnpm` (`test/skills-spec.test.js:97`). Cek tambahan sekali jalan: output `buildSpecSkill()` byte-identik dengan `caf-spec.source.md` + satu newline penutup.
- AC-2 PASS — ditulis lewat `writeIfAbsentGuarded` yang sama dengan skill lain (`src/commands/skills.js:224`), tanpa `--force`. Test: `AC-2: an existing caf-spec/SKILL.md is not changed by a re-run — <fixture>` (`test/skills-spec.test.js:119`), membandingkan seluruh tree sebelum/sesudah, termasuk file yang diedit tim.
- AC-3 PASS — dry-run lewat helper yang sama (`skills.js:224`, opsi `dryRun`). Test: `AC-3: --dry-run writes nothing and reports what the real run does — <fixture>` (`test/skills-spec.test.js:136`): tree tidak berubah, `drafts`/`skipped`/`collisions` sama dengan jalur write.
- AC-4 PASS — `src/templates/skill-md.js:38` (`planner: [...ARTIFACT_WRITER_SKILLS, 'caf-spec']`). Test: `AC-4: the planner maps to caf-spec, and only the planner` (`:166`) dan `AC-4: while the DRAFT banner is there, no planner gets a pointer to caf-spec` (`:173`): planner existing, planner baru (byte-identik dengan sebelum caf-spec ada), dan planner yang sudah punya `## Skills` tidak diedit.
- AC-5 PASS — Test: `AC-5: check-drafts after scaffold skills — no FAIL, no finding about caf-spec — <fixture>` (`:153`). Eksekusi CLI nyata dicatat di Catatan.
- AC-6 PASS — 72 baris. Test: `AC-6: the template is at most 90 lines` (`:69`).
- AC-7 PASS dengan catatan — `npm test` 204/204; `git diff --stat` tidak menyentuh `test/fixtures/` (0 baris). Catatan: "seluruh test lama lulus" hanya tercapai setelah ekspektasi di 3 file test lama disesuaikan (lihat Catatan 3). Tidak ada test lama yang dihapus.

## Quality Gate
- `npm test`: 204 tests, 204 pass, 0 fail.
- Lint/build: tidak ada di `package.json`, tidak dijalankan.
- `git diff --stat`: README.md, src/commands/skills.js, src/templates/skill-md.js, test/skills-pointer.test.js, test/skills-scaffold.test.js, test/skills-templates.test.js (+ file baru test/skills-spec.test.js). `test/fixtures/snapshots/` tidak tersentuh.
- Invariant: tidak ada pemanggilan model; `writeIfAbsent` tanpa `--force`; placeholder guard tetap jalan (0 placeholder); heading `##` contoh tetap di dalam fence dan `parseSections` hanya melihat 6 section asli (test `:75`).

## Catatan

### 1. Pola generator (T1)
- Builder: `src/templates/skill-md.js`, satu fungsi murni `build*Skill()` per skill, mengembalikan string template literal.
- Daftar skill: `SKILL_NAMES` (urutan tulis/tampil) + objek `builders` di `buildSkillFiles()`; pemetaan kind: `SKILLS_BY_KIND`.
- Frontmatter: helper privat `skillMd({ name, description, title, banner, body })`, hanya `name` + `description`.
- Penulisan: `skillsTarget()` di `src/commands/skills.js`, loop `writeIfAbsentGuarded(..., { dryRun, overwrite })`.
- Gerbang DRAFT: `hasSkillDraftBanner()` (baris `> DRAFT` dalam 15 baris pertama); `usableSkillPaths()` dan `addSkillPointers()` membuang skill DRAFT.
- Penyimpangan dari pola, disengaja: `buildSpecSkill` tidak lewat `skillMd()`. Helper itu menaruh banner SETELAH judul dan memakai kalimat banner generator; sumber menaruh banner SEBELUM judul dengan dua baris pertama sendiri. Karena isi wajib apa adanya, builder menulis frontmatter sendiri; baris ketiga banner memakai konstanta bersama `SKILL_DRAFT_AGENT_LINE`.
- `caf-spec` ditaruh di akhir `SKILL_NAMES`, jadi urutan pointer planner kelak: scope-discipline, no-guess, spec.

### 2. Perubahan di luar daftar task (kecil, perlu diketahui)
- `skills.js:234-258`: peringatan DRAFT dipecah dua. Pesan lama berbunyi "a verification script was not detected ... open TODO lines", salah untuk `caf-spec`. Skill DRAFT tanpa baris TODO kini dapat pesan sendiri ("not tested in a real agent run yet"). Nilai kembalian `drafts` tidak berubah bentuk.
- README.md: "five" jadi "six", satu baris tabel, satu kalimat di "DRAFT skills" (Docs Task: daftar skill memang disebut di sana). CLAUDE.md tidak menyebut daftar skill, dilewati.

### 3. Test lama yang ekspektasinya diubah
- `skills-templates.test.js`: daftar 5 nama jadi 6; tabel pemetaan planner; `CONSTANT` dan test "finished skills carry neither banner line" mengecualikan `caf-spec` (lahir DRAFT).
- `skills-scaffold.test.js`, `skills-pointer.test.js`: `drafts` kini memuat `caf-spec`; jumlah file tertulis 5 jadi 6; filter "skill DRAFT" di test pointer membaca `result.drafts`, bukan nama `caf-verify`.
- SATU pelonggaran substantif: test "skills an agent may point at never tell it to wait for a chat reply" mewajibkan tiap skill terpetakan memuat frasa `agent definition` (baris "the agent definition wins"). Isi `caf-spec` tidak memuatnya dan tidak boleh diubah, jadi `caf-spec` dikecualikan dari asersi itu saja (`skills-templates.test.js:160`). Asersi larangan "wait for/go-ahead/confirmation/approval" tetap berlaku untuk `caf-spec` dan lulus.

### 4. Hal yang butuh keputusan (usulan, spec tidak diubah)
- a. Sebelum banner `caf-spec` dihapus: tambah baris "agent definition wins" ke isi skill, atau resmikan pengecualiannya. Invariant CLAUDE.md menyebut skill yang ditunjuk agent tidak boleh mendefinisikan ulang file report atau kata status; `caf-spec` mendefinisikan `Status: DRAFT | NEEDS_CLARIFICATION | APPROVED` untuk `requirements.md` dan menyebut `verify-report.md`. Sejalan dengan A3, tetapi belum diputuskan.
- b. `caf-spec` berbahasa Indonesia dan menyebut `umkm-pos` di banner, sedangkan skill lain berbahasa Inggris dan universal (commit 71ed438 menerjemahkan sisa konten Indonesia). Skill ini kini tertulis di SEMUA repo yang menjalankan `scaffold skills`. Dipakai apa adanya sesuai tiket.
- c. Sesi manual: skill DRAFT tetap bisa terpicu lewat `description` (FINDINGS bagian 8); banner hanya menggerbang agent.
- d. `.ai/` di-gitignore: `tasks.md` (centang) dan report ini tidak ikut commit.
- e. `AGENTS.md` tidak ada di root repo; tidak dibaca.

### 5. Usulan jawaban
- Q-1: cukup 3 skill dulu (`caf-scope-discipline`, `caf-no-guess`, `caf-spec`). Alasan: tiap pointer adalah satu `Read` wajib per run, dan generator belum punya mekanisme pointer bersyarat (`## Skills` berisi daftar tetap). `caf-design`/`caf-breakdown` diputuskan di tiket planner.
- Q-2: ikut default. Polanya sudah begitu: `caf-verify` ditulis default walau DRAFT; tidak ada mekanisme target per-skill. Tidak ada skill DRAFT lain yang menyalahi pola ini.

### 6. Hasil check-drafts (T5), CLI nyata pada salinan fixture
Urutan: `curate --check-drafts` → `scaffold skills --dry-run` → `scaffold skills` → `curate --check-drafts`.

| Fixture | check sebelum | dry-run | scaffold | check sesudah |
|---|---|---|---|---|
| mono-pnpm | exit 0 | exit 0, `.claude/skills` tidak dibuat | exit 0, wrote 6 | exit 0, 6 draft, 0 fail, 0 warn |
| single-nuxt | exit 0 | exit 0, `.claude/skills` tidak dibuat | exit 0, wrote 6 | exit 0, 6 draft, 0 fail, 0 warn |

Satu-satunya temuan di kedua fixture: `INFO .claude/skills/caf-verify/SKILL.md — 1 TODO(s) still open — DRAFT` (sudah ada sebelum tiket ini). Tidak ada temuan untuk `caf-spec`: banner dikenali, 0 placeholder, 0 baris TODO.

## Lanjutan v2 (sumber: caf-spec.source.v2.md)

### Hasil
- `buildSpecSkill()` (`src/templates/skill-md.js:259`, banner `:252`) byte-identik dengan `caf-spec.source.v2.md` + satu newline penutup (dicek sekali jalan dengan skrip). 74 baris (AC-6: <= 90).
- Frasa asersi: test mengecek regex `/agent definition/`. v2 memuat "If the agent definition conflicts with this skill, the agent definition wins." → cocok. Tidak STOP; skill tidak diubah, asersi tidak dilonggarkan.
- `npm test`: 206 tests, 206 pass. `git diff --stat -- test/fixtures`: kosong, snapshot `mono-pnpm.json` tidak tersentuh.
- AC-1 sampai AC-7 tetap PASS; bukti test sama, nomor baris baru di `test/skills-spec.test.js`: AC-1 `:126`, AC-2 `:148`, AC-3 `:165`, AC-5 `:182`, AC-4 `:195` dan `:202`, AC-6 `:69`.

### Test yang diubah dan alasannya
- `test/skills-templates.test.js:158` — pengecualian `caf-spec` dari asersi `/agent definition/` DIHAPUS (keputusan 3). `caf-spec` kini lolos asersi yang sama dengan skill terpetakan lain. `BORN_DRAFT` masih dipakai di dua tempat lain di file itu (`:48` dan `:199`) hanya untuk fakta bahwa `caf-spec` lahir berbanner; itu bukan pelonggaran aturan isi.
- `test/skills-spec.test.js` — `BANNER`: dua baris pertama diganti ke teks v2 (tanpa nama project); baris ketiga tidak berubah. Alasan: sumber berganti.
- `test/skills-spec.test.js:75` — heading di dalam fence dan daftar section `parseSections` diganti ke string Inggris v2 (Outcome, Scope, Constraints and Assumptions, Decisions Already Made, Open Questions, Acceptance Criteria); ditambah asersi `In:`/`Out:`, baris `Status:`, pola `AC-1: When ..., then .... Verify:` dan `Q-1 [...] ... — Answer:`. Alasan: keputusan 5.
- BARU `:102` "caf-spec banner: three lines, no project name; the agent definition wins" — tepat 3 baris blockquote, baris pertama `> DRAFT`, baris ketiga persis kalimat Agents, tanpa `umkm-pos`, kalimat "agent definition wins" ada.
- BARU `:114` "caf-spec defines requirements.md only: no report format, no report status or verdict word" — memegang batas invarian yang dipersempit (keputusan 4): hanya satu baris `Status:` (milik requirements.md); satu-satunya file report yang disebut `verify-report.md`; tidak ada validate-report/review-notes/qa-report; tidak ada kata SUCCESS/NEEDS_HUMAN/PASS/FAIL/BLOCKED/REQUEST_CHANGES; tidak ada heading format report.
- Test lain tidak diubah.

### Penyempitan invarian (keputusan 4)
- Satu-satunya tempat invarian itu tertulis: `CLAUDE.md:142-148`. Kalimat aslinya dipertahankan, ditambah pengecualian sempit yang menyebut `caf-spec`/`requirements.md` saja.
- Komentar di atas `SPEC_DRAFT_BANNER` (`src/templates/skill-md.js:246-250`) menyatakan batas yang sama.
- Sebelumnya tidak ada test yang memegang invarian ini; test `:114` di atas ditambahkan khusus untuk `caf-spec`. Skill lain tidak mendapat kelonggaran apa pun.
- `src/templates/skill-md.js:138` dan `:205` (isi skill `caf-verify`/`caf-escalate`, "status word ... defined by the agent definition") tidak disentuh.

### README (keputusan 6)
Tidak diubah: catatan DRAFT `caf-spec` di README tidak menyebut bahasa maupun `umkm-pos`.

### check-drafts ulang (CLI nyata, salinan fixture, isi v2)
| Fixture | check sebelum | dry-run | scaffold | check sesudah |
|---|---|---|---|---|
| mono-pnpm | exit 0 | exit 0, `.claude/skills` tidak dibuat | exit 0, wrote 6 | exit 0, 6 draft, 0 fail, 0 warn |
| single-nuxt | exit 0 | exit 0, `.claude/skills` tidak dibuat | exit 0, wrote 6 | exit 0, 6 draft, 0 fail, 0 warn |

Satu-satunya temuan: `INFO .claude/skills/caf-verify/SKILL.md — 1 TODO(s) still open — DRAFT`. Tidak ada temuan untuk `caf-spec`.

### Status butir terbuka sebelumnya
- 4a (baris "agent definition wins", invarian status): SELESAI lewat keputusan 3 dan 4.
- 4b (bahasa Indonesia, `umkm-pos`): SELESAI lewat v2.
- Masih terbuka: Q-1 dan Q-2 (usulan tidak berubah); 4c (sesi manual bisa memicu skill DRAFT lewat `description`); 4d (`.ai/` di-gitignore, jadi `caf-spec.source.v2.md` pun tidak ikut git: sumber kebenaran yang ter-commit hanya `buildSpecSkill()`).
