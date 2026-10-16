# CAF-SDD-07 — Tasks

Eksekusi di `caf-initiator`, di branch `ai-agent/CAF-SDD-06` yang sama (JANGAN buat branch baru, JANGAN checkout main). Hanya commit lokal. Jangan push, jangan publish, jangan merge. Berkas tiket ada di `.ai/tasks/CAF-SDD-07/`; pakai apa adanya.

## Frontend Tasks
(none)

## Backend Tasks
- T1 (baca dulu, sebelum menyentuh `src/`): pastikan HEAD adalah commit 06 terakhir dan `git status` hanya menunjukkan berkas tiket 07 yang untracked. Verifikasi Findings F-1..F-5 dan Assumptions A-1..A-4 terhadap kode. Untuk A-1 dan A-2 baca `../caf-orchestrator/src` (`report-reader.ts`, alur review/fix-review, `ac-summary.ts`); bila repo itu tidak ada di mesin ini, catat bahwa A-1/A-2 tidak terverifikasi, lanjutkan, dan tandai di `verify-report.md`. STOP dan laporkan bila ada temuan yang bertentangan dengan sebuah AC (terutama A-1). Catat deviasi bentuk di `verify-report.md`.
  - Daftar semua test yang menahan teks yang akan diganti atau yang berdekatan: `IMPLEMENTATION_SPEC_WORKFLOW` (`### 1. Read`), butir "A blocking finding rules out ..." reviewer, langkah 2 dan 3 `VALIDATOR_WORKFLOW`, dan `frozen-kinds.test.js` untuk implementer. Daftar itu menentukan test lama yang diubah di T2-T4.
  - Rekam golden `test/fixtures/pre-sdd07/` SEKARANG, dari kode yang belum diubah: render `frontend` dan `backend` (mono-pnpm), `implementer` dan `frontend`/`backend` (single-nuxt, lewat helper implementation-agents), `reviewer` dan `validator` (mono-pnpm dan single-nuxt). Pakai pola helper `record-sdd06.mjs`. Commit golden terpisah sebelum perubahan apa pun.
- T2 (AC-1): di `IMPLEMENTATION_SPEC_WORKFLOW` (`agent-md.js`) tambahkan dua baris Coverage persis seperti di Constraints, tepat setelah butir `tasks.md` di `### 1. Read`. Tidak ada perubahan lain di teks itu.
- T3 (AC-2): di `REVIEWER_SPEC_WORKFLOW`, ganti dua baris "A blocking finding rules out an approving verdict; ..." dengan lima baris reviewer persis seperti di Constraints. Jangan menyebut nilai verdict di mana pun di teks itu.
- T4 (AC-3, AC-4): di `VALIDATOR_WORKFLOW`, ganti dua baris pertama `### 2. Run the repo verification gate` dengan empat baris validator persis seperti di Constraints (butir kedua tentang gap tetap ada: baris "A checklist line with no command ..." tidak diubah), dan tambahkan dua baris pipa tepat setelah baris "What `verify-report.md` claims is never a reason for `PASS` on its own: only what you ran is." di `### 3. Judge every AC`.
- T5 (AC-5..AC-7): buat helper `test/helpers/since-07.js` (pola `since-06.js`) agar test lama membaca golden mereka melalui keempat perubahan, termasuk `frozen-kinds` implementer, tanpa mengedit satu pun berkas golden. Perbarui test lama yang menahan teks yang berubah dan catat tiap perubahan beserta alasannya di `verify-report.md`.
- T6 (semua AC bertipe test): tulis `test/sdd07-agent-clarity.test.js` sesuai `Verify:`. AC-7 pakai `makeOldRepo` dengan agent dari golden `pre-sdd07` untuk frontend, backend, reviewer, validator, termasuk kasus CONFLICT byte demi byte. `mono-pnpm.json` hanya diregenerasi pada entri yang disebut di Constraints; catat entri yang berubah.
- T7 (AC-9): tambah section "CAF-SDD-07" di `CLAUDE.md` setelah section 06.
- T8 (AC-8): jalankan `npm test`. Tulis `verify-report.md` di `.ai/tasks/CAF-SDD-07/` dengan baris `Status:` polos (`SUCCESS` atau `NEEDS_HUMAN`), tabel per AC (id | status | metode | bukti), dan bagian `### Notes` (deviasi, hasil verifikasi A-1/A-2, test lama yang diubah beserta alasannya, entri snapshot yang berubah, usulan perubahan spec di baris `Proposed Spec Changes:`).

## Docs Tasks
(none)

## Skip Agents
(none)

## Coverage
- AC-1: T2, T6
- AC-2: T3, T6
- AC-3: T4, T6
- AC-4: T4, T6
- AC-5: T2, T3, T4, T5, T6
- AC-6: T1, T5, T6
- AC-7: T5, T6
- AC-8: T8
- AC-9: T7