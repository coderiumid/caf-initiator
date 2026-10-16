# CAF-SDD-03f — Teks usang dan dokumentasi diselaraskan dengan SDD
Status: APPROVED (Q-1 diputuskan konsultan, Ganjar boleh membatalkan; keputusan lain berasal dari kesepakatan SDD 12 Okt 2026 dan catatan progres)
Source: chat (laporan audit caf-initiator pasca-02c, temuan 5, 6, 7, 9, 12, 13, 14, 13 Okt 2026; daftar 03f di CAF-SDD-PROGRESS.md)
Repo target: `caf-initiator`
Bergantung pada: 03e ter-merge (sudah).

## 1. Outcome
Teks yang sampai ke pengguna (hasil scaffold, hasil `curate audit`, README, CLAUDE.md, CAF.md) tidak lagi menyesatkan: token verdict, daftar peran, aturan retry, format laporan, dan daftar agent akhir menyatakan hal yang sama dengan yang benar-benar ditulis dan dibaca kode. CAF.md menyatakan bahwa CAF mengikuti Spec-Driven Development. Tidak ada perubahan perilaku agent selain satu pengecualian sempit di planner (Q-1).

## 2. Scope
In:
- Template `piv-workflow.md` hasil scaffold: token Reviewer di Parser Contract, daftar peran yang tidak di-scaffold (tanpa permintaan konfirmasi), kalimat retry.
- Deskripsi (frontmatter) command `/caf-run-pipeline` agar sesuai roster yang benar-benar ditulis.
- `curate audit`: gap opsional `caf-feature-catalog-sync` tidak lagi dilaporkan untuk repo yang tidak punya berkasnya.
- Komentar kode yang masih menyebut "all four" untuk jenis bukti.
- Planner `## Output`: pengecualian sempit untuk tiket refactor/config (Q-1).
- README.md dan CLAUDE.md: pemakai `caf-traceability`, kalimat planner `NEEDS_HUMAN`, daftar lima agent dan lima command akhir beserta yang masih transisional.
- CAF.md: sikap SDD, format `verify-report.md` dan `validate-report.md` di Layer 3, penjelasan dua tingkat retry, deskripsi orchestrator.
- Test, golden pra-tiket, snapshot terbatas.

Out:
- Rujukan usang yang sengaja ditunda ke 03c2/03c3 (`.caf/discovery/`, `/caf-discovery-start`, `/caf-review-ticket`, "PM Agent" di INDEX.md).
- Rename command, validator keluar dari kind tersembunyi, `## Input` reviewer, perilaku command terhadap `NEEDS_CLARIFICATION` (03c2); `SINGLE_REPO`, `--role`, penghapusan `implementer` (03c3); fallback kind tak dikenal (tiket sendiri).
- Isi skill `caf-spec`, `caf-no-guess`, `caf-traceability` (hash `caf-spec` tetap), `tools:`, `## Skills`, `## Retry Logic` semua agent.
- Orchestrator.

## 3. Constraints and Assumptions
- Finding (audit): `piv-workflow.md` Parser Contract menyebut token Reviewer `READY_FOR_HUMAN_REVIEW`/`NEEDS_CHANGES`, sedangkan `caf-reviewer.md` memakai baris `Verdict:` dengan nilai APPROVE, CHANGES REQUESTED, atau DEFER.
- Finding (audit): `piv-workflow.md` mencantumkan Documentation, PM, UX Designer, dan Auditor sebagai "NOT present" disertai permintaan konfirmasi berawalan TODO, padahal peran itu tidak bisa dipilih di scaffold.
- Finding (audit): "max 3x" muncul di `piv-workflow.md`, `/caf-run-pipeline`, AGENTS.md, dan `## Retry Logic` agent sebagai aturan verify dalam satu agent; gate retry di orchestrator berbeda (default 1, `agents.qa.maxRetries` dan `agents.reviewer.maxRetries`).
- Finding (audit): deskripsi frontmatter `/caf-run-pipeline` menyebut "Planner → Architect → implementation → Documentation → QA → Reviewer", sementara tahap 4 di berkas yang sama menyatakan tidak ada Documentation Agent bila cabang `hasDocumentation: false`.
- Finding (audit): entri opsional `caf-feature-catalog-sync.md` dilaporkan "missing (optional)" di setiap repo baru; satu-satunya target terkait menjawab "is no longer scaffolded — nothing written", jadi gap itu tidak bisa ditutup.
- Finding (audit): README baris 176 menyebut `caf-traceability` dipakai "Planner, Frontend, Backend", sementara `SKILLS_BY_KIND` dan README baris 404 memasukkan validator; README mengulang "stops with Status: NEEDS_HUMAN" untuk planner tanpa menyebut berkas.
- Finding (audit): CAF.md tidak menyebut SDD, spec-first, atau validator; `.caf/tasks/README.md` hasil scaffold merujuk "CAF.md Layer 3 for the verify-report.md format".
- Finding (progres): contoh `verify-report.md` di CAF.md Layer 3 memakai heading `## Status: SUCCESS / NEEDS_HUMAN`; format yang dibaca orchestrator sejak 04a memakai baris `Status:` ter-anchor (heading lama hanya diterima untuk kompatibilitas).
- Finding (ringkasan orchestrator): implementasi nyata memakai Fastify dan BullMQ; CAF.md menyebut Express dan p-queue serta retry 3x untuk gate.
- Finding (progres 02e): aturan planner "tanpa path dan nama simbol di Outcome, Scope, Decisions, dan kalimat `When … then`" bersifat mutlak; pengecualian untuk tiket refactor/config ditunda ke tiket ini.
- Constraint: teks template di luar yang disebut di Scope tidak berubah satu byte pun; `tools:`, `## Skills`, `## Retry Logic` semua agent tidak berubah; hash `caf-spec` tetap `b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0`; golden `frozen-kinds` tidak berubah; test `todo` fallback `implementation` tetap ada.
- Constraint: kata TODO tidak ditulis literal di aturan atau teks baru yang dihitung `curate --check-drafts`.
- Constraint: kosakata (Finding, Assumption A-n, Verify, nama bagian, token verdict) disalin dari teks agent dan template yang sudah ada.
- Constraint: CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1: branch `ai-agent/CAF-SDD-03f` dari main terbaru.
- Assumption A2 (T1): `piv-workflow.md` dan deskripsi `/caf-run-pipeline` dirender oleh builder di `src/templates/`; dasar: keduanya muncul di hasil render audit. T1 mencatat builder, fixture yang mengunci teksnya, dan apakah ada golden (mis. `pre-sdd03b3`, `pre-sdd03c1`) yang memuatnya.
- Assumption A3 (T1): token Verdict yang ditulis template reviewer adalah sumber kebenaran untuk Parser Contract; T1 mencatat bentuk literalnya (spasi atau garis bawah) dan bentuk yang diterima orchestrator.
- Assumption A4 (T1): CAF.md adalah dokumen statis di repo (tidak dirender CLI); dasar: audit §7 membacanya sebagai dokumen. T1 mencatat bagian yang memuat Layer 3, retry, dan deskripsi orchestrator.
- Assumption A5 (T1): entri opsional `curate audit` didefinisikan di satu daftar di `src/commands/audit.js`; T1 mencatat cara repo yang sudah punya berkasnya tetap diaudit.

## 4. Decisions Already Made
- CAF mengikuti Spec-Driven Development: spec-first menuju spec-anchored, bukan spec-as-source; dokumen CAF harus menyatakannya (Ganjar, 12 Okt 2026).
- Lima agent akhir: `caf-planner`, `caf-frontend`, `caf-backend`, `caf-validator`, `caf-reviewer`; `caf-architect` dilipat ke planner (skill `caf-design` belum ada); `caf-qa` diganti nama menjadi `caf-validator`; `implementer`, documentation, devops, pm, ux-designer, auditor dibuang (SDD-summary).
- Lima command akhir: `/caf-plan`, `/caf-run`, `/caf-review`, `/caf-fix-review`, `/caf-complete-drafts`; `/caf-feature-catalog-sync` dibuang.
- Retry gate default tetap 1 (hemat token, dapat dikonfigurasi); tulisan "max 3x" di CAF.md dikoreksi supaya membedakan retry verify dalam satu agent (hingga 3x) dari retry gate orchestrator (default 1).
- Gap opsional `caf-feature-catalog-sync` dihapus dari laporan audit repo yang tidak memiliki berkasnya, karena command itu sudah dibuang.
- Q-1 (keputusan konsultan): pengecualian refactor/config hanya di planner `## Output`, sempit (hanya kalimat `When … then`, hanya path atau simbol yang menjadi subjek tiket); `caf-spec` tidak berubah di tiket ini (hashnya tetap; perubahan skill butuh rollout manual dan masuk `caf-spec` v4).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Pengecualian aturan "tanpa path di kalimat `When … then`" untuk tiket refactor/config: (a) hanya di planner `## Output`, sempit, `caf-spec` tidak berubah (rekomendasi), (b) juga di `caf-spec` v4 (hash berubah, rollout manual), atau (c) tidak dikerjakan? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When `piv-workflow.md` dirender, then token Reviewer di Parser Contract sama persis dengan nilai `Verdict:` yang ditulis template reviewer. Verify: automated test yang membandingkan kedua teks hasil render.
- AC-2: When `piv-workflow.md` dirender, then tidak ada baris yang meminta konfirmasi untuk peran yang tidak di-scaffold, dan bagian itu menyatakan peran yang tidak di-scaffold secara datar (Documentation, PM, UX Designer, Auditor). Verify: automated test.
- AC-3: When `piv-workflow.md` dirender, then kalimat retry menyatakan retry verify dalam satu agent (hingga 3x) dan gate retry di orchestrator (default 1) sebagai dua hal berbeda. Verify: automated test.
- AC-4: When `/caf-run-pipeline` dirender tanpa agent Documentation, then deskripsi frontmatter tidak menyebut Documentation; when dengan agent Documentation, then menyebutnya. Verify: automated test (dua kasus).
- AC-5: When `curate --audit-only` dijalankan pada repo hasil scaffold baru, then tidak ada entri `caf-feature-catalog-sync.md` di laporan. Verify: automated test.
- AC-6: When `curate --audit-only` dijalankan pada repo yang memiliki `caf-feature-catalog-sync.md`, then berkas itu tetap diaudit seperti sebelum tiket. Verify: automated test.
- AC-7: When kode dan test dicari untuk frasa "all four", then tidak ada komentar yang menyebut empat jenis bukti. Verify: command: `git grep -n -i "all four" -- src test` | expect: kosong, atau hanya baris dengan konteks lain yang dicatat satu per satu di `verify-report.md`.
- AC-8: When planner dirender, then `## Output` menyatakan: pada tiket refactor atau config, kalimat `When … then` boleh menyebut path atau simbol yang menjadi subjek tiket dan tidak boleh di tempat lain; aturan di Outcome, Scope, dan Decisions tidak berubah. Verify: automated test atas teks hasil render.
- AC-9: When planner dirender, then bagian selain `## Output`, `tools:`, `## Skills`, `## Allowed Tools`, `## Constraints` identik byte-for-byte dengan golden pra-tiket (`test/fixtures/pre-sdd03f/`), dan hash `caf-spec` tetap. Verify: automated test dengan golden.
- AC-10: When file planner hasil sebelum tiket di-baseline di repo sementara lalu `curate sync` dijalankan, then hanya `## Output` ditulis dengan teks baru, planner yang dikustomisasi tidak ditimpa, dan file lain tidak berubah. Verify: automated test.
- AC-11: When `piv-workflow.md` dan `/caf-run-pipeline` dirender, then bagian selain yang disebut AC-1 sampai AC-4 identik byte-for-byte dengan golden pra-tiket. Verify: automated test dengan golden.
- AC-12: When README.md dibaca, then `caf-traceability` disebut dipakai oleh Planner, Frontend, Backend, dan Validator, kalimat planner `NEEDS_HUMAN` menyebut berkas tempat usulan ditulis, dan ada daftar lima agent dan lima command akhir dengan `architect`, `qa`, `implementer`, `run-pipeline`, dan `plan-ticket` ditandai transisional. Verify: manual: baca bagian terkait.
- AC-13: When CLAUDE.md dibaca, then daftar lima agent dan lima command akhir yang sama tercantum, dan aturan baru tiket ini (pengecualian planner, gap audit, token Verdict) dicatat. Verify: manual: baca bagian terkait.
- AC-14: When CAF.md dibaca, then tertulis bahwa CAF mengikuti Spec-Driven Development (spec-first menuju spec-anchored, bukan spec-as-source) dan ada penjelasan peran validator. Verify: manual: baca bagian terkait.
- AC-15: When CAF.md Layer 3 dibaca, then contoh `verify-report.md` memakai baris `Status:` polos dan bukti per AC dengan lima jenis bukti, dan `validate-report.md` didokumentasikan, sesuai format yang dirender `agent-handoff.md` dan validator. Verify: manual: bandingkan dengan hasil render `agent-handoff.md`.
- AC-16: When CAF.md dibaca, then retry dibedakan menjadi retry verify dalam satu agent (hingga 3x) dan retry gate orchestrator (default 1, dapat dikonfigurasi), dan orchestrator digambarkan memakai Fastify dan BullMQ. Verify: manual: baca bagian terkait.
- AC-17: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri yang berubah menurut daftar T1 yang berbeda, dicatat per entri. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-18: When `npm test` dijalankan, then semua test lulus, `git diff --stat -- test/fixtures/frozen-kinds/` kosong, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
