# CAF-SDD-03a — Tasks (revisi 2)
Repo: `caf-initiator`. Baca `requirements.md` (revisi 2) dulu. Lanjutkan dari T2; T1 sudah selesai di run sebelumnya (verify-report.md lama ada di folder ini, tambahkan bagian "Lanjutan revisi 2" di dalamnya, jangan timpa).

## Aturan umum
- Branch: `ai-agent/CAF-SDD-03a` (sudah ada). Jangan mengubah `src/templates/` maupun `utils/agent-sections.js`.
- Jangan regenerate `test/fixtures/snapshots/mono-pnpm.json`; bila snapshot gagal, STOP `NEEDS_HUMAN`.
- Di `src/` hanya `utils/package-scripts.js` (logika) dan `export` minimal bila terbukti perlu (T1 menemukan `KNOWN_KINDS` dan `HIDDEN_CANDIDATE_KINDS` sudah di-export).
- `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC ternyata mustahil lagi, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.

## Tasks
- [x] T1 (AC-1, AC-5, AC-6): Baca lokasi kode dan pola test; catat kebutuhan export. (selesai)
- [x] T2 (AC-1, AC-5, AC-6): Tulis `test/kind-guard.test.js` untuk AC-1, AC-5, AC-6. Pesan gagal AC-5 menyebut "menghapus kind butuh rilis penghapusan penuh".
- [x] T3 (AC-4): Tabel literal tools per kind (sesuai AC-4) dibandingkan dengan frontmatter hasil render; jangan diturunkan dari kode.
- [x] T4 (AC-3): Skrip sekali pakai di scratchpad (jangan di-commit) merender builder untuk 7 kind frozen pada `mono-pnpm` dan `single-nuxt`, dan `implementer` hanya pada `single-nuxt` (render natural; jangan memakai `--mode single` pada fixture monorepo). Tulis golden ke `test/fixtures/frozen-kinds/<kind>.<fixture>.json`. Tanpa nilai non-deterministik. Commit goldennya, bukan skripnya.
- [x] T5 (AC-3): `test/frozen-kinds.test.js` membandingkan output builder dengan golden. Pesan gagal: builder kind ini dibekukan; menimpa file lama lewat DRIFT.
- [x] T6 (AC-2): Test sync: untuk tiap kind frozen dan fixture yang berlaku, bangun repo sementara, tulis file via builder, rekam baseline, jalankan `curate sync` (dry-run lalu write). Hitung himpunan section non-IN_SYNC dan bandingkan dengan tabel pengecualian literal di AC-2 (kesetaraan himpunan, bukan subset). Pastikan: DRIFT baru di luar tabel gagal; baris tabel yang sudah IN_SYNC juga gagal; file di luar baris tabel byte-identik. Tambahkan 5 test `todo` (satu per baris tabel) dengan keterangan "diperbaiki di CAF-SDD-03a2".
- [x] T7 (AC-7): Test `todo` untuk kind tak dikenal: `detectKind('caf-foo.md') === 'implementation'` dan section ber-baseline akan DRIFT. Keterangan: "fallback berbahaya; putuskan sebelum rilis penghapusan penuh (Q-1)". Tidak boleh menggagalkan suite.
- [x] T8 (AC-8): Ubah `utils/package-scripts.js`: pencocokan pola tidak memilih script watch-mode (segmen `watch`) atau lifecycle `pre*`/`post*`; exact-match tetap diutamakan; bila hanya kandidat terlarang, hasil null (slot jadi TODO gap). Test semua kasus AC-8 untuk slot test, lint, typecheck, build.
- [x] T9 (AC-9): `npm test` penuh dan `git diff --stat`. Snapshot tidak tersentuh; perubahan `src/` hanya sesuai batas. Bila test lama harus diubah, STOP `NEEDS_HUMAN`.
- [x] T10: Perbarui `verify-report.md` (tambah bagian "Lanjutan revisi 2"): bukti per AC (nama test atau file), daftar export (kemungkinan nol), usulan jawaban Q-1 dan Q-2, dan hal tak terduga.

## Docs Tasks
- Tidak ada.

## Di luar tugas ini
Memperbaiki akar tiga DRIFT (03a2), kind `validator`, template reviewer, `/caf-plan`, penghapusan agent/command, rename, SINGLE_REPO, kode mati, teks 3x, regenerasi snapshot.