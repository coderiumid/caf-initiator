# Verify Report — CAF-SDD-02b

Ticket: CAF-SDD-02b — caf-spec v3 dan bentuk bukti `command`
Status: SUCCESS
Tanggal: 2026-10-12
Branch: `ai-agent/CAF-SDD-02b` (dari `main` 8877e55 = `origin/main`; SDD-02 ada di main: PR #18)
Commit: `8e248a6` (golden planner SDD-02, T2), `7d017ce` (fixture caf-spec v2), `89145cc` (implementasi). Lokal saja: tidak di-push, tidak ada PR, tidak di-merge.

## Ringkasan

- `caf-spec` = `caf-spec.source.v3.md` byte-identik (sha256 `513407dd…`), 80 baris, banner DRAFT 3 baris.
- `caf-traceability` = `caf-traceability.source.v2.md` byte-identik (sha256 `a1a89ede…`), 42 baris, banner DRAFT.
- Format verify-report (`agent-handoff.md`): bentuk bukti kelima `command — <command> | <exit code or output observed>`, di urutan kedua (sama dengan urutan skill).
- Planner `## Output`: tiga butir saja (fakta vs pertanyaan + maksimal 5 di file, tag dipertahankan, tiga bentuk `Verify:`). Di luar `## Output` tidak ada satu byte pun berubah.
- Banner tidak dicabut, tidak ada pointer `## Skills` baru.

Satu hal diputuskan Ganjar di tengah pengerjaan: satu test SDD-02 di luar pengecualian T4/T5 diizinkan diubah (lihat "Test lama yang diubah" no. 2).

## Attempt Log

1. Persiapan: `git log main` memuat merge SDD-02 (8877e55, a0b78f0); working tree bersih; `origin/main` = `main`. Empat file tiket sudah ada di `.ai/tasks/CAF-SDD-02b/`, dibaca habis, juga verify-report SDD-02. Baseline `npm test`: 313 test, 312 lulus, 1 todo.
2. T1 audit baca-saja (hasil di Catatan).
3. T2: skrip sekali pakai di scratchpad (menolak menimpa) menulis `test/fixtures/pre-sdd02b/planner.{mono-pnpm,single-nuxt}.json`; isi sama dengan entri snapshot saat itu. Di-commit lebih dulu (`8e248a6`). Render `caf-spec` v2 juga direkam sebelum `src/` diubah (`7d017ce`), dipakai test AC-3.
4. T3: `test/sdd02b-spec-v3.test.js`. Merah: 24 test, 20 gagal.
5. T4/T5: kedua sumber disematkan ke `skill-md.js` oleh skrip (escape backtick saja, banner diganti konstanta bersama); sha256 cocok. `skills-spec.test.js` ternyata tidak perlu diubah.
6. T6: planner `## Output` dan format verify-report. Test SDD-02 "four forms" gagal; pengerjaan dihentikan dan ditanyakan ke Ganjar; jawaban: izinkan ubah test itu.
7. T7: skrip regenerasi dengan daftar izin dua entri (berhenti bila entri lain, `stack`, atau urutan kunci berbeda). Hasil: tepat dua entri.
8. T8 `npm test` hijau. T9 CLAUDE.md dan README. T10 laporan ini.

## Acceptance Criteria

Semua test di `test/sdd02b-spec-v3.test.js` kecuali disebut lain; "(2 fixture)" = `mono-pnpm` dan `single-nuxt`.

- AC-1: automated-test — test/sdd02b-spec-v3.test.js::"AC-1: caf-spec is the v3 ticket source verbatim (sha256), 3-line DRAFT banner, at most 90 lines" dan ::"AC-1: scaffold skills in an empty test repo writes caf-spec identical to the v3 source". Kode: `src/templates/skill-md.js:263`
- AC-2: automated-test — ::"AC-2: caf-spec has `Finding:` in section 3 and the three `Verify:` forms" dan ::"AC-2: caf-spec says no line numbers, a fact from the code is not a question, an answered question keeps its tag"
- AC-3: automated-test — ::"AC-3: a repo that already has the older caf-spec keeps it; --dry-run reports the same list as the write path — <fixture>" (2 fixture; file lama = `test/fixtures/pre-sdd02b/caf-spec.v2.SKILL.md`)
- AC-4: automated-test — ::"AC-4: caf-traceability is the v2 ticket source verbatim (sha256), has the `command` form, DRAFT banner, at most 90 lines" dan ::"AC-4: no agent points at caf-traceability (or caf-spec) while the banner is there". Hash yang sama juga di test/sdd02-planner-spec.test.js::"AC-7: caf-traceability is the ticket source verbatim, at most 90 lines, registered once". Kode: `src/templates/skill-md.js:354`
- AC-5: automated-test — ::"AC-5: verify-report format — five evidence forms per AC: automated-test, command, build-only, manual, none" (juga membandingkan kelima bentuk dengan isi skill `caf-traceability`) dan ::"AC-5: verify-report format — \"Proposed Spec Changes\" is still there and the Status line still reads right for caf-orchestrator". Test SDD-02 untuk baris Status (test/sdd02-planner-spec.test.js::"AC-6: verify-report format — the Status line keeps its shape and still reads right for caf-orchestrator") lulus tanpa diubah. Kode: `src/templates/agent-handoff-md.js:73-90`
- AC-6: automated-test — ::"AC-6: planner on <fixture> — what the code answers is a fact, at most 5 questions in the file, an answered question keeps its tag", ::"AC-6: planner on <fixture> — `Verify:` may be `command:`", ::"AC-6: planner on <fixture> — everything outside `## Output` is byte-identical to the SDD-02 render" (2 fixture; render baru dengan `## Output` dikembalikan ke isi golden = golden byte-identik). Kode: `src/templates/agent-md.js:579-582, 589-595`
- AC-7: manual — `git diff main..HEAD -- test/fixtures/snapshots/mono-pnpm.json`: 2 baris diganti (`.caf/workflows/agent-handoff.md`, `.claude/agents/caf-planner.md`), cocok dengan daftar T1. Skrip regenerasi melaporkan `changed: ['.caf/workflows/agent-handoff.md', '.claude/agents/caf-planner.md']` dan akan berhenti pada entri lain. test/repo-context.test.js "regression: MONOREPO detection + every rendered file is byte-identical to the pre-change snapshot" lulus setelahnya
- AC-8: automated-test — ::"AC-8: <fixture> — the SDD-02 planner's `## Output` is synced to the new text, no other agent file changes", ::"AC-8: <fixture> — a planner whose Output the user customized is not overwritten", ::"AC-8: <fixture> — a customized Input stays the user's while the untouched Output is synced" (2 fixture)
- AC-9: command — `npm test` | exit 0 (`# tests 337, # pass 336, # fail 0, # todo 1`); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | keluaran kosong; todo fallback `implementation` masih ada di `test/kind-guard.test.js:117`
- AC-10: manual — dibaca: `CLAUDE.md:149-166` (v3, lima bentuk, bentuk `command`, banner sampai 02c, `writeIfAbsent`) dan `CLAUDE.md:268-271` (tiga aturan yang diulang di planner). Klaim lama "three other forms / four forms" diganti. `README.md:173-174, 192` diperbarui

Yang TIDAK dibuktikan: tidak ada dispatch agent sungguhan. Semua bukti adalah teks template dan perilaku CLI, bukan perilaku planner. Uji ulang v3 (vitest-merchant, kontrak spec APPROVED) di umkm-pos belum dijalankan; itu prasyarat 02c.

## Quality Gate

- `npm test`: exit 0. 337 test (313 lama + 24 baru), 336 lulus, 0 gagal, 1 todo.
- Lint, typecheck, build: tidak ada di `package.json`.
- 15 golden `test/fixtures/frozen-kinds/`: tidak tersentuh.
- Tidak diubah (`git diff --stat main..HEAD` kosong): `kind-guard`, `frozen-kinds`, `package-scripts`, `false-drift`, `retry-logic-role-aware`, `discovery-sections`, `skills-spec`, `skills-templates`, `skills-scaffold`, `skills-pointer`.
- `curate sync` dan `scaffold skills` hanya dijalankan di direktori sementara.
- CLI: `node src/index.js scaffold skills --dir <salinan mono-pnpm> --dry-run` melaporkan `would write 7 skill(s)` dan `caf-spec, caf-traceability: DRAFT`.

## Proposed Spec Changes

- T8 / larangan "test SDD-02 tidak diubah kecuali hash/isi skill": tambahkan test format verify-report SDD-02 ke daftar pengecualian. AC-5 (lima bentuk) tidak bisa dipenuhi selama test itu mengunci tepat empat baris.

## Catatan

### Hasil T1 (jawaban Q-1)

Ya, aturan yang sama disalin di lebih dari satu tempat. Peta:

| Tempat | Aturan yang dimuat | Tindakan |
|---|---|---|
| `src/templates/skill-md.js` `buildSpecSkill` | seluruh aturan spec | diganti v3 |
| `src/templates/skill-md.js` `buildTraceabilitySkill` | bentuk baris bukti | diganti v2 |
| `src/templates/agent-md.js` `PLANNER_SPEC_WORKFLOW` (planner `## Output`) | bentuk `Verify:` (Specify); "jangan tanya yang sudah terjawab" dan "at most 5 questions" (Clarify); `Verify: automated test` di Tasks | Specify dan Clarify diselaraskan; Tasks tidak berubah |
| `src/templates/agent-handoff-md.js` | skeleton empat baris bukti + prosa "four forms" | lima bentuk |
| `CLAUDE.md` bagian Skills | "three other forms", "same four forms" | diperbarui (T9) |
| `README.md` tabel skills | deskripsi saja, bukan salinan aturan | deskripsi diperbarui (T9) |
| `CAF.md:529-547` | format verify-report lain (sudah berbeda sebelum SDD-02) | tidak disentuh, di luar scope |
| `ticket-preview-commands.js`, `discovery-commands.js`, `run-pipeline-command.js`, `tasks-readme.js` | hanya menyebut "Open Questions" / "acceptance criteria" / nama file, bukan aturan v3 | tidak disentuh |

Entri snapshot yang terdampak menurut T1: `.claude/agents/caf-planner.md` dan `.caf/workflows/agent-handoff.md`. Skill tidak ada di snapshot. Tidak ada entri lain yang memuat salinan aturan.

### Entri snapshot yang berubah (T7)

Tepat dua, sama dengan daftar T1:
1. `.claude/agents/caf-planner.md`: hanya `## Output` (satu butir di Specify, tiga butir di Clarify).
2. `.caf/workflows/agent-handoff.md`: skeleton (baris `command`, penomoran contoh AC-2..AC-5 bergeser) dan satu paragraf penjelasan ("five forms", aturan `Verify: command:`).

`stack`, urutan kunci, dan 14 entri lain tidak berubah.

### Test lama yang diubah

1. `test/sdd02-planner-spec.test.js`, konstanta `TRACE_SOURCE_SHA256` dan komentarnya: hash sumber v1 diganti hash v2 (T5).
2. `test/sdd02-planner-spec.test.js`, test "AC-6: verify-report format — one evidence line per AC, in one of four forms": nama menjadi "five forms", daftar baris bukti 4 menjadi 5, regex "four forms" menjadi "five forms". Alasan: bertentangan langsung dengan AC-5. Ini bukan test hash/isi skill, jadi di luar pengecualian T4/T5; pengerjaan dihentikan dan Ganjar memilih "izinkan ubah test itu". Alternatif tanpa mengubah test (baris `command` dipisah baris kosong, prosa tetap "four forms") ditolak karena membuat teks format janggal dan urutannya beda dari skill.

`skills-spec.test.js` (disebut di T4) tidak perlu diubah: ia tidak mengunci hash, dan semua asersinya masih benar untuk v3.

### Hal tak terduga

1. **`Finding:` tidak disebut di planner.** Scope membatasi planner pada tiga butir. Teks planner berbunyi "a fact, written with the constraints and assumptions, never a question"; `Finding:` hanya ada di skill. Selama banner ada, planner tidak tahu bentuk `Finding:`. Bila diinginkan sebelum 02c, perlu tiket atau perluasan scope.
2. **Planner tidak bisa menyebut "section 3".** Test SDD-02 melarang judul section caf-spec disalin ke planner, jadi rujukannya "the constraints and assumptions" (huruf kecil), bukan nomor section.
3. **"Verify checklist of the repo".** Keputusan "perintah dibatasi pada Verify Checklist repo" ditulis di planner dengan kata-kata v3 ("a deterministic command from the verify checklist of the repo"). Planner punya `## Verify Checklist` sendiri (berisi cek dokumen, bukan lint/test), jadi frasa itu sengaja tidak menunjuk ke "this file".
4. **`agent-handoff.md` tidak punya sync** (sudah dicatat di SDD-02): repo lama tetap berformat empat bentuk sampai file dihapus dan `scaffold workflow` dijalankan lagi. Sama untuk skill (A2).
5. **Penomoran contoh di skeleton bergeser** (`build-only` AC-2 menjadi AC-3, dst.) karena `command` ditaruh kedua agar urutannya sama dengan skill; satu test baru membandingkan keduanya.
6. **Tiga aturan kini ada di dua tempat** (skill dan planner `## Output`). Tidak ada test yang membandingkan kalimatnya (kalimat planner bukan salinan harfiah); dicatat di CLAUDE.md sebagai "ubah bersama".
7. `.ai/` di-gitignore: laporan ini dan file tiket tidak ikut commit.
8. Dua commit persiapan, bukan satu: fixture `caf-spec` v2 direkam terpisah setelah golden planner, keduanya sebelum `src/` disentuh.

## git diff --stat (main..HEAD)

```
 CLAUDE.md                                         |  25 +-
 README.md                                         |   6 +-
 src/templates/agent-handoff-md.js                 |  16 +-
 src/templates/agent-md.js                         |  19 +-
 src/templates/skill-md.js                         |  36 +-
 test/fixtures/pre-sdd02b/caf-spec.v2.SKILL.md     |  74 ++++
 test/fixtures/pre-sdd02b/planner.mono-pnpm.json   |  17 +
 test/fixtures/pre-sdd02b/planner.single-nuxt.json |  17 +
 test/fixtures/snapshots/mono-pnpm.json            |   4 +-
 test/sdd02-planner-spec.test.js                   |  17 +-
 test/sdd02b-spec-v3.test.js                       | 438 ++++++++++++++++++++++
 11 files changed, 627 insertions(+), 42 deletions(-)
```

Status: SUCCESS
Test: 337 total, 336 lulus, 0 gagal, 1 todo (fallback `implementation`)
Commit: 8e248a6, 7d017ce, 89145cc
