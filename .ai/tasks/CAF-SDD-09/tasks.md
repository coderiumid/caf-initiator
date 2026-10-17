# CAF-SDD-09 — Tasks
Status: APPROVED. Commit lokal saja; jangan push, merge, atau publish. Branch: `ai-agent/CAF-SDD-09` dari `main` (periksa `git log -1`; harus memuat merge PR #40). CAF-SDD-10 dan 11 menyusul di branch yang sama.

## T1 — Baca dan periksa
- Baca `CAF.md` bagian "What CAF Is", "Full Pipeline", tabel agen, Layer 2 (skills), Layer 3, "Recommended Full Folder Structure", Layer 5; baca tabel `SKILLS_BY_KIND` di `src/templates/skill-md.js`, `CLAUDE.md` bagian roster/commands, dan `README.md`.
- Bila `../caf-orchestrator/CLAUDE.md` ada, baca bagian gerbang spec/Clarify untuk A-1; bila tidak, catat "A-1 tidak diperiksa" dan tulis AC-7 tanpa nama label.
- Catat setiap tempat lain di `CAF.md` yang menyebut roster/command lama (grep `Architect`, `QA Agent`, `caf-qa`, `design-ticket`, `plan-ticket`, `run-pipeline`) dan laporkan di `verify-report.md`; ubah hanya yang di cakupan Scope In.
- Jika temuan bertentangan dengan Finding atau AC, STOP sebelum mengubah apa pun.

## T2 — Alur dan roster
- "What CAF Is": satu paragraf baru setelah paragraf Validator (AC-1).
- "Full Pipeline": gambar ulang sesuai AC-2; pertahankan catatan "human review is mandatory, no auto-merge".
- Tabel agen: judul tanpa angka 8; baris Planner menyebut `design.md`/`breakdown.md` (kalimatnya sama dengan `ARTIFACT_BY_ROLE.planner` di `src/templates/artifact-by-role.js`); Validator ditambahkan; Architect/QA/Documentation/DevOps ditandai (AC-3).

## T3 — Skill dan artefak
- Layer 2: daftar skill dan mapping (AC-4); perbarui kalimat "Built-in mapping" yang menyebut Architect, Auditor, PM, UX Designer agar sesuai tabel kode.
- Layer 3: `breakdown.md` ke daftar artefak; `design.md` dimiliki Planner; kedua tanpa `Status:` (AC-5).

## T4 — Folder structure
- Gambar ulang pohon agen dan command sesuai AC-6; Cluster 1/3/4 diberi satu kalimat "not scaffolded by `caf-init` since CAF-SDD-03c1" (D-1).

## T5 — Layer 5
- Satu paragraf SDD flow orchestrator (AC-7), tanpa mengubah varian A/B/C.

## T6 — Test dan CLAUDE.md
- `test/sdd09-caf-md.test.js` (AC-8). Paragraf `CLAUDE.md` (AC-10), di bagian yang menyebut `CAF.md` di atas ("What this is"), bukan section baru.

## T7 — Verifikasi
- `npm test`; `git diff --stat main -- src test/fixtures` kosong; `verify-report.md` dengan baris pertama `Status: SUCCESS|NEEDS_HUMAN`, satu baris bukti per AC (AC-1,2,4,7,10 manual → `manual`), daftar tempat lain yang masih menyebut roster lama. Commit TERAKHIR.