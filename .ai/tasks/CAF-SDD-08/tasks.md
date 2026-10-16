# CAF-SDD-08 — Tasks

Eksekusi di `caf-initiator`, di branch `ai-agent/CAF-SDD-06` yang sama (JANGAN buat branch baru, JANGAN checkout main). Hanya commit lokal. Jangan push, jangan publish, jangan merge. Berkas tiket ada di `.ai/tasks/CAF-SDD-08/`; pakai apa adanya.

## Frontend Tasks
(none)

## Backend Tasks
- T1 (baca dulu, sebelum menyentuh `src/`): pastikan HEAD adalah commit 07 terakhir dan `git status` hanya menunjukkan berkas tiket 08 yang untracked. Verifikasi Findings F-1..F-6 dan Assumptions A-1..A-3 terhadap kode, termasuk `grep` nama lama di `scripts/` dan `.github/`. STOP dan laporkan bila ada temuan yang bertentangan dengan sebuah AC. Catat deviasi bentuk di `verify-report.md`.
  - Daftar semua berkas yang menyebut `run-pipeline-command`, `buildRunPipelineMd`, atau `generateRunPipeline`. Daftar itu menentukan T2-T3.
- T2 (AC-1, AC-3): `git mv src/templates/run-pipeline-command.js src/templates/run-command.js`; ubah baris ekspor menjadi `buildRunMd` dan komentar atau JSDoc di dalam berkas yang menyebut nama lama. Commit sendiri sebelum langkah lain. Tidak ada perubahan lain di berkas itu.
- T3 (AC-4, AC-5): perbarui semua pemakai (`src/commands/agents.js`, komentar di `fix-review-command.js` dan `ticket-preview-commands.js`, helper dan test di F-2): jalur impor, nama fungsi, kunci prompt `generateRunPipeline` menjadi `generateRun`, komentar yang menyebut nama berkas lama. Jangan ubah asersi, teks hasil, atau berkas di `test/fixtures/`. Jangan ubah kemunculan `/caf-run-pipeline`.
- T4 (AC-1, AC-3, AC-5): tulis `test/sdd08-rename.test.js` sesuai `Verify:`. Pembanding `git show` memakai commit sebelum rename (induk commit T2). Bila `git` tidak tersedia di lingkungan test, lewati dengan `skip` dan catat di `verify-report.md`.
- T5 (AC-7): tambah section "CAF-SDD-08" di `CLAUDE.md` setelah section 07. Jangan menulis ulang section lama.
- T6 (AC-2, AC-6): jalankan `npm test`; pastikan `git diff --stat -- test/fixtures` kosong. Tulis `verify-report.md` di `.ai/tasks/CAF-SDD-08/` dengan baris `Status:` polos (`SUCCESS` atau `NEEDS_HUMAN`), tabel per AC (id | status | metode | bukti), dan bagian `### Notes` (deviasi, berkas yang berubah, usulan perubahan spec di baris `Proposed Spec Changes:`).

## Docs Tasks
(none)

## Skip Agents
(none)

## Coverage
- AC-1: T2, T3, T4
- AC-2: T6
- AC-3: T2, T4
- AC-4: T3
- AC-5: T3, T4
- AC-6: T6
- AC-7: T5