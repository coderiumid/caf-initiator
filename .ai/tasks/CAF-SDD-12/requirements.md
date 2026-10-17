# CAF-SDD-12 — Bahasa artefak Planner ditentukan prosa tiket, bukan kutipan (caf-initiator)
Status: APPROVED
Source: dispatch test umkm-pos 17 Okt (kasus B dan ulangan B2, B3, B4), disetujui Ganjar 17 Okt

## 1. Outcome
Planner menulis prosa artefak dan pesan akhirnya dalam bahasa yang dipakai penulis tiket pada judul dan kalimatnya, bukan bahasa string UI yang dikutip, isi kode, atau berkas yang dibaca. Tiket Inggris yang mengutip label Indonesia menghasilkan prosa Inggris dengan label tetap seperti dikutip. Perubahan ini satu kalimat di aturan bahasa yang sudah ada (SDD-11), dan sampai ke repo lama lewat `curate sync`.

## 2. Scope
In:
- Penegasan di baris aturan bahasa yang sudah ada di `### 1. Specify` pada `## Output` planner (`PLANNER_SPEC_WORKFLOW`): sumber bahasa, dan pesan akhir ikut bahasa itu. Tetap satu bullet.
- Test, golden `pre-sdd12/`, helper `since-12`, bagian `CLAUDE.md`.
- Dispatch ulang di umkm-pos sebagai bagian tiket yang sama (tahap 2 prompt eksekusi; AC-9).
Out:
- Skill (`caf-spec` baris 11, `caf-design`, `caf-breakdown`): tidak berubah; hash terkunci. Aturan `## Output` planner yang menjadi sumber kebenaran.
- Artefak agent lain, konfigurasi bahasa per repo, orchestrator, deteksi bahasa otomatis.
- Teks agent/skill/command yang digenerate `caf-init` (tetap Inggris).
- Temuan lunak dispatch lain (pembacaan ADR/docs, AC ganda, "Decisions Already Made"): tidak ditindak di sini.

## 3. Constraints and Assumptions
- Finding: dispatch umkm-pos 17 Okt: tiket B (Inggris, mengutip "Belum ada riwayat stok.") menghasilkan prosa Indonesia di 2 dari 3 run identik (B, B3), Inggris di B2; varian B4 tanpa string Indonesia menghasilkan Inggris. Token tetap tidak diterjemahkan di run mana pun. `caf-spec` dan aturan `## Output` terbaca di semua run.
- Finding: aturan bahasa sekarang di `caf-planner.md` `## Output` baris 102-110 (umkm-pos) menyebut "language of the ticket description" tanpa mengatur kutipan atau isi kode; pesan akhir tidak disebut.
- Finding: spec CAF-SDD-11 mengunci kata tetap (judul section, `Status:` dan nilainya, `AC-n:`, `Verify:` dan tiga bentuknya, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`, `NON-BLOCKING`, `Answer:`, `Tidak ada`) dan menetapkan aturan memakai niat, bukan daftar kata terlarang (02d→02e).
- Constraint: aturan tetap satu bullet utuh di langkah yang ada; tanpa `TODO`, tanpa heading baru, tanpa nilai status baru, tanpa daftar bahasa atau kata terlarang.
- Constraint: teks yang dikunci SDD-11 (test `sdd11-planner-language`, golden `pre-sdd11/`, `since-11`) berubah hanya lewat helper baru `since-12`; golden lama tidak diedit dan asersi tidak dilonggarkan.
- Assumption A-1: satu kalimat penegas cukup memperbaiki sebagian besar kegagalan. Dasar: B4 menunjukkan string Indonesia sebagai pemicu. Belum tentu menghilangkannya; hasilnya diukur di AC-9, dan bila masih gagal itu dicatat sebagai batas model, bukan alasan memperketat lagi.
- Assumption A-2: test lama yang memegang baris `## Output` planner (02d, 02e, 05a, 05b, 06, 07, 03f, `sdd11-planner-language`) gagal pada teks baru dan ditangani `since-12`; T1 memetakannya dengan mencari nilai literal yang berubah, bukan hanya nama builder (pelajaran 10).
- Assumption A-3: `curate sync` memperlakukan perubahan ini sebagai `DRIFT` pada repo yang planner-nya dibuat dengan teks SDD-11 dan tidak diedit (umkm-pos, yang manifest-nya dicatat di commit 8d1b3f7), dan tetap `CONFLICT` bila diedit tangan. Dasar: perilaku 3-way yang sama seperti SDD-11 AC-5.

## 4. Decisions Already Made
- D-1 (Ganjar, 17 Okt): satu tiket sampai selesai (spec, implementasi, dispatch ulang); tidak dipecah.
- D-2 (konsultan; dasar data dispatch): bahasa ditentukan oleh kalimat yang ditulis penulis tiket; kutipan UI, kode, dan berkas yang dibaca tidak menentukan bahasa; kutipan tetap ditulis apa adanya.
- D-3 (konsultan): pesan akhir planner ke pengguna mengikuti bahasa yang sama (B dan B3 gagal pada pesan akhir juga).
- D-4: lulus di dispatch berarti B ×3 dan B4 semuanya Inggris dan satu tiket Indonesia (yang mengutip istilah Inggris) tetap Indonesia; bila tidak, dicatat tanpa perubahan lanjutan.

## 5. Open Questions
Tidak ada

## 6. Acceptance Criteria
- AC-1: When `caf-planner.md` is rendered (both fixtures), then the language bullet in `### 1. Specify` of `## Output` states, in addition to the SDD-11 rule: the language is the one the ticket author wrote in (title and sentences), not the language of quoted UI text, code or files read; an English ticket that quotes an Indonesian label is still written in English with the label quoted as it is; the final message to the user follows the same language. Everything else of the SDD-11 bullet (the fixed words list, paths, symbols, commands, quoted text) is unchanged. Verify: automated test: `test/sdd12-planner-language.test.js` holds the new lines verbatim.
- AC-2: When the rendered planner is compared with `test/fixtures/pre-sdd12/`, then the only difference is the changed lines of that one bullet, in both fixtures, and `tools:` and every other section are byte-identical. Verify: automated test: `test/sdd12-planner-language.test.js`.
- AC-3: When any other kind is rendered, then its `## Output` is byte-identical to before. Verify: automated test: `test/sdd12-planner-language.test.js` against `pre-sdd12/`.
- AC-4: When the bullet is read, then it is still one bullet and holds no `TODO`, no `###` heading, no `## ` line, no new status value, and no list of languages or words to avoid. Verify: automated test: `test/sdd12-planner-language.test.js`.
- AC-5: When `curate sync` runs on a repo whose planner was generated with the SDD-11 text, or before SDD-11, and not edited, then `## Output` is `DRIFT` and is carried to the new text with no other section changed; when `## Output` was edited by hand, then it stays `CONFLICT` and the file is unchanged. Verify: automated test: `test/sdd12-planner-language.test.js` (byte comparison for the unchanged case).
- AC-6: When the three planner skills (`caf-spec`, `caf-design`, `caf-breakdown`) are rendered, then they are unchanged by this ticket. Verify: automated test: existing sha256 checks.
- AC-7: When `npm test` runs, then it exits 0, older tests that hold the planner `## Output` change only through `test/helpers/since-12.js` (goldens untouched), and the test count does not decrease. Verify: command: `npm test` | expect: exit code 0; the report lists the tests changed.
- AC-8: When a maintainer reads `CLAUDE.md`, then the SDD-11 language paragraph states where the language comes from (author's sentences, not quotes, code or files read), that the final message follows it, and the rollout (`curate sync` carries `## Output`). Verify: manual: read it.
- AC-9: When a real dispatch runs the planner (umkm-pos test worktree, after `curate sync`) on the same English ticket three times plus the variant without an Indonesian string, and on one Indonesian ticket that quotes an English term, then the English runs write English prose and final message, the Indonesian run writes Indonesian, and every fixed word is unchanged. Verify: manual: dispatch from stage 2 of the execution prompt; executor reports the table, Ganjar reads it.

## Coverage
AC-1 → T2, T3; AC-2 → T3, T4; AC-3 → T4; AC-4 → T3; AC-5 → T4; AC-6 → T4; AC-7 → T5; AC-8 → T5; AC-9 → T6.