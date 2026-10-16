# Verify Report

Status: SUCCESS

Tiket: CAF-SDD-03b2 — Reviewer yang memeriksa spec
Branch: `ai-agent/CAF-SDD-03b2` (dari main `79812ad`). Tanpa push, PR, atau merge.
Commit: `2d7810f` (golden reviewer lama, T2), `de71b76` (test, implementasi, snapshot, dokumen).

## Checklist
- [ ] lint — tidak ada skrip lint di `package.json`
- [ ] typecheck — tidak ada skrip typecheck
- [x] test — `npm test`, exit 0: 417 test, 416 lulus, 0 gagal, 1 todo
- [ ] build — tidak ada langkah build

## Acceptance Criteria
Semua test di bawah ada di `test/sdd03b2-reviewer-spec.test.js`, dijalankan untuk `mono-pnpm` dan `single-nuxt`.

- AC-1: automated-test — test/sdd03b2-reviewer-spec.test.js::"AC-1: reviewer on <fixture> — reads the spec, the tasks, the reports, the ADRs and the diff" (baris 96)
- AC-2: automated-test — ::"AC-2: reviewer on <fixture> — scope deviation and task not done, each naming the task or the Scope item" (baris 106)
- AC-3: automated-test — ::"AC-3: reviewer on <fixture> — every AC mapped to task and evidence; unproven ACs need a human check; no re-run" (baris 115); ::"the evidence kinds the reviewer names are the five of the verify-report format" (baris 205)
- AC-4: automated-test — ::"AC-4: reviewer on <fixture> — spec changed after approval blocks, proposed spec changes go to a human, ADR violations are named" (baris 125)
- AC-5: automated-test — ::"AC-5: reviewer on <fixture> — tools and verdict skeleton are the ones recorded before this ticket; it edits nothing" (baris 137; tabel literal `EXPECTED_TOOLS` dan `VERDICT_SKELETON` di atasnya, golden `test/fixtures/pre-sdd03b2/`)
- AC-6: automated-test — ::"AC-6: reviewer on <fixture> — only \"## Output\" differs from the golden, and no header was added" (baris 164); ::"reviewer on <fixture> — the new text splits no section, adds no TODO, no placeholder and no verdict word" (baris 185)
- AC-7: automated-test — ::"AC-7: <fixture> — the old reviewer's Output is synced to the new text (dry-run, then write), no other agent file changes" (242); ::"... a reviewer whose Output the user edited is not overwritten (CONFLICT)" (271); ::"... a section the user customized stays theirs (CUSTOMIZATION) while Output is synced" (288); ::"... without a manifest baseline nothing is written (UNTRACKED)" (305); ::"AC-7: mono-pnpm — the app list of the reviewer Input survives the sync" (317)
- AC-8: manual — sudah dijalankan: `git diff main..HEAD -- test/fixtures/snapshots/mono-pnpm.json` menunjukkan 1 baris diganti, entri `.claude/agents/caf-reviewer.md`; cocok dengan daftar T1(f). Skrip regenerasi memakai daftar izin satu entri dan melaporkan `entries: 16 changed: [ '.claude/agents/caf-reviewer.md' ]`. Pemilik tiket masih perlu membaca diff itu sendiri.
- AC-9: command — `npm test` | exit 0 (`# tests 417, # pass 416, # fail 0, # todo 1`); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | keluaran kosong. Test todo fallback `implementation` ("AC-7: an unknown kind (caf-foo.md) ...") masih ada, satu.
- AC-10: manual — sudah ditulis: `README.md:12` (paragraf SDD) dan `README.md:328` (bagian "The spec-aware reviewer"); `CLAUDE.md:283-302` dan `CLAUDE.md:336-338` (jenis bukti kini di empat tempat). Pencarian "review" di README tidak menemukan klaim yang bertentangan. Pemilik tiket perlu membaca kedua bagian.

## Proposed Spec Changes
-

## Notes

### Jawaban Open Questions
- Q-1: pemeriksaan baru ada di `## Output` reviewer, setelah baris kontrak artefak. Kerangka verdict ada di `## Report Format`, jalur keluaran `.caf/tasks/<TICKET-ID>/review-notes.md`. Muat tanpa header baru.
- Q-2: lihat T1(e).

### Hasil T1 (audit baca-saja, sebelum `src/` diubah)

**(a) Section template reviewer.** Sembilan, urutan tetap:
| Section | Isi | Dilacak `curate` |
|---|---|---|
| Role | satu kalimat dari kandidat (`src/commands/agents.js:185`) | tidak |
| Scope | TODO untuk manusia | tidak |
| Allowed Tools | daftar tools, alasan, TODO MCP | ya |
| Input | `verify-report.md` dari implementation agent (dengan daftar app di monorepo) dan `qa-report.md`; masukan opsional mode post-PR | ya |
| Output | satu baris: `Produces \`review-notes.md\` in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.` | ya |
| Working Pattern (PIV) | teks generik tiga langkah | ya |
| Verify Checklist | dua baris TODO "not a single app" | tidak |
| Retry Logic | `REVIEWER_RETRY_LOGIC`: tulis `review-notes.md`, DEFER bila terblokir | ya |
| Report Format | kerangka `review-notes.md` dan aturan nilai Verdict | ya |

**(b) `tools:`** `[Read, Write, Bash]` di kedua fixture.

**(c) Kerangka verdict.** Di `## Report Format` (`buildReviewerReportFormat`). Baris yang dibaca orchestrator: `Verdict: APPROVE | CHANGES REQUESTED | DEFER` di `review-notes.md` (parser ketat `readInitialReviewReport` dan parser longgar `readReviewerReport`, salinannya dikunci di `test/reviewer-report-format.test.js`). Bagian kerangka: `### Security Audit`, `### Qualitative Review`, `### Verdict Rationale`, `### For Developer`. Jalur keluaran: `.caf/tasks/<TICKET-ID>/review-notes.md`.

**(d) Section yang memuat pemeriksaan baru:** `## Output` saja. Alasan menyingkirkan yang lain:
- `Working Pattern (PIV)`: dikunci ke teks generik untuk semua kind non-Discovery (test 03a2).
- `Input`: tidak boleh berubah satu byte.
- `Report Format`: memuat kerangka verdict.
- `Retry Logic`: bisa, tetapi isinya soal penulisan laporan, dan `Output` adalah pola yang sudah dipakai planner (SDD-02) dan validator (03b1).
- Role, Scope, Verify Checklist: tidak dilacak, jadi `curate sync` tidak akan membawanya ke berkas lama.

**(e) Test yang mengunci teks reviewer.**
| Test | Yang dikunci | Kena perubahan |
|---|---|---|
| `sdd02-planner-spec.test.js` "only the planner changed ..." | `Output` reviewer persis satu baris | ya, diubah |
| `false-drift.test.js` "AC-4: a manifest written by the pre-fix code ..." | hash `Output` reviewer di `legacy-manifest` | ya, diubah (tidak terlihat saat audit, lihat "Hal tak terduga") |
| `repo-context.test.js` (snapshot) | seluruh `caf-reviewer.md` | ya, lewat regenerasi T6 |
| `reviewer-report-format.test.js`, `qa-report-format.test.js` | Report Format, Retry Logic | tidak |
| `false-drift.test.js` AC-2/AC-3/AC-5 (reviewer `Input`) | `Input` | tidak |
| `retry-logic-role-aware.test.js` | Working Pattern, Retry Logic | tidak |
| `skills-*`, `complete-drafts`, `single-repo-scaffold`, `kind-guard` | daftar kind, pointer skill, jumlah TODO | tidak |

**(f) Entri snapshot.** Dari 16 entri, hanya `.claude/agents/caf-reviewer.md` yang memuat `Output` reviewer. `piv-workflow.md`, `agent-handoff.md`, `caf-run-pipeline.md` hanya menyebut nama berkas `review-notes.md`, tidak menyalin teks section.

### Yang diubah di `src/`
Hanya `src/templates/agent-md.js`: konstanta `REVIEWER_SPEC_WORKFLOW` (baris 805) dan satu cabang `reviewer` di `buildOutputSection`. Satu komentar di `VALIDATOR_WORKFLOW` diperbarui (jenis bukti kini di empat tempat); teks yang dirender validator tidak berubah.

Isi baru di `## Output` reviewer: `### 1. Read`, `### 2. Scope`, `### 3. Acceptance criteria`, `### 4. Spec integrity and ADRs`, `### Where the findings go`, `### What the Reviewer never does`.

### Test lama yang diubah
1. `test/sdd02-planner-spec.test.js` (test SDD-02), test "only the planner changed on <fixture> ...":
   - entri `reviewer` dikeluarkan dari tabel literal `OUTPUT`; reviewer kini dicek baris pertama `Output`-nya sama dengan baris kontrak lama;
   - judul test: "one-line Output" menjadi "Output artifact line".
   Alasan: tabel itu mengunci `Output` reviewer persis satu baris, yaitu section yang diubah tiket ini.
2. `test/false-drift.test.js` (test 03a2), test "AC-4: a manifest written by the pre-fix code — curate sync keeps the app list of qa and reviewer Input":
   - berkas reviewer yang ditaruh di repo sementara kini golden `pre-sdd03b2` (berkas yang memang direkam manifest itu), bukan render baru;
   - harapan `{}` + "sync no-op" menjadi `{ DRIFT: 1 }` (`Output` reviewer), sync menulis section itu saja, qa tetap byte-identik, reviewer hasil sync sama dengan render baru, daftar app di `Input` kedua berkas utuh.
   Alasan: `test/fixtures/legacy-manifest/` menyimpan hash `Output` reviewer lama. Fixture itu tidak diregenerasi. Tujuan test (manifest lama, daftar app selamat) tetap, dan kini diuji lewat penulisan sungguhan.

Tidak ada test lain yang diubah. Test 02b, 03a (`frozen-kinds`, `kind-guard`), 03b1: tidak tersentuh.

### Entri snapshot yang berubah (T6)
`test/fixtures/snapshots/mono-pnpm.json`: satu entri, `.claude/agents/caf-reviewer.md`. `stack` dan 15 entri lain identik.

### Tidak tersentuh
`test/fixtures/frozen-kinds/` (15 golden), `pre-sdd02/`, `pre-sdd02b/`, `legacy-manifest/`; `/caf-review`, `/caf-fix-review`, `/caf-review-ticket`, `/caf-plan`; `SKILLS_BY_KIND`; kind `qa`; apa pun terkait orchestrator.

### Hal tak terduga dan keputusan yang perlu diketahui
1. **Test 03a2 legacy-manifest ikut gagal.** Tidak tertangkap di audit T1 karena kuncinya berupa hash di fixture, bukan teks. Diperlakukan sebagai "test lama yang mengunci teks reviewer pada section yang berubah" (butir 2 di atas), bukan alasan berhenti. Bila pemilik tiket menilai ini di luar izin, perubahan itu ada di satu test dan mudah ditinjau.
2. **Pemetaan temuan ke kerangka verdict adalah keputusan saya**, karena spec tidak menentukannya dan kerangka tidak boleh bertambah: penyimpangan scope, task belum dikerjakan, perubahan spec setelah disetujui, dan pelanggaran ADR masuk `### Qualitative Review`; AC "needs human check" dan usulan perubahan spec masuk `### For Developer`.
3. **"Temuan yang memblokir" ditulis sebagai "rules out an approving verdict"**, tanpa menyebut nilai verdict (Retry Logic melarang mengulang nilainya; ada test yang menolak `APPROVE`/`CHANGES REQUESTED`/`DEFER` di teks baru). AC "needs human check" dan usulan perubahan spec tidak diberi pengaruh ke verdict, karena spec tidak memintanya.
4. **Dua aturan tambahan di luar bunyi AC**, keduanya anti-menebak: bila `requirements.md` tidak punya riwayat git atau tidak pernah disetujui, reviewer melaporkan pemeriksaan A4 tidak bisa dilakukan; bila `requirements.md`/`tasks.md` tidak ada, itu "missing context" dan mengikuti Retry Logic yang sudah ada.
5. **Task tanpa id.** `tasks.md` hasil planner tidak menjamin id per task, jadi teksnya: "the task id, or the task line when tasks carry no id".
6. **Ketegangan yang sudah ada, tidak diubah:** `## Verify Checklist` reviewer masih dua baris TODO dan Working Pattern masih berkata "run the Verify Checklist", sementara teks baru melarang menjalankan ulang test. Keduanya section yang tidak boleh berubah di tiket ini.
7. **Mode post-PR (`/caf-fix-review`)** memakai agen yang sama; `Output` baru berlaku juga di sana. Command-nya tidak disentuh (03b3).
8. `.ai/` ada di `.gitignore`, jadi `requirements.md`, `tasks.md`, dan laporan ini tidak masuk commit.
9. Tidak ada uji dispatch agen sungguhan: yang dibuktikan adalah teks hasil render dan perilaku `curate sync`, bukan bahwa sebuah model mengikuti instruksinya.

### git diff --stat main..HEAD
```
 CLAUDE.md                                          |  27 +-
 README.md                                          |  15 +-
 src/templates/agent-md.js                          |  87 +++++-
 test/false-drift.test.js                           |  30 +-
 test/fixtures/pre-sdd03b2/reviewer.mono-pnpm.json  |  19 ++
 .../fixtures/pre-sdd03b2/reviewer.single-nuxt.json |  19 ++
 test/fixtures/snapshots/mono-pnpm.json             |   2 +-
 test/sdd02-planner-spec.test.js                    |   6 +-
 test/sdd03b2-reviewer-spec.test.js                 | 332 +++++++++++++++++++++
 9 files changed, 525 insertions(+), 12 deletions(-)
```

Status: SUCCESS — 417 test (416 lulus, 1 todo, 0 gagal) — commit `2d7810f`, `de71b76`
