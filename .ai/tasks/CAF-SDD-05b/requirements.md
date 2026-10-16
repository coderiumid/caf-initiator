# CAF-SDD-05b — Skill `caf-breakdown`: Planner memecah permintaan besar menjadi usulan tiket

Status: APPROVED
Repo: caf-initiator, di atas branch `ai-agent/CAF-SDD-05a` (belum di-merge; 05b dikerjakan di branch yang sama sebagai tiket terpisah, setelah 4 commit 05a)

## Outcomes
- Permintaan yang berisi lebih dari satu hasil yang bisa dirilis sendiri-sendiri tidak dipaksakan menjadi satu spec raksasa: Planner menulis `breakdown.md` (usulan tiket) dan berhenti.
- Planner tidak membuat tiket. Tiket dibuat manusia, atau satu per satu di chat lewat `/caf-plan` dengan jawaban eksplisit (ya / ubah / lewati) untuk tiap tiket.
- Jalur ticket run (orchestrator) tidak berubah: berhentinya lewat Clarify yang sudah ada (`Status: NEEDS_CLARIFICATION` + satu pertanyaan BLOCKING), dan `breakdown.md` ikut masuk Draft PR spec.
- Satu hasil dengan banyak langkah tetap satu spec; langkahnya masuk `tasks.md`, bukan `breakdown.md`.
- Skill `caf-breakdown` lahir DRAFT dan baru aktif setelah dispatch test nyata.

## Scope
In:
- Skill baru `caf-breakdown` (`src/templates/skill-md.js`): nama, builder, pemetaan ke `planner`, banner DRAFT.
- Dua baris baru di `### 1. Specify` pada `## Output` Planner (`PLANNER_SPEC_WORKFLOW`, `src/templates/agent-md.js`). Tidak ada heading baru.
- `/caf-plan` (`src/templates/plan-command.js`): langkah 5 dan `## Constraints` untuk kasus `breakdown.md` ada.
- Satu baris `breakdown.md` di `.caf/tasks/README.md` yang di-generate (`src/templates/tasks-readme.js`).
- Test baru, golden `pre-sdd05b`, penyesuaian test 05a yang menahan teks yang sama, `CLAUDE.md`.

Out:
- Perubahan di caf-orchestrator, termasuk pembuatan tiket/sub-issue otomatis dari ticket run. Ditunda; tiket sendiri bila dibutuhkan.
- Pembuatan tiket oleh Planner atau oleh agent lain. Planner tidak punya tool tracker dan tidak akan diberi.
- Menutup, memindahkan, atau mengubah tiket induk. Itu keputusan manusia.
- Ukuran/estimasi per item (tebakan; tidak ada dasar di repo).
- Penghapusan `architect`, `ARTIFACT_BY_ROLE.planner`, roster `agent-handoff.md`.

## Findings (dari kode, main 2bb11e3 + 4 commit 05a)
- F-1: `/caf-plan` (`plan-command.js`) menerima ID tiket atau teks bebas, memanggil `caf-planner` lewat Task, dan di langkah 5 berhenti pada `NEEDS_CLARIFICATION`/`NEEDS_HUMAN` dengan menampilkan pertanyaan. Jalur ini sudah cocok untuk kasus "berhenti karena perlu dipecah".
- F-2: `## Constraints` `/caf-plan` kini berbunyi "NEVER changes ticket status in the tracker and NEVER posts to the tracker or to a PR". Membuat tiket baru adalah tulisan ke tracker, jadi kalimat itu harus diubah dengan sadar (lihat D-5).
- F-3: Langkah 1 `/caf-plan` sudah memakai MCP tracker bila terhubung (membaca tiket) tanpa mendaftarkannya di `allowed-tools`. Pola yang sama dipakai untuk membuat tiket.
- F-4: Pada ticket run, orchestrator berhenti di `NEEDS_CLARIFICATION` sebelum membutuhkan `tasks.md`, mendorong draft (`commitAll` + push, jadi `breakdown.md` ikut), dan bertanya di tiket (`❓ CAF-CLARIFY`). Orchestrator tidak punya logika `breakdown.md`.
- F-5: Aturan Planner tentang ticket run sudah ada: pertanyaan BLOCKING tanpa Answer → `requirements.md` dengan `Status: NEEDS_CLARIFICATION`, tanpa `tasks.md` (CAF-SDD-03c2b). Aturan baru memakai jalur yang sama, tidak menambah nilai status.
- F-6: Planner sudah punya aturan memecah AC yang berisi beberapa perilaku, dan aturan maksimal 5 pertanyaan. Aturan memecah permintaan adalah tingkat di atasnya.
- F-7: Test 05a (`sdd05a-caf-design.test.js`, AC-7) membandingkan Planner dengan golden `pre-sdd05a` byte per byte di luar enam baris Plan. Dua baris baru di Specify membuat test itu gagal kecuali dibaca lewat helper (pola `since-05a.js`).

## Assumptions
- A-1: Pada ticket run, stop di `NEEDS_CLARIFICATION` tidak mensyaratkan `requirements.md` punya AC, dan Clarify di orchestrator tidak membaca AC. Dasar: F-4. T1 memverifikasi di `../caf-orchestrator/src` (jalur `stopForSpecIfNeeded` dan `stopForClarification`); bila bertentangan, STOP dan laporkan.
- A-2: `requirements.md` untuk permintaan yang dipecah cukup berupa garis besar (tujuan dan cakupan seluruh permintaan, pertanyaan BLOCKING); AC milik tiket hasil pecahan. Dasar: aturan `caf-spec` bahwa bagian tanpa isi ditulis `Tidak ada`. T1 memeriksa bahwa teks Planner dan `caf-spec` tidak melarang bagian AC kosong; bila melarang, catat sebagai deviasi dan pakai bunyi yang paling kecil perubahannya.
- A-3: `/caf-plan` berjalan di sesi interaktif (ada manusia). Pembuatan tiket tidak pernah dilakukan di ticket run. Dasar: `/caf-plan` adalah jalur chat; orchestrator memakai jalurnya sendiri.
- A-4: `.caf/tasks/README.md` hanya punya satu baris per artefak (`tasks-readme.js`). T1 memeriksa test yang menahannya, seperti di 05a.

## Decisions already made
- D-1: `caf-breakdown` adalah tiket terpisah dari `caf-design` (Ganjar, 16 Okt). Dikerjakan di branch yang sama dengan 05a (Ganjar, 16 Okt).
- D-2: Planner menulis `breakdown.md` berupa usulan: item, urutan, dependensi, garis besar AC. Ia berhenti; tidak ada tiket yang dibuat olehnya (Ganjar, 16 Okt).
- D-3: Tiket dibuat manusia, atau satu per satu di chat dengan konfirmasi per tiket (ya / ubah / lewati). Tidak ada pembuatan massal (Ganjar, 16 Okt).
- D-4: Tidak ada perubahan orchestrator (Ganjar, 16 Okt).
- D-5: Karena `/caf-plan` kini boleh membuat tiket setelah jawaban eksplisit, kalimat "NEVER posts to the tracker" diubah menjadi: tidak pernah menulis ke tracker kecuali membuat tiket dari `breakdown.md` setelah "ya" untuk tiket itu; status tiket yang ada dan PR tetap tidak pernah disentuh (keputusan tiket ini, konsekuensi D-3; ubah bila Ganjar ingin lain).
- D-6: Pemicu pemecahan: permintaan berisi lebih dari satu hasil yang bisa dirilis dan dipakai sendiri-sendiri. Bukan jumlah AC atau jumlah baris (tidak ada dasar angka). Satu hasil dengan banyak langkah bukan pemecahan (keputusan tiket ini).
- D-7: Hasil pemecahan memakai jalur yang sama di chat dan di ticket run: `requirements.md` garis besar dengan `Status: NEEDS_CLARIFICATION`, satu pertanyaan BLOCKING (pecah seperti `breakdown.md`, atau lanjut sebagai satu spec), tanpa `tasks.md`. Setelah pertanyaan itu punya `Answer:`, Planner tidak memecah lagi (keputusan tiket ini).
- D-8: Aturan inti ada di `## Output` Planner (tracked, ikut sync); format dan rincian ada di skill. Skill lahir DRAFT tanpa baris `TODO`, planner-only (sama dengan D-6/D-7 di 05a).

## Constraints
- `## Output` Planner: hanya dua baris baru di `### 1. Specify` (T3, verbatim). Tidak ada heading baru, tidak ada kata `TODO`, tidak ada nilai status baru. Semua yang lain, `tools:` dan `## Allowed Tools` byte-identik dengan render di HEAD 05a (`test/fixtures/pre-sdd05b/`, direkam sebelum perubahan, tidak boleh di-regenerate).
- Teks skill verbatim dari `caf-breakdown.skill.md` di folder tiket ini; ditahan lewat sha256. Skill tidak menyebut kata status/verdict, tidak berkata "tunggu konfirmasi", tidak mendefinisikan format laporan, dan hanya dipetakan ke `planner`. Ini pengecualian sempit keempat: skill mendefinisikan format artefak `breakdown.md` saja.
- `breakdown.md` tidak punya baris `Status:` (orchestrator hanya membaca `Status:` dari `requirements.md` dan laporan; jangan menambah kemungkinan salah baca).
- `/caf-plan`: hanya langkah 5 (cabang `NEEDS_CLARIFICATION` bila `breakdown.md` ada) dan `## Constraints` yang berubah. Teks lain byte-identik dengan golden. Command tidak menyalin aturan Planner (test yang menolak teks aturan Planner di `/caf-plan` tetap lulus).
- Pembuatan tiket: satu per satu, tiap tiket butuh jawaban eksplisit; tanpa jawaban = tidak dibuat. Tidak ada loop otomatis, tidak ada "buat semua". Tiket yang dibuat dilaporkan di chat (ID dan judul); command tidak menulis balik ke `breakdown.md`.
- Command tetap tidak menulis berkas, tidak menjalankan `git`, tidak mengubah kode.
- Perintah tidak dilacak dan tidak sampai ke repo lama lewat `curate sync`; jangan menyebutnya demikian.
- `mono-pnpm.json` hanya berubah pada entri berkas yang disebut di AC; dicatat di `verify-report.md`; bukan preseden.
- Tidak ada panggilan model dan tidak ada dependency baru.

## Open questions
Tidak ada.

## Acceptance criteria
- AC-1: When `caf-init scaffold skills` runs on a repo, then `.claude/skills/caf-breakdown/SKILL.md` is written with frontmatter `name: caf-breakdown` and a `description`, starts with the 3-line DRAFT banner (`hasSkillDraftBanner` and `hasSkillDraftAgentNotice` true), and has no line that starts with the to-do word (`countOpenSkillTodos` is 0).
  Verify: automated test — `test/sdd05b-caf-breakdown.test.js` (render lewat `buildSkillFiles`; `caf-breakdown` terakhir di `SKILL_NAMES`, `draft: true`).
- AC-2: When the body of the rendered skill without its banner is compared with `caf-breakdown.skill.md` of this ticket, then it is identical.
  Verify: automated test — sha256 teks tanpa banner ditahan di test.
- AC-3: When `SKILLS_BY_KIND` is read, then `caf-breakdown` appears for `planner` only, after `caf-design`, and the earlier entries of `skillsForKind('planner')` keep their order.
  Verify: automated test — asersi pada tabel dan urutan.
- AC-4: When a planner is generated while `caf-breakdown` has its banner, then its `## Skills` has no pointer to it; once the banner is removed from the file, the generated section has the pointer.
  Verify: automated test — dua render.
- AC-5: When the rendered text of `caf-breakdown` is checked, then it names none of the status or verdict words (`SUCCESS`, `NEEDS_CLARIFICATION`, `NEEDS_HUMAN`, `APPROVED`, `DRAFT` as a status, `PASS`, `FAIL`, `UNVERIFIED`, `APPROVE`, `CHANGES REQUESTED`, `DEFER`), does not tell the reader to wait for confirmation, and says that creating tickets is not the planner's work.
  Verify: automated test — asersi regex dan asersi kalimat.
- AC-6: When a planner is rendered, then `### 1. Specify` of its `## Output` contains the two lines of `tasks.md` T3 verbatim, in the place T3 names, with no new `###` heading and no `TODO` word, and `check-drafts` counts the same open `TODO` lines for the planner as before.
  Verify: automated test — baris ditahan verbatim; heading dihitung; hitungan `check-drafts`.
- AC-7: When a planner is rendered, then every line outside those two lines is byte-identical to `test/fixtures/pre-sdd05b/` (render di HEAD 05a), including the six Plan lines of 05a, `## Input`, `## Constraints`, `## Allowed Tools` and the frontmatter.
  Verify: automated test — perbandingan dengan golden pada kedua fixture.
- AC-8: When any kind other than `planner` is rendered (all `frozen-kinds`, including `architect`, `reviewer`, `validator`), then it is unchanged, and the 05a test that compared the planner with `pre-sdd05a` now reads that golden through a `since-05b` helper without its golden being edited.
  Verify: automated test — `frozen-kinds` tetap lulus; test 05a tetap lulus lewat helper.
- AC-9: When `curate sync` runs on a repo whose planner was generated at the 05a state (baseline recorded), then `## Output` is `DRIFT` and rewritten with the new lines, the file differs only inside `## Output`; a planner whose `## Output` was edited by hand is `CONFLICT` and the file is unchanged byte for byte.
  Verify: automated test — `makeOldRepo` dengan planner 05a; CONFLICT dengan asersi byte-demi-byte.
- AC-10: When `curate audit` runs on a repo whose planner has no `caf-breakdown` pointer and the skill file has no banner, then one `skill-pointer` warning names `.claude/skills/caf-breakdown/SKILL.md`; with the banner present there is no such warning; no gap and no exit-code change.
  Verify: automated test — dua kasus.
- AC-11: When `/caf-plan` is rendered, then step 5 says: if the stop is `NEEDS_CLARIFICATION` and `breakdown.md` exists in the folder, show the user its items and the planner's question, and — only when a tracker tool is connected in this session — offer to create the tickets one at a time, each with its own question answered by yes, edit or skip.
  Verify: automated test — asersi kalimat pada render `buildPlanMd`.
- AC-12: When `/caf-plan` is rendered, then it says a ticket is created only after an explicit yes for that ticket, never several in one step and never on silence; "edit" lets the user change the title or description before creating; "skip" creates nothing for that item; the created IDs and titles are reported in chat; and with no tracker tool connected it names the file and creates nothing.
  Verify: automated test — asersi kalimat.
- AC-13: When `/caf-plan` is rendered, then its `## Constraints` no longer says it NEVER posts to the tracker without exception: it allows creating a ticket from `breakdown.md` after an explicit yes, and keeps the prohibitions on changing the status of an existing ticket, posting to a PR, running `git` and writing application code.
  Verify: automated test — asersi kalimat; sisa Constraints identik dengan golden.
- AC-14: When `/caf-plan` is rendered, then everything outside step 5 and `## Constraints` is byte-identical to `test/fixtures/pre-sdd05b/`, and it contains no text of the Planner's rules (test yang ada tetap lulus).
  Verify: automated test — perbandingan dengan golden; test aturan-Planner yang ada tetap lulus.
- AC-15: When `.caf/tasks/README.md` is generated, then its artifact list names `breakdown.md` as written by the Planner only for a request with several independent outcomes, and the rest is identical to the golden.
  Verify: automated test — asersi pada render `buildTasksReadme`.
- AC-16: When the verification gate runs, then `npm test` passes, `pre-sdd05b` and every older golden are unchanged, and `mono-pnpm.json` differs only in entries for files named in Constraints.
  Verify: command: `npm test` | expect: exit 0
- AC-17: When `CLAUDE.md` is read, then it has a section for CAF-SDD-05b stating: skill born DRAFT and planner-only; the rule lives in `## Output` and in the skill; the stop reuses `NEEDS_CLARIFICATION` with one BLOCKING question and `breakdown.md` rides the spec Draft PR; no orchestrator change; tickets are never created by the Planner, only by `/caf-plan` after an explicit yes per ticket; the relaxed `/caf-plan` constraint; rollout (curate sync carries `## Output`; `/caf-plan` is a command and does not sync; banner and `## Skills` pointer by hand after a dispatch test); and `pre-sdd05b/` is never regenerated.
  Verify: manual — baca section; tiap butir di atas ada.

## Notes for reviewer
- Dispatch test nyata menentukan penghapusan banner: Planner pada satu permintaan multi-hasil (harus menulis `breakdown.md` dan berhenti) dan satu permintaan satu-hasil-banyak-langkah (harus tetap satu spec tanpa `breakdown.md`).
- Pembuatan tiket di chat hanya dapat diuji manusia dengan tracker sungguhan; test otomatis hanya menahan teks command.