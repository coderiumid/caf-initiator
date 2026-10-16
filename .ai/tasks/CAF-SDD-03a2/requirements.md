# CAF-SDD-03a2 — Perbaiki DRIFT palsu pada `curate sync`
Status: DRAFT
Source: chat (audit SDD-03 bagian E3, temuan CAF-SDD-03a T1, README known issue :256-261)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-03a (commit a679ede, branch `ai-agent/CAF-SDD-03a`), yang berdiri di atas CAF-SDD-01 (PR #15).

## 1. Outcome
`curate sync` tidak lagi menimpa section yang isinya tidak berubah: `Working Pattern (PIV)` agent pm/ux-designer dan `Input` agent qa/reviewer di MONOREPO. Daftar app di `Input` tidak hilang lagi. Tidak ada file yang di-generate berubah, dan pemilihan script verifikasi tidak lagi lolos dari script watch-mode bergaya camelCase.

## 2. Scope
In:
- Komparator `Working Pattern (PIV)` untuk pm dan ux-designer memakai teks yang memang sudah dirender hari ini.
- Pemulihan konteks `appNames` untuk perbandingan section `Input` qa dan reviewer di MONOREPO, termasuk repo dengan manifest lama.
- Menghapus tabel pengecualian dan 5 test `todo` AC-2 di CAF-SDD-03a, karena akarnya sudah diperbaiki.
- Deteksi `watch` bergaya camelCase di `utils/package-scripts.js`.
- Memperbarui catatan known issue di README dan CLAUDE.md.

Out:
- Perubahan isi teks apa pun pada file yang di-generate (golden dan snapshot harus tetap sama).
- Fallback `implementation` untuk kind tak dikenal (tiket terpisah sebelum rilis penghapusan penuh).
- Kind `validator`, template reviewer baru, `/caf-plan` (03b).
- Rename, penghapusan agent/command (03c).

## 3. Constraints and Assumptions
- Constraint: file yang dihasilkan generator tidak boleh berubah satu byte pun. Bukti: 15 golden di `test/fixtures/frozen-kinds/` dan `mono-pnpm.json` tidak tersentuh.
- Constraint: format manifest lama harus tetap terbaca. Bila perbaikan butuh field baru, repo dengan manifest lama tetap tidak boleh kehilangan data saat sync.
- Constraint: `curate sync` tetap hanya menulis section berstatus DRIFT (file = baseline, template berubah). Tidak ada penulisan "untuk berjaga-jaga".
- Constraint: bila sebuah section tidak bisa dirender setia (konteks hilang), statusnya tidak boleh DRIFT.
- Constraint: tidak boleh ada penyentuhan `test/fixtures/snapshots/mono-pnpm.json`. Bila harus berubah, STOP `NEEDS_HUMAN`.
- Assumption A1: branch `ai-agent/CAF-SDD-03a2` dibuat dari `ai-agent/CAF-SDD-03a`; merge berurutan SDD-01, 03a, 03a2.
- Assumption A2: perbedaan pm/ux disebabkan `SYNCABLE_SECTIONS` memanggil `buildWorkingPatternSection()` tanpa kind (temuan 03a T1). Teks Discovery yang sudah dirender dianggap benar; "keputusan konten" yang pernah dibiarkan terbuka diputuskan: teks yang ada dipertahankan.
- Assumption A3: perubahan pada `agent-sections.js` dan `buildWorkingPatternSection` (sebatas menerima kind) diizinkan di tiket ini, selama output builder identik byte-for-byte.

## 4. Decisions Already Made
- Kind pm dan ux-designer pensiun; teks mereka dibekukan. Perbaikan menyelaraskan pembanding dengan teks yang ada, bukan sebaliknya.
- Reviewer ikut diperbaiki walau tidak di-freeze, karena 03b akan mengubah `Input`-nya dan perbaikan akar harus mendahului itu.
- camelCase watch masuk tiket ini sebagai AC terpisah (risiko asimetris: watcher yang lolos membuat agent macet; false positive hanya menjadi baris TODO).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Mekanisme memulihkan `appNames`. Usulan: catat `appNames` per file di manifest saat generate atau baseline, dengan fallback mem-parse daftar app dari section `Input` file bila manifest lama; bila tidak dapat di-parse secara deterministik, section tidak diperlakukan sebagai DRIFT. Implementer boleh mengusulkan alternatif di `verify-report.md`, tetapi bila butuh perubahan format manifest yang tidak kompatibel mundur, STOP `NEEDS_HUMAN`. — Answer:
- Q-2 [NON-BLOCKING] Batas deteksi camelCase: `Watch` sebagai segmen setelah huruf kecil (`testWatch`, `buildWatch`), bukan substring (`watchman` tidak dihitung). — Answer:

## 6. Acceptance Criteria
- AC-1: When agent pm dan ux-designer dirender (fixture `mono-pnpm` dan `single-nuxt`), di-baseline, lalu `curate sync` dijalankan (dry-run dan write), then section `Working Pattern (PIV)` berstatus `IN_SYNC` dan file byte-identik. Verify: automated test.
- AC-2: When agent qa dan reviewer dirender pada `mono-pnpm`, di-baseline, lalu `curate sync` dijalankan, then section `Input` berstatus `IN_SYNC`, daftar app (`apps/web`, `apps/api`) tetap ada, dan file byte-identik. Verify: automated test.
- AC-3: When template section `Input` qa atau reviewer berubah di luar bagian daftar app (disimulasikan di test), then `curate sync` memperbarui section dengan teks baru dan daftar app tetap utuh. Verify: automated test dengan template yang diubah secara terkendali.
- AC-4: When repo memakai manifest format lama (tanpa field baru) dengan file qa/reviewer MONOREPO, then `curate sync` tidak menghapus daftar app dari section `Input` (diperbaiki lewat parse atau dilaporkan tanpa menulis). Verify: automated test dengan manifest lama dari fixture.
- AC-5: When `npm test` dijalankan setelah tabel pengecualian AC-2 dan 5 test `todo` dari CAF-SDD-03a dihapus, then semua test lulus, himpunan section non-IN_SYNC pada kind frozen kosong, 15 golden `frozen-kinds` dan `mono-pnpm.json` tidak berubah, dan test `todo` untuk fallback `implementation` (AC-7 di 03a) tetap ada. Verify: `npm test`; `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/` maupun `test/fixtures/snapshots/`.
- AC-6: When `package-scripts` memilih script dengan pola, then `{testWatch}` saja menghasilkan null; `{testWatch, test}` memilih `test`; `{buildWatch, build}` memilih `build`; `{watchman:build}` tetap bisa dipilih untuk slot build bila itu satu-satunya kandidat; semua kasus AC-8 di CAF-SDD-03a tetap lulus. Verify: automated test.
- AC-7: When README dan CLAUDE.md dibaca, then catatan known issue tentang `Working Pattern (PIV)` pm/ux dan `Input` QA/Reviewer di monorepo dihapus atau ditandai selesai, dan tidak ada klaim yang bertentangan dengan perilaku baru. Verify: manual: baca bagian "Known issue" README dan bagian terkait di CLAUDE.md, cocokkan dengan hasil AC-1 sampai AC-4.