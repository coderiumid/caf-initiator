# CAF-SDD-06 — Tasks

Eksekusi di `caf-initiator`. Hanya commit lokal. Jangan push, jangan publish, jangan merge. Berkas tiket ada di `.ai/tasks/CAF-SDD-06/`; pakai apa adanya.

## Frontend Tasks
(none)

## Backend Tasks
- T1 (baca dulu, sebelum menyentuh `src/`): pastikan HEAD adalah `main` yang terbaru (2d3adab atau lebih baru, `git status` bersih) lalu buat branch `ai-agent/CAF-SDD-06` dari situ. Verifikasi Findings F-1..F-6 dan Assumptions A-1..A-3 terhadap kode. STOP dan laporkan bila ada temuan yang bertentangan dengan sebuah AC. Catat deviasi bentuk di `verify-report.md`.
  - Daftar semua test yang menahan kalimat kontrak Planner, baris Planner di roster `agent-handoff.md`, dan isi `### 1. Specify` (termasuk `sdd02`, `sdd02d`, `sdd02e`, `sdd05a`, `sdd05b`, `sdd03b3`, `repo-context`). Daftar itu menentukan test lama yang diubah di T2-T3.
  - Rekam golden `test/fixtures/pre-sdd06/` SEKARANG, dari kode yang belum diubah: render Planner (mono-pnpm dan single-nuxt) dan render `agent-handoff.md` (mono-pnpm dan single-nuxt, dengan roster default). Pakai pola helper `record-sdd05b`/`record-sdd05a`. Commit golden terpisah sebelum perubahan apa pun.
- T2 (AC-1, AC-2, AC-5): di `artifact-by-role.js` ubah hanya nilai `planner` menjadi persis nilai di Constraints. Jangan menyentuh entri lain dan jangan membuat teks kedua di `agent-md.js` atau `agent-handoff-md.js`. Buat helper `test/helpers/since-06.js` bila test lama perlu membaca golden mereka melalui perubahan ini (pola `since-05b.js`); jangan edit golden. Catat tiap test lama yang diubah beserta alasannya di `verify-report.md`.
- T3 (AC-3, AC-4): di `PLANNER_SPEC_WORKFLOW` (`agent-md.js`) tambahkan satu baris (dua baris sumber bila perlu dipotong 100 kolom seperti baris lain) persis seperti di Constraints, tepat setelah baris "An AC that holds more than one behavior is split into one AC per behavior.". Tidak ada perubahan lain di Planner.
- T4 (AC-1..AC-6, dan semua AC bertipe test): tulis `test/sdd06-artifact-contract.test.js` sesuai `Verify:`. AC-6 pakai `makeOldRepo` dengan Planner dari golden `pre-sdd06`, termasuk kasus CONFLICT byte demi byte. Golden tidak diubah. `mono-pnpm.json` hanya diregenerasi pada entri yang disebut di Constraints; catat entri yang berubah.
- T5 (AC-8): tambah section "CAF-SDD-06" di `CLAUDE.md` setelah section 05b.
- T6 (AC-7): jalankan `npm test`. Tulis `verify-report.md` di `.ai/tasks/CAF-SDD-06/` dengan baris `Status:` polos (`SUCCESS` atau `NEEDS_HUMAN`), tabel per AC (id | status | metode | bukti), dan bagian `### Notes` (deviasi, test lama yang diubah beserta alasannya, entri snapshot yang berubah, usulan perubahan spec di baris `Proposed Spec Changes:`).

## Docs Tasks
(none)

## Skip Agents
(none)

## Coverage
- AC-1: T2, T4
- AC-2: T2, T4
- AC-3: T3, T4
- AC-4: T1, T3, T4
- AC-5: T2, T4
- AC-6: T3, T4
- AC-7: T6
- AC-8: T5