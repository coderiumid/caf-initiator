# CAF-SDD-05b — Tasks

Eksekusi di `caf-initiator`, di branch `ai-agent/CAF-SDD-05a` yang sama (JANGAN buat branch baru, JANGAN checkout main). Hanya commit lokal. Jangan push, jangan publish, jangan merge. Berkas tiket ada di `.ai/tasks/CAF-SDD-05b/`; pakai apa adanya.

## Frontend Tasks
(none)

## Backend Tasks
- T1 (baca dulu, sebelum menyentuh `src/`): pastikan HEAD branch adalah commit 05a terakhir dan `git status` bersih. Verifikasi Findings F-1..F-7 dan Assumptions A-1..A-4 terhadap kode. Untuk A-1 baca `../caf-orchestrator/src` (`stopForSpecIfNeeded`, `stopForClarification`, pembaca `requirements.md`); bila tidak ada di mesin ini, catat bahwa A-1 tidak terverifikasi di sisi orchestrator. STOP dan laporkan bila ada temuan yang bertentangan dengan sebuah AC. Catat deviasi bentuk di `verify-report.md`.
  - Daftar semua test yang menahan teks `### 1. Specify` Planner, langkah 5 dan `## Constraints` `/caf-plan`, dan baris README tugas. Daftar itu menentukan test lama yang diubah di T3-T5 (termasuk `sdd05a-caf-design.test.js` AC-7 dan helper `since-05a.js`).
  - Tentukan apakah `caf-plan.md` ada di `mono-pnpm.json`.
  - Rekam golden `test/fixtures/pre-sdd05b/` SEKARANG, dari kode yang belum diubah (HEAD 05a): render Planner (mono-pnpm dan single-nuxt), render `buildPlanMd`, render `buildTasksReadme`. Pakai pola helper `record-sdd05a.mjs`. Commit golden terpisah sebelum perubahan apa pun.
- T2 (AC-1..AC-5): salin `caf-breakdown.skill.md` ke `src/templates/skill-md.js` sebagai `buildBreakdownSkill()` verbatim, dengan banner DRAFT 3 baris yang sama seperti `caf-design`. Tambah `'caf-breakdown'` ke akhir `SKILL_NAMES`, ke `builders` di `buildSkillFiles`, dan ke `SKILLS_BY_KIND.planner` setelah `caf-design`. Jangan ubah kind lain. Komentar: pengecualian sempit keempat, hanya format `breakdown.md`.
- T3 (AC-6..AC-8): di `PLANNER_SPEC_WORKFLOW` (`agent-md.js`), di bawah `### 1. Specify`, sisipkan dua baris berikut sebagai butir pertama setelah baris-baris pembuka yang sudah ada tentang membaca berkas yang ada di folder tiket (T1 mencatat posisi persisnya; bila ragu, taruh tepat sebelum butir yang mulai menulis `requirements.md`), verbatim dan tidak ada yang lain:
  ```
  '- Before specifying, check whether the request is one deliverable or several. A request with',
  '  more than one outcome that could ship and be used on its own is split: write `breakdown.md`',
  '  in the task folder, following the `caf-breakdown` skill when `## Skills` lists it. One outcome',
  '  reached in many steps is not split; its steps go to `tasks.md`.',
  '- When you split, write `requirements.md` for the request as a whole as an outline, with',
  '  `Status: NEEDS_CLARIFICATION` and one `BLOCKING` question: split as in `breakdown.md`, or',
  '  continue as one spec. Write no `tasks.md`. Once that question has an `Answer:`, do not split',
  '  again. Never create tickets: that is a human step.',
  ```
  (Dua butir, delapan baris sumber.) Perbarui `since-05a.js` / test 05a AC-7 sehingga golden `pre-sdd05a` dibaca lewat helper `since-05b` tanpa mengedit golden; catat tiap test lama yang diubah beserta alasannya di `verify-report.md`.
- T4 (AC-11..AC-14): di `plan-command.js` ubah hanya dua tempat.
  - Langkah 5, cabang `NEEDS_CLARIFICATION`: tambahkan bahwa bila `breakdown.md` ada di folder, tampilkan itemnya (id, judul, hasil, dependensi) bersama pertanyaan Planner; hanya bila sebuah tool tracker terhubung di sesi ini (MCP Linear/Jira/GitHub Issues, seperti langkah 1), tawarkan membuat tiketnya satu per satu. Untuk tiap item tanyakan satu pertanyaan sendiri dengan tiga jawaban: ya (buat), ubah (pengguna mengubah judul/deskripsi, lalu tanya lagi), lewati (jangan buat). Tiket dibuat hanya setelah "ya" untuk tiket itu; tanpa jawaban tidak dibuat; tidak pernah beberapa sekaligus. Laporkan ID dan judul tiket yang dibuat di chat. Tanpa tool tracker: sebut nama berkasnya dan jangan buat apa pun. Lalu tetap STOP.
  - `## Constraints`: ganti kalimat "NEVER posts to the tracker or to a PR" sesuai D-5: tidak pernah menulis ke tracker kecuali membuat tiket dari `breakdown.md` setelah "ya" untuk tiket itu; tetap tidak pernah mengubah status tiket yang ada, memposting ke PR, menjalankan `git`, atau mengubah kode. Sisa Constraints dan seluruh teks lain tidak berubah.
  Tidak menyalin aturan Planner ke command. Perbarui test lama yang menahan kalimat itu (hasil T1) dan catat.
- T5 (AC-15): di `tasks-readme.js` tambah satu baris `breakdown.md`: ditulis Planner hanya untuk permintaan dengan beberapa hasil mandiri (skill `caf-breakdown`). Sisa berkas identik. Perbarui test/snapshot yang menahan daftar artefak sesuai T1.
- T6 (AC-9, AC-10, dan semua AC bertipe test): tulis `test/sdd05b-caf-breakdown.test.js` sesuai `Verify:`. AC-9 pakai `makeOldRepo` dengan Planner dari golden `pre-sdd05b`, termasuk kasus CONFLICT byte demi byte. Golden tidak diubah. `mono-pnpm.json` hanya diregenerasi pada entri yang disebut di Constraints; catat entri yang berubah.
- T7 (AC-17): tambah section "CAF-SDD-05b" di `CLAUDE.md` setelah section 05a, dan ubah kalimat-kalimat 05a yang kini tidak lengkap (mis. daftar skill planner, "pengecualian sempit") bila ada.
- T8 (AC-16): jalankan `npm test`. Tulis `verify-report.md` di `.ai/tasks/CAF-SDD-05b/` dengan baris `Status:` polos (`SUCCESS` atau `NEEDS_HUMAN`), tabel per AC (id | status | metode | bukti), dan bagian `### Notes` (deviasi, test lama yang diubah beserta alasannya, entri snapshot yang berubah, usulan perubahan spec di baris `Proposed Spec Changes:`).

## Docs Tasks
(none)

## Skip Agents
(none)

## Coverage
- AC-1: T2, T6
- AC-2: T2, T6
- AC-3: T2, T6
- AC-4: T2, T6
- AC-5: T2, T6
- AC-6: T3, T6
- AC-7: T1, T3, T6
- AC-8: T3, T6
- AC-9: T3, T6
- AC-10: T2, T6
- AC-11: T4, T6
- AC-12: T4, T6
- AC-13: T4, T6
- AC-14: T1, T4, T6
- AC-15: T5, T6
- AC-16: T8
- AC-17: T7