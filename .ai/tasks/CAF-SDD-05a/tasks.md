# CAF-SDD-05a — Tasks

Eksekusi di `caf-initiator`. Hanya commit lokal. Jangan push, jangan publish, jangan merge.

## Frontend Tasks
(none)

## Backend Tasks
- T1 (baca dulu, sebelum menyentuh `src/`): verifikasi Findings F-1..F-7 dan Assumptions A-1..A-4 terhadap kode di kedua repo (`caf-initiator` dan `../caf-orchestrator` bila ada; bila tidak, catat bahwa F-3/A-2 tidak diverifikasi di sisi orkestrator). STOP dan laporkan bila ada temuan yang bertentangan dengan sebuah AC. Catat deviasi bentuk (tidak mengubah AC) di `verify-report.md`.
  - Daftar semua test yang menahan teks `### 3. Plan`, `architectSection`, dan baris `design.md` di `tasks-readme.js` (sdd02d, sdd02e, sdd03b3, sdd03c2c, dll.). Daftar itu menentukan test lama mana yang diubah di T3-T5.
  - Tentukan apakah `.caf/tasks/README.md` ada di `mono-pnpm.json`.
  - Rekam golden `test/fixtures/pre-sdd05a/` SEKARANG, dari kode yang belum diubah: render Planner (mono-pnpm dan single-nuxt), render `/caf-run` (hasArchitect true dan false, hasDocumentation true dan false), render `buildTasksReadme`. Gunakan helper yang ada (`test/helpers/...`). Commit golden terpisah sebelum perubahan apa pun.
- T2 (AC-1..AC-5): salin `caf-design.skill.md` dari folder tiket ini ke dalam `src/templates/skill-md.js` sebagai `buildDesignSkill()` verbatim (frontmatter, judul, badan). Banner DRAFT 3 baris yang sama dengan `caf-traceability` (`SPEC_DRAFT_BANNER`), dipasang di bawah judul. Tambah `'caf-design'` ke akhir `SKILL_NAMES`, ke `builders` di `buildSkillFiles`, dan ke `SKILLS_BY_KIND.planner` setelah `caf-traceability`. Jangan ubah kind lain. Tambah komentar: pengecualian sempit ketiga, hanya format `design.md`.
- T3 (AC-6..AC-8): di `PLANNER_SPEC_WORKFLOW` (`agent-md.js`), ganti tiga baris isi `### 3. Plan` setelah baris `- Only when no \`BLOCKING\` question is open.` dengan enam baris berikut, verbatim, dan tidak ada yang lain:
  ```
  '- Decide the approach at the level of work, not code: which agents and apps are involved, in',
  '  what order, and what depends on what.',
  '- A change that touches more than one app or service, adds or changes a schema or a migration,',
  '  or changes a contract between layers needs a technical design: write `design.md` in the task',
  '  folder before `tasks.md`, following the `caf-design` skill when `## Skills` lists it.',
  '  Otherwise write none. Do not design inside `requirements.md` or `tasks.md`.',
  ```
  Jangan menyentuh baris Specify yang menyebut `design.md`. Perbarui test lama yang menahan tiga baris yang diganti (hasil T1), dan catat tiap perubahan di `verify-report.md`.
- T4 (AC-12..AC-14): di `architectSection` (`run-pipeline-command.js`), tambah satu kalimat pada cabang `hasArchitect: true` sebelum "Spawn Architect": bila `design.md` sudah ada di folder tiket (ditulis Planner), lewati tahap ini dan catat alasannya di ringkasan akhir. Kriteria spawn yang ada tetap. Pada cabang `hasArchitect: false`, ganti kalimat "this ticket should go through Architect first ..." dengan: `design.md` ditulis Planner; bila tiket memenuhi kriteria (lebih dari satu app, schema/migration, kontrak antar-layer) dan `design.md` belum ada, berhenti dan laporkan ke pengguna agar Planner dijalankan ulang. Tidak ada teks lain di command yang berubah. Pindahkan `caf-run.md` dari daftar "identical" di test lama yang relevan ke tes baru, dan catat.
- T5 (AC-15): di `tasks-readme.js`, ubah satu baris `design.md` menjadi: ditulis Planner (skill `caf-design`), hanya bila perubahan memenuhi kriteria desain. Sisa berkas identik. Perbarui test/snapshot yang menahan baris itu sesuai T1.
- T6 (AC-9..AC-11, dan semua AC bertipe test): tulis `test/sdd05a-caf-design.test.js` sesuai `Verify:`. Untuk AC-10 gunakan `makeOldRepo` dengan Planner lama (render dari golden `pre-sdd05a` atau fixture lama), termasuk kasus CONFLICT dengan asersi file tidak berubah byte demi byte. Golden tidak diubah. `mono-pnpm.json` hanya diregenerasi pada entri yang disebut di Constraints; catat entri yang berubah.
- T7 (AC-17): tambah section "CAF-SDD-05a" di `CLAUDE.md` (gaya section 03c2b/03d), dan ubah kalimat "`architect` and `qa` stay until `caf-design` and the connected validator exist" menjadi menyebut bahwa `caf-design` ada (DRAFT) dan `architect` menunggu dispatch test.
- T8 (AC-16): jalankan `npm test`. Tulis `verify-report.md` dengan baris `Status:` polos (`SUCCESS` atau `NEEDS_HUMAN`), tabel per AC (id | status | metode | bukti), dan bagian `### Notes` (deviasi, test lama yang diubah beserta alasannya, entri snapshot yang berubah, usulan perubahan spec di baris `Proposed Spec Changes:`).

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
- AC-9: T6
- AC-10: T3, T6
- AC-11: T2, T6
- AC-12: T4, T6
- AC-13: T4, T6
- AC-14: T1, T4, T6
- AC-15: T5, T6
- AC-16: T8
- AC-17: T7
