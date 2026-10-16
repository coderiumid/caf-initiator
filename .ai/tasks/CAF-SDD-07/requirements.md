# CAF-SDD-07 — Penegasan teks agent: Coverage, verdict reviewer, pipa validator, cakupan checklist

Status: APPROVED
Repo: caf-initiator, di atas branch `ai-agent/CAF-SDD-06` (belum di-merge; 07 dikerjakan di branch yang sama sebagai tiket terpisah, setelah commit 06)

## Outcomes
- Agent implementasi tahu bahwa `## Coverage` di `tasks.md` adalah peta AC → task, bukan task yang dikerjakan.
- Reviewer tahu verdict mana (tanpa menyebut nilainya) untuk temuan yang hanya bisa diputuskan manusia, dan mana untuk temuan yang bisa diperbaiki developer.
- Validator tidak memecah sel tabel `validate-report.md` dengan pipa telanjang.
- Validator di monorepo menjalankan checklist hanya untuk app yang disebut task di `tasks.md`.
- Tidak ada perubahan lain: tidak ada skill, command, atau perubahan orchestrator.

## Scope
In (semuanya di `## Output` yang sudah ada, `src/templates/agent-md.js`):
- `IMPLEMENTATION_SPEC_WORKFLOW` (frontend, backend, implementer): satu butir baru di `### 1. Read`.
- `REVIEWER_SPEC_WORKFLOW`: satu butir di `### Where the findings go` diganti.
- `VALIDATOR_WORKFLOW`: butir pertama `### 2. Run the repo verification gate` diganti, satu butir baru di `### 3. Judge every AC`.
- Test baru, golden `pre-sdd07`, penyesuaian test lama, `CLAUDE.md`.

Out:
- `## Verify Checklist` validator (tetap dibangun untuk semua app), `## Report Format`, `## Retry Logic`, `## Allowed Tools`, frontmatter.
- Skill, command, `agent-handoff.md`, orchestrator.
- Kosmetik rename dan `caf-spec` v4 (tiket lain).

## Findings (dari kode, main 2d3adab + commit 06)
- F-1: Agent implementasi membaca `tasks.md` hanya sebagai "tasks of this agent and the AC ids each one serves". Planner menulis `## Coverage` di akhir `tasks.md` yang berisi tugas (aturan 02e), dan `task-router` orchestrator mengabaikannya (04a). Teks agent implementasi tidak menyebutnya.
- F-2: Item reviewer berbunyi "A blocking finding rules out an approving verdict; give it as the reason under `### Verdict Rationale`. The verdict values are the ones of the Report Format section." Ia tidak menyatakan nilai non-approve yang mana untuk temuan yang tidak bisa diperbaiki developer. Aturan lama: teks `REVIEWER_SPEC_WORKFLOW` tidak boleh menyebut nilai verdict (`APPROVE`, `CHANGES REQUESTED`, `DEFER`); `REVIEWER_RETRY_LOGIC` sudah menyatakan bahwa review yang terblokir (konteks hilang atau butuh keputusan manusia) memakai nilai DEFER.
- F-3: `## Report Format` validator memuat tabel AC dengan kolom `Evidence` yang bisa berisi perintah dengan `|` (bentuk `command: <cmd> | expect: ...`). Orchestrator (04b) mem-parse kolom per posisi dan menjaga pipa di dalam backtick sebagai satu sel; pipa telanjang memecah sel.
- F-4: Langkah 2 validator berbunyi "Run every command of the Verify Checklist of this file, for the app(s) the change touches, and record the exit code of each one." Checklist dibangun untuk semua app terdeteksi; di monorepo "app yang disentuh perubahan" tidak ditentukan oleh `tasks.md`.
- F-5: Golden `frozen-kinds` memuat `implementer.single-nuxt.json` dengan `sections.Output` (diedit sekali di 03d). Golden `pre-sdd03b2`, `pre-sdd03d`, `pre-sdd03e` dan seterusnya dibaca test lama lewat helper `since-*`.

## Assumptions
- A-1: Di orchestrator, verdict reviewer `CHANGES REQUESTED` memicu jalur fix-review (agent memperbaiki kode, tidak boleh mengubah spec), sedangkan `DEFER` menyerahkan keputusan ke manusia tanpa fix-review. Dasar: `REVIEWER_RETRY_LOGIC` dan pembaca laporan `report-reader.ts`. T1 memverifikasi di `../caf-orchestrator/src`; bila bertentangan, STOP dan laporkan.
- A-2: Parser tabel AC (`ac-summary.ts`) mengenal pipa di dalam backtick dan tidak mengenal escape `\|`. Dasar: Penilaian 04b. T1 memverifikasi; bila `\|` ternyata didukung, tetap tulis aturan backtick saja (satu cara).
- A-3: Menambah atau mengganti butir di dalam langkah yang sudah ada tidak menambah heading `###` dan tidak memengaruhi `parseSections`. Dasar: pola 02c-02e, 05a, 05b, 06.
- A-4: Test yang membaca golden `frozen-kinds` implementer dan `pre-sdd03*` dapat membacanya lewat helper baru `since-07` tanpa mengubah berkas golden. Dasar: pola `since-05a/05b/06`. T1 memastikan; bila `frozen-kinds.test.js` membandingkan berkas langsung, tambahkan transformasi di test, bukan di golden.

## Decisions already made
- D-1: Item yang masuk 07 adalah kelompok "Penegasan agent" (Ganjar, 16 Okt: "lanjutkan ticket untuk caf-initiator"; pilihan item oleh konsultan dari kelompok yang ditawarkan sebelumnya).
- D-2: Semua perubahan hanya teks `## Output`; sampai ke repo lama lewat `curate sync` sebagai `DRIFT` (keputusan tiket ini).
- D-3: Aturan reviewer tidak menyebut nilai verdict; ia merujuk Retry Logic untuk review yang terblokir dan Report Format untuk nilainya (keputusan tiket ini, mengikuti aturan 03b2).
- D-4: Aturan pipa memakai satu cara: backtick (keputusan tiket ini).

## Constraints
- Teks baru (verbatim, T2-T4 memuatnya persis; baris sumber boleh dipotong sama seperti yang tertulis di sini):

  Butir implementasi, tepat setelah butir "`tasks.md`: the tasks of this agent and the AC ids each one serves." di `### 1. Read`:
  ```
  '- A `tasks.md` may end with `## Coverage`, which maps each AC id to the tasks that serve it. It',
  '  is a map, not a task: do not implement it. Use it to find the tasks behind an AC you report.',
  ```
  Butir reviewer, menggantikan dua baris "A blocking finding rules out an approving verdict; ..." di `### Where the findings go`:
  ```
  '- A blocking finding means the verdict is not the approving one. A finding only a human can',
  '  settle (a spec changed after approval, a proposed spec change that blocks the work) takes the',
  '  value that Retry Logic gives for a review that is blocked. Any other blocking finding takes',
  '  the remaining value that is not approving. Give the reason under `### Verdict Rationale`.',
  '  The values themselves are the ones of the Report Format section.',
  ```
  Butir validator langkah 2, menggantikan dua baris pertama "Run every command of the Verify Checklist ...":
  ```
  '- Run the commands of the Verify Checklist of this file for the app(s) that the tasks of',
  '  `tasks.md` name, by path or by name. When they name none, use the app(s) the change touches.',
  '  Record the exit code of each command you run.',
  '- A checklist line of an app you did not run is not a gap of the gate.',
  ```
  Butir validator langkah 3, setelah baris "What `verify-report.md` claims is never a reason for `PASS` on its own: only what you ran is.":
  ```
  '- In the table of `validate-report.md`, a `|` that belongs to a command or to observed output is',
  '  written inside backticks. A bare `|` splits the cell and the row is misread.',
  ```
- Tidak ada heading baru, tidak ada kata `TODO`, tidak ada nilai status/verdict baru; teks reviewer tidak boleh memuat `APPROVE`, `CHANGES REQUESTED`, atau `DEFER`.
- Semua bagian lain tiap kind (frontmatter, `## Input`, `## Allowed Tools`, `## Retry Logic`, `## Skills`, `## Report Format`, `## Verify Checklist`, sisa `## Output`) byte-identik dengan render di HEAD sebelum 07 (`test/fixtures/pre-sdd07/`, direkam sebelum perubahan, tidak boleh di-regenerate). Kind lain (planner, architect, qa, dst.) tidak berubah sama sekali.
- Lima bentuk bukti tetap identik di kelima tempat (tes perbandingan yang ada tetap lulus).
- `curate sync` tetap hanya menulis `DRIFT`. Tidak ada jalur tulis baru.
- Golden yang ada (termasuk `frozen-kinds/implementer.single-nuxt.json` dan `pre-sdd03*`) tidak diedit; test membacanya lewat helper `since-07`.
- `mono-pnpm.json` hanya boleh berubah pada entri `caf-frontend.md`, `caf-backend.md`, `caf-validator.md`, `caf-reviewer.md`; dicatat di `verify-report.md`; bukan preseden.
- Tidak ada panggilan model dan tidak ada dependency baru.

## Open questions
Tidak ada.

## Acceptance criteria
- AC-1: When a `frontend`, `backend` or `implementer` agent is rendered, then `### 1. Read` of its `## Output` contains the two Coverage lines of Constraints verbatim directly after the `tasks.md` bullet, and the `implementation` kind (per-app agent) and every other kind keep an unchanged `## Output`.
  Verify: automated test — `test/sdd07-agent-clarity.test.js` (render tiga kind pada fixture yang relevan; perbandingan `Output` kind lain dengan golden).
- AC-2: When a reviewer is rendered, then `### Where the findings go` contains the five reviewer lines of Constraints verbatim in place of the two old lines, and the text of `REVIEWER_SPEC_WORKFLOW` names none of `APPROVE`, `CHANGES REQUESTED`, `DEFER`.
  Verify: automated test — baris ditahan verbatim; asersi regex tiga nilai pada teks workflow.
- AC-3: When a validator is rendered, then step 2 contains the four validator lines of Constraints verbatim in place of the two old lines, and `## Verify Checklist` is byte-identical to the golden.
  Verify: automated test — baris ditahan verbatim; perbandingan `Verify Checklist` dengan golden pada mono-pnpm dan single-nuxt.
- AC-4: When a validator is rendered, then step 3 contains the two pipe lines of Constraints verbatim after the "What `verify-report.md` claims ..." line.
  Verify: automated test — baris ditahan verbatim.
- AC-5: When any of these agents is rendered, then no `###` heading was added or removed, the changed lines contain no `TODO` word, and `check-drafts` counts the same open `TODO` lines per agent as before.
  Verify: automated test — hitung heading; asersi kata; hitungan `check-drafts`.
- AC-6: When frontend, backend, implementer, reviewer and validator are rendered on both fixtures, then every line outside the changed lines is byte-identical to `test/fixtures/pre-sdd07/`; and every other kind is byte-identical to its render before this ticket.
  Verify: automated test — perbandingan dengan golden; `frozen-kinds` dan test kind lain tetap lulus (lewat helper `since-07` bila perlu, tanpa mengedit golden).
- AC-7: When `curate sync` runs on a repo whose frontend, backend, reviewer and validator were generated before this ticket (baseline recorded), then `## Output` of each is `DRIFT` and rewritten with the new text, the file differs only inside `## Output`; an agent whose `## Output` was edited by hand is `CONFLICT` and its file is unchanged byte for byte.
  Verify: automated test — `makeOldRepo` dengan agent dari golden `pre-sdd07`; CONFLICT dengan asersi byte-demi-byte.
- AC-8: When the verification gate runs, then `npm test` passes, `pre-sdd07` and every older golden are unchanged, and `mono-pnpm.json` differs only in `caf-frontend.md`, `caf-backend.md`, `caf-validator.md`, `caf-reviewer.md`.
  Verify: command: `npm test` | expect: exit 0
- AC-9: When `CLAUDE.md` is read, then it has a section for CAF-SDD-07 stating: the four text changes and where each lives; that all four are `## Output` text reaching old repos through `curate sync` as `DRIFT`; that the reviewer text names no verdict value and refers to Retry Logic and Report Format; that the pipe rule uses backticks only; that goldens (including `frozen-kinds/implementer.single-nuxt.json`) were not edited and are read through `since-07`; and that `pre-sdd07/` is never regenerated.
  Verify: manual — baca section; tiap butir di atas ada.

## Notes for reviewer
- A-1 adalah satu-satunya klaim lintas-repo. Bila verdict `DEFER` ternyata memicu jalur yang tidak diharapkan di orchestrator, tiket ini berhenti di T1 dan butir reviewer ditinjau ulang sebelum apa pun ditulis.
- Efek pada perilaku model (apakah reviewer sungguh memilih verdict yang benar, apakah validator berhenti memecah sel) hanya terlihat di dispatch nyata; test otomatis menahan teks.