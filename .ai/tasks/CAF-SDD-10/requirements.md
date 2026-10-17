# CAF-SDD-10 — `caf-spec` v4: selaraskan skill dengan aturan planner (caf-initiator)
Status: APPROVED
Source: backlog SDD (`caf-spec` v4), disetujui Ganjar 17 Okt

## 1. Outcome
Skill `caf-spec` tidak lagi bertentangan dengan `## Output` planner pada empat hal: penanda section kosong, penomoran asumsi, nilai `Status:`, dan pengecualian tiket refactor/config. Satu baris usang (`flow.md`) dibuang. Aturan "agent definition menang" tetap, tetapi tidak lagi dibutuhkan untuk empat hal itu.

## 2. Scope
In:
- Teks skill `caf-spec` (`buildSpecSkill`) menjadi v4: enam penggantian, persis seperti `caf-spec.skill.v4.md` di folder tiket (berkas itu adalah sumber; builder harus identik byte demi byte).
- Test lama yang mengunci teks v3 dibaca dari fixture v3, bukan dari builder hidup.
- Satu test baru, fixture v3, bagian `CLAUDE.md`.
Out:
- `## Output` planner dan semua template agent (tidak berubah satu byte pun).
- Skill lain (`caf-traceability`, `caf-design`, `caf-breakdown`, `caf-no-guess`, ...).
- Mekanisme sync skill (skill tetap ditulis sekali lewat `writeIfAbsent`).
- Aturan bahasa (CAF-SDD-11).

## 3. Constraints and Assumptions
- Finding: skill v3 menulis `-` untuk section kosong (bagian Size dan item 1 Check), padahal planner menulis `Tidak ada`; `CLAUDE.md` mencatat divergensi ini sebagai disengaja ("Don't fix the skills to match") sampai tiket ini.
- Finding: template skill berisi `Assumption: ...` tanpa nomor, planner menulis `Assumption A-n:`; template `Status:` skill memuat tiga nilai, planner empat (`NEEDS_HUMAN`).
- Finding: skill berkata tiket refactor/config boleh "menyebut artifact"; planner mempersempit menjadi: kalimat `When ... then` boleh menyebut path atau simbol yang menjadi subjek tiket dan tidak yang lain (03f).
- Finding: skill berkata "Ticket touches UI: screen flow and states go in `flow.md`"; `flow.md` dulu ditulis agent `ux-designer`, yang sudah tidak di-scaffold (03c1).
- Finding: teks skill dikunci sha256 di `test/sdd02b-spec-v3.test.js` (v3 dengan banner dikembalikan) dan `test/sdd02c-spec-active.test.js` (77 baris tanpa banner), dan dibaca oleh `test/skills-spec.test.js`, `test/skills-pointer.test.js`, `test/sdd02-planner-spec.test.js`.
- Constraint: tidak ada kata `TODO` di teks skill (dihitung `check-drafts`); batas panjang skill dalam test lama (≤ 90 baris) tetap berlaku (v4: 76 baris).
- Constraint: skill tidak boleh mendefinisikan report atau status verdict agent lain (pengecualian sempit `caf-spec` hanya untuk `requirements.md`).
- Assumption A-1: tidak ada test selain yang tersebut di atas yang membandingkan teks `caf-spec` dengan golden. Dasar: pencarian `buildSpecSkill`/`caf-spec` di `test/`. T1 mengonfirmasi dengan `grep` dan mencatat daftar akhir.
- Assumption A-2: golden lama yang memuat teks skill (mis. `pre-sdd03c2d/`, `pre-sdd03d/`) dibaca test lewat jalur render hidup untuk bagian lain, sehingga butuh helper `since-10` bila membandingkan seluruh berkas skill. T1 memastikan.

## 4. Decisions Already Made
- D-1 (Ganjar): penanda section kosong adalah `Tidak ada`, bukan `-`.
- D-2 (konsultan; Ganjar boleh ubah): baris `flow.md` dibuang tanpa pengganti; state UI ditulis sebagai AC biasa.
- D-3 (konsultan): empat penyelarasan lain mengikuti planner, karena planner adalah yang sudah teruji dispatch (02e, 03f).
- D-4: repo yang sudah punya skill v3 tidak berubah (`writeIfAbsent`); rollout = hapus `.claude/skills/caf-spec/SKILL.md` lalu `caf-init scaffold skills`. Tidak ada kode sync baru.

## 5. Open Questions
Tidak ada

## 6. Acceptance Criteria
- AC-1: When `buildSpecSkill()` is called, then the returned text equals `.ai/tasks/CAF-SDD-10/caf-spec.skill.v4.md` byte for byte (76 lines, one trailing newline). Verify: automated test: `test/sdd10-spec-v4.test.js` (sha256 of the source computed in T2 and held in the test).
- AC-2: When the v3 text recorded before the change is compared with the v4 text, then they differ in exactly these six places and nowhere else: the empty-section marker in Size, the `Status:` values in the template, the `Assumption A-1:` line, the refactor/config exception line, the removed `flow.md` line, the empty-section marker in the last check. Verify: automated test: `test/sdd10-spec-v4.test.js` applies the six replacements to the v3 fixture and compares with the live text.
- AC-3: When the skill text is read, then it contains no `` `-` `` empty-section marker, contains `Tidak ada` twice, and does not contain `flow.md`. Verify: automated test: `test/sdd10-spec-v4.test.js`.
- AC-4: When `test/fixtures/pre-sdd10/caf-spec.v3.SKILL.md` is read, then it is the v3 render recorded from the HEAD before any change (77 lines) and the hashes `SPEC_V3_SHA256` (with banner put back) and `SPEC_FINAL_SHA256` of the older tests still match it. Verify: automated test: the two older tests, changed only to read v3 from the fixture.
- AC-5: When the rendered planner (both fixtures) is compared with the render before this ticket, then it is identical, and so is every other file of `scaffold skills` except `.claude/skills/caf-spec/SKILL.md`. Verify: automated test: `test/sdd10-spec-v4.test.js` against the existing `pre-sdd06`/`pre-sdd07` planner goldens read through the existing since-helpers.
- AC-6: When `scaffold skills` runs in a repo that already has a v3 `caf-spec/SKILL.md`, then that file is not changed. Verify: automated test: `test/sdd10-spec-v4.test.js` (byte comparison before and after).
- AC-7: When `caf-traceability`, `caf-design`, `caf-breakdown` are rendered, then they are unchanged. Verify: automated test: the sha256 checks that already exist; no change to them.
- AC-8: When `npm test` runs, then it exits 0 and the number of tests does not decrease. Verify: command: `npm test` | expect: exit code 0; the report states the counts before and after.
- AC-9: When a maintainer reads `CLAUDE.md`, then the paragraph that said the skill and the planner differ on purpose (`-` vs `Tidak ada`, `Assumption:`, refactor exception) says they are aligned since this ticket, the section on `caf-spec` says v4, and the rollout step of D-4 is written. Verify: manual: read it (executor reports UNVERIFIED; Ganjar reads).

## Coverage
AC-1 → T2, T4; AC-2 → T2, T4; AC-3 → T4; AC-4 → T3; AC-5 → T4; AC-6 → T4; AC-7 → T3; AC-8 → T5; AC-9 → T5.