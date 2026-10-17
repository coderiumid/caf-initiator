# CAF-SDD-11 — Aturan bahasa artefak Planner (caf-initiator)
Status: APPROVED
Source: backlog SDD ("aturan bahasa artefak planner"), disetujui Ganjar 17 Okt

## 1. Outcome
Planner menulis prosa artefak (`requirements.md`, `tasks.md`, `design.md`, `breakdown.md`) dalam bahasa tiket, sementara kata struktural yang dibaca mesin atau dipakai agent lain tetap persis seperti template. Hasilnya konsisten di repo berbahasa Indonesia maupun Inggris, tanpa konfigurasi.

## 2. Scope
In:
- Satu aturan di `## Output` planner (bagian `### 1. Specify` dari `PLANNER_SPEC_WORKFLOW`), tracked dan ikut `curate sync`.
- Test, golden `pre-sdd11/`, helper `since-11`, bagian `CLAUDE.md`.
Out:
- Artefak agent lain (`verify-report.md`, `validate-report.md`, `review-notes.md`, `fix-review-log.md`): bahasanya tidak diatur tiket ini.
- Skill (`caf-spec`, `caf-design`, `caf-breakdown`: tidak berubah; teks hash-nya sudah memuat `Tidak ada`), konfigurasi bahasa per repo, terjemahan penanda, orchestrator.
- Teks agent/skill/command yang digenerate `caf-init` (tetap Inggris).

## 3. Constraints and Assumptions
- Finding: satu-satunya aturan bahasa sekarang adalah satu baris di skill `caf-spec` ("Write the spec content in the language the ticket is written in"). `## Output` planner tidak punya aturan bahasa, dan skill belum tentu dibaca (pointer hanya bila skill aktif dan dicantumkan).
- Finding: penanda section kosong `Tidak ada` adalah literal Indonesia di planner (`PLANNER_SPEC_WORKFLOW`) dan di `caf-design`/`caf-breakdown`; spec CAF-SDD-10 menjadikan `caf-spec` sama.
- Finding: kata struktural yang dipakai agent lain atau orchestrator: `Status:` dan nilainya, `AC-n:`, `Verify:` dan tiga bentuknya (`automated test`, `command: ... | expect: ...`, `manual:`), `Finding:`, `Assumption A-n:`, `BLOCKING`/`NON-BLOCKING`, `Answer:`, `Q-n`, `## Coverage`, `## Frontend Tasks`/`## Backend Tasks`, `## Proposed Spec Changes`, judul section template.
- Finding: orchestrator menyembunyikan nilai `Proposed Spec Changes:` yang bernilai `none`/`n/a`/`-`/`tidak ada` (04b), jadi literal `Tidak ada` kompatibel; task-router membaca judul `## Frontend Tasks`/`## Backend Tasks`, jadi judul tidak boleh diterjemahkan.
- Constraint: aturan memakai niat, bukan daftar kata terlarang (pelajaran 02d→02e); hanya satu daftar pendek token tetap yang disebut.
- Constraint: tidak ada kata `TODO`, tidak ada heading `###` baru, tidak ada nilai status baru; satu aturan utuh di dalam langkah yang sudah ada.
- Assumption A-1: "bahasa tiket" cukup ditentukan dari deskripsi tiket (atau pesan pengguna bila dari chat); tidak perlu deteksi otomatis. Dasar: planner adalah model yang membaca tiket. Tidak diuji otomatis; dicek di dispatch (manual).
- Assumption A-2: tidak ada test lama yang melarang kalimat baru di Specify selain test yang menghitung baris `## Output` (02d/02e/05b/06 memegang daftar baris dan gagal pada baris baru lain). T1 memetakannya; yang perlu daftar baris baru memakai helper `since-11`.

## 4. Decisions Already Made
- D-1 (Ganjar, 17 Okt): aturan dikunci di planner, tanpa konfigurasi per repo.
- D-2 (konsultan; Ganjar boleh ubah): `Tidak ada` tetap literal di semua bahasa, diperlakukan sebagai token seperti `Status:`.
- D-3 (konsultan): pertanyaan di `## 5. Open Questions` (yang dikirim orchestrator ke komentar tiket) ikut bahasa tiket; token `Q-n`, `[BLOCKING]`, `Answer:` tetap.
- D-4: nama path, simbol, perintah, dan kutipan teks tiket ditulis apa adanya.

## 5. Open Questions
Tidak ada

## 6. Acceptance Criteria
- AC-1: When `caf-planner.md` is rendered (both fixtures), then `### 1. Specify` of its `## Output` contains the language rule: prose of the four artifacts follows the language of the ticket description (or of the chat request); the fixed words stay as the templates show them (section headings, `Status:` and its values, `AC-n:`, `Verify:` and its forms, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`, `Answer:`, `Tidak ada`); paths, symbols, commands and quoted ticket text are written as they are. Verify: automated test: `test/sdd11-planner-language.test.js` holds the added lines verbatim.
- AC-2: When the rendered planner is compared with `test/fixtures/pre-sdd11/`, then the only difference is the added lines, in both fixtures, and `tools:` and every other section are byte-identical. Verify: automated test: `test/sdd11-planner-language.test.js`.
- AC-3: When any other kind is rendered, then its `## Output` is byte-identical to before. Verify: automated test: `test/sdd11-planner-language.test.js` against `pre-sdd11/`.
- AC-4: When the added lines are read, then they hold no `TODO`, no `###` heading, no `## ` line, no new status value, and do not list words to avoid. Verify: automated test: `test/sdd11-planner-language.test.js`.
- AC-5: When `curate sync` runs on a repo whose planner was generated before this ticket and not edited, then `## Output` is `DRIFT` and is carried, with no other section changed; when `## Output` was edited by hand, then it stays `CONFLICT` and the file is unchanged. Verify: automated test: `test/sdd11-planner-language.test.js` (byte comparison for the unchanged case).
- AC-6: When the three planner skills (`caf-spec`, `caf-design`, `caf-breakdown`) are rendered, then they are unchanged by this ticket. Verify: automated test: existing sha256 checks (the `caf-spec` hash is the v4 one from CAF-SDD-10).
- AC-7: When `npm test` runs, then it exits 0, older tests that hold the planner `## Output` are changed only through `test/helpers/since-11.js` (goldens untouched), and the test count does not decrease. Verify: command: `npm test` | expect: exit code 0; the report lists the tests changed.
- AC-8: When a maintainer reads `CLAUDE.md`, then a paragraph describes the rule, the fixed words, D-2, the rollout (`curate sync` carries `## Output`; nothing else to do) and that the artifacts of other agents are out of scope; the sentence that listed the language of the planner's artifacts as out of scope is updated. Verify: manual: read it.
- AC-9: When a real dispatch runs the planner on one Indonesian ticket and one English ticket, then the prose follows the ticket language and every fixed word is unchanged. Verify: manual: dispatch by Ganjar (executor reports UNVERIFIED).

## Coverage
AC-1 → T2, T3; AC-2 → T3, T4; AC-3 → T4; AC-4 → T3; AC-5 → T4; AC-6 → T4; AC-7 → T5; AC-8 → T5; AC-9 → T5 (note only).