Status: SUCCESS

# Verify Report — CAF-SDD-02c (revisi 2)

Branch `ai-agent/CAF-SDD-02c`, tiga commit lokal di atas `main` (`8b30ec8`). Tidak ada push, PR, atau merge.
- `3178bb7` Record the pre-SDD-02c planner render as a golden
- `5fd5e6e` Activate caf-spec and give the planner Glob, Grep and two spec rules
- `ffe3398` Document the active caf-spec, the planner tools and the manual rollout steps

## Quality Gate
- `npm test`: exit 0. 529 test, 528 lulus, 0 gagal, 1 `todo` (yang memang harus ada, lihat AC-8).
- Repo ini tidak punya lint, typecheck, atau build di `package.json`.

## Acceptance Criteria
Test baru semuanya di `test/sdd02c-spec-active.test.js` (26 test).
- AC-1: automated-test — test/sdd02c-spec-active.test.js::"AC-1: caf-spec is the final v3 source byte for byte (sha256), 77 lines, no DRAFT banner; caf-traceability keeps its 3-line banner" dan "AC-1: scaffold skills in an empty test repo writes that caf-spec, and caf-traceability with its banner"
- AC-2: automated-test — test/sdd02c-spec-active.test.js::"AC-2: planner on <fixture> — `## Skills` has three imperative Read pointers, check-drafts has no new FAIL" (kedua fixture) dan "AC-2: caf-spec is pointed at by the planner only, and no kind is pointed at caf-traceability"
- AC-3: automated-test — test/sdd02c-spec-active.test.js::"AC-3: frontmatter `tools:` on <fixture> match the literal table; ...", "AC-3: planner on <fixture> — `## Allowed Tools` lists the four tools, Glob and Grep read-only", "AC-3: `## Allowed Tools` of every other kind is what it was before this ticket"
- AC-4: automated-test — test/sdd02c-spec-active.test.js::"AC-4: planner on <fixture> — read the files that already exist before writing", "AC-4: ... an approved spec is not written: proposal in verify-report.md, stop with NEEDS_HUMAN", "AC-4: ... the new text adds no section boundary, no TODO, no heading"
- AC-5: automated-test — test/sdd02c-spec-active.test.js::"AC-5: planner on <fixture> — outside the tools line, two lines of `## Allowed Tools` and the two new rules, the file is the pre-ticket golden byte for byte" (golden `test/fixtures/pre-sdd02c/`)
- AC-6: automated-test — test/sdd02c-spec-active.test.js::"AC-6: <fixture>, the 02b planner — sync writes `## Output` and `## Allowed Tools`; `## Skills`, the frontmatter and every other agent stay", sama untuk "the SDD-02 planner", "AC-6: ... a planner whose Output and Allowed Tools the user customized is not overwritten", "AC-6: ... a customized Output stays the user's while the untouched Allowed Tools is synced"
- AC-7: manual — sudah dijalankan: snapshot diregenerasi dari `renderMonoSnapshot()`; dibandingkan per entri sebelum ditulis: `stack` sama, daftar 13 kunci sama, satu entri berbeda: `.claude/agents/caf-planner.md`. `git diff --stat` snapshot: 1 baris berubah. Cocok dengan T1(e). Tidak ada entri `caf-spec` di snapshot. Untuk diperiksa manusia: `git diff main..HEAD -- test/fixtures/snapshots/mono-pnpm.json`.
- AC-8: command — `npm test` | exit 0 (528 lulus, 0 gagal, 1 todo); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | kosong (0 baris). Test `todo` masih ada: test/kind-guard.test.js "AC-7: an unknown kind (caf-foo.md) is not treated as implementation ..." dilaporkan `# TODO`.
- AC-9: manual — sudah ditulis, perlu dibaca manusia: README bagian "DRAFT skills", "The Planner and `caf-spec`", "Getting this in a repository scaffolded earlier", dan paragraf `/caf-plan`; CLAUDE.md bagian "Skills" (tiga butir `caf-spec`/`caf-traceability`/skill lama), paragraf planner "Since CAF-SDD-02c ...", dan butir `/caf-plan`.

## Teks baru, dikutip persis

Rationale `## Allowed Tools` planner (K-1). Gaya mengikuti agent lain: tool, kegunaan, lalu batas "Does NOT ...":
```
The frontmatter `tools` above is the list that applies: `Read`, `Write`, `Glob`, `Grep`.

Read, Glob and Grep (read-only) for ticket/docs context and facts about the repo, Write for artifacts in `.caf/tasks/{TICKET-ID}/`. Does NOT touch code.
```
Frontmatter: `tools: [Read, Write, Glob, Grep]` (`Glob`, `Grep` ditambahkan di belakang; urutan AC-3).

Aturan (a), tiga baris pertama `### 1. Specify`:
```
- Before writing anything, read the files that already exist in the task folder:
  `requirements.md`, `tasks.md`, `verify-report.md`. A file that is there is the starting point;
  never write over one you have not read in this run.
```
Aturan (b), butir terakhir `### An approved spec is a contract`:
```
- Asked to change the content of a `requirements.md` that says `Status: APPROVED`: do not write
  `requirements.md`, not even its status line. Write the proposed change in `verify-report.md`
  under `## Proposed Spec Changes`, keeping what that file already holds, then stop with
  `Status: NEEDS_HUMAN`.
```
Tidak ada heading `###` baru; kedua aturan adalah baris utuh yang disisipkan.

## Batasan rollout (langkah manual di repo lama)
- `curate sync` menulis `## Output` dan `## Allowed Tools` planner sebagai `DRIFT` biasa.
- Frontmatter `tools:` tidak ditulis sync: ubah manual ke `tools: [Read, Write, Glob, Grep]`.
  Sampai itu dilakukan, `## Allowed Tools` planner hasil sync menyebut dua tool yang belum dimiliki.
- `## Skills` tidak ditulis sync, dan `scaffold skills` tidak mengedit agent yang sudah punya
  section itu: tambah pointer `caf-spec` manual.
- `caf-spec` yang sudah ada di repo tidak ditimpa: cabut banner manual, atau hapus file lalu
  jalankan `scaffold skills` lagi.
- Rilis npm masih menunggu CAF-SDD-04.
Semua ada di README dan CLAUDE.md.

## Test lama yang diubah, dengan alasan
- `test/sdd02b-spec-v3.test.js`
  - AC-1 (dua test): `caf-spec` tidak lagi berbanner. Hash 02b (`513407dd...`) tetap dipakai: test memasang kembali banner (`withBanner`) lalu membandingkan, jadi tetap membuktikan isi sama dengan source 02b. `draft` menjadi `false`, `drafts` tidak memuat `caf-spec`.
  - AC-4: nama dan isi. `caf-spec` kini ditunjuk planner saja; `caf-traceability` tetap tanpa pointer.
  - AC-6 "everything outside `## Output` ...": baris `tools:` dan `## Allowed Tools` dikembalikan ke nilai lama sebelum dibandingkan dengan golden `pre-sdd02b` (keduanya berubah karena K-1).
  - AC-8 (tiga test sync): `drifted` kini `Allowed Tools` + `Output`; file hasil sync = render baru dengan baris `tools:` lama. Pada test "Output dikustomisasi", `## Allowed Tools` yang tidak diedit kini ikut tersinkron, jadi assert "tidak ada file ditulis" diganti: Output milik pengguna tetap byte-for-byte, hanya `## Allowed Tools` yang berubah.
- `test/sdd02-planner-spec.test.js`
  - AC-5: `tools` planner menjadi `Read, Write, Glob, Grep`; perbandingan dengan golden `pre-sdd02` mengembalikan baris `tools:` dan `## Allowed Tools` lebih dulu.
  - AC-10 (tiga test sync): perubahan yang sama dengan AC-8 di 02b.
- `test/skills-spec.test.js`: `draft` `false`; test banner menjadi "tanpa banner"; AC-1 scaffold tanpa banner; AC-4 dibalik (planner mendapat pointer) dan ditambah kasus `caf-spec` lama yang masih berbanner tetap tanpa pointer. Konstanta `BANNER` dihapus (tidak terpakai).
- `test/skills-pointer.test.js`, `test/skills-scaffold.test.js`: daftar `drafts` tanpa `caf-spec`; pointer planner memuat `caf-spec`.
- `test/discovery-sections.test.js`: string golden `## Allowed Tools` planner diperbarui (K-1). Test ini tidak ada di daftar "boleh diperbarui" tasks.md, tetapi mengunci persis teks yang K-1 putuskan berubah. Baris `auditor` dan `devops` tidak disentuh.
- Golden `pre-sdd02`, `pre-sdd02b`, `frozen-kinds`, `legacy-manifest` tidak diubah.

## Snapshot
`test/fixtures/snapshots/mono-pnpm.json`: satu entri berubah, `.claude/agents/caf-planner.md` (baris `tools:`, dua baris `## Allowed Tools`, tujuh baris baru di `## Output`). Tidak ada entri tak terduga.

## Hasil T1
Tidak berubah dari laporan sebelumnya; ringkasnya ada di `requirements.md` revisi 2 (Finding render, Finding sync, A3, A4). Pointer muncul lewat `usableSkillPaths` (aturan banner), tidak ada hardcode; `SKILLS_BY_KIND` tidak diubah.

## Catatan dan hal tak terduga
- AC-6 diuji dari dua planner lama: golden `pre-sdd02c` (hasil 02b, sesuai teks AC-6) dan golden `pre-sdd02b` (hasil SDD-02, sesuai teks T3). Keduanya lulus.
- `/caf-plan`: README dan CLAUDE.md tadinya berkata "hidden sampai banner `caf-spec` dicabut". Kalimat itu diubah menjadi "banner sudah dicabut; tetap hidden sampai tiket yang menghubungkannya" supaya tidak bertentangan. Command tetap hidden, kode tidak disentuh.
- Aturan (b) berbunyi "stop with `Status: NEEDS_HUMAN`" seperti AC-4, tanpa menyebut di file mana status itu ditulis (planner dilarang menulis `requirements.md` pada kasus ini). Bila perlu dipertegas (misalnya di `verify-report.md`), itu tiket lanjutan; tidak ditebak di sini.
- `test/skills-templates.test.js` punya konstanta `BORN_DRAFT = ['caf-spec', 'caf-traceability']` dengan komentar yang kini usang untuk `caf-spec`. Test tetap lulus dan tidak disentuh (di luar daftar yang boleh diubah).
- Komentar kode di `skill-md.js` dan `agent-md.js` yang menyebut "caf-spec masih DRAFT" diperbarui. Itu bukan teks template.
- `.ai/` di-gitignore: laporan ini, `tasks.md` (T2 sampai T9 dicentang) dan source skill tidak ikut ter-commit.

## Proposed Spec Changes
-
