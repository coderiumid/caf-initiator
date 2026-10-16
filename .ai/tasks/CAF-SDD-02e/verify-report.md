# Verify Report — CAF-SDD-02e

Status: SUCCESS

Branch `ai-agent/CAF-SDD-02e`, 5 commit lokal di atas main (62829d7). Tidak ada push, PR, merge
atau publish. `curate sync` hanya dijalankan test pada salinan fixture di direktori sementara.

## Checklist
- [x] syarat mulai: `Status: APPROVED`, Q-1..Q-3 ber-Answer, main bersih dan sejajar origin (0/0), merge 43ac420 (02c), fb4b439 (03d), 62829d7 (02d) ada
- [x] `npm test` sebelum mulai: 627 total, 626 lulus, 0 gagal, 1 todo
- [x] `npm test` akhir: 660 total, 659 lulus, 0 gagal, 1 todo, exit 0
- [x] lint / typecheck / build: tidak ada di `package.json` (hanya `npm test`)
- [x] T1 sampai T8
- [x] classifier izin: tidak ada langkah yang diblokir

## Acceptance Criteria
Semua test di `test/sdd02e-planner-read.test.js`; `<fixture>` = mono-pnpm dan single-nuxt.
- AC-1: automated-test — test/sdd02e-planner-read.test.js::AC-1: planner on <fixture> — a Finding or an AC about a behavior comes from a file read in this run; CLAUDE.md, an ADR and a Glob name are pointers
- AC-2: automated-test — test/sdd02e-planner-read.test.js::AC-2: planner on <fixture> — a fact Read/Glob/Grep can answer is read before any artifact is written and never handed on to the implementer
- AC-3: automated-test — test/sdd02e-planner-read.test.js::AC-3: planner on <fixture> — no sentence that puts a reading off, stated by intent; readable is read, a human decision is a question (lihat Keputusan 1)
- AC-4: automated-test — test/sdd02e-planner-read.test.js::AC-4: planner on <fixture> — an unsourced claim is `Assumption A-n:` with its basis; a word of doubt only on an assumption line
- AC-5: automated-test — test/sdd02e-planner-read.test.js::AC-5: planner on <fixture> — a `Finding:` holds only what was observed; a conclusion or a prediction is an assumption
- AC-6: automated-test — test/sdd02e-planner-read.test.js::AC-6: planner on <fixture> — the same list, number or term everywhere, and the files written are read again before the run ends
- AC-7: automated-test — test/sdd02e-planner-read.test.js::AC-7: planner on <fixture> — where a path or a symbol name may be written (Q-3), and one AC is one observable behavior
- AC-8: automated-test — test/sdd02e-planner-read.test.js::AC-8: planner on <fixture> — a `tasks.md` that holds tasks ends with `## Coverage`, every AC in it (Q-2)
- AC-9: automated-test — test/sdd02e-planner-read.test.js::AC-9: planner on <fixture> — the ADRs related to the ticket are read and named in a Finding; a Glob result of mostly node_modules is narrowed
- AC-10: automated-test — test/sdd02e-planner-read.test.js::AC-10: planner on <fixture> — the planner's rules win over the open-item line of `caf-no-guess` (Q-1 a)
- AC-11: automated-test — test/sdd02e-planner-read.test.js::AC-11: planner on <fixture> — outside `## Output` the file is the pre-ticket golden byte for byte; juga AC-11: … inside `## Output` only the rules of this ticket are new, and only the 02d "not read yet" rule is gone; dan AC-11: `caf-spec` and `caf-no-guess` are the files of before this ticket (sha256)
- AC-12: automated-test — test/sdd02e-planner-read.test.js::AC-12: <fixture> — sync writes `## Output` of the 02d planner, nothing else in it, and no other agent file; juga varian "a planner whose Output the user customized is not overwritten" dan "a customized Input is left alone …, while Output is synced"
- AC-13: manual — `git diff main -- test/fixtures/snapshots/mono-pnpm.json`: 1 baris berubah, entri `.claude/agents/caf-planner.md`, cocok dengan T1 butir 5. Skrip regenerasi membandingkan dulu (stack sama, daftar kunci sama, tepat satu entri beda) sebelum menulis.
- AC-14: command — `npm test` | exit 0 (660 total, 659 lulus, 0 gagal, 1 todo); `git diff --stat main -- test/fixtures/frozen-kinds/` | kosong. Test `todo` masih ada: test/kind-guard.test.js "AC-7: an unknown kind (caf-foo.md) is not treated as implementation …".
- AC-15: manual — README: daftar "The generated Planner" (enam butir baru menggantikan butir "not read yet") dan paragraf tentang dua skill di bawahnya; tabel rollout sudah menyebut `## Output` lewat `curate sync`. CLAUDE.md: paragraf "Since CAF-SDD-02e …" dan butir 02d yang diperbarui.

## T1 — audit baca-saja (sebelum `src/` disentuh)
1. Teks planner: `PLANNER_SPEC_WORKFLOW` (`src/templates/agent-md.js`) dirender di `## Output`; `## Input` dari `buildInputSection('planner')`. Render kedua fixture identik.
2. Aturan 02d yang terkait: blok empat baris di `### 1. Specify` (baca fakta dulu; tanpa catatan "not read yet"; yang tak terjawab jadi `Finding:` yang menyebut "what is not known"). Aturan placeholder (`Tidak ada`) tidak bersinggungan dengan AC mana pun dan tidak diubah.
3. Kontradiksi: kalimat ketiga blok itu ("a `Finding:` that says … what is not known") bertentangan dengan AC-3 (tak ada kalimat "belum diketahui") dan AC-5 (Finding hanya pengamatan). A2 dan T1 sudah menyebut aturan ini "diperluas atau diganti", jadi diselesaikan dengan mengganti blok itu, bukan STOP. Lihat Keputusan 1.
4. `## Input` tidak perlu berubah: ia hanya menyebut `## Frontend Tasks`/`## Backend Tasks`, dan `## Coverage` ditambahkan dari `### 4. Tasks` di Output. `## Constraints` tidak tersentuh; catatan blocked ticket run tidak berisi tugas, jadi tidak kena aturan coverage.
5. Golden dan test yang memuat teks planner: `pre-sdd02/`, `pre-sdd02b/`, `pre-sdd02c/`, `pre-sdd02d/` (tidak diregenerasi), dan `snapshots/mono-pnpm.json` entri `.claude/agents/caf-planner.md` (satu-satunya entri terdampak). `frozen-kinds/` tidak punya golden planner (15 berkas, tanpa kata "planner").
6. `curate --check-drafts` menghitung `\bTODO\b` per berkas agent (`src/commands/check-drafts.js:312`). Aturan baru tidak memuat kata itu; test membandingkan jumlahnya dengan golden.
7. Batasan dari test lama yang dipatuhi: tidak ada heading `###` baru, tidak ada baris berawalan `## `, tidak ada literal "Decisions Already Made"/"Constraints and Assumptions" di Output.

## Commit
- 2318b75 Record the pre-SDD-02e planner render as a golden (CAF-SDD-02e)
- 1c933da Add failing tests for the planner that reads what it claims (CAF-SDD-02e)
- 468ea82 Make the planner read what it claims, without putting it off or guessing (CAF-SDD-02e)
- 8d2bbef Regenerate the MONOREPO snapshot for the planner that reads what it claims (CAF-SDD-02e)
- 34858c1 Document the planner that reads what it claims and its rollout (CAF-SDD-02e)

## git diff --stat main
```
 CLAUDE.md                                         |  44 ++-
 README.md                                         |   9 +-
 src/templates/agent-md.js                         |  52 ++-
 test/fixtures/pre-sdd02e/planner.mono-pnpm.json   |  19 +
 test/fixtures/pre-sdd02e/planner.single-nuxt.json |  19 +
 test/fixtures/snapshots/mono-pnpm.json            |   2 +-
 test/sdd02d-planner-audit.test.js                 |  25 +-
 test/sdd02e-planner-read.test.js                  | 406 ++++++++++++++++++++++
 8 files changed, 561 insertions(+), 15 deletions(-)
```

## Test lama yang diubah
Hanya `test/sdd02d-planner-audit.test.js`, dua test (masing-masing per fixture):
- "AC-1: … a fact Read/Glob/Grep can answer is read first …": blok empat baris 02d kini dicek pada render 02d (`pre-sdd02e/`), dan pada render hidup dicek bahwa kalimat pertamanya masih di posisi yang sama. Alasan: blok itu diganti tiket ini.
- "AC-8: … inside the two sections only the rules of this ticket …": delta 02d dibandingkan pada render 02d, ditambah cek bahwa dari blok 02d hanya blok itu yang hilang di render hidup. Alasan: Output hidup kini memuat baris 02e.
Test 02, 02b, 02c tidak diubah dan tetap lulus.

## Snapshot
`test/fixtures/snapshots/mono-pnpm.json`: satu entri, `.claude/agents/caf-planner.md`.

## Hal tak terduga
- Tidak ada langkah yang diblokir, tidak ada entri snapshot di luar daftar.
- `caf-spec` berbeda dari aturan baru di dua titik kecil (definisi agent menang, skill tidak diubah): templatenya menulis `Assumption:` tanpa nomor, dan mengizinkan tiket refactor menyebut artefak di AC.
- Tidak ada kode di repo ini yang membaca `tasks.md`; pembaca di luar repo (agent implementasi, orchestrator) belum tahu tentang `## Coverage`.

## Keputusan yang perlu dijawab manusia
1. Blok 02d "yang tak terjawab ditulis sebagai `Finding:` yang menyebut apa yang tidak diketahui" dihapus, bukan dipertahankan. Kini: klaim tanpa sumber menjadi `Assumption A-n:` beserta dasarnya, atau pertanyaan. Ini mengikuti A2 ("menggantikan"), tetapi bersinggungan dengan constraint "aturan 02d tetap". Setuju, atau kalimat itu harus kembali dalam bentuk lain?
2. Aturan Q-3 ditulis mutlak ("never … in the `When ... then` sentence"), sedangkan `caf-spec` memberi pengecualian untuk tiket refactor/config. Biarkan mutlak, atau pengecualian itu disebut juga di planner?
