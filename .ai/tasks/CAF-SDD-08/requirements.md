# CAF-SDD-08 — Rename builder `/caf-run` (kosmetik)

Status: APPROVED
Repo: caf-initiator (branch `ai-agent/CAF-SDD-06`, setelah 06 dan 07)

## Outcomes
- Kode builder `/caf-run` bernama sesuai commandnya: `src/templates/run-command.js` dan `buildRunMd`, bukan `run-pipeline-command.js` dan `buildRunPipelineMd`.
- Tidak ada perubahan perilaku: setiap berkas yang ditulis scaffold byte-identik dengan sebelum tiket ini.

## Scope
In:
- Rename berkas `src/templates/run-pipeline-command.js` menjadi `src/templates/run-command.js` (`git mv`, riwayat terjaga) dan ekspor `buildRunPipelineMd` menjadi `buildRunMd`.
- Semua pemakai di `src/` dan `test/`: import, panggilan, komentar yang menyebut nama berkas atau fungsi lama, nama variabel prompt `generateRunPipeline` di `agents.js`.
- Satu section baru di `CLAUDE.md`.

Out:
- Teks command (`/caf-run`), nama command, dan nama berkas hasil scaffold (`caf-run.md`).
- Penyebutan `/caf-run-pipeline` sebagai nama command lama (catatan migrasi, README, test migrasi): itu nama command, bukan nama kode.
- Nama berkas golden `test/fixtures/**/run-pipeline.json` dan seluruh isi `test/fixtures/` (tidak diedit, tidak direkam ulang).
- Nama berkas test yang sudah ada.
- Folder `.ai/tasks/` tiket lama dan section `CLAUDE.md` lama (riwayat).
- `buildPlanTicketMd` dan builder lain.

## Findings (dari kode, main 2d3adab)
- F-1: `buildRunPipelineMd` diekspor satu kali di `src/templates/run-pipeline-command.js` dan diimpor oleh `src/commands/agents.js`.
- F-2: Berkas lain yang menyebut nama berkas atau fungsi lama: `src/templates/fix-review-command.js`, `src/templates/ticket-preview-commands.js` (komentar), `test/helpers/record-sdd05a.mjs`, `test/helpers/mono-snapshot.js`, dan test `sdd03b3-commands`, `sdd03c2-validator-default`, `sdd03f-stale-text`, `sdd05a-caf-design`, `sdd03c2c-run-command`, `single-repo-scaffold`, `sdd03c3-single-repo-roster`.
- F-3: `package.json` memuat `files: ["src", ...]` dan `main: src/index.js`; tidak ada `exports`. Jalur impor `src/templates/*` bukan API publik.
- F-4: `agents.js` memakai nama variabel prompt `generateRunPipeline` (nama kunci `prompts`, bukan teks yang ditampilkan). Test mengisi jawaban prompt berdasarkan urutan, bukan nama kunci.
- F-5: Section `CLAUDE.md` 03c2c menyatakan "Builder keeps its name and file". Section lama adalah riwayat dan tidak ditulis ulang.
- F-6: Golden `test/fixtures/pre-sdd05a/run-pipeline.json` dan `pre-sdd03*` dibaca test lewat nama berkas golden, tidak lewat nama modul.

## Assumptions
- A-1: Tidak ada pembaca nama modul di luar `src/` dan `test/` (skrip, workflow, dokumen). Dasar: `grep` nama lama di seluruh pohon di luar `node_modules`, `.git`, `.ai/` hanya menemukan berkas di F-2 dan `CLAUDE.md`. T1 mengulang `grep` dan memeriksa juga `scripts/` dan `.github/`.
- A-2: Tidak ada nama `buildRunMd` atau `run-command` yang sudah terpakai sebagai identifier atau berkas kode. Dasar: `grep` pada `src` tidak menemukan keduanya; yang cocok hanyalah nama berkas test `sdd03c2c-run-command.test.js` dan komentar. T1 memeriksa.
- A-3: Kunci prompt `generateRunPipeline` tidak dibaca di luar `agents.js`. Dasar: `grep` menemukannya hanya di `agents.js`.

## Decisions already made
- D-1: Nama baru `run-command.js` dan `buildRunMd` (keputusan tiket ini, selaras dengan `plan-command.js`, `review-command.js`, `fix-review-command.js`).
- D-2: Tanpa alias ekspor lama (`buildRunPipelineMd`): modul internal, F-3.
- D-3: Golden dan test lama tidak diubah isinya selain nama impor dan panggilan; asersi tetap sama.

## Constraints
- Rename berkas dengan `git mv`, bukan salin lalu hapus.
- Isi fungsi dan teks yang dihasilkan tidak berubah. Perubahan di dalam `run-command.js` hanya: baris `export function`, komentar atau JSDoc yang menyebut nama lama (`run-pipeline.md` pada JSDoc menjadi `run.md`), dan rujukan komentar ke nama berkas lama.
- Komentar di berkas lain yang menyebut `run-pipeline-command.js` diganti `run-command.js`; kalimat sisanya tidak diubah.
- Kemunculan `/caf-run-pipeline` yang merujuk command lama tidak diubah di berkas mana pun.
- `test/fixtures/` tidak disentuh. Tidak ada rekaman ulang golden dan tidak ada golden baru (tidak ada perubahan keluaran).
- Snapshot `mono-pnpm.json` tidak berubah.
- Tidak ada dependency baru, tidak ada panggilan model.

## Open questions
Tidak ada.

## Acceptance criteria
- AC-1: When the repository is searched (excluding `node_modules`, `.git`, `.ai/`, `test/fixtures/` and the old `CLAUDE.md` sections), then no file or identifier named `run-pipeline-command` or `buildRunPipelineMd` remains, `src/templates/run-command.js` exports `buildRunMd`, and `src/templates/run-pipeline-command.js` does not exist.
  Verify: automated test — `test/sdd08-rename.test.js` (berkas lama tidak ada; modul baru mengekspor `buildRunMd` dan tidak mengekspor nama lama; pindai `src/` dan `test/` kecuali pengecualian dan berkas test ini sendiri).
- AC-2: When any scaffold or `curate` runs on any fixture, then every file written is byte-identical to before this ticket, including `.claude/commands/caf-run.md`.
  Verify: command: `npm test` | expect: exit 0 (golden `pre-sdd0*` dan `mono-pnpm.json` tidak diedit; `git diff --stat` untuk `test/fixtures/` kosong).
- AC-3: When `git diff` of the ticket is read for `src/templates/run-command.js` against `src/templates/run-pipeline-command.js` with rename detection, then only the export line and comment or JSDoc lines that name the old file or function differ.
  Verify: automated test — `test/sdd08-rename.test.js` membandingkan isi modul baru dengan isi di commit sebelum rename (`git show HEAD:...`) setelah mengganti nama lama menjadi baru; hasilnya sama persis, dan perbedaan baris sebelum penggantian hanya baris yang mengandung nama lama.
- AC-4: When the ticket's changes are read outside `run-command.js`, then each changed line in `src/` and `test/` is an import path, a function name, the prompt key `generateRunPipeline`, or a comment naming the old file or function; no assertion, string literal of generated text, or fixture changed.
  Verify: manual — baca `git diff` dari commit rename; tiap baris sesuai daftar itu.
- AC-5: When `/caf-run-pipeline` appears in `src/`, `README.md` and `test/`, then every occurrence still refers to the old command name and none was changed by this ticket.
  Verify: automated test — `test/sdd08-rename.test.js` menghitung kemunculan `/caf-run-pipeline` di `src/` dan `README.md` dan membandingkan dengan jumlah di commit sebelum tiket (`git show`).
- AC-6: When the verification gate runs, then `npm test` passes.
  Verify: command: `npm test` | expect: exit 0
- AC-7: When `CLAUDE.md` is read, then it has a section for CAF-SDD-08 stating: the new module and function names; that only names changed (no output, golden, or snapshot changed); that `/caf-run-pipeline` in older sections and in migration notes is the old command name, not the old code name; and that the 03c2c line "the builder keeps its name and file" is history superseded by this ticket.
  Verify: manual — baca section; tiap butir di atas ada.