# Verify Report — CAF-SDD-02

Ticket: CAF-SDD-02 — Planner yang menulis spec, format verify-report, skill caf-traceability
Status: SUCCESS
Tanggal: 2026-10-12
Branch: `ai-agent/CAF-SDD-02` (dari `main` cd8ed1f; SDD-01, 03a, 03a2 ada di main: PR #15, #16, #17)
Commit: `6800652` (golden pra-tiket, T2), `a0b78f0` (implementasi). Lokal saja: tidak di-push, tidak ada PR, tidak di-merge.

## Ringkasan

- Planner: alur Specify, Clarify, Plan, Tasks ditulis di section `## Output` planner (ter-track),
  setelah baris artefak lama yang tidak berubah. Di luar `## Output` tidak ada satu byte pun
  berubah (frontmatter, Input, Constraints, Working Pattern, Retry Logic).
- Format verify-report (`.caf/workflows/agent-handoff.md`): satu baris bukti per AC dan bagian
  `## Proposed Spec Changes`. Baris `Status: SUCCESS | NEEDS_HUMAN` tidak berubah.
- Skill `caf-traceability`: byte-identik dengan `caf-traceability.source.md`, lahir DRAFT,
  dipetakan ke planner, frontend, backend. Tidak ada agent yang menunjuk ke sana.
- T10 dilewati, tunggu uji manual (Q-1 = "belum"). Banner `caf-spec` tetap.

Tiga hal butuh konfirmasi Ganjar, tidak menghalangi (rinci di Catatan, "Hal tak terduga"):
1. Alur planner ada di `## Output`, bukan `## Working Pattern (PIV)`.
2. Tafsir AC-2 di jalur ticket: catatan `tasks.md` "blocked" tetap ditulis.
3. `requirements.md` masih berstatus DRAFT saat dikerjakan.

## Attempt Log

1. Persiapan: `git log` memuat merge SDD-01/03a/03a2; working tree bersih; `origin/main` sama
   dengan `main`. Tiga file tiket sudah ada di `.ai/tasks/CAF-SDD-02/`, dibaca habis, begitu juga
   verify-report 03a dan 03a2. Baseline `npm test`: 278 test, 277 lulus, 1 todo.
2. T1 audit baca-saja (hasil di Catatan). Juga membaca `caf-orchestrator` lokal
   (`report-reader.ts`, `run-agent-pipeline.use-case.ts`) untuk kontrak yang dibaca orchestrator.
3. T2: skrip sekali pakai di scratchpad (tidak di-commit, menolak menimpa) menulis
   `test/fixtures/pre-sdd02/planner.{mono-pnpm,single-nuxt}.json`. Di-commit lebih dulu (`6800652`).
4. T3: `test/sdd02-planner-spec.test.js`. Merah: 35 test, 32 gagal.
5. T4, T5, T6. Percobaan pertama T5 menaruh alur di `## Working Pattern (PIV)`: test baru hijau,
   tetapi test 03a2 `retry-logic-role-aware.test.js:172` gagal (ia mengunci Working Pattern
   planner ke teks generik). Test itu tidak diubah; alur dipindah ke `## Output`. Hijau.
6. 13 test lama (CAF-SKILLS-01 dan SDD-01) gagal karena daftar skill
   ditulis literal; diperbarui (daftar di Catatan). Tidak ada test 03a/03a2 yang disentuh.
7. T7: skrip sekali pakai meregenerasi snapshot dengan daftar izin dua entri; skrip berhenti
   bila ada entri lain yang berbeda. Hasil: tepat dua entri.
8. T8 `npm test` penuh hijau. T9 README. CLAUDE.md diperbarui (invarian skill berubah).
9. T10 dilewati. T11 laporan ini.

## Acceptance Criteria

Semua test di bawah ada di `test/sdd02-planner-spec.test.js` kecuali disebut lain; test
bertanda "(2 fixture)" berjalan untuk `mono-pnpm` dan `single-nuxt`.

- AC-1: automated-test — test/sdd02-planner-spec.test.js::"AC-1: planner on <fixture> — Specify, Clarify, Plan, Tasks in order, artifacts in .caf/tasks, slug for chat" (2 fixture). Kode: `src/templates/agent-md.js:566`
- AC-2: automated-test — ::"AC-2: planner on <fixture> — Clarify: at most 5 questions, BLOCKING stops with NEEDS_CLARIFICATION, no tasks, today's stop token on the ticket path" (2 fixture)
- AC-3: automated-test — ::"AC-3: planner on <fixture> — an APPROVED spec is not changed; proposals go to verify-report.md" (2 fixture)
- AC-4: automated-test — ::"AC-4: planner on <fixture> — Tasks: every task names its AC ids, every AC has a task, test task before implementation" (2 fixture)
- AC-5: automated-test — ::"AC-5: planner on <fixture> — name, tools, artifacts and status tokens are the ones recorded before this ticket" (2 fixture; tabel literal 12 baris, plus: render baru dengan `## Output` dikembalikan ke isi lama = golden lama byte-identik). Tools planner juga di `test/kind-guard.test.js` "AC-4: frontmatter tools ..." (tidak diubah)
- AC-6: automated-test — ::"AC-6: verify-report format — one evidence line per AC, in one of four forms", ::"AC-6: verify-report format — a \"Proposed Spec Changes\" part, `-` when there is none", ::"AC-6: verify-report format — the Status line keeps its shape and still reads right for caf-orchestrator". Kode: `src/templates/agent-handoff-md.js:65-95`
- AC-7: automated-test — ::"AC-7: caf-traceability is the ticket source verbatim, at most 90 lines, registered once" (sha256 sumber), ::"AC-7: scaffold skills writes caf-traceability with its frontmatter and the 3-line DRAFT banner — <fixture>", ::"AC-7: an existing caf-traceability/SKILL.md is never overwritten — <fixture>", ::"AC-7: --dry-run reports the same list and writes nothing — <fixture>" (2 fixture). Kode: `src/templates/skill-md.js:345`
- AC-8: automated-test — ::"AC-8: caf-traceability maps to planner, frontend and backend, and to nothing else", ::"AC-8: while the DRAFT banner is there no agent points at caf-traceability, and check-drafts gains no FAIL". Kode: `src/templates/skill-md.js:35-40`
- AC-9: manual — `git diff main..HEAD -- test/fixtures/snapshots/mono-pnpm.json`: 2 baris diganti (`.caf/workflows/agent-handoff.md`, `.claude/agents/caf-planner.md`), cocok dengan daftar T1(f) yang disetujui; skrip regenerasi berhenti bila ada entri lain. Test snapshot `test/repo-context.test.js` "regression: MONOREPO detection + every rendered file is byte-identical to the pre-change snapshot" lulus setelahnya
- AC-10: automated-test — ::"AC-10: <fixture> — the old planner's changed section is synced to the new text, no other agent file changes", ::"AC-10: <fixture> — a planner whose Output the user edited is not overwritten (CONFLICT)", ::"AC-10: <fixture> — a section the user customized stays theirs (CUSTOMIZATION) while the untouched one is synced", ::"AC-10: <fixture> — without a manifest baseline nothing is written (UNTRACKED)" (2 fixture)
- AC-11: build-only — `npm test` exit 0 (313 test, 312 lulus, 0 gagal, 1 todo); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` kosong; todo fallback `implementation` masih ada di `test/kind-guard.test.js:117`
- AC-12: none — kondisional; Q-1 = "belum", T10 dilewati, tunggu uji manual. Banner `caf-spec` tidak disentuh
- AC-13: manual — `README.md:12`: satu paragraf SDD (spec-first menuju spec-anchored, bukan spec-as-source). Dibaca ulang terhadap perilaku baru; bagian skills diperbarui ("seven", baris tabel `caf-traceability`, kalimat DRAFT) supaya tidak bertentangan

Yang TIDAK dibuktikan: tidak ada dispatch agent sungguhan. Semua bukti AC-1 sampai AC-4 adalah
teks template, bukan perilaku planner. Apakah model benar-benar berhenti di BLOCKING belum diuji.

## Quality Gate

- `npm test`: exit 0. `# tests 313, # pass 312, # fail 0, # todo 1` (278 lama + 35 baru).
- Lint, typecheck, build: tidak ada di `package.json`.
- 15 golden `test/fixtures/frozen-kinds/`: tidak tersentuh.
- Test 03a/03a2 tidak diubah: `kind-guard`, `frozen-kinds`, `package-scripts`, `false-drift`,
  `retry-logic-role-aware`, `discovery-sections` (`git diff --stat main..HEAD` atas keenam file: kosong).
- `curate sync` hanya dijalankan pada salinan fixture di direktori sementara.
- CLI: `node src/index.js scaffold skills --dir <salinan mono-pnpm> --dry-run` melaporkan
  `would write .../caf-traceability/SKILL.md` dan `caf-spec, caf-traceability: DRAFT`.

## Proposed Spec Changes

- AC-2: perjelas "tasks.md tidak ditulis" untuk jalur ticket. Usul kalimat: "rincian task tidak
  ditulis; di jalur ticket hanya catatan blocked yang sudah ada hari ini". Alasan: orchestrator
  melempar error bila `tasks.md` tidak ada (lihat Hal tak terduga no. 2).
- AC-1/AC-5: `.caf/tasks/<ID-atau-slug>/` di AC-1 vs "path yang sama" di AC-5. Template memakai
  `.caf/tasks/{TICKET-ID}/` dan menyatakan slug mengisi `{TICKET-ID}`. Usul: samakan penulisan di spec.

## Catatan

### Hasil T1

**(a) Planner saat ini.** `name: caf-planner`, `tools: [Read, Write]`, `model: sonnet`. Section:
Role, Scope, Allowed Tools, Input, Output, Constraints, Working Pattern (PIV), Verify Checklist,
Retry Logic. Render `mono-pnpm` dan `single-nuxt` byte-identik (5550 karakter) dan sama dengan
entri snapshot. Isi lengkap: `test/fixtures/pre-sdd02/planner.*.json`.

**(b) Artefak dan token status planner (dikunci di test AC-5).**
- `requirements.md`, `tasks.md` di `.caf/tasks/{TICKET-ID}/` (Output, Allowed Tools).
- Fallback discovery: membaca `.caf/discovery/{TICKET-ID}/prd.md`; `requirements.md` dengan
  `## Status: PLAN` (tanpa pertanyaan terbuka) atau `## Status: NEEDS_HUMAN` (headless, ada
  pertanyaan) plus `tasks.md` minimal "blocked"; section `## Open Questions`.
- `tasks.md`: section `## Frontend Tasks` / `## Backend Tasks`, tag app bila scope lebih dari satu app.
- Constraints: `Status: NEEDS_HUMAN` + `tasks.md` blocked saat headless.
- Retry Logic (teks generik, sama dengan kind lain): `verify-report.md` dengan
  `Status: SUCCESS` / `Status: NEEDS_HUMAN`.
- Yang dibaca orchestrator dari planner (`caf-orchestrator/src/application/use-cases/run-agent-pipeline.use-case.ts:449-455, 523`):
  keberadaan `tasks.md` (tidak ada = error "caf-planner did not produce tasks.md") dan section
  Frontend/Backend Tasks. Status di `requirements.md` tidak di-parse orchestrator.

**(c) Folder artefak.** `.caf/tasks/{TICKET-ID}/` di semua template `src/` (17 file). `.ai/tasks` hanya muncul sebagai rujukan ke dokumen internal repo ini
(`review-command.js`, `fix-review-command.js`). Sesuai A3, tidak ada STOP.

**(d) Format verify-report dan regex Status.** Lihat jawaban Q-3. Regex:
`caf-orchestrator/src/infrastructure/reports/report-reader.ts:35`
`/\bSUCCESS\b/.test(raw) ? 'SUCCESS' : 'NEEDS_HUMAN'`, diuji atas SELURUH isi file, bukan baris
`Status:` saja. Disalin ke test AC-6. `/caf-run-pipeline` memakai aturan "bukan NEEDS_HUMAN"
(`run-pipeline-command.js:331-341`).

**(e) Sync untuk section baru.** Lihat jawaban Q-2.

**(f) Entri snapshot yang memuat teks planner atau format verify-report.** Dari 16 entri file:
- `.claude/agents/caf-planner.md`: definisi planner.
- `.caf/workflows/agent-handoff.md`: satu-satunya yang memuat format verify-report.
- Hanya menyebut nama planner/verify-report tanpa memuat teks template yang diubah (tidak boleh
  berubah): `.caf/tasks/README.md`, `caf-run-pipeline.md`, `task-completion.md`,
  `piv-workflow.md`, dan 8 file agent lain.

### Daftar entri snapshot yang berubah (T7)

Tepat dua, keduanya ada di daftar (f):
1. `.claude/agents/caf-planner.md`: hanya isi `## Output` (alur spec ditambahkan setelah baris lama).
2. `.caf/workflows/agent-handoff.md`: skeleton `verify-report.md` (dua bagian baru) dan tiga
   paragraf penjelasan di bawahnya.

`stack`, urutan kunci, dan 14 entri lain tidak berubah satu byte pun.

### Perilaku sync untuk section baru (jawaban Q-2)

Dari `src/commands/agents-sync.js:118-157`: section yang ada di template tetapi tidak ada di
file lama TIDAK ditulis otomatis. Sync menampilkan preview lalu bertanya per section (default
Ya). Dry-run hanya melaporkan "would add". Bila ditolak, keputusan disimpan di
`.caf-sync-state.json` dan tidak ditanya lagi sampai template berubah. Bila diterima, section
disisipkan menurut `TEMPLATE_SECTION_ORDER` dan langsung di-baseline. Header yang tidak ada di
`TEMPLATE_SECTION_ORDER` disisipkan sebelum `## Role`.

Tiket ini tidak menambah header baru, jadi batasan itu tidak terpicu: planner lama menerima teks
baru sebagai DRIFT biasa pada `## Output` (ditulis tanpa prompt, hanya bila section itu belum
diedit sejak baseline). Repo tanpa manifest: UNTRACKED, tidak ditulis, perlu `curate baseline`
dulu. Granularitas per section: `Input` yang dikustomisasi tetap milik pengguna sementara
`Output` yang tidak disentuh tetap ter-sync (test AC-10 ketiga).

Batasan yang tetap ada: `agent-handoff.md` tidak punya sync sama sekali (`writeIfAbsent`). Repo
lama tidak menerima format verify-report baru kecuali file itu dihapus lalu `scaffold workflow`
dijalankan lagi. `curate audit` akan melaporkan header `Acceptance Criteria` dan
`Proposed Spec Changes` sebagai belum ada di file lama (`canonical-sections.js` membaca header
dari template). Tidak diperbaiki di tiket ini.

### Jawaban Q-3

Format verify-report hidup di satu sumber yang di-generate: `src/templates/agent-handoff-md.js`
(section `## Format verify-report.md`, ditulis ke `.caf/workflows/agent-handoff.md`). Hanya itu
yang diubah.

Salinan dan rujukan lain:
- `CAF.md:529-547`: format berbeda (`## Status: SUCCESS / NEEDS_HUMAN`, Attempt Log, Acceptance
  Criteria, Quality Gate). TIDAK diselaraskan: `CAF.md` ada di daftar Out. Sudah tidak sama
  dengan `agent-handoff.md` sebelum tiket ini. Perlu tiket sendiri.
- `src/templates/tasks-readme.js:25`: menunjuk ke "CAF.md Layer 3" untuk format. Tidak diubah
  (mengubahnya mengubah entri snapshot di luar daftar).
- Retry Logic agent (`agent-md.js`): hanya nama file dan kata status, bukan format. Tidak diubah.
- `task-completion-md.js:67`, `run-pipeline-command.js`: hanya menyebut `Status:`.
- Skill `caf-traceability`: memuat empat bentuk baris bukti yang sama. Dua tempat ini harus
  diubah bersama (dicatat di CLAUDE.md).

Agent frontend/backend tidak dirujuk ke `agent-handoff.md` oleh definisinya sendiri, dan teks
mereka dilarang diubah di tiket ini. Jadi "tempat resmi" itu ada, tetapi agent implementasi baru
membacanya bila pipeline atau manusia menunjukkannya, atau setelah banner `caf-traceability`
dilepas.

### Test lama yang diperbarui (bukan test 03a/03a2)

Semua karena daftar skill ditulis literal:
- `test/skills-templates.test.js`: `SKILL_NAMES` (7), tabel pemetaan, `BORN_DRAFT`.
- `test/skills-scaffold.test.js`, `test/skills-pointer.test.js`: daftar `drafts`, jumlah file
  ditulis (6 menjadi 7), pointer frontend disaring dari skill DRAFT.
- `test/skills-spec.test.js` (SDD-01): pemetaan planner; dan dua asersi
  `!includes('caf-spec')` dipersempit menjadi "tidak ada path `caf-spec/SKILL.md`", karena T5
  mewajibkan planner menyebut skill `caf-spec` dalam prosa. Maksud test (tidak ada pointer) tetap.

### Hal tak terduga

1. **Alur planner ada di `## Output`, bukan `## Working Pattern (PIV)`.** Test 03a2
   (`test/retry-logic-role-aware.test.js:172`, ditulis di commit 4fc92cf) menegaskan Working
   Pattern planner = teks generik. Mengubahnya dilarang. Section baru juga tidak cocok: hanya
   sampai ke planner lama lewat prompt interaktif, dan AC-10 meminta "section yang berubah
   ditulis". `## Output` ter-track, sudah khusus planner, dan baris lamanya tetap di baris
   pertama. Bila Ganjar lebih suka Working Pattern: satu baris di test 03a2 itu harus diizinkan
   berubah, dan pemindahan nanti berarti satu siklus DRIFT lagi di semua repo.
2. **AC-2 vs kontrak orchestrator.** AC-2: "`tasks.md` tidak ditulis selama ada BLOCKING".
   Constraint: artefak yang dibaca orchestrator tetap dihasilkan. Orchestrator melempar error
   bila planner tidak meninggalkan `tasks.md`. Tafsir yang dipakai: rincian task tidak ditulis;
   di jalur ticket (headless) catatan "blocked" yang lama tetap ditulis, dan status di
   `requirements.md` adalah `Status: NEEDS_HUMAN` sebagai pengganti `NEEDS_CLARIFICATION`
   (A2). Di jalur chat: `Status: NEEDS_CLARIFICATION`, tanpa `tasks.md`.
3. **Dua kosakata status di `requirements.md`.** `## Input` lama masih menyebut
   `## Status: PLAN` dan `## Status: NEEDS_HUMAN` (bentuk heading); `caf-spec` memakai
   `Status: DRAFT | NEEDS_CLARIFICATION | APPROVED`. Input tidak diubah karena AC-5. Planner
   sekarang membaca dua bentuk. Perlu keputusan di tiket lanjutan (04 atau 02b).
4. **Planner menyebut skill yang masih DRAFT.** T5 meminta format dirujuk ke `caf-spec`, tetapi
   banner `caf-spec` menyuruh agent mengabaikannya. Teks ditulis "ikuti bila tercantum di
   `## Skills`", dan langkah Specify memuat aturan minimum (penomoran `AC-n:`, `Verify:`) supaya
   planner tetap bisa bekerja sebelum T10.
5. **Regex orchestrator membaca seluruh file.** Kata `SUCCESS` di mana pun dalam
   `verify-report.md` terbaca sukses, termasuk di usulan perubahan spec pada laporan
   NEEDS_HUMAN. Kelemahan lama, tetapi bagian teks bebas yang baru memperbesar peluangnya.
   Skeleton dijaga test, dan satu kalimat peringatan ditambahkan di format. Perbaikan
   sebenarnya ada di orchestrator (regex ber-jangkar baris), di luar tiket ini.
6. **`caf-traceability` mendefinisikan baris bukti verify-report**, padahal CLAUDE.md melarang
   skill mendefinisikan format laporan. Isinya wajib apa adanya, jadi dicatat sebagai
   pengecualian sempit kedua di CLAUDE.md (setelah `caf-spec`). Tidak ada kata status/verdict di
   dalamnya.
7. **`implementer` dan `implementation` tidak dipetakan ke `caf-traceability`** (spec hanya
   menyebut planner, frontend, backend; SINGLE_REPO di luar tugas). Repo SINGLE_REPO dengan
   `caf-implementer` tidak akan mendapat pointer itu kelak. Layak diputuskan di tiket lanjutan.
8. **File sumber tanpa newline akhir.** Skill ditulis sebagai sumber + satu `\n` (sama dengan
   skill lain). Test membandingkan sha256 sumber dengan isi tanpa newline akhir itu.
9. **`requirements.md` berstatus DRAFT** ("menunggu persetujuan Ganjar") saat dikerjakan.
   Perintah mengerjakan tiket dianggap persetujuan. Spec tidak diubah; Q-2 dan Q-3 dijawab di
   sini, bukan di file spec.
10. `.ai/` di-gitignore: laporan ini, `requirements.md`, `tasks.md`, dan file sumber skill tidak
    ikut commit. `git status` bersih.

## git diff --stat (main..HEAD)

```
 CLAUDE.md                                        |  26 ++
 README.md                                        |   7 +-
 src/templates/agent-handoff-md.js                |  27 ++
 src/templates/agent-md.js                        |  75 +++-
 src/templates/skill-md.js                        |  62 ++-
 test/fixtures/pre-sdd02/planner.mono-pnpm.json   |  17 +
 test/fixtures/pre-sdd02/planner.single-nuxt.json |  17 +
 test/fixtures/snapshots/mono-pnpm.json           |   4 +-
 test/sdd02-planner-spec.test.js                  | 522 +++++++++++++++++++++++
 test/skills-pointer.test.js                      |  11 +-
 test/skills-scaffold.test.js                     |   4 +-
 test/skills-spec.test.js                         |   8 +-
 test/skills-templates.test.js                    |  12 +-
 13 files changed, 768 insertions(+), 24 deletions(-)
```

Status: SUCCESS
Test: 313 total, 312 lulus, 0 gagal, 1 todo (fallback `implementation`, AC-7 di 03a)
Commit: 6800652, a0b78f0
