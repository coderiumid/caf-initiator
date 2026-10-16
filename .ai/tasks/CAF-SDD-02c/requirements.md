# CAF-SDD-02c — caf-spec aktif, planner membaca berkas lama dan punya Glob/Grep
Status: APPROVED (revisi 2 setelah NEEDS_HUMAN di T1; keputusan K-1 dan K-2 dijawab 13 Okt 2026)
Source: chat (hasil uji ulang caf-spec v3 di umkm-pos, 13 Okt 2026: tiket vitest-merchant-v3 dan Uji 4 kontrak spec)
Repo target: `caf-initiator`
Bergantung pada: 02b, 03c1 sudah ter-merge ke main.

## 1. Outcome
Skill `caf-spec` yang di-generate tidak lagi berbanner DRAFT dan planner membacanya lewat pointer di `## Skills`. Planner bisa menjawab fakta repo sendiri (Glob, Grep), membaca berkas artefak yang sudah ada sebelum menulis, dan saat diminta mengubah spec berstatus APPROVED ia tidak menulis ulang spec: ia menulis usulan di `verify-report.md` lalu berhenti dengan `Status: NEEDS_HUMAN`.

## 2. Scope
In:
- Pencabutan banner DRAFT `caf-spec` di builder; isi hasil render = `caf-spec.source.v3-final.md` (dipakai apa adanya).
- Pointer `## Skills` planner ke `caf-spec` (muncul karena banner tidak ada lagi), bersama dua pointer yang sudah ada.
- Frontmatter `tools:` planner ditambah `Glob` dan `Grep`.
- Planner `## Output`: dua aturan baru (baca berkas yang sudah ada sebelum menulis; spec APPROVED tidak ditulis, usulan ke `verify-report.md`).
- Planner `## Allowed Tools`: daftar dan rationale ikut menyebut `Glob` dan `Grep`, karena section itu dirender dari peta tools yang sama dengan frontmatter (keputusan K-1).
- Test yang mengunci hal di atas, snapshot terbatas, README dan CLAUDE.md.

Out:
- Banner `caf-traceability` (menunggu uji dispatch validator).
- Perubahan isi `caf-spec` selain pencabutan banner.
- Aturan bahasa artefak (`tasks.md` hasil uji berbahasa Inggris, `requirements.md` berbahasa Indonesia), tugas non-planner (QA, Reviewer, Documentation) di `tasks.md`: dicatat sebagai backlog.
- Himpunan perintah yang boleh dijalankan validator (backlog 03b/SDD-04).
- `caf-design`, `caf-breakdown`, orchestrator.

## 3. Constraints and Assumptions
- Finding (uji dispatch, hasil): planner membaca `caf-spec` sebelum menulis; hasilnya memakai `Finding:`, mempertahankan tag `[BLOCKING]` setelah dijawab, tanpa nomor baris, dan memetakan AC ke task.
- Finding (kontrak spec): bila `requirements.md` dibaca saat berstatus APPROVED, planner menolak mengubahnya dan tidak menulis apa pun. Bila tidak dibaca ulang (konteks lama), planner menimpa spec APPROVED dengan `Status: DRAFT`.
- Finding (jejak): saat menolak, planner tidak menulis jejak di berkas; nama bagian "Proposed Spec Changes" tidak ada di teks planner.
- Finding (tools): planner hanya punya `Read` dan `Write`. Fakta repo (jumlah file test, ada tidaknya file di app lain) jadi pertanyaan BLOCKING atau menunggu koordinator.
- Finding (render, T1): frontmatter `tools:` dan section `## Allowed Tools` dirender dari satu peta tools per kind; menambah tool mengubah keduanya. `## Allowed Tools` adalah section yang di-track `curate sync`.
- Finding (sync, T1): `## Skills` bukan section yang disinkronkan (CLAUDE.md: tidak boleh); `scaffold skills` tidak mengedit agent yang sudah punya `## Skills`, hanya mencetak petunjuk menambah pointer manual. `curate sync` tidak menyentuh frontmatter.
- Finding (render): `## Skills` planner memuat `caf-scope-discipline` dan `caf-no-guess`, dan satu aturan yang menyuruh melewati skill yang masih berbanner DRAFT. `caf-spec` tidak punya pointer selama banner ada.
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: `caf-traceability` tetap lahir DRAFT dan tidak punya pointer di agent mana pun.
- Constraint: teks planner di luar `## Skills`, `## Output`, dan `## Allowed Tools` tidak berubah satu byte pun; di `## Output`, hanya dua aturan baru yang ditambahkan; di `## Allowed Tools`, hanya daftar tool dan kalimat rationale yang menyebut `Glob`/`Grep` (baca-saja, tanpa `Bash`/`Edit`) yang berubah, dengan gaya yang sama seperti rationale agent lain.
- Constraint: `tools:` agent lain tidak berubah; 15 golden `frozen-kinds` dan test 03a/03a2 tidak berubah; test `todo` fallback `implementation` tetap ada.
- Constraint: planner tidak mendapat `Bash` atau `Edit`.
- Assumption A1: branch `ai-agent/CAF-SDD-02c` dari main terbaru.
- Assumption A2: skill yang sudah ada di repo pengguna tidak ditimpa; Ganjar sudah mencabut banner di salinan umkm-pos secara manual.
- Assumption A3: `caf-spec` hanya dipetakan ke planner; T1 memastikan. Bila ada kind lain, pointer ikut muncul di sana dan dicatat.
- Assumption A4 (terjawab T1): `curate sync` tidak menyentuh frontmatter, jadi `tools:` planner di repo lama diedit manual; pointer `caf-spec` di `## Skills` planner lama juga ditambah manual.

## 4. Decisions Already Made
- Banner `caf-spec` dicabut karena uji ulang di umkm-pos lulus (Uji 1 dan Uji 4).
- Planner mendapat `Glob` dan `Grep` (baca-saja) supaya fakta repo tidak jadi pertanyaan. Usulan konsultan; Ganjar boleh menolak sebelum spec APPROVED.
- K-1: `## Allowed Tools` planner ikut berubah (disetujui); alternatif hanya mengubah frontmatter ditolak karena membuat satu file memuat dua daftar tool berbeda.
- K-2: `## Skills` tidak disinkronkan; pointer `caf-spec` di planner lama ditambah manual dan masuk catatan rollout.
- Hash `caf-spec` dikunci sebagai konstanta di test (`.ai/` di-gitignore, jadi source tidak tersedia di clone lain), seperti 02b.
- Usulan perubahan atas spec APPROVED ditulis di `verify-report.md` (bagian "Proposed Spec Changes") dan manusia yang membuka spec ke DRAFT.

## 5. Open Questions
Tidak ada.

## 6. Acceptance Criteria
- AC-1: When `caf-init scaffold skills` dijalankan di repo uji kosong, then `.claude/skills/caf-spec/SKILL.md` identik byte-for-byte dengan `caf-spec.source.v3-final.md` (sha256 `b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0`, dikunci di test), 77 baris, tanpa baris yang diawali `> DRAFT`, dan `caf-traceability` tetap berbanner 3 baris. Verify: automated test.
- AC-2: When agent `planner` dirender (fixture `mono-pnpm` dan `single-nuxt`), then `## Skills` memuat tiga pointer imperatif (`Read`) ke `caf-spec`, `caf-scope-discipline`, `caf-no-guess` (sebagai himpunan; urutan mengikuti tabel), dan `curate --check-drafts` tidak menghasilkan FAIL baru. Verify: automated test.
- AC-3: When planner dirender, then frontmatter `tools:` memuat persis `Read`, `Write`, `Glob`, `Grep` (tanpa `Bash`/`Edit`), `## Allowed Tools` planner menyebut `Read`, `Write`, `Glob`, `Grep` dengan rationale baca-saja untuk `Glob`/`Grep`, dan `tools:` serta `## Allowed Tools` semua agent lain sama dengan sebelum tiket. Verify: automated test dengan tabel literal.
- AC-4: When planner dirender, then `## Output` menyatakan: (a) sebelum menulis, baca berkas yang sudah ada di folder tugas (`requirements.md`, `tasks.md`, `verify-report.md`); (b) bila `requirements.md` berstatus APPROVED dan diminta mengubah isinya, jangan menulis `requirements.md`, tulis usulan di `verify-report.md` bagian "Proposed Spec Changes", lalu berhenti dengan `Status: NEEDS_HUMAN`. Verify: automated test atas teks hasil render.
- AC-5: When planner dirender, then bagian selain `## Skills`, `## Output`, dan `## Allowed Tools`, isi `## Output` di luar dua aturan baru, serta isi `## Allowed Tools` di luar daftar tool dan rationale `Glob`/`Grep`, identik byte-for-byte dengan golden sebelum tiket. Verify: automated test dengan golden di `test/fixtures/pre-sdd02c/`.
- AC-6: When file planner hasil 02b di-baseline di repo sementara lalu `curate sync` dijalankan, then `## Output` dan `## Allowed Tools` ditulis dengan teks baru, planner yang dikustomisasi pengguna tidak ditimpa, dan file agent lain tidak berubah; `## Skills` dan frontmatter `tools:` tidak berubah oleh sync, dan batasan itu dicatat di `verify-report.md` sebagai langkah manual rollout. Verify: automated test.
- AC-7: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then entri yang berubah hanya `caf-planner.md` (ditambah entri `caf-spec` bila ada di snapshot, dicatat); tidak ada entri lain berubah. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-8: When `npm test` dijalankan, then semua test lulus, 15 golden `frozen-kinds` tidak berubah, `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat` tidak menyentuh folder golden.
- AC-9: When README dan CLAUDE.md dibaca, then tertulis: `caf-spec` aktif tanpa banner; planner punya `Glob`/`Grep` dan dua aturan baru; `caf-traceability` masih DRAFT; rollout repo lama (skill tidak ditimpa sehingga banner dicabut manual; `curate sync` menulis `## Output` dan `## Allowed Tools` planner, tetapi pointer `caf-spec` di `## Skills` dan `tools:` di frontmatter ditambah manual); rilis npm masih menunggu SDD-04. Tidak ada klaim yang bertentangan. Verify: manual: baca bagian terkait.