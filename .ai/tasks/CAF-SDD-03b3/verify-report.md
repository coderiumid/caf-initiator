# Verify Report

Status: SUCCESS

Tiket: CAF-SDD-03b3 — Command `/caf-plan` dan command review yang spec-aware
Branch: `ai-agent/CAF-SDD-03b3` (dari main `1beb256`, yang memuat merge 03b2 PR #22). Tanpa push, PR, atau merge.
Commit: `459f31b` (golden semua command, T2), `997da2d` (test, implementasi, dokumen).

## Checklist
- [ ] lint — tidak ada skrip lint di `package.json`
- [ ] typecheck — tidak ada skrip typecheck
- [x] test — `npm test`, exit 0: 457 test, 456 lulus, 0 gagal, 1 todo (tiga kali berturut-turut, hasil sama)
- [ ] build — tidak ada langkah build

## Acceptance Criteria
Semua test di bawah ada di `test/sdd03b3-commands.test.js`. "(2 fixture)" = `mono-pnpm` dan `single-nuxt`.

- AC-1: automated-test — ::"AC-1: /caf-plan on <fixture> — written as caf-plan.md with the frontmatter and layout of the other commands, no placeholder left" (baris 149, 2 fixture; lewat `writeIfAbsent`, jadi lewat placeholder guard) dan ::"AC-1: the agent dir is the only input, and it reaches every path in the file" (175). Kode: `src/templates/plan-command.js:129`
- AC-2: automated-test — ::"AC-2: /caf-plan takes a ticket ID or free text, and names the artifact folder" (185), ::"AC-2: /caf-plan spawns caf-planner and points at its rules instead of copying them" (200), ::"AC-2: /caf-plan continues an answered NEEDS_CLARIFICATION, and treats APPROVED as a contract" (212), ::"AC-2: /caf-plan stops after tasks.md and starts no implementation" (221). Kode: `plan-command.js:32` (Input), `:47` (folder dan slug), `:64` (spec yang sudah ada), `:83` (spawn), `:105` (stop)
- AC-3: automated-test — ::"AC-3: a full scaffold on <fixture> — every agent picked, every opt-in command accepted — writes no caf-plan.md" (236; mono-pnpm, single-nuxt, single-nuxt `--role frontend`, `--role backend`), ::"AC-3: the frozen MONOREPO render and its snapshot have no /caf-plan entry" (244), ::"AC-3: no command of the CLI imports the /caf-plan builder" (252). `git diff --stat main..HEAD -- test/fixtures/snapshots` | keluaran kosong
- AC-4: automated-test — ::"AC-4: <fixture> — the same 13 commands, and all but /caf-review and /caf-fix-review are byte-identical to the golden" (270, 2 fixture; golden `test/fixtures/pre-sdd03b3/`, commit `459f31b`) dan ::"AC-4: the name /caf-plan is not the name of a skill, of /caf-plan-ticket or of any other command" (280)
- AC-5: automated-test — ::"AC-5: /caf-review on <fixture> — finds the artifact folder and hands it to the reviewer" (293), ::"… no artifact folder: a code-only review, said so in the PR Review and in chat" (306), ::"… name, argument and output markers are the ones recorded before this ticket" (316; tabel literal `REVIEW_MARKERS`, 16 baris, plus semua blok berpagar di section yang berubah). Kode: `src/templates/review-command.js:153`, `:205`, `:244`, `:296`
- AC-6: automated-test — ::"AC-6: /caf-fix-review on <fixture> — a comment that asks to change goal, scope or an AC never edits requirements.md" (335), ::"… the appended proposal cannot turn verify-report.md into a pass" (353), ::"… name, argument and output markers are the ones recorded before this ticket" (361; tabel literal `FIX_REVIEW_MARKERS`, 14 baris, dan tepat tiga nilai `Status`). Kode: `src/templates/fix-review-command.js:208`, `:260`, `:310-314`
- AC-7: automated-test — ::"AC-7: caf-review.md on <fixture> — only the sections recorded by T1 differ from the golden, and no header was added" dan yang sama untuk `caf-fix-review.md` (385, 2 fixture masing-masing); ::"<file> on <fixture> — the new text adds no TODO, no placeholder and no fence" (399). Bagian sync: command TIDAK ter-track (T1(b)), jadi yang dibuktikan adalah batasannya: ::"AC-7: <fixture> — curate sync does not track commands: an old or customized command is left byte-identical" (411) dan ::"AC-7: <fixture> — a scaffold re-run never overwrites an existing command; a deleted one comes back with the new text" (430)
- AC-8: manual — sudah dijalankan: snapshot TIDAK diregenerasi karena tidak ada entri yang memuat teks dua command itu (T1(g)). `git diff --stat main..HEAD -- test/fixtures/snapshots` | keluaran kosong; test `repo-context` "regression: MONOREPO detection + every rendered file is byte-identical to the pre-change snapshot" lulus tanpa diubah. Jumlah entri yang berubah: 0. Pemilik tiket cukup memastikan diff snapshot memang kosong.
- AC-9: command — `npm test` | exit 0 (`# tests 457, # pass 456, # fail 0, # todo 1`); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | keluaran kosong. Test todo fallback `implementation` masih ada, satu (`test/kind-guard.test.js:118`).
- AC-10: manual — sudah ditulis: `README.md:341` (bagian "Spec-aware commands": dua command, batasan tidak ter-track, `/caf-plan` tersembunyi) dan `README.md:339` (klaim lama "`/caf-review`, `/caf-fix-review` … are unchanged" diganti). `CLAUDE.md:366` sampai akhir (bagian "Commands and the spec") dan `CLAUDE.md:301-302` (daftar "out of scope" 03b2 diperbarui). Pencarian `caf-plan`, `caf-review`, `caf-fix-review` di kedua berkas tidak menemukan klaim lain yang bertentangan. Pemilik tiket perlu membaca kedua bagian.

Yang TIDAK dibuktikan: tidak ada dispatch agent sungguhan dan tidak ada panggilan GitHub. Semua bukti AC-2, AC-5, AC-6 adalah teks hasil render, bukan perilaku model yang menjalankan command.

## Proposed Spec Changes
-

## Catatan

### Jawaban Open Questions
- Q-1: lihat T1(a), (b), (c). Command tidak ter-track `curate`; ini batasan: repo lama perlu menghapus berkas command lalu scaffold ulang (atau `--force`).
- Q-2: lihat T1(d).

### Hasil T1 (audit baca-saja, sebelum `src/` diubah)

**(a) Cara command dibuat.** Tiap command adalah fungsi murni `build*Md({ agentDir, ... })` di `src/templates/`, ditulis ke `.claude/commands/` (atau `--command-dir`) lewat `writeIfAbsentGuarded`. Full scaffold menulis 13 berkas, sama di kedua fixture:
- otomatis saat role dipilih (`PREVIEW_COMMANDS`, `src/commands/agents.js:43`): `caf-plan-ticket`, `caf-design-ticket`, `caf-qa-check`, `caf-review-ticket`; auditor: `caf-audit-scan`, `caf-audit-to-ticket`; PM: `caf-discovery-start`, `caf-discovery-to-ticket`;
- opt-in lewat konfirmasi (default tidak): `caf-run-pipeline`, `caf-fix-review`, `caf-review`;
- target scaffold sendiri: `caf-complete-drafts`, `caf-feature-catalog-sync`.

Struktur: frontmatter `allowed-tools`, `description`, `argument-hint` (11 dari 13; dua command `*-to-ticket` memakai urutan lain), baris kosong, banner DRAFT, satu judul `# `, lalu section `## `. Ada dua pola: pembungkus main-thread yang memerankan role (`ticket-preview-commands.js`, termasuk `/caf-plan-ticket`) dan command yang men-spawn agent lewat Task tool (`/caf-review`, `/caf-fix-review`, `/caf-run-pipeline`, `/caf-discovery-start`).
Harness: command hanya dibuat untuk Claude Code. `caf-init export --kind command` menyalin apa pun yang ada di `.claude/commands/` ke OpenCode, Cursor, Cline, Kiro dengan transformasi frontmatter. Tidak ada pemetaan per command, jadi `/caf-plan` tidak butuh pemetaan harness.

**(b) Tracking.** Tidak ter-track. Manifest (`.caf/.generate-manifest.json`) hanya mencatat section agent; `curate audit`/`sync` hanya membaca direktori agent (satu-satunya rujukan ke command adalah cek keberadaan `caf-feature-catalog-sync.md`, `src/commands/audit.js:138`). Tidak ada sync untuk command.

**(c) `/caf-plan-ticket`.** Isi ticket: MCP tracker bila terhubung, bila tidak minta pengguna menempelkan (`ticketSection`, `ticket-preview-commands.js:82`). Tidak memanggil agent: main thread membaca `{agentDir}/planner.md` dan memerankannya. Hal tak terduga: path itu `planner.md`, padahal berkas yang dibuat scaffold bernama `caf-planner.md`, jadi di repo hasil scaffold cabang fallback-lah yang berjalan. Tidak diubah (byte-identik).

**(d) `/caf-review` dan `/caf-fix-review`.**
| | `/caf-review` | `/caf-fix-review` |
|---|---|---|
| Argumen | nomor PR, opsional (kosong: deteksi dari branch `ai-agent/{TICKET-ID}`) | sama |
| Section | 0 Permission Check; 0.5 Resolve PR Number & TICKET-ID; 0.7 Check for an Existing Review; 1 Read Task Artifacts; 2 Fetch the PR Diff; 3 Spawn caf-reviewer — INITIAL mode; 4 Post GitHub PR Review; 5 Summary to the User; Constraints | 0 Permission Check; 0.5 PR Number Resolution; 1 Fetch Comments; 2 Show the List; 3 User Chooses; 4 Spawn caf-reviewer; 5 Reply & Post Summary; 6 Summary to User; Constraints |
| Berkas keluaran | `.caf/tasks/{TICKET-ID}/review-notes.md` | `.caf/tasks/{TICKET-ID}/fix-review-log.md` |

Webhook caf-orchestrator tidak membaca berkas command. Ia dipicu komentar `/caf-review` / `/caf-fix-review` di PR dan menyalin kontrak prompt spawn-nya (`caf-orchestrator/src/application/use-cases/run-pr-review.use-case.ts:65-150`), lalu mem-parse hasilnya (`src/infrastructure/reports/report-reader.ts:154-185`). Penanda yang dikunci test:
- `/caf-review`: frontmatter `allowed-tools` dan `argument-hint`; kalimat argumen; kalimat larangan verbatim; `Explicit mode: INITIAL`; `commentContext = []`; jalur `review-notes.md` dan daftar bagiannya (Ticket, Agent, Verdict, Security Audit, Qualitative Review, Verdict Rationale, For Developer); tabel verdict ke `event`; panggilan `gh api … /reviews -X POST`.
- `/caf-fix-review`: frontmatter; kalimat argumen; kalimat larangan verbatim; blok format `fix-review-log.md` (`## Fix Review Log`, `Generated:`, `Triggered by:`, `### Comment … [INLINE path:line | GENERAL]`, `Status: FIXED | SKIPPED | NOT_APPLICABLE`, `Notes:`); dua panggilan `gh api` untuk reply dan ringkasan.

**(e) Section yang berubah (tanpa header baru).**
- `/caf-review`: `1. Read Task Artifacts (optional, best-effort)`, `3. Spawn …`, `4. Post GitHub PR Review`, `5. Summary to the User`.
- `/caf-fix-review`: `4. Spawn …`, `6. Summary to User`, `Constraints`.

**(f) Test yang mengunci teks dua command itu.** Tidak ada. `single-repo-scaffold`, `skills-scaffold`, `sdd03b1-validator` hanya menjawab prompt konfirmasinya dengan `false`.

**(g) Entri snapshot.** Tidak ada. Dari 16 entri `mono-pnpm.json`, satu-satunya command adalah `caf-run-pipeline.md`, yang tidak menyalin teks dua command itu. `caf-reviewer.md` menyebut nama `/caf-fix-review` di `Input` (template agent, tidak disentuh).

### Yang dibangun
- `/caf-plan` (`src/templates/plan-command.js`): `1. Input`, `2. Artifact Folder`, `3. Existing Spec`, `4. Spawn caf-planner`, `5. Stop`, `Constraints`. Pola spawn lewat Task tool; `allowed-tools: Read, Grep, Glob, Task` (main thread tidak menulis apa pun). Tersembunyi: tidak ada berkas di `src/` yang mengimpornya.
- `/caf-review`: folder artefak `.caf/tasks/{TICKET-ID}/` dengan ID hasil langkah 0.5; ada `requirements.md` berarti reviewer diberi foldernya dan memeriksa lewat `## Output`-nya sendiri; tidak ada berarti "code-only review", dinyatakan di `body` PR Review dan di chat.
- `/caf-fix-review`: komentar yang meminta perubahan tujuan, scope, atau AC tidak mengedit `requirements.md`; usulan ditambahkan ke `## Proposed Spec Changes` di `verify-report.md`; entri log `SKIPPED` dengan `Notes:` berawalan `Needs a human decision:`; didaftar terpisah untuk pengguna.

### Test lama yang diubah
Tidak ada. Test baru: `test/sdd03b3-commands.test.js` (40 test) dan helper `test/helpers/commands-render.js`.

### Entri snapshot yang berubah (T7)
Tidak ada. Snapshot tidak diregenerasi (lihat AC-8 dan T1(g)).

### Tidak tersentuh
`test/fixtures/frozen-kinds/` (15 golden), `pre-sdd02/`, `pre-sdd02b/`, `pre-sdd03b2/`, `legacy-manifest/`, `snapshots/`; semua test 03a/03a2/02/02b/03b1/03b2; template agent; `src/commands/` (termasuk `agents.js`); 11 command lain; apa pun di caf-orchestrator.

### Hal tak terduga dan keputusan yang perlu diketahui
1. **AC-8 dan bagian sync AC-7 terpenuhi secara kosong.** Dua command itu tidak ada di snapshot dan tidak ter-track `curate`. Akibat nyata: repo yang sudah di-scaffold tidak mendapat teks baru sampai berkas command dihapus dan scaffold dijalankan lagi. Dicatat di README dan CLAUDE.md.
2. **Kalimat larangan `/caf-fix-review` dibiarkan byte-identik, pengecualiannya ditulis di sebelahnya.** Larangan itu berbunyi "only write `fix-review-log.md`", sedangkan §4 meminta usulan ditulis di `verify-report.md`. Kalimat itu disalin orchestrator, jadi saya tidak mengubahnya; butir baru menyatakan "This is the one write allowed besides `fix-review-log.md`". Prompt spawn kini memuat aturan umum dan satu pengecualian eksplisit. Bila pemilik tiket lebih suka kalimat larangannya sendiri yang diubah, itu perubahan kontrak dan perlu tiket bersama orchestrator.
3. **Jalur webhook tidak ikut berubah.** `run-pr-review.use-case.ts` punya salinan prompt sendiri, jadi `/caf-fix-review` yang dipicu komentar PR belum mengenal aturan usulan spec. Reviewer tetap tidak boleh mengedit spec lewat `## Output`-nya (03b2), tetapi pencatatan usulan baru berlaku di jalur command interaktif. Urusan 04.
4. **Mismatch lama, tidak disentuh:** command menulis baris `Notes:`, parser orchestrator membaca `Catatan:` (`report-reader.ts`, `NOTE_LINE`). Awalan `Needs a human decision:` karena itu tidak terbaca sebagai catatan oleh webhook hari ini; status `SKIPPED`-nya terbaca.
5. **Status untuk komentar perubahan spec adalah keputusan saya:** `SKIPPED`, karena nilai baru akan mengubah penanda keluaran. Spec tidak menentukannya.
6. **`verify-report.md` tidak ada.** Teks menyuruh agent tidak membuat berkas itu (berkas tanpa `Status` akan menipu guard `/caf-run-pipeline`) dan menaruh usulan lengkap di `Notes:`. Tambahan di luar bunyi AC, sifatnya anti-menebak. Usulan juga hanya "append", tanpa menyentuh baris `Status:`; test memastikan teks command tidak memuat kata yang di-grep orchestrator.
7. **`/caf-review` tanpa spec:** ambangnya "folder tidak ada atau tanpa `requirements.md`". Reviewer diberi tahu secara eksplisit bahwa ini code-only, supaya aturan "missing context" di `## Output`-nya (03b2) tidak membuatnya berhenti. Header section 1 tetap "(optional, best-effort)" karena header tidak boleh berubah.
8. **`/caf-plan`, keputusan di luar bunyi AC:** `NEEDS_CLARIFICATION` dengan jawaban yang belum terisi berarti tampilkan pertanyaan dan STOP; jawaban di chat diteruskan verbatim ke planner (main thread tidak punya `Write`); status lain (`DRAFT`, `NEEDS_HUMAN`, tanpa baris `Status`) dilanjutkan dari berkas yang ada; satu kata yang bisa berarti ID atau teks berarti tanya dulu; folder slug yang sudah ada dan jelas milik permintaan lain berarti tanya dulu.
9. **Golden direkam lewat scaffold sungguhan** (`renderCommands`: semua agent dipilih, semua konfirmasi ya, tracker Linear, lalu `complete-drafts` dan `feature-catalog-sync`), bukan lewat pemanggilan builder langsung, supaya yang dibekukan adalah yang benar-benar ditulis CLI. Helper itu ikut di commit golden.
10. **Uji merah:** berkas test gagal total sebelum `plan-command.js` ada; dengan template review lama dikembalikan sementara, 12 dari 40 test gagal (AC-5, AC-6, AC-7), sisanya lulus.
11. `.ai/` ada di `.gitignore`: `requirements.md`, `tasks.md`, dan laporan ini tidak masuk commit.

### git diff --stat main..HEAD
```
 CLAUDE.md                                          |  47 ++-
 README.md                                          |  13 +-
 src/templates/fix-review-command.js                |  28 +-
 src/templates/plan-command.js                      | 171 ++++++++
 src/templates/review-command.js                    |  43 +-
 test/fixtures/pre-sdd03b3/commands.mono-pnpm.json  |  18 +
 .../fixtures/pre-sdd03b3/commands.single-nuxt.json |  18 +
 test/helpers/commands-render.js                    |  77 ++++
 test/sdd03b3-commands.test.js                      | 446 +++++++++++++++++++++
 9 files changed, 847 insertions(+), 14 deletions(-)
```

Status: SUCCESS — 457 test (456 lulus, 1 todo, 0 gagal) — commit `459f31b`, `997da2d`
