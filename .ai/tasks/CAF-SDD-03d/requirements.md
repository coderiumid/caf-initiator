# CAF-SDD-03d — Agent implementasi spec-aware
Status: APPROVED (revisi 2 setelah NEEDS_HUMAN di T1; K-1 mengikuti rekomendasi opsi A, 13 Okt 2026)
Source: chat (laporan audit caf-initiator pasca-02c, 13 Okt 2026, temuan 1)
Repo target: `caf-initiator`
Bergantung pada: 02c ter-merge (sudah, 43ac420).

## 1. Outcome
`caf-frontend`, `caf-backend`, dan `caf-implementer` membaca spec sebelum bekerja, memperlakukan AC sebagai kontrak, tidak pernah mengedit `requirements.md`/`tasks.md`, menulis bukti per AC di `verify-report.md` dengan kosakata yang sama dengan yang dinilai validator dan reviewer, dan melaporkan usulan perubahan spec di `## Proposed Spec Changes`. Perubahan hanya di `## Output`, sehingga `curate sync` bisa membawanya ke repo lama.

## 2. Scope
In:
- Tiga template implementasi (frontend, backend, implementer): `## Output` mendapat aturan: (a) baca berkas yang ada di folder tugas sebelum mengubah kode; (b) AC sebagai kontrak; (c) larangan mengedit spec dan tasks; (d) format bukti per AC; (e) spec ambigu atau bertentangan dengan kode → berhenti `Status: NEEDS_HUMAN` dengan usulan di `## Proposed Spec Changes`.
- Test, golden pra-tiket, snapshot terbatas, satu pembaruan golden `implementer.single-nuxt.json` (hanya `sections.Output`), README dan CLAUDE.md.

Out:
- `tools:`, `## Allowed Tools`, `## Skills`, `## Input`, `## Retry Logic` agent implementasi (tidak berubah).
- Pointer `caf-traceability` dan pencabutan banner-nya.
- Rename `caf-verify` ke `caf-self-verify`, `/caf-run-pipeline`, orchestrator, validator, reviewer, planner.
- Menyembunyikan `implementer` (03c3).

## 3. Constraints and Assumptions
- Finding (audit): ketiga template tidak memuat `AC-`, `APPROVED`, bukti per AC, atau `## Proposed Spec Changes`; `requirements.md` hanya disebut sebagai input "(required)"; format `verify-report.md` hanya ada di `.caf/workflows/agent-handoff.md`, yang tidak dirujuk agent ini dan tidak ikut `curate sync`.
- Finding (audit): validator dan reviewer memakai lima jenis bukti (`automated-test`, `command`, `build-only`, `manual`, `none`), menghitung `manual`/`build-only`/`none` bukan lulus, dan menulis usulan di `## Proposed Spec Changes`.
- Finding (audit): frontend dan backend identik kecuali nama, app, scope, dan Verify Checklist; frontend/backend hasil render di snapshot `mono-pnpm.json` dikunci literal.
- Finding (audit): `## Skills` agent ini memuat `caf-scope-discipline`, `caf-no-guess`, `caf-escalate`; `caf-no-guess` dan `caf-escalate` sudah menyebut celah requirement dan kontradiksi.
- Finding (T1): `## Output` ketiga agent dibangun satu builder, `buildOutputSection(kind)` di `src/templates/agent-md.js` (cabang akhir satu baris); `curate sync` melacak `## Output` untuk semua kind; kind `implementation` (fallback agent tak dikenal) memakai artefak frontend di builder yang sama.
- Finding (T1): `test/fixtures/frozen-kinds/implementer.single-nuxt.json` mengunci `sections.Output` implementer, dibandingkan `deepEqual` oleh `test/frozen-kinds.test.js`; begitu `## Output` implementer berubah, golden itu merah.
- Constraint: teks di luar `## Output` tidak berubah satu byte pun; `tools:` semua agent tidak berubah; 14 golden `frozen-kinds` tidak berubah; golden `implementer.single-nuxt.json` berubah hanya di `sections.Output` (K-1).
- Constraint: kind `implementation` (fallback) dan kind lain di luar frontend, backend, implementer tidak berubah; cabang baru memeriksa tiga kind itu secara eksplisit.
- Constraint: kosakata bukti dan format baris AC diambil dari teks validator/reviewer/agent-handoff yang sudah ada, tanpa istilah baru; tidak diparafrase menjadi arti lain.
- Constraint: agent implementasi tidak mendapat tool baru; CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1: branch `ai-agent/CAF-SDD-03d` dari main terbaru.
- Assumption A2: `## Output` ketiga template ditulis oleh satu builder bersama atau tiga builder serupa; T1 memastikan.
- Assumption A3 (T1): `curate sync` melacak `## Output` agent implementasi.

## 4. Decisions Already Made
- Agent tidak pernah mengedit spec APPROVED; penyimpangan dilaporkan sebagai usulan (SDD-summary, 12 Okt).
- Gerbang approval spec hanya untuk ticket berlabel; manusia selalu mereview MR.
- `manual`, `build-only`, `none` tidak dihitung lulus.
- Q-1: aturan format bukti ringkas inline di `## Output`; tata letak lengkap tetap menunjuk `.caf/workflows/agent-handoff.md` (jawaban Ganjar, 13 Okt 2026).
- Q-2: agent implementasi berhenti `NEEDS_HUMAN` hanya pada `NEEDS_CLARIFICATION` atau pertanyaan BLOCKING tanpa `Answer:`; `DRAFT`/`APPROVED` jalan terus.
- Q-3: `caf-implementer` ikut diubah sekarang.
- K-1 (dari NEEDS_HUMAN T1): izinkan satu edit pada `implementer.single-nuxt.json`, hanya `sections.Output`; bagian lain berkas itu identik. Opsi B (implementer ditunda ke 03c3) ditolak karena membiarkan agent SINGLE_REPO tidak spec-aware.

## 5. Open Questions
- Q-1 [BLOCKING] Aturan format bukti per AC: (a) ringkas inline di `## Output` (nama lima bukti, apa yang dihitung lulus, satu baris per AC) dan tata letak lengkap tetap menunjuk `.caf/workflows/agent-handoff.md` (rekomendasi: bisa ikut `curate sync`), atau (b) hanya menunjuk agent-handoff? — Answer: (a) ringkas inline di `## Output`, tata letak lengkap menunjuk agent-handoff (ikut rekomendasi).
- Q-2 [NON-BLOCKING] Agent implementasi berhenti `Status: NEEDS_HUMAN` hanya saat `requirements.md` berstatus `NEEDS_CLARIFICATION` atau ada pertanyaan BLOCKING tanpa `Answer:`; status `DRAFT` dan `APPROVED` jalan terus (rekomendasi, karena gerbang hanya untuk ticket berlabel), atau berhenti juga pada `DRAFT`? — Answer: Berhenti hanya pada `NEEDS_CLARIFICATION` atau BLOCKING tanpa `Answer:`; `DRAFT` dan `APPROVED` jalan terus (ikut rekomendasi).
- Q-3 [NON-BLOCKING] `caf-implementer` ikut diubah sekarang walau disembunyikan di 03c3 (rekomendasi: ya, repo SINGLE_REPO masih memakainya), atau ditunda? — Answer: Ya, `caf-implementer` ikut diubah (ikut rekomendasi).
## 6. Acceptance Criteria
- AC-1: When frontend, backend, dan implementer dirender (fixture `mono-pnpm` dan `single-nuxt` sesuai kind yang ada), then `## Output` menyatakan: sebelum mengubah kode, baca `requirements.md`, `tasks.md`, dan `verify-report.md` bila ada di folder tugas. Verify: automated test atas teks hasil render.
- AC-2: When agent dirender, then `## Output` menyatakan: tiap AC adalah kontrak; kerjakan AC yang masuk scope app agent ini; AC yang tidak bisa dipenuhi dilaporkan, tidak dilewati diam-diam. Verify: automated test.
- AC-3: When agent dirender, then `## Output` melarang menulis `requirements.md` dan `tasks.md` (termasuk baris statusnya) dan menyuruh usulan perubahan ditulis di `verify-report.md` bagian `## Proposed Spec Changes`. Verify: automated test.
- AC-4: When agent dirender, then `## Output` menyatakan bukti per AC memakai lima jenis bukti dengan kosakata yang sama dengan validator, menyebut `manual`/`build-only`/`none` tidak dihitung lulus, dan merujuk `.caf/workflows/agent-handoff.md` untuk tata letak lengkap (sesuai Q-1). Verify: automated test yang membandingkan kosakata dengan teks agent-handoff/validator hasil render.
- AC-5: When `requirements.md` berstatus sesuai Q-2 atau spec ambigu/bertentangan dengan kode, then `## Output` menyuruh berhenti dengan `Status: NEEDS_HUMAN` dan menuliskan alasannya di `verify-report.md`; status `DRAFT`/`APPROVED` tidak menghentikan (sesuai Q-2). Verify: automated test.
- AC-6: When agent dirender (kind `implementation` fallback diuji tidak berubah), then bagian selain `## Output`, serta isi `## Output` di luar aturan baru, identik byte-for-byte dengan golden sebelum tiket (`test/fixtures/pre-sdd03d/`), dan `tools:`, `## Allowed Tools`, `## Skills` tidak berubah. Verify: automated test dengan golden.
- AC-7: When file agent implementasi hasil sebelum tiket di-baseline di repo sementara lalu `curate sync` dijalankan, then `## Output` ditulis dengan teks baru, agent yang dikustomisasi tidak ditimpa, dan file lain tidak berubah. Verify: automated test.
- AC-8: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri `caf-frontend.md` dan `caf-backend.md` yang berubah (dan entri implementer bila ada di snapshot), dicatat per entri. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-9: When `npm test` dijalankan, then semua test lulus, 14 golden `frozen-kinds` tidak berubah, golden `implementer.single-nuxt.json` berubah hanya di `sections.Output` (diff berkas itu tidak menyentuh bagian lain), `git diff --stat` di `test/fixtures/frozen-kinds/` hanya menyebut berkas itu, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: hanya `implementer.single-nuxt.json`, dan `git diff` berkas itu hanya di `Output`.
- AC-10: When README dan CLAUDE.md dibaca, then tertulis aturan baru agent implementasi, bahwa hanya `## Output` yang berubah, dan langkah rollout repo lama (`curate sync` membawa `## Output`; `agent-handoff.md` dihapus lalu `scaffold workflow` bila ingin tata letak baru). Verify: manual: baca bagian terkait.