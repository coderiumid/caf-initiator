# CAF-SDD-02 — Planner yang menulis spec, format verify-report, skill caf-traceability
Status: DRAFT (menunggu persetujuan Ganjar; Q-1 menentukan apakah T10 dijalankan)
Source: chat (CAF-SDD-SUMMARY.md bagian 3, 5, 7, 10; audit umkm-pos; hasil SDD-01, 03a, 03a2)
Repo target: `caf-initiator`
Bergantung pada: SDD-01, 03a, 03a2 sudah ter-merge ke main.

## 1. Outcome
Agent `caf-planner` yang di-generate bekerja dengan alur Specify, Clarify, Plan, Tasks dan menghasilkan `requirements.md` serta `tasks.md` yang terhubung lewat nomor AC. Agent implementasi punya tempat resmi untuk melaporkan bukti per AC dan mengusulkan perubahan spec di `verify-report.md`, tanpa pernah mengedit spec yang sudah disetujui. Skill `caf-traceability` tersedia (lahir DRAFT) sebagai dasar validator di 03b.

## 2. Scope
In:
- Template `caf-planner` baru: Specify, Clarify, Plan, Tasks.
- Format `verify-report.md`: bukti per AC dan bagian "Usulan perubahan spec".
- Skill `caf-traceability` (isi dari `caf-traceability.source.md`, dipakai apa adanya), lahir DRAFT, dipetakan ke planner, frontend, backend.
- Penghapusan banner DRAFT `caf-spec` (T10), hanya bila Q-1 dijawab "lulus".
- Regenerasi snapshot `mono-pnpm.json` terbatas pada file yang terkait planner dan format verify-report (AC-9).
- Satu paragraf di README yang menyatakan CAF mengikuti SDD.

Out:
- Skill `caf-design` dan `caf-breakdown` (02b, ditunda; planner cukup 3 skill dulu).
- Rename `caf-verify` ke `caf-self-verify` (03c).
- `validate-report`, kind `validator`, reviewer spec-aware, `/caf-plan` (03b).
- Gerbang spec berlabel, jeda Clarify di orchestrator, parsing AC oleh orchestrator (04).
- Berhenti menulis agent/command yang dibuang (03c).
- Perubahan pada `caf-orchestrator`, `caf-website`, `CAF.md`.
- Menghapus banner `caf-traceability` (menunggu uji dispatch nyata setelah validator ada).

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard `{{...}}` tetap berlaku.
- Constraint: frontmatter `tools:` planner, frontend, backend tidak boleh berubah (tabel literal dari 03a tetap lulus; untuk planner, nilai saat ini dicatat T1 dan dikunci test).
- Constraint: artefak yang saat ini dihasilkan planner dan dibaca orchestrator tetap dihasilkan dengan path dan token status yang sama (daftar dari T1). Bila template baru mengharuskan menghapus salah satunya, STOP `NEEDS_HUMAN`.
- Constraint: generator tidak menulis pointer `## Skills` ke skill berbanner DRAFT. `caf-traceability` lahir DRAFT, jadi tidak ada pointernya di agent mana pun.
- Constraint: 15 golden `test/fixtures/frozen-kinds/` dan test 03a/03a2 (kind-guard, false-drift, package-scripts) tetap lulus tanpa diubah.
- Constraint: nama skill tidak sama dengan nama command.
- Assumption A1: branch `ai-agent/CAF-SDD-02` dibuat dari main terbaru.
- Assumption A2: Clarify lewat ticket memakai mekanisme berhenti yang sudah ada (`Status: NEEDS_HUMAN`) sampai SDD-04 membuat jeda khusus. Template hanya menyuruh planner menulis pertanyaan di `requirements.md` dan berhenti.
- Assumption A3: folder artefak adalah `.caf/tasks/<ID-atau-slug>/`, sesuai `caf-spec`. T1 memastikan ini sama dengan yang dipakai generator hari ini.
- Assumption A4: perubahan template planner membuat `curate sync` menandainya DRIFT di repo yang sudah ada; ini disengaja (planner termasuk kind yang boleh berubah).

## 4. Decisions Already Made
- Agent tidak pernah mengedit spec berstatus APPROVED; usulan perubahan ditulis di `verify-report.md` dan manusia memutuskan.
- Chat tanpa ticket ID memakai slug pendek untuk nama folder artefak.
- `validate-report` ada di 03b bersama agent `caf-validator`, bukan di sini.
- Jenis bukti per AC: `automated-test`, `build-only`, `manual`, `none` (hasil audit umkm-pos: jumlah test lulus bukan bukti).
- Planner membawa 3 skill dulu: `caf-spec`, `caf-scope-discipline`, `caf-no-guess` (jawaban Q-1 di SDD-01).
- Banner DRAFT `caf-spec` hanya dihapus setelah Ganjar menyatakan uji manual lulus.

## 5. Open Questions
- Q-1 [BLOCKING untuk T10 saja] Apakah uji manual `caf-spec` di umkm-pos sudah lulus dan banner boleh dihapus? Bila belum, T10 dilewati dan dikerjakan sebagai tiket 02b. — Answer: belum
- Q-2 [NON-BLOCKING] Bagaimana `curate sync` memperlakukan section baru di file agent yang sudah ada (template menambah section, file lama belum punya)? T1 menjawab dari kode dan test; bila section baru tidak pernah ditulis, itu dicatat sebagai batasan di `verify-report.md`, bukan diperbaiki di tiket ini. — Answer:
- Q-3 [NON-BLOCKING] Di file mana format `verify-report` hidup hari ini (agent frontend/backend, `task-completion.md`, skill `caf-verify`, atau template terpisah)? T1 memetakan dan mengubah hanya sumber tunggal formatnya; bila ada lebih dari satu salinan, semuanya diselaraskan dan didaftar. — Answer:

## 6. Acceptance Criteria
- AC-1: When agent `planner` dirender (fixture `mono-pnpm` dan `single-nuxt`), then isinya memuat langkah Specify, Clarify, Plan, Tasks berurutan, menyuruh menulis `requirements.md` dan `tasks.md` di `.caf/tasks/<ID-atau-slug>/`, dan menyebut slug untuk chat tanpa ticket ID. Verify: automated test atas teks hasil render.
- AC-2: When planner dirender, then langkah Clarify menyatakan: pertanyaan maksimal 5, yang BLOCKING menghentikan pekerjaan dengan `Status: NEEDS_CLARIFICATION` di `requirements.md`, `tasks.md` tidak ditulis selama ada BLOCKING yang belum dijawab, dan di jalur ticket planner berhenti dengan token status berhenti yang ada hari ini. Verify: automated test atas teks hasil render.
- AC-3: When planner dirender, then ada aturan eksplisit bahwa spec berstatus APPROVED tidak diubah (tujuan, scope, AC) dan usulan perubahan ditulis di `verify-report.md`. Verify: automated test atas teks hasil render.
- AC-4: When planner dirender, then langkah Tasks menyuruh setiap task menyebut id AC yang dilayaninya, tiap AC punya minimal satu task, dan task test mendahului implementasi untuk AC bertanda `Verify: automated test`. Verify: automated test atas teks hasil render.
- AC-5: When planner dirender, then frontmatter `tools:` dan `name` sama persis dengan nilai yang dicatat T1 (tabel literal di test), dan setiap artefak serta token status yang dihasilkan planner sebelum tiket ini (daftar T1) masih disebut dengan path yang sama. Verify: automated test dengan tabel literal.
- AC-6: When format `verify-report` dibaca di template yang menjadi sumbernya, then tiap AC mendapat satu baris bukti dengan salah satu bentuk `automated-test — <file>::<nama test>`, `build-only — <command>`, `manual — <langkah>`, atau `none — <alasan>`; ada bagian "Usulan perubahan spec" (isi `-` bila kosong); dan baris `Status:` yang dibaca orchestrator tidak berubah bentuk. Verify: automated test atas teks hasil render dan atas kecocokan regex `Status:` yang dipakai hari ini.
- AC-7: When `caf-init scaffold skills` dijalankan di repo uji, then `.claude/skills/caf-traceability/SKILL.md` ditulis dengan frontmatter `name: caf-traceability`, banner DRAFT 3 baris persis seperti di `caf-traceability.source.md`, panjang tidak lebih dari 90 baris; file yang sudah ada tidak ditimpa; `--dry-run` melaporkan daftar yang sama tanpa menulis. Verify: automated test.
- AC-8: When kind planner, frontend, dan backend dirender, then pemetaan kind ke skill memuat `caf-traceability` tetapi `## Skills` agent tidak berisi pointer ke `caf-traceability` selama banner DRAFT ada; `curate --check-drafts` tidak menghasilkan FAIL baru. Verify: automated test atas pemetaan dan output agent.
- AC-9: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then entri yang berubah hanya file yang memuat teks planner atau format verify-report (daftar lengkap dicatat di `verify-report.md`), dan tidak ada entri lain yang berubah satu byte pun. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1/T7; test snapshot lulus setelah regenerasi.
- AC-10: When file planner dari render sebelum tiket ini (golden `test/fixtures/pre-sdd02/`) di-baseline di repo sementara lalu `curate sync` dijalankan, then section planner yang berubah ditulis dengan teks baru, file agent lain tidak berubah, dan file planner yang sudah dikustomisasi pengguna tidak ditimpa (status CUSTOMIZATION atau CONFLICT). Verify: automated test.
- AC-11: When `npm test` dijalankan, then semua test lulus, 15 golden `frozen-kinds` tidak berubah, `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`, dan test `todo` fallback `implementation` tetap ada. Verify: `npm test`; `git diff --stat`.
- AC-12 (kondisional, hanya bila Q-1 = "lulus"): When banner DRAFT `caf-spec` dihapus dari template, then `SKILL.md` hasil `scaffold skills` tidak lagi memuat banner, `## Skills` planner berisi pointer imperatif ke `caf-spec`, `caf-scope-discipline`, `caf-no-guess` (3 Read), dan `curate --check-drafts` tidak FAIL. Verify: automated test.
- AC-13: When README dibaca, then ada satu paragraf yang menyatakan CAF mengikuti Spec-Driven Development (spec-first menuju spec-anchored, bukan spec-as-source) dan tidak ada klaim yang bertentangan dengan perilaku baru. Verify: manual: baca README bagian terkait.