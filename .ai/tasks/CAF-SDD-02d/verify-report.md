# Verify Report — CAF-SDD-02d

Status: SUCCESS

Branch `ai-agent/CAF-SDD-02d`, 6 commit lokal di atas main (fb4b439). Tidak ada push, PR, merge
atau publish. `curate sync`, `curate audit` dan `scaffold skills` hanya dijalankan test pada
salinan fixture di direktori sementara (plus satu `curate --audit-only` manual pada salinan
`mono-pnpm` di direktori sementara, baca-saja).

## Checklist
- [x] syarat mulai: `Status: APPROVED`, Q-1..Q-3 ber-Answer, main bersih dan sejajar origin, merge 43ac420 (02c) dan fb4b439 (03d) ada
- [x] `npm test` sebelum mulai: 590 total, 589 lulus, 0 gagal, 1 todo
- [x] `npm test` akhir: 627 total, 626 lulus, 0 gagal, 1 todo, exit 0
- [x] lint / typecheck / build: tidak ada di `package.json` (hanya `npm test`)
- [x] T1 sampai T9
- [x] classifier izin: tidak ada langkah yang diblokir

## Acceptance Criteria
Semua test di `test/sdd02d-planner-audit.test.js`; `<fixture>` = mono-pnpm dan single-nuxt.
- AC-1: automated-test — test/sdd02d-planner-audit.test.js::AC-1: planner on <fixture> — a fact Read/Glob/Grep can answer is read first, no "not read yet" note, the rest is a `Finding:`
- AC-2: automated-test — test/sdd02d-planner-audit.test.js::AC-2: planner on <fixture> — a section with nothing to say is written `Tidak ada`, never a placeholder
- AC-3: automated-test — test/sdd02d-planner-audit.test.js::AC-3: planner on <fixture> — no `tasks.md` at all while a BLOCKING question has no `Answer:`; the ticket run keeps its blocked note (lihat Keputusan 1)
- AC-4: automated-test — test/sdd02d-planner-audit.test.js::AC-4: planner on <fixture> — the refusal to change an approved spec is `Status: NEEDS_HUMAN` on the first line of `verify-report.md`, never in `requirements.md`
- AC-5: automated-test — test/sdd02d-planner-audit.test.js::AC-5: planner on <fixture> — the final message starts with a plain `Status: <value>` line, values of the artifacts
- AC-6: automated-test — test/sdd02d-planner-audit.test.js::AC-6: planner on <fixture> — an `automated test` AC names the test file or the task that creates it
- AC-7: automated-test — test/sdd02d-planner-audit.test.js::AC-7: planner on <fixture> — `## Input` and `## Output` name the status of `requirements.md` as a `Status:` line, no heading
- AC-8: automated-test — test/sdd02d-planner-audit.test.js::AC-8: planner on <fixture> — outside `## Input` and `## Output` the file is the pre-ticket golden byte for byte; juga AC-8: … inside the two sections only the rules of this ticket and the status wording changed; AC-8: `caf-spec` is the same file as before this ticket (sha256), and `## Skills` is rendered as it was
- AC-9: automated-test — test/sdd02d-planner-audit.test.js::AC-9: <fixture> — sync writes `## Input` and `## Output` of the 02c planner, nothing else in it, and no other agent file; juga varian "customized is not overwritten" dan "customized Output stays the user's while the untouched Input is synced"
- AC-10: automated-test — test/sdd02d-planner-audit.test.js::AC-10: <fixture> — a frontmatter `tools:` that differs from the kind's template is a warning naming the file, the tools now and the template's; juga AC-10: … tools in another order are the same list; an agent file of no known kind is not compared
- AC-11: automated-test — test/sdd02d-planner-audit.test.js::AC-11: <fixture> — an active skill of the agent's kind that `## Skills` does not point at is a warning naming agent, skill and the manual step; juga AC-11: … put the DRAFT banner back on `caf-spec` and the planner's warning is gone
- AC-12: automated-test — test/sdd02d-planner-audit.test.js::AC-12: <fixture> — a clean scaffold has no warning and the audit report of before this ticket, with or without skills (laporan dibandingkan entri demi entri dengan `pre-sdd03c1/curate-old-repo.<fixture>.json`); exit code repo AC-10/AC-11 diperiksa di test AC-10 dan AC-11
- AC-13: manual — `git diff main -- test/fixtures/snapshots/mono-pnpm.json` : 1 baris berubah, entri `.claude/agents/caf-planner.md`, cocok dengan daftar T1 butir 6. Skrip regenerasi membandingkan dulu sebelum menulis: `stack` sama, daftar kunci sama, entri berubah = [`.claude/agents/caf-planner.md`]. Perlu dibaca manusia.
- AC-14: command — `npm test` | exit 0 (627 total, 626 lulus, 0 gagal, 1 todo); `git diff --stat main -- test/fixtures/frozen-kinds/` | kosong. Test `todo` masih ada: test/kind-guard.test.js "AC-7: an unknown kind (caf-foo.md) is not treated as implementation …".
- AC-15: manual — README: daftar "The generated Planner", tabel "Getting this in a repository scaffolded earlier", bagian baru "Rollout warnings" di bawah `caf-init curate`. CLAUDE.md: paragraf "Since CAF-SDD-02d the planner is stricter …" dan paragraf "`curate audit` also prints two rollout warnings …". Perlu dibaca manusia.

## Commit
- 3a320e6 Record the pre-SDD-02d planner render as a golden (CAF-SDD-02d)
- f5e087c Add failing tests for the stricter planner and the curate audit warnings (CAF-SDD-02d)
- 7b8aaf8 Make the planner stricter and give it one status convention (CAF-SDD-02d)
- a8a9b04 Warn in curate audit about a stale tools line and a missing skill pointer (CAF-SDD-02d)
- af33d35 Regenerate the MONOREPO snapshot for the stricter planner (CAF-SDD-02d)
- 78d44e8 Document the stricter planner and the curate audit rollout warnings (CAF-SDD-02d)

## git diff --stat main..HEAD
```
 CLAUDE.md                                         |  56 ++-
 README.md                                         |  26 +-
 src/commands/audit.js                             |  87 +++-
 src/templates/agent-md.js                         |  53 ++-
 src/templates/discovery-commands.js               |   6 +-
 test/fixtures/pre-sdd02d/planner.mono-pnpm.json   |  19 +
 test/fixtures/pre-sdd02d/planner.single-nuxt.json |  19 +
 test/fixtures/snapshots/mono-pnpm.json            |   2 +-
 test/sdd02-planner-spec.test.js                   |  38 +-
 test/sdd02b-spec-v3.test.js                       |  31 +-
 test/sdd02c-spec-active.test.js                   |  35 +-
 test/sdd02d-planner-audit.test.js                 | 545 ++++++++++++++++++++++
 test/sdd03d-implementation-spec.test.js           |   5 +-
 13 files changed, 864 insertions(+), 58 deletions(-)
```

## Yang berubah
- `src/templates/agent-md.js`: planner `## Input` 3 baris (status sebagai baris, bukan heading); planner `## Output` 8 blok (4 aturan baru di Specify, 2 baris Clarify ditulis ulang, 1 kalimat ditambah di baris ticket run, ekor aturan APPROVED ditulis ulang, 1 aturan di "Before declaring done"). Tidak ada heading `###` baru. `templateToolsForKind(kind)` diekspor untuk audit.
- `src/templates/discovery-commands.js`: `DISCOVERY_TOOLS` (konstanta); frontmatter pm/ux-designer dirender darinya, hasil byte-identik (golden `frozen-kinds` pm/ux-designer tetap lulus).
- `src/commands/audit.js`: `rolloutWarnings()`; `auditAgentDefinitions()` dan `audit()` mengembalikan `warnings`; status tampilan `warn` (`!`) di Layer 2; satu baris ringkasan hanya bila ada peringatan. `entries`, `requiredGaps`, `declined`, `sectionCounts`, exit code tidak berubah.

## Test lama yang diubah (semuanya mengunci `## Input`/`## Output` planner)
- `test/sdd02-planner-spec.test.js`
  - AC-5: dua literal `## Status: PLAN` / `## Status: NEEDS_HUMAN` diganti teks baru (AC-7); pemulihan ke golden kini juga mengembalikan `## Input`.
  - AC-10 sync: daftar drift bertambah `#Input`; varian CONFLICT: Input ikut tersinkron.
  - AC-10 CUSTOMIZATION: section yang dikustomisasi dipindah dari `Input` ke `Retry Logic`. Alasan: template Input kini berubah, jadi Input yang diedit menjadi CONFLICT; cakupan CUSTOMIZATION dijaga pada section yang template-nya tetap.
- `test/sdd02b-spec-v3.test.js`: AC-6 (pemulihan juga mengembalikan Input; Input keluar dari daftar "sama dengan golden"); AC-8 sync sama seperti di atas, termasuk pemindahan kasus CUSTOMIZATION ke `Retry Logic` (judul test ikut berubah).
- `test/sdd02c-spec-active.test.js`: AC-4 blok aturan APPROVED verbatim dan regex ekornya (AC-4/Q-1 tiket ini); AC-5 "Output minus dua aturan = golden" tidak lagi berlaku baris demi baris, diganti "dua aturan ada tepat sekali + tiga section dikembalikan = golden" (perbandingan baris demi baris kini terhadap golden 02c di test 02d); AC-6 sync: drift bertambah `#Input`.
- `test/sdd03d-implementation-spec.test.js`: "every other kind keep the Output they had" — planner masuk daftar `CHANGED_LATER` (golden `pre-sdd03d/output-by-kind.json` tidak diregenerasi).
- Tidak ada golden lama yang diregenerasi. `frozen-kinds` tidak tersentuh.

## Entri snapshot yang berubah
`test/fixtures/snapshots/mono-pnpm.json`: satu entri, `.claude/agents/caf-planner.md`.

## Hal tak terduga
- `curate-old-repo.*.json` (pre-sdd03c1) merekam `audit.layers`; karena itu peringatan tidak dimasukkan ke `auditAgentDefinitions().entries` dan hanya digabung ke Layer 2 saat ada.
- 10 test lama memakai `auditAgentDefinitions().entries`; tidak satu pun perlu diubah.
- pm/ux-designer tidak ada di `TOOLS_BY_KIND` (A2 benar sebagian), jadi perlu `DISCOVERY_TOOLS`.
- Planner `## Retry Logic` (tidak diubah) menyebut `verify-report.md` dengan `Status: SUCCESS`; nilai itu tidak masuk himpunan pesan akhir AC-5 (lihat Keputusan 4).

## Keputusan yang perlu dijawab manusia
1. Q-2 pada jalur headless. Yang diimplementasikan: "tidak menulis `tasks.md` sama sekali" berlaku di luar ticket run; ticket run (marker headless) tetap menulis catatan blocked dan disebut sebagai satu-satunya pengecualian. Alasan: `## Constraints` planner (terkunci AC-8) menyebut "`Status: NEEDS_HUMAN` + `tasks.md` blocked" dan orchestrator hari ini melempar error tanpa `tasks.md`. Bila yang dimaksud Q-2 adalah larangan total termasuk headless, itu butuh perubahan `## Constraints` dan orchestrator (04b). Setuju dengan bacaan ini?
2. `Tidak ada` ditulis literal di template berbahasa Inggris (sesuai AC-2), dan berbeda dari `caf-spec` yang menyuruh `-`. Definisi agent menang, tetapi dua teks kini tidak seragam. Dibiarkan, atau `caf-spec` disesuaikan di tiket lain?
3. `caf-no-guess` butir 4 masih menyuruh menulis item terbuka sebagai baris berawalan kata to-do di artefak; planner kini memakai `Finding:`. Sama seperti butir 2: dibiarkan atau skill disesuaikan?
4. Pengganti `## Status: PLAN`: Input kini merujuk ke baris `Status:` di Output, dan Output menyatakan spec tanpa pertanyaan BLOCKING terbuka ditulis `Status: DRAFT`. `DRAFT` diambil dari `caf-spec`; tidak ada sumber yang menyebut padanan `PLAN` secara eksplisit. Himpunan pesan akhir = `DRAFT | NEEDS_CLARIFICATION | APPROVED | NEEDS_HUMAN` (tanpa `SUCCESS`). Benar?
5. Kata `TODO` tidak dipakai di aturan AC-1 (ditulis "a note … that says something was not read yet") karena `check-drafts` menghitung kata itu per agent dan dua test lama menolaknya. Cukup?
6. Peringatan audit tidak diperiksa untuk berkas agent yang namanya bukan kind dikenal (fallback `implementation`), dan `tools:` dibandingkan sebagai himpunan. Setuju?
7. Planner yang `## Input`-nya pernah diedit manual kini terbaca `CONFLICT` saat `curate sync` (template Input berubah untuk pertama kali sejak 02). Perlu dicatat di catatan rilis?

## Hasil T1 — audit baca-saja (sebelum `src/` disentuh)

Syarat mulai: `requirements.md` `Status: APPROVED`, Q-1..Q-3 ber-Answer; branch main bersih, sejajar origin/main; merge 43ac420 (02c) dan fb4b439 (03d) ada; `npm test` 590 total / 589 lulus / 0 gagal / 1 todo.

1. Teks planner sekarang
   - `## Input`: `buildInputSection('planner')`, `src/templates/agent-md.js`. Tiga subbagian `###`: Fallback Discovery, Layer 1 reference docs, App-tag requirement.
   - `## Output`: baris kontrak artefak + `PLANNER_SPEC_WORKFLOW` (file yang sama). Heading `###`: 1. Specify, 2. Clarify, 3. Plan, 4. Tasks, An approved spec is a contract, Before declaring done.
2. Frasa `## Status: PLAN`
   - Satu-satunya kemunculan di `src/`: `## Input` planner, langkah 3 Fallback Discovery ("generate `requirements.md` with `## Status: PLAN` as usual"). Di langkah yang sama ada `## Status: NEEDS_HUMAN` (jalur headless). Keduanya memang status `requirements.md` ditulis sebagai heading: konvensi status, bukan hal lain. AC-7 berlaku apa adanya.
   - `## Constraints` planner (di luar dua section) sudah memakai bentuk baris: `Status: NEEDS_HUMAN`.
   - `PLAN` bukan anggota himpunan status mana pun di template lain.
3. `## Input` di-track `curate sync`: ya, `SYNCABLE_SECTIONS.Input` (`src/utils/agent-sections.js`). Planner bukan `APP_LIST_INPUT_KINDS`, jadi kind-only. A3 benar.
4. Golden dan test yang memuat teks planner
   - `test/fixtures/frozen-kinds/`: 15 berkas, tidak ada planner (qa, documentation, architect, devops, auditor, pm, ux-designer, implementer). Tidak ada konflik dengan AC-14.
   - Golden pra-tiket planner: `pre-sdd02/`, `pre-sdd02b/`, `pre-sdd02c/` (tidak diregenerasi).
   - `test/fixtures/snapshots/mono-pnpm.json`: entri `.claude/agents/caf-planner.md`.
   - `test/fixtures/pre-sdd03d/output-by-kind.json`, `pre-sdd03c1/*`: perlu dicek saat test dijalankan.
   - Test yang mengunci `## Input`/`## Output` planner: `sdd02-planner-spec.test.js` (AC-5: literal `## Status: PLAN`, `## Status: NEEDS_HUMAN`, dan "di luar Output tak berubah"), `sdd02b-spec-v3.test.js` (AC-6 "outside Output byte-identical"), `sdd02c-spec-active.test.js` (AC-4 teks aturan APPROVED verbatim, AC-5 Output minus dua aturan = golden, `Input` sama dengan golden).
5. `curate audit`
   - Kode: `src/commands/audit.js` (`auditAgentDefinitions`, `audit`), dipanggil `src/commands/curate.js`. Exit code: `process.exitCode = 1` hanya bila ada `requiredGaps`.
   - Tabel `tools:` per kind: `TOOLS_BY_KIND` di `agent-md.js` (tidak diekspor; `buildFrontmatter` dan `## Allowed Tools` dirender darinya). pm/ux-designer tidak ada di tabel itu: frontmatter mereka `tools: [Read, Write]` literal di `discovery-commands.js`. A2 benar sebagian: perlu satu fungsi yang diekspor.
   - Pemetaan skill per kind: `SKILLS_BY_KIND`/`skillsForKind` (`src/templates/skill-md.js`), sudah diekspor.
   - "Skill aktif": `usableSkillPaths(dir, kind)` (`src/commands/skills.js`) = skill kind itu yang berkasnya ada dan `hasSkillDraftBanner` salah. Pointer: path `…/SKILL.md` dalam backtick di badan `## Skills` (cara `check-drafts` dan `addSkillPointers` membacanya).
   - `test/fixtures/pre-sdd03c1/curate-old-repo.*.json` merekam `audit.layers` repo lama: pemeriksaan baru tidak boleh menambah entri di repo itu (tools cocok, tidak ada skill).
6. Entri snapshot terdampak (daftar untuk AC-13): hanya `.claude/agents/caf-planner.md`.

### Temuan T1 yang menyentuh AC (tidak ada yang menghentikan; lihat "Keputusan" di atas)
- F-1 (AC-3 / Q-2): `## Constraints` planner, yang menurut AC-8 tidak boleh berubah satu byte, menyebut eskalasi headless sebagai "`requirements.md` with `Status: NEEDS_HUMAN` + `tasks.md` blocked", dan orchestrator hari ini melempar error bila `tasks.md` tidak ada (Finding di requirements). Q-2 berbunyi "tidak ditulis sama sekali". Satu-satunya bacaan yang memenuhi AC-3 dan AC-8 sekaligus: larangan total berlaku di luar jalur headless; jalur tiket/headless tetap seperti aturan 02 (catatan blocked).
- F-2 (AC-1): `check-drafts` menghitung kata `TODO` per berkas agent dan dua test lama menolak kata itu di `## Output`. Aturan AC-1 ditulis tanpa kata tersebut.
- F-3 (AC-2): skill `caf-spec` (hash terkunci) menyuruh menulis `-` untuk section kosong; AC-2 meminta `Tidak ada`. Definisi agent menang atas skill menurut kedua teks, tetapi keduanya kini berbeda.
- F-4 (AC-1): skill `caf-no-guess` butir 4 menyuruh menulis `TODO: <what is unknown, where you looked>` di artefak; AC-1 meminta `Finding:`. Sama: definisi agent menang.
- F-5 (AC-7): `PLAN` tidak punya padanan langsung; himpunan status `requirements.md` adalah `DRAFT | NEEDS_CLARIFICATION | APPROVED` (caf-spec) plus `NEEDS_HUMAN` (planner).
