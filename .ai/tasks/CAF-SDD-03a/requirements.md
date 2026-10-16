# CAF-SDD-03a — Jaring pengaman kind lama di caf-initiator
Status: DRAFT (revisi 2: AC-2 diperbaiki setelah NEEDS_HUMAN di T1; menunggu persetujuan Ganjar)
Source: chat (hasil audit SDD-03, commit df230a9; CAF-SDD-SUMMARY.md bag. 10 dan 11)
Repo target: `caf-initiator`

## 1. Outcome
Perubahan kind/agent berikutnya (SDD-03a2, 03b, 03c) tidak bisa melebarkan hak akses atau menimpa file agent lama secara diam-diam, karena perilaku kind lama, termasuk tiga DRIFT palsu yang sudah diketahui, sudah dikunci oleh test. Pemilihan script verifikasi tidak lagi bisa jatuh ke script watch-mode. Tidak ada perubahan pada isi file yang di-generate.

## 2. Scope
In:
- Test penjaga untuk 12 `KNOWN_KINDS` (deteksi, tools, perilaku `curate sync`).
- "Freeze" byte-for-byte builder untuk kind yang kelak pensiun atau diganti, lewat golden fixture baru.
- Kunci tiga DRIFT palsu yang sudah diketahui lewat tabel pengecualian literal (himpunan tepat).
- Perbaikan `package-scripts.js`: pencocokan pola tidak boleh memilih script watch-mode atau lifecycle hook.
- Test `todo` untuk bahaya fallback `implementation` dan untuk tiap pengecualian DRIFT.

Out:
- Memperbaiki akar tiga DRIFT itu (komparator `Working Pattern (PIV)` pm/ux, `Input` qa/reviewer di monorepo). Itu tiket CAF-SDD-03a2.
- Menambah kind `validator`, mengubah template reviewer, builder `/caf-plan` (03b).
- Berhenti menulis agent/command, rename `/caf-run` dan `caf-self-verify`, SINGLE_REPO, kode mati, koreksi "3x" (03c).
- Mengubah fallback `implementation` di `agent-sections.js:96` (Q-1).
- Mengubah template apa pun di `src/templates/` atau `agent-sections.js`.
- Regenerasi `test/fixtures/snapshots/mono-pnpm.json`.
- Kontradiksi token di `piv-workflow-md.js:43-45` (03c).

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap berlaku.
- Constraint: seluruh `src/templates/` dan `utils/agent-sections.js` tidak boleh berubah. Perubahan di `src/` hanya `utils/package-scripts.js` (logika) dan `export` minimal tanpa mengubah logika (T1 menemukan `KNOWN_KINDS` dan `HIDDEN_CANDIDATE_KINDS` sudah di-export; kemungkinan tidak perlu export baru).
- Constraint: snapshot `mono-pnpm.json` tidak boleh berubah. Bila berubah, STOP `NEEDS_HUMAN`.
- Constraint: `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Assumption A1: branch `ai-agent/CAF-SDD-03a` sudah ada (dari `ai-agent/CAF-SDD-01`, PR #15 masih open).
- Assumption A2: golden di `test/fixtures/frozen-kinds/`, dibuat sekali dari output builder saat ini.
- Assumption A3: kind frozen = qa, documentation, architect, devops, auditor, pm, ux-designer (fixture `mono-pnpm` dan `single-nuxt`) dan implementer (hanya `single-nuxt`, konteks naturalnya). Kind yang akan berubah sah (planner, frontend, backend, reviewer) tidak di-freeze.
- Assumption A4: tabel pengecualian DRIFT sesuai temuan T1 (lihat AC-2).

## 4. Decisions Already Made
- Kind lama tetap dikenali sampai rilis penghapusan penuh; hapus bertahap.
- Builder kind pensiun dibekukan byte-for-byte; freeze golden di sini disengaja (kind ini tidak boleh berubah lagi, jadi dua edit adalah fitur).
- Opsi A untuk AC-2: tabel pengecualian literal dengan kesetaraan himpunan, bukan mengeluarkan kind dari uji dan bukan memperbaiki akar di tiket ini.
- Akar DRIFT diperbaiki di CAF-SDD-03a2 sebelum 03b, memakai golden dari tiket ini sebagai bukti output tidak berubah.
- Golden `implementer` hanya dari `single-nuxt`.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Fallback `implementation` untuk kind tak dikenal (`agent-sections.js:96`) tidak diubah di sini; didokumentasikan lewat test `todo`; diputuskan sebelum rilis penghapusan penuh. — Answer:
- Q-2 [NON-BLOCKING] Pola script watch-mode: segmen `watch` (`test:watch`, `test-watch`, `watch`) dan lifecycle `pre*`/`post*`; `test:e2e` tetap boleh dipilih. — Answer:

## 6. Acceptance Criteria
- AC-1: When `detectKind` dipanggil untuk `caf-<kind>.md` dari tiap `KNOWN_KINDS` (dan `devops.md` tanpa prefix), then hasilnya kind itu sendiri, bukan `implementation`. Verify: automated test baru.
- AC-2: When tiap kind frozen dirender dengan builder saat ini, di-baseline, lalu `curate sync` dijalankan (dry-run dan write) pada salinan fixture, then himpunan section ber-track yang BUKAN `IN_SYNC` sama persis dengan tabel pengecualian literal di test, dan semua file di luar baris tabel itu tetap byte-identik. Tabel (kind, fixture, section, status): pm, mono-pnpm dan single-nuxt, `Working Pattern (PIV)`, DRIFT; ux-designer, mono-pnpm dan single-nuxt, `Working Pattern (PIV)`, DRIFT; qa, mono-pnpm, `Input`, DRIFT. Test gagal bila ada DRIFT baru di luar tabel, dan juga bila salah satu baris tabel sudah tidak DRIFT (agar tabel menyusut saat akarnya diperbaiki). Tiap baris tabel punya satu test `todo` dengan keterangan "diperbaiki di CAF-SDD-03a2". Verify: automated test baru; output `node --test` menunjukkan 5 todo.
- AC-3: When builder tiap kind frozen dipanggil (frontmatter `tools:` dan semua section ter-track), then outputnya sama persis dengan golden di `test/fixtures/frozen-kinds/`: 7 kind pada kedua fixture, dan `implementer` hanya pada `single-nuxt`. Verify: automated test yang membandingkan dengan golden.
- AC-4: When frontmatter `tools:` tiap kind dirender, then daftarnya sama persis dengan tabel literal di test: qa = Read, Write, Bash; documentation = Read, Write, Edit; architect = Read, Write; devops = Read, Bash; auditor = Read, Bash; pm dan ux-designer = Read, Write; implementer, frontend, backend = Read, Write, Edit, Bash. Verify: automated test (tabel literal, bukan diturunkan dari kode).
- AC-5: When `KNOWN_KINDS` dibandingkan dengan daftar 12 kind literal di test, then semua 12 hadir; pesan kegagalan menyebut bahwa menghapus kind butuh rilis penghapusan penuh. Verify: automated test.
- AC-6: When `HIDDEN_CANDIDATE_KINDS` diperiksa, then setiap entrinya ada di `KNOWN_KINDS`. Verify: automated test.
- AC-7: When kind tak dikenal (mis. `caf-foo.md`) melewati `detectKind` dan `curate sync`, then bahaya fallback `implementation` terdokumentasi sebagai test `todo` yang tidak menggagalkan suite. Verify: output `node --test` menampilkan test itu sebagai todo.
- AC-8: When `package-scripts` memilih script dengan pencocokan pola, then: `{test:watch}` saja menghasilkan null (slot jadi TODO gap); `{test:watch, pretest, test}` memilih `test`; `{test:watch, test:ci}` memilih `test:ci`; `{pretest, posttest}` saja menghasilkan null; exact-match tetap menang atas pola. Verify: automated test untuk slot test, lint, typecheck, build.
- AC-9: When `npm test` dijalankan dan `git diff --stat` dibaca, then semua test lama lulus, snapshot `mono-pnpm.json` tidak tersentuh, dan perubahan di `src/` hanya `utils/package-scripts.js` (plus export minimal bila terbukti perlu). Verify: `npm test`; `git diff --stat`.