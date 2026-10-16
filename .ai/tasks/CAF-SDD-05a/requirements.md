# CAF-SDD-05a — Skill `caf-design`: Planner menulis `design.md`

Status: APPROVED
Repo: caf-initiator (main 2bb11e3, setelah merge CAF-CHORE-02)

## Outcomes
- Tiket yang butuh desain teknis (lebih dari satu app, schema/migration baru, atau kontrak antar-layer baru) mendapat `design.md` dari Planner, tanpa agent Architect dan tanpa langkah tambahan.
- Tiket yang tidak butuh desain tidak mendapat `design.md` sama sekali (tidak ada berkas kosong).
- `design.md` ikut gerbang spec yang sudah ada: ia masuk ke Draft PR spec bersama `requirements.md` dan `tasks.md`, dibaca manusia pada satu persetujuan.
- Skill `caf-design` lahir DRAFT dan baru aktif setelah dispatch test nyata, sama seperti `caf-spec` dan `caf-traceability`.
- Agent `architect` tidak berubah dan tidak dihapus di tiket ini.

## Scope
In:
- Skill baru `caf-design` (`src/templates/skill-md.js`): nama, builder, pemetaan ke `planner`, banner DRAFT.
- Langkah `### 3. Plan` pada `## Output` Planner (`PLANNER_SPEC_WORKFLOW`, `src/templates/agent-md.js`), diganti di tempat.
- `/caf-run`: tahap Architect dilewati bila `design.md` sudah ada di folder tiket (`src/templates/run-pipeline-command.js`).
- Satu baris `design.md` di `.caf/tasks/README.md` yang di-generate (`src/templates/tasks-readme.js`).
- Test baru, golden `pre-sdd05a`, `CLAUDE.md`.

Out:
- Menghapus atau menyembunyikan `architect` (`SUPERSEDED_CANDIDATE_KINDS`), builder-nya, atau tool/skill-nya. Menunggu dispatch test `caf-design` yang nyata; tiket sendiri.
- Skill `caf-breakdown` (CAF-SDD-05b).
- Perubahan di caf-orchestrator. Ia tidak mengenal `design.md` dan tidak perlu mengenalnya (lihat F-3).
- `ARTIFACT_BY_ROLE.planner` dan roster di `agent-handoff.md` (berkas itu tidak punya sync; tiket lanjutan bila perlu).
- Persetujuan terpisah untuk `design.md`, status baru, atau command baru.
- `caf-spec` v4 dan skill lain.

## Findings (dari kode, main 2bb11e3)
- F-1: `### 3. Plan` Planner kini berbunyi: "Decide the approach at the level of work, not code ... A change that needs a technical design goes to the Architect (`design.md`); do not design it here." (`PLANNER_SPEC_WORKFLOW`). Satu-satunya penunjuk ke Architect di teks Planner.
- F-2: Planner punya tools `Read`, `Write`, `Glob`, `Grep` (`TOOLS_BY_KIND.planner`), jadi bisa membaca kode dan menulis `design.md` tanpa tool baru. `architect` punya `Read`, `Write`.
- F-3: Orkestrator tidak punya referensi ke `design.md` maupun `caf-architect` di `src`. `parkSpecOnBranch` memakai `commitAll` lalu push, sehingga isi working tree (termasuk `design.md`) masuk ke Draft PR spec. Orkestrator juga tidak memilih agent berdasarkan `design.md`.
- F-4: Agent implementasi (`frontend`, `backend`, `implementer`), Reviewer (`REVIEWER_SPEC_WORKFLOW`) dan Validator (`VALIDATOR_WORKFLOW`) sudah membaca `design.md` "if present". Tidak ada yang perlu ditambah di sisi pembaca.
- F-5: Kriteria Architect di `/caf-run` (`architectSection`): spawn bila `tasks.md` menyatakan perlu keputusan desain, ATAU task menyentuh lebih dari satu app/service, ATAU ada schema/migration baru. Tanpa Architect di roster, bagian itu menyuruh berhenti dan melapor bahwa tiket "harus lewat Architect".
- F-6: Skill hanya dipetakan lewat `SKILLS_BY_KIND`; penunjuk `## Skills` ditulis hanya untuk skill yang berkas-nya ada dan tanpa banner (`usableSkillPaths`). Skill DRAFT tidak pernah menjadi penunjuk.
- F-7: `## Output` Planner adalah bagian tracked (`SYNCABLE_SECTIONS`); perubahan teksnya sampai ke repo lama lewat `curate sync` sebagai `DRIFT`, dan Planner yang `## Output`-nya sudah diedit adalah `CONFLICT` yang dibiarkan. `## Skills` dan frontmatter `tools:` tidak ikut sync (langkah manual).

## Assumptions
- A-1: `design.md` yang ditulis Planner tidak perlu berkas atau status tambahan: ia tidak punya `Status:` dan tidak mengubah apa yang dibaca orkestrator. Dasar: F-3, F-4.
- A-2: Format `design.md` yang dulu dihasilkan Architect tidak dibaca oleh kode mana pun (tidak ada parser). Dasar: grep `design.md` di `src/` caf-initiator hanya menemukan teks template. T1 memverifikasi di kedua repo.
- A-3: Penyebutan `design.md` di `.caf/tasks/README.md` hanya berupa satu baris daftar artefak (`tasks-readme.js`, baris "design.md ← Architect Agent: technical approach (if needed)"). T1 memverifikasi test mana yang menahannya.
- A-4: Mengganti tiga baris langkah Plan tidak menambah heading `###` baru, sehingga `## Output` tetap satu bagian yang sama untuk `parseSections`.

## Decisions already made
- D-1: Dua tiket terpisah: `caf-design` (ini) lebih dulu, `caf-breakdown` kemudian (Ganjar, 16 Okt).
- D-2: Planner memutuskan sendiri apakah `design.md` ditulis, berdasarkan kriteria; bukan flag, label, atau permintaan manusia (Ganjar, 16 Okt).
- D-3: Kriteria: menyentuh lebih dari satu app/service, atau menambah/mengubah schema atau migration, atau menambah/mengubah kontrak antar-layer. Tidak satu pun terpenuhi berarti tidak ada `design.md` (Ganjar, 16 Okt; sama dengan kriteria Architect di `/caf-run`).
- D-4: `design.md` tidak punya gerbang persetujuan sendiri. Ia ikut gerbang spec: masuk Draft PR yang sama (Ganjar, 16 Okt).
- D-5: `architect` tetap ada dan tetap ditawarkan di picker sampai tiket lanjutan. Dasar: dispatch test `caf-design` belum ada, dan menghapus peran sebelum penggantinya terbukti adalah kesalahan urutan yang sama dengan yang sudah dihindari untuk `qa` (keputusan tiket ini; ubah bila Ganjar ingin lain).
- D-6: Skill lahir DRAFT, tanpa baris `TODO` (banner 3 baris seperti `caf-traceability`). Penunjuk di `## Skills` baru ada setelah manusia menghapus banner.
- D-7: Aturan inti ada di `## Output` Planner (tracked, ikut sync), bukan hanya di skill, karena skill tidak ikut sync dan masih DRAFT. Skill memuat format dan rincian.

## Constraints
- `## Output` Planner: hanya tiga baris langkah Plan yang diganti. Tidak ada heading baru, tidak ada kata `TODO`, tidak ada nilai status/verdict baru. Semua bagian lain Planner, `tools:` dan `## Allowed Tools` byte-identik dengan render sebelum tiket (`test/fixtures/pre-sdd05a/`, direkam sebelum perubahan, tidak boleh di-regenerate).
- Teks skill diambil verbatim dari `caf-design.skill.md` di folder tiket ini; jangan diparafrasa di `skill-md.js`. Ditahan lewat sha256.
- Skill tidak boleh mendefinisikan format atau kata status laporan (verify-report, validate-report, review-notes, qa-report), tidak boleh berkata "tunggu konfirmasi", dan tidak dipetakan ke kind selain `planner`. Ini pengecualian sempit ketiga (setelah `caf-spec`/`caf-traceability`): skill mendefinisikan format artefak `design.md` saja.
- `curate sync` tetap hanya menulis `DRIFT`. Tidak ada jalur tulis baru, tidak ada perubahan `## Skills` menjadi syncable, tidak ada penulisan frontmatter.
- Perintah (`/caf-run`) tidak dilacak dan tidak sampai ke repo lama; jangan menyebut perubahannya "sampai lewat sync".
- Snapshot `mono-pnpm.json` hanya boleh berubah pada entri berkas yang disebut di AC (`caf-planner.md`, `caf-run.md`, dan README tugas bila ia ada di snapshot). Dicatat di `verify-report.md`; bukan preseden.
- Tidak ada panggilan model, tidak ada dependency baru.

## Open questions
Tidak ada.

## Acceptance criteria
- AC-1: When `caf-init scaffold skills` runs on a repo, then `.claude/skills/caf-design/SKILL.md` is written with frontmatter `name: caf-design` and a `description`, and starts with the 3-line DRAFT banner (`hasSkillDraftBanner` true, `hasSkillDraftAgentNotice` true) and contains no line that starts with the to-do word (`countOpenSkillTodos` is 0).
  Verify: automated test — `test/sdd05a-caf-design.test.js` (render lewat `buildSkillFiles`; entri `caf-design` ada di urutan `SKILL_NAMES`, `draft: true`).
- AC-2: When the body of `.claude/skills/caf-design/SKILL.md` is compared with the body of `caf-design.skill.md` of this ticket, then it is identical except for the banner lines.
  Verify: automated test — sha256 dari teks tanpa banner ditahan di test.
- AC-3: When `SKILLS_BY_KIND` is read, then `caf-design` appears for `planner` and for no other kind, and `skillsForKind('planner')` still lists `caf-scope-discipline`, `caf-no-guess`, `caf-spec`, `caf-traceability` in their previous order.
  Verify: automated test — asersi pada tabel dan urutan.
- AC-4: When a planner agent is generated while `caf-design` still has its banner, then its `## Skills` section contains no pointer to `caf-design`; when the banner is removed from the file, `usableSkillPaths('planner')`-based generation adds the pointer.
  Verify: automated test — dua render, satu dengan banner, satu setelah banner dihapus pada fixture skill.
- AC-5: When the rendered text of `caf-design` is checked, then it names none of the status or verdict words (`SUCCESS`, `NEEDS_HUMAN`, `PASS`, `FAIL`, `UNVERIFIED`, `APPROVE`, `CHANGES REQUESTED`, `DEFER`), does not tell the reader to wait for confirmation, and is not in the skills mapped to any kind other than `planner`.
  Verify: automated test — asersi regex pada teks skill dan pada `SKILLS_BY_KIND`.
- AC-6: When a planner is rendered, then `### 3. Plan` of its `## Output` holds exactly the six lines of `tasks.md` T3 (verbatim) in place of the previous three, contains no `###` heading that was not there before, and contains no `Architect` pointer.
  Verify: automated test — baris ditahan verbatim di test; heading dihitung.
- AC-7: When a planner is rendered, then every line outside those lines is byte-identical to `test/fixtures/pre-sdd05a/` (planner `## Input`, `## Constraints`, `## Allowed Tools`, frontmatter, and the rest of `## Output`).
  Verify: automated test — perbandingan dengan golden; golden direkam dari kode sebelum perubahan.
- AC-8: When a planner is rendered, then the word `TODO` does not appear in the changed lines and `check-drafts` counts the same number of open `TODO` lines for the planner as before.
  Verify: automated test — asersi pada baris dan pada hitungan `check-drafts` fixture.
- AC-9: When an `architect` agent is rendered (all sections, frontmatter, picker offer), then it is byte-identical to the render before this ticket, and `architect` is not in `SUPERSEDED_CANDIDATE_KINDS` or `HIDDEN_CANDIDATE_KINDS`.
  Verify: automated test — golden `frozen-kinds` yang ada tetap lulus tanpa perubahan; asersi daftar kind.
- AC-10: When a repo holds a planner generated before this ticket (baseline recorded) and `curate sync` runs, then `## Output` is reported as `DRIFT` and rewritten with the new Plan step, and the file differs from before only inside `## Output`; when its `## Output` was edited by hand, it is `CONFLICT` and the file is unchanged byte for byte.
  Verify: automated test — `makeOldRepo` dengan planner lama; asersi `DRIFT`/`CONFLICT` dan "file unchanged after sync" byte demi byte pada kasus CONFLICT.
- AC-11: When `curate audit` runs on a repo whose planner lacks the `caf-design` pointer and the skill file has no banner, then one `skill-pointer` warning names `.claude/skills/caf-design/SKILL.md`; with the banner still present, no such warning appears.
  Verify: automated test — dua kasus; kode keluar dan hitungan lain tidak berubah.
- AC-12: When `/caf-run` is rendered with an Architect in the roster, then the Architect stage says to skip it when `.caf/tasks/{TICKET-ID}/design.md` already exists and to note the reason in the final summary, and the previous spawn criteria are kept in the text.
  Verify: automated test — asersi kalimat baru dan kalimat lama pada render `hasArchitect: true`.
- AC-13: When `/caf-run` is rendered without an Architect in the roster, then the stop-and-report paragraph no longer says the ticket "should go through Architect first"; it says that `design.md` is written by the Planner and, when the ticket meets the criteria and none exists, the run stops and reports that to the user.
  Verify: automated test — asersi pada render `hasArchitect: false`.
- AC-14: When `/caf-run` is rendered, then everything outside those two Architect-stage paragraphs is byte-identical to `test/fixtures/pre-sdd05a/` (render dari kode sebelum perubahan).
  Verify: automated test — perbandingan dengan golden; berkas dipindahkan dari daftar "identical" test lama dan itu dicatat di `verify-report.md`.
- AC-15: When `.caf/tasks/README.md` is generated, then its artifact list names the Planner (not the Architect) as the writer of `design.md` and says it is written only when the change meets the design criteria.
  Verify: automated test — asersi pada render `buildTasksReadme`; sisa teks identik dengan golden.
- AC-16: When the verification gate runs, then `npm test` passes, the `pre-sdd05a` goldens and every older golden are unchanged, and `mono-pnpm.json` differs only in the entries named in Constraints.
  Verify: command: `npm test` | expect: exit 0
- AC-17: When `CLAUDE.md` is read, then it has a section for CAF-SDD-05a that states: the skill is born DRAFT and planner-only; the rule lives in `## Output` and in the skill; `design.md` rides the spec gate and needs no orchestrator change; `architect` stays until a follow-up; the rollout (curate sync carries `## Output`; remove the banner and add the `## Skills` pointer by hand after a dispatch test); and that `pre-sdd05a/` is never regenerated.
  Verify: manual — baca section; tiap butir di atas ada.

## Notes for reviewer
- Dispatch test nyata (planner pada tiket multi-app dan tiket satu-app) dilakukan manusia setelah merge; hasilnya menentukan penghapusan banner dan nasib `architect`. Tiket ini tidak mengklaim skill sudah terbukti.
