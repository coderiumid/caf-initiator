# CAF-SDD-03c2 — Validator dan /caf-plan masuk scaffold default; command dan reviewer mengenal laporan SDD
Status: APPROVED (Q-1 dan Q-2 diputuskan konsultan, Ganjar boleh membatalkan; keputusan lain berasal dari kesepakatan SDD 12 Okt 2026 dan catatan progres)
Source: chat (daftar 03c2 di CAF-SDD-PROGRESS.md; audit caf-initiator pasca-02c, temuan 8 dan 10; Out of Scope 03f, 15 Okt 2026)
Repo target: `caf-initiator`
Bergantung pada: 03f ter-merge (sudah); 04a ter-merge di orchestrator (sudah, orchestrator memilih `caf-validator` bila berkasnya ada).

## 1. Outcome
Repo baru hasil `caf-init` mendapat `caf-validator` (pengganti `caf-qa`) dan `/caf-plan` secara default. `/caf-run-pipeline` dan `/caf-plan` menghormati status spec (`NEEDS_CLARIFICATION`, BLOCKING tanpa `Answer:`) dan menampilkan usulan perubahan spec tanpa menerapkannya. `## Input` reviewer menerima `validate-report.md`. Rujukan ke command dan folder yang sudah tidak di-scaffold dihapus dari teks hasil scaffold. Repo lama tidak berubah kecuali lewat `curate sync` atau scaffold ulang yang disengaja.

## 2. Scope
In:
- Roster default: `validator` menggantikan `qa` di mono-pnpm dan single-nuxt; `validator` dan `/caf-plan` tidak lagi tersembunyi.
- Scaffold di repo yang sudah punya `caf-qa.md`: `caf-qa.md` tidak disentuh, `caf-validator.md` ditambahkan, satu catatan dicetak (Q-1).
- `/caf-run-pipeline` (hasil render dengan roster validator): langkah gate memakai `caf-validator` dan `validate-report.md`; aturan status spec; usulan perubahan spec ditampilkan, tidak diterapkan.
- `/caf-plan`: aturan berhenti untuk `NEEDS_CLARIFICATION` dan `NEEDS_HUMAN`.
- Reviewer `## Input`: `validate-report.md` diutamakan, `qa-report.md` diterima untuk repo yang masih memakai `caf-qa`.
- Rujukan usang: `.caf/discovery/` dan `/caf-discovery-start` di planner `## Input`; `/caf-review-ticket` di `caf-review.md` dan `caf-fix-review.md`; "PM Agent" di `INDEX.md` hasil scaffold.
- Test, golden pra-tiket, snapshot terbatas, README.md dan CLAUDE.md.

Out:
- Rename `/caf-run-pipeline` ke `/caf-run` dan `caf-verify` ke `caf-self-verify`, pencabutan `/caf-plan-ticket`, planner `## Constraints` (catatan blocked), kata "qa" di komentar/commit/judul PR orchestrator (semua 03c2b atau 04d; Q-2).
- `SINGLE_REPO`, `--role`, penghapusan `implementer` (03c3); fallback kind tak dikenal (tiket sendiri).
- Penghapusan `caf-qa` dari repo mana pun; isi kind `qa`, `validator`, golden `frozen-kinds`; `tools:`, `## Skills`, `## Retry Logic` semua agent; isi skill; baris `.gitignore` `.caf/discovery/` dan `.caf/audits/` (sengaja dipertahankan).
- Orchestrator.

## 3. Constraints and Assumptions
- Finding (audit): default scaffold mono-pnpm = planner, architect, frontend, backend, qa, reviewer; single-nuxt = planner, architect, implementer, qa, reviewer. Command default: caf-complete-drafts, caf-fix-review, caf-plan-ticket, caf-review, caf-run-pipeline. Validator dan `/caf-plan` tersembunyi.
- Finding (audit): sisa rujukan usang yang ditunda dari 03c1: `.caf/discovery/` dan `/caf-discovery-start` di planner `## Input`, `/caf-review-ticket` di `caf-review.md` dan `caf-fix-review.md` (baris 14), "PM Agent" di `INDEX.md`.
- Finding (progres): orchestrator memilih `caf-validator` bila `.claude/agents/caf-validator.md` ada di workspace, selain itu `caf-qa` (04a); repo yang masih `caf-qa` tetap jalan.
- Finding (progres): `## Input` reviewer di-track `curate sync`; di umkm-pos `## Input` reviewer terbaca CONFLICT karena pernah diedit manual.
- Finding (progres): kind `validator` dan format `validate-report.md` ada sejak 03b1; usulan spec validator = baris `Proposed Spec Changes:` di `### Notes` (03e); usulan agent implementasi = `## Proposed Spec Changes` di `verify-report.md` (03d).
- Finding (progres): golden `frozen-kinds` memuat kind `qa` tetapi tidak memuat `validator` maupun `reviewer`.
- Constraint: kind `qa` tetap ada dan tidak berubah; hanya roster default yang berubah. Berkas `caf-qa.md` yang sudah ada tidak dihapus, ditimpa, atau diubah.
- Constraint: `## Input` reviewer harus tetap benar untuk repo campuran (reviewer baru, gate masih `caf-qa`): kedua nama laporan disebut.
- Constraint: dari reviewer hanya `## Input` yang berubah; dari planner hanya `## Input` (rujukan usang); `tools:`, `## Skills`, `## Retry Logic`, `## Output`, `## Constraints` semua agent tidak berubah.
- Constraint: `/caf-plan-ticket`, `/caf-complete-drafts`, dan teks command selain `/caf-run-pipeline`, `/caf-plan`, `/caf-review`, `/caf-fix-review` tidak berubah satu byte pun; dua yang terakhir berubah hanya pada rujukan `/caf-review-ticket`.
- Constraint: command tidak di-track `curate`; repo lama tidak menerima perubahan command tanpa scaffold ulang.
- Constraint: kind di `HIDDEN_CANDIDATE_KINDS` (devops, documentation, pm, ux-designer, auditor) tetap tersembunyi.
- Constraint: kosakata (status spec, `Answer:`, nama berkas laporan, nama bagian usulan) disalin dari teks agent dan template yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Constraint: CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1 (T1): kind `validator` dan `/caf-plan` disembunyikan oleh satu mekanisme di `src/` yang terpisah dari `HIDDEN_CANDIDATE_KINDS`; dasar: audit melaporkan keduanya "masih tersembunyi" sementara `validator` tidak ada di daftar itu. T1 mencatat lokasinya.
- Assumption A2 (T1): roster default tiap stack berasal dari satu daftar kind; mengganti `qa` dengan `validator` cukup di satu tempat; T1 mencatat tempat itu dan semua test serta fixture yang mengunci `qa` di roster.
- Assumption A3 (T1): teks `/caf-run-pipeline` dirender dari roster (dasar: 03f menyelaraskan deskripsinya dengan roster dan cabang `hasDocumentation`); T1 mencatat cabang yang menentukan nama gate dan nama berkas laporan.
- Assumption A4 (T1): `## Input` reviewer dan planner dibangun builder di `src/templates/agent-md.js` dan di-track `curate sync`; T1 mencatat builder dan section yang di-track.
- Assumption A5 (T1): `/caf-plan` (03b3) belum atau sudah memuat aturan berhenti untuk status planner; T1 mencatat teks sebenarnya sebelum T-lainnya mengubahnya. Bila sudah ada dan sesuai AC-8, tiket hanya menambah test.
- Assumption A6 (T1): `scaffold agents` tidak menimpa berkas agent yang sudah ada; dasar: berkas lain memakai pola tulis-bila-belum-ada. T1 mencatat perilaku nyata pada repo yang punya `caf-qa.md`.
- Assumption A7 (T1): `review-notes.md` memuat `## Proposed Spec Changes` (03b2); T1 mencatat teks reviewer yang sebenarnya, supaya command menyebut sumber usulan dengan nama yang benar.
- Assumption A8: branch `ai-agent/CAF-SDD-03c2` dari main terbaru.

## 4. Decisions Already Made
- Agent akhir: planner, frontend, backend, validator, reviewer; `architect`, `qa`, `implementer`, `plan-ticket`, `run-pipeline` transisional (SDD-summary 12 Okt; README dan CLAUDE.md sejak 03f).
- Agent tidak pernah mengedit spec APPROVED; usulan dilaporkan (SDD-summary, 12 Okt).
- Status yang menghentikan pipeline: `NEEDS_CLARIFICATION` atau pertanyaan BLOCKING tanpa `Answer:`; `DRAFT` dan `APPROVED` jalan terus (03d Q-2).
- Orchestrator memilih gate dari keberadaan `caf-validator.md`; repo lama bermigrasi dengan menambahkan berkas itu (04a).
- Q-1: scaffold di repo yang sudah punya `caf-qa.md` menambahkan `caf-validator.md`, tidak menghapus `caf-qa.md`, dan mencetak catatan bahwa orchestrator akan memakai validator (konsultan, 15 Okt 2026).
- Q-2: tiket dipecah: rename, pencabutan `/caf-plan-ticket`, dan planner `## Constraints` dikerjakan di 03c2b setelah Ganjar memastikan di repo orchestrator bahwa tidak ada pemanggilan `/caf-run-pipeline` dan `/caf-plan-ticket` serta apakah jalur Clarify 04c masih butuh `tasks.md` (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [BLOCKING] Repo lama yang menjalankan scaffold agent ulang dan sudah punya `caf-qa.md`: (a) validator ditambahkan di samping `caf-qa`, `caf-qa` tidak disentuh, catatan dicetak (rekomendasi: migrasi eksplisit, tanpa penghapusan), (b) validator tidak ditambahkan sampai pengguna meminta, atau (c) `caf-qa` diganti? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).
- Q-2 [NON-BLOCKING] Rename `/caf-run-pipeline` dan `caf-verify`, pencabutan `/caf-plan-ticket`, dan planner `## Constraints` ikut tiket ini (rekomendasi: tidak; tiket sendiri, 03c2b, karena rename bisa mematahkan pemanggilan di orchestrator yang tidak terlihat dari repo ini)? — Answer: Tidak; dipecah ke 03c2b (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When scaffold default dirender untuk fixture `mono-pnpm`, then daftar agent adalah planner, architect, frontend, backend, validator, reviewer, dan daftar command adalah daftar lama ditambah `caf-plan`; tidak ada perubahan lain pada daftar berkas dibanding golden pra-tiket. Verify: automated test (bandingkan daftar berkas dengan `test/fixtures/pre-sdd03c2/`).
- AC-2: When scaffold default dirender untuk fixture `single-nuxt`, then daftar agent adalah planner, architect, implementer, validator, reviewer, dan command mengikuti AC-1. Verify: automated test.
- AC-3: When `scaffold agents` dijalankan di repo sementara yang sudah punya `caf-qa.md` (termasuk versi yang dikustomisasi), then `caf-qa.md` identik byte-for-byte, `caf-validator.md` ditulis, dan satu catatan dicetak yang menyebut bahwa orchestrator akan memakai `caf-validator`; when dijalankan di repo tanpa `caf-qa.md`, then catatan tidak dicetak. Verify: automated test.
- AC-4: When mekanisme penyembunyi (A1) diperiksa, then `validator` dan `/caf-plan` tidak tersembunyi, sedangkan kind di `HIDDEN_CANDIDATE_KINDS` tetap tersembunyi. Verify: automated test.
- AC-5: When `/caf-plan-ticket` dan `/caf-complete-drafts` dirender, then identik byte-for-byte dengan golden pra-tiket; `/caf-review` dan `/caf-fix-review` berbeda dari golden hanya pada rujukan `/caf-review-ticket`. Verify: automated test dengan golden.
- AC-6: When `/caf-run-pipeline` dirender dengan roster berisi `validator`, then langkah gate menyebut `caf-validator` dan `validate-report.md` serta tidak menyebut `caf-qa` atau `qa-report.md`; when dirender dengan roster berisi `qa`, then berbeda dari golden pra-tiket hanya oleh teks aturan status spec dari AC-7 (nama gate dan berkas laporan `caf-qa`/`qa-report.md` tetap). Verify: automated test (hapus teks AC-7 dari hasil render, sisanya sama dengan golden).
- AC-7: When `/caf-run-pipeline` dirender, then teksnya menyatakan: sebelum menjalankan agent implementasi, baca `requirements.md` di folder tugas; bila `Status: NEEDS_CLARIFICATION` atau ada pertanyaan BLOCKING tanpa `Answer:`, berhenti dengan `Status: NEEDS_HUMAN` dan tampilkan pertanyaannya; `DRAFT` dan `APPROVED` jalan terus; command tidak pernah menulis `requirements.md` atau `tasks.md`; usulan perubahan spec dari `verify-report.md`, laporan gate, dan `review-notes.md` ditampilkan kepada manusia dan tidak diterapkan. Verify: automated test atas teks hasil render.
- AC-8: When `/caf-plan` dirender, then teksnya menyatakan: bila planner menghasilkan `Status: NEEDS_CLARIFICATION` atau `NEEDS_HUMAN`, tampilkan pertanyaan atau alasannya kepada manusia dan berhenti tanpa menjalankan agent lain; `APPROVED` dilaporkan sebagai siap diimplementasikan. Verify: automated test atas teks hasil render.
- AC-9: When reviewer dirender, then `## Input` menyebut `validate-report.md` sebagai laporan gate dan `qa-report.md` untuk repo yang masih memakai `caf-qa`; bagian lain reviewer identik dengan golden pra-tiket. Verify: automated test.
- AC-10: When file reviewer dan planner hasil sebelum tiket di-baseline di repo sementara lalu `curate sync` dijalankan, then hanya `## Input` kedua agent yang ditulis, agent yang dikustomisasi tidak ditimpa, dan file lain tidak berubah. Verify: automated test.
- AC-11: When teks hasil scaffold diperiksa, then planner `## Input` tidak menyebut `.caf/discovery/` atau `/caf-discovery-start`, `caf-review.md` dan `caf-fix-review.md` tidak menyebut `/caf-review-ticket`, dan `INDEX.md` tidak menyebut "PM Agent". Verify: automated test; lalu command: `git grep -n -E "caf-discovery-start|caf-review-ticket|PM Agent" -- src` | expect: kosong, atau hanya baris dengan konteks lain yang dicatat satu per satu di `verify-report.md`.
- AC-12: When scaffold lengkap (agents, commands, skills, workflow) dijalankan di fixture lalu `curate --audit-only` dijalankan di hasilnya, then tidak ada peringatan untuk `caf-validator`, `caf-planner`, `caf-reviewer`, atau `/caf-plan`. Verify: automated test.
- AC-13: When `test/fixtures/snapshots/mono-pnpm.json` dan snapshot single-nuxt (bila ada) diregenerasi, then hanya entri dalam daftar T1 yang berubah, dicatat per entri. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-14: When README.md dan CLAUDE.md dibaca, then tertulis bahwa roster default memuat `caf-validator` dan `/caf-plan`, bahwa `qa`, `plan-ticket`, `run-pipeline`, `architect`, `implementer` masih transisional, bahwa `## Input` reviewer dan planner bergerak lewat `curate sync` sedangkan command dan `piv-workflow.md` lewat hapus lalu scaffold ulang, dan bahwa menambahkan `caf-validator` ke repo yang punya `caf-qa` mengalihkan gate orchestrator ke validator. Verify: manual: baca bagian terkait.
- AC-15: When `npm test` dijalankan, then semua test lulus, 14 golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
