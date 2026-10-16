# CAF-SDD-03c2b — Planner di ticket run meminta klarifikasi lewat status, bukan lewat catatan blocked
Status: APPROVED (Q-1 diputuskan konsultan, Ganjar boleh membatalkan; keputusan lain berasal dari kesepakatan SDD 12 Okt 2026 dan SDD-04c)
Source: chat (cek caf-orchestrator 15 Okt 2026; temuan P-4 laporan 03c2; sisa 03c2b di CAF-SDD-PROGRESS.md)
Repo target: `caf-initiator`
Bergantung pada: 03c3 ter-merge (sudah); caf-orchestrator SDD-04c ter-merge (sudah, harus ter-deploy sebelum planner baru dipakai di repo sungguhan).

## 1. Outcome
Planner yang dijalankan orchestrator (ticket run, penanda `[SYSTEM CONTEXT: Environment = headless...]`) dengan pertanyaan BLOCKING yang belum dijawab menulis `requirements.md` berstatus `NEEDS_CLARIFICATION` tanpa `tasks.md`, sehingga jalur Clarify SDD-04c (draf di-push, komentar `❓ CAF-CLARIFY` di ticket) benar-benar berjalan. `## Output` dan `## Constraints` planner menyatakan hal yang sama dan tidak lagi menunjuk alur Discovery yang sudah dihapus. Repo lama diberi peringatan `curate audit` untuk bagian yang harus diubah manual. Sisa teks usang kecil dan kode mati yang tertunda dibereskan.

## 2. Scope
In:
- Planner `## Output`: aturan ticket run (status `NEEDS_CLARIFICATION`, tanpa `tasks.md`), pengecualian "catatan blocked" dihapus dari semua kalimat yang memuatnya.
- Planner `## Constraints`: aturan headless yang sama, tanpa rujukan ke "Fallback — Discovery".
- `curate audit`: peringatan rollout untuk `## Constraints` planner yang berbeda dari template.
- Komentar kode yang menyatakan sebaliknya.
- `INDEX.md` hasil scaffold: rujukan `.caf/discovery/`.
- Test untuk `readAgentRoster` pada repo hanya-`caf-qa`, hanya-`caf-validator`, dan keduanya.
- Pembuangan `src/utils/architecture-signatures.js`.
- Test, golden pra-tiket, snapshot terbatas, README.md dan CLAUDE.md.

Out:
- Rename `/caf-run-pipeline`, `caf-verify`, pencabutan `/caf-plan-ticket`, routing langkah 4 repo tunggal, kalimat retry tingkat pipeline (semua 03c2c).
- Penolakan planner atas perubahan spec `APPROVED` (`Status: NEEDS_HUMAN` baris pertama `verify-report.md`); status dan perilakunya tidak berubah.
- `## Input`, `## Retry Logic`, `## Working Pattern (PIV)`, `## Skills`, `tools:` planner; semua agent lain; isi skill (hash `caf-spec` tetap).
- Orchestrator; baris `.gitignore` `.caf/discovery/` dan `.caf/audits/` (sengaja dipertahankan).

## 3. Constraints and Assumptions
- Finding: pada orchestrator SDD-04c, `planTicket()` memanggil `stopForSpecIfNeeded()` sebelum `tasks.md` dibutuhkan; hanya `Status: NEEDS_CLARIFICATION` (dan `DRAFT` berlabel gerbang) yang menghentikan run; `APPROVED`, `NEEDS_HUMAN`, dan `DRAFT` tanpa label lanjut ke `tasks.md`; tanpa `requirements.md` atau tanpa baris `Status:` tidak ada Clarify.
- Finding: pada `Status: NEEDS_HUMAN` orchestrator lanjut membaca `tasks.md`; catatan blocked tanpa bagian Frontend Tasks atau Backend Tasks membuat routing melempar galat ("No Frontend Tasks or Backend Tasks section found") dan BullMQ mencoba ulang job.
- Finding: planner hasil `buildAgentMd` memuat tiga kalimat yang bertentangan dengan itu: `## Constraints` ("`requirements.md` with `Status: NEEDS_HUMAN` + `tasks.md` blocked ... see Fallback — Discovery draft in the Input section"), `## Output` langkah Specify ("Ticket run ... `Status: NEEDS_HUMAN` in place of `NEEDS_CLARIFICATION`, plus the blocked `tasks.md` note described in Input"), dan pengecualian pada aturan "tidak ada `tasks.md` selama BLOCKING belum dijawab". `## Input` planner sudah tidak memuat catatan blocked maupun Discovery sejak 03c2, jadi dua rujukan itu menggantung.
- Finding: `## Output` dan `## Input` planner di-track `curate sync`; `## Constraints` tidak (bukan anggota `SYNCABLE_SECTIONS`), jadi planner yang dibuat sebelumnya hanya menerima `## Output` lewat `curate sync` dan `## Constraints`-nya harus diubah manual.
- Finding: `curate audit` sudah mencetak dua peringatan rollout per agent (`tools:` dan pointer skill) sebagai `warn`, bukan gap, tanpa mengubah kode keluar.
- Finding: `readAgentRoster` pada repo hanya-`caf-qa`, hanya-`caf-validator`, dan keduanya sudah benar (diperiksa manual setelah 03c2), tetapi test hanya mengunci kasus hanya-`caf-validator` secara tidak langsung lewat snapshot.
- Finding: `src/utils/architecture-signatures.js` tidak diimpor siapa pun sejak 03c3 (dibiarkan sengaja saat itu).
- Constraint: dari planner hanya `## Output` dan `## Constraints` yang berubah; `## Input`, `tools:`, `## Allowed Tools`, `## Skills`, `## Retry Logic`, `## Working Pattern (PIV)`, `## Verify Checklist`, dan semua agent lain identik byte-for-byte dengan golden pra-tiket.
- Constraint: penolakan atas perubahan spec `APPROVED` tetap `Status: NEEDS_HUMAN` sebagai baris pertama `verify-report.md`; status yang diizinkan untuk `requirements.md` tetap `DRAFT | NEEDS_CLARIFICATION | APPROVED | NEEDS_HUMAN`.
- Constraint: aturan ditulis berdasarkan niat dan memakai kosakata yang sudah ada (`Status:`, `BLOCKING`, `Answer:`, `NEEDS_CLARIFICATION`); tidak ada daftar kata yang dilarang. Kata TODO tidak ditulis literal di teks baru.
- Constraint: peringatan `curate audit` adalah peringatan saja: bukan gap, kode keluar dan hitungan yang ada tidak berubah; hanya planner yang diperiksa; read-only, deterministik, tanpa model. `## Constraints` tidak dijadikan syncable.
- Constraint: golden `frozen-kinds` tidak berubah; test `todo` fallback `implementation` tetap ada; `curate sync` tetap hanya menulis section berstatus `DRIFT`.
- Constraint: CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1 (T1): tidak ada golden `frozen-kinds` untuk planner; dasar: tiket 02 sampai 02e mengubah planner tanpa menyentuh golden itu. T1 mencatat daftar test yang mengunci kalimat yang berubah (perkiraan: `sdd02d-planner-audit`, `sdd02e-planner-read`, `sdd02-planner-spec`, `sdd03c2-validator-default`).
- Assumption A2 (T1): rujukan `.caf/discovery/` di `INDEX.md` dirender `knowledge-index-md.js`; dasar: tindak lanjut 03c2 menemukannya di hasil scaffold. T1 mencatat builder dan kalimatnya.
- Assumption A3 (T1): peringatan rollout dapat ditambah satu pemeriksaan khusus planner di fungsi `rolloutWarnings` (`src/commands/audit.js`) tanpa mengubah keluaran kind lain; dasar: CLAUDE.md menjelaskan fungsi itu per file agent. T1 mencatat bentuk entri yang dikembalikan.
- Assumption A4 (T1): fixture repo lama (`makeOldRepo`) berisi planner dengan `## Constraints` versi sebelum tiket, sehingga laporan `curate` yang direkam (`test/fixtures/pre-sdd03c1/curate-old-repo.*.json`) bertambah tepat satu peringatan. T1 mencatat apa yang benar-benar terjadi; bila laporan itu bertambah lebih dari satu entri atau berubah di tempat lain, STOP `NEEDS_HUMAN`.
- Assumption A5: branch `ai-agent/CAF-SDD-03c2b` dari main terbaru.

## 4. Decisions Already Made
- Via ticket, pipeline berhenti dan bertanya lewat komentar di ticket; di chat Claude bertanya langsung (SDD-summary 12 Okt).
- `NEEDS_CLARIFICATION` selalu menghentikan orchestrator, draf di-push ke branch, jawaban dikumpulkan dari komentar setelah penanda `❓ CAF-CLARIFY` (SDD-04c).
- Agent tidak pernah menulis `tasks.md` selama pertanyaan BLOCKING belum dijawab (02d); orchestrator tidak lagi memerlukannya pada jalur Clarify (04c).
- Template planner yang berubah harus bisa sampai ke repo lama: bagian di-track lewat `curate sync`, bagian tidak di-track lewat peringatan `curate audit` (02d).
- Q-1: penolakan perubahan spec `APPROVED` di ticket run tidak diubah tiket ini (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Penolakan planner atas perubahan spec `APPROVED` di ticket run (`Status: NEEDS_HUMAN` di `verify-report.md`, orchestrator lanjut karena `tasks.md` sudah ada) ikut diubah sekarang (rekomendasi: tidak; perilakunya belum dilihat di dispatch nyata, dicatat sebagai backlog), atau diubah? — Answer: Tidak diubah; masuk backlog (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When planner dirender (fixture `mono-pnpm` dan `single-nuxt`), then `## Output` menyatakan bahwa pada ticket run dengan pertanyaan BLOCKING belum dijawab planner menulis `requirements.md` dengan `Status: NEEDS_CLARIFICATION`, tidak menulis `tasks.md`, dan berhenti; teks itu tidak lagi memuat pengecualian "catatan blocked" maupun `NEEDS_HUMAN` sebagai pengganti `NEEDS_CLARIFICATION` untuk kasus ini. Verify: automated test atas teks hasil render.
- AC-2: When planner dirender, then `## Constraints` menyatakan: pada run dengan penanda headless planner tidak pernah mengakhiri run dengan menunggu konfirmasi chat; eskalasinya adalah `requirements.md` berstatus `NEEDS_CLARIFICATION` dengan pertanyaan BLOCKING yang belum dijawab dan tanpa `tasks.md`. Verify: automated test atas teks hasil render.
- AC-3: When planner dirender, then `## Output` dan `## Constraints` tidak memuat kata "Fallback" atau "Discovery" dan tidak merujuk ke catatan `tasks.md` yang diblokir, sedangkan penolakan perubahan spec `APPROVED` tetap `Status: NEEDS_HUMAN` sebagai baris pertama `verify-report.md`. Verify: automated test.
- AC-4: When planner dirender dibandingkan dengan golden pra-tiket, then hanya `## Output` dan `## Constraints` yang berbeda; `tools:` dan semua bagian lain identik byte-for-byte, dan semua agent lain identik. Verify: automated test dengan golden (`test/fixtures/pre-sdd03c2b/`).
- AC-5: When file planner hasil sebelum tiket di-baseline di repo sementara lalu `curate sync` dijalankan, then hanya `## Output` yang ditulis (DRIFT biasa), `## Constraints` tidak berubah, `## Output` yang dikustomisasi tidak ditimpa, dan file lain tidak berubah. Verify: automated test.
- AC-6: When `curate audit` dijalankan pada planner yang `## Constraints`-nya berbeda dari template, then satu peringatan rollout (status `warn`, bukan gap) menyebut `## Constraints` dan bahwa perbaikannya diubah manual; pada planner dengan teks baru, pada agent kind lain, dan pada repo tanpa planner tidak ada peringatan tambahan; kode keluar dan hitungan yang ada tidak berubah; laporan fixture repo lama yang direkam sama persis kecuali satu peringatan planner tersebut. Verify: automated test.
- AC-7: When `INDEX.md` hasil scaffold dirender, then tidak ada rujukan ke `.caf/discovery/`. Verify: automated test.
- AC-8: When `readAgentRoster` dan `piv-workflow.md` dirender untuk tiga repo sementara — (i) hanya `.claude/agents/caf-qa.md`, (ii) hanya `caf-validator.md`, (iii) keduanya — then (i) QA tercentang dan tidak ada baris Validator, (ii) Validator tercentang dan tidak ada baris "QA — NOT present", (iii) keduanya tercentang, dan `custom` kosong pada ketiganya. Verify: automated test (kasus (i) dan (iii) belum terkunci sebelum tiket).
- AC-9: When kode dicari untuk `architecture-signatures`, then tidak ada hasil. Verify: command: `git grep -n "architecture-signatures" -- src test` | expect: kosong.
- AC-10: When snapshot `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri `caf-planner.md` yang berubah, dicatat. Verify: manual: baca `git diff` snapshot.
- AC-11: When README.md dan CLAUDE.md dibaca, then tertulis aturan ticket run baru planner, bahwa `## Output` planner mencapai repo lama lewat `curate sync` sedangkan `## Constraints` diubah manual dan ditandai peringatan `curate audit`, dan urutan rollout (caf-orchestrator dengan SDD-04c ter-deploy lebih dulu; planner lama di bawah orchestrator lama tetap menulis `tasks.md`, planner baru di bawah orchestrator lama membuat run gagal karena `tasks.md` tidak ada). Verify: manual: baca bagian terkait.
- AC-12: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
