# CAF-FIX-01 — Verify Report

Tanggal: 2026-10-12
Branch: `ai-agent/CAF-FIX-01` (dari `main` @ `75826f1`, sama dengan `origin/main`)
Spec: `requirements.md` dan `tasks.md` di folder ini, dibaca sampai habis. Tidak diubah.
Commit: `bd3dbd8` (lokal; tidak di-push, tidak ada PR, tidak di-merge).

## Ringkasan

- Akar masalah: `findApps` (`src/utils/repo-context.js`) memakai hasil `fast-glob` apa adanya.
  fast-glob mengembalikan entri menurut urutan selesainya pembacaan direktori, jadi urutannya
  berubah antar pemanggilan.
- Perbaikan di sumber: daftar app diurutkan menurut `path` dengan perbandingan code-unit
  (`byAppPath`, `src/utils/repo-context.js:120`, dipakai di `:159`). Tidak ada pemakai yang
  diubah. Isi tiap app tidak berubah, hanya urutannya.
- Snapshot `mono-pnpm.json`, 15 golden `frozen-kinds`, golden `pre-sdd02` dan `pre-sdd02b`: tidak
  tersentuh. Tidak ada test lama yang diubah. Pengurutan di `buildValidatorAgent` tetap ada.

## Attempt Log

1. T1 audit baca-saja (lihat Catatan). Ketidakstabilan direproduksi sebelum mengubah apa pun:
   3000 pemanggilan `detectRepoContext` pada `test/fixtures/mono-pnpm` menghasilkan
   `apps/api,apps/web` 2482 kali dan `apps/web,apps/api` 518 kali.
2. T2: `test/helpers/readdir-order.js` (stub `fs.readdir`) dan `test/fix01-detect-order.test.js`
   ditulis lebih dulu. Merah: 20 test, 6 lulus, 14 gagal (run kedua 13 gagal; satu test di sistem
   berkas nyata gagal hanya bila race-nya muncul).
3. T3: pengurutan di `findApps`. File test baru: 20 dari 20 lulus. Tidak ada percobaan gagal.
4. T5: invarian di `CLAUDE.md`. Commit.
5. T4: `npm test` tiga kali berturut-turut pada commit `bd3dbd8`, hasil sama.

## Acceptance Criteria

Semua test di `test/fix01-detect-order.test.js`.

- AC-1: automated-test — ::"AC-1: mono-pnpm — a reversed directory listing gives the same app order as a normal one", ::"AC-1: seven workspace packages — reversed and shuffled listings give the same app order as a normal one", ::"AC-1: the database findings follow the app order under every listing order". Ketiganya merah sebelum perbaikan (teramati: `not ok 2`, `not ok 3`, `not ok 4`; mis. aktual `apps/web, apps/api` di bawah listing terbalik), hijau sesudahnya. Stub: `test/helpers/readdir-order.js`; ::"the stub decides the listing order: reversed and shuffled differ from normal" membuktikan urutan acak tetap memang berbeda dari normal dan dari terbalik
- AC-2: automated-test — 50 pemanggilan per kasus: ::"AC-2: mono-pnpm — 50 calls on the real file system all return the order in the snapshot"; ::"AC-2: mono-pnpm — 50 calls under a <normal|reversed|shuffled> listing all return the order in the snapshot" (dibandingkan dengan `stack.apps` dan `stack.database` di `mono-pnpm.json`); ::"AC-2: mono-pnpm with --mode mono — 50 calls under a <…> listing are identical"; ::"AC-2: single-nuxt — 50 calls under a <…> listing are identical: one app at the repo root"; ::"AC-2: seven workspace packages — 50 calls under a <…> listing are identical"; ::"AC-2: single-nuxt and the seven-package repo — 50 calls on the real file system are identical"; ::"AC-2: detectRepoContext itself returns the ordered list (the order is decided at the source)"; ::"AC-2: explicit globs are ordered by app path too, not by the order the globs were given". Kode: `src/utils/repo-context.js:120` dan `:159`
- AC-3: command — `npm test` | exit 0 pada ketiga run, tiap run `# tests 393, # pass 392, # fail 0, # todo 1`; `git diff --stat main..HEAD -- test/fixtures` | keluaran kosong; `git diff --stat main..HEAD -- test` selain dua file baru | keluaran kosong
- AC-4: manual — daftar di "Catatan, T1(c)" di bawah: 16 tempat, masing-masing dengan status
- AC-5: manual — `CLAUDE.md:77-86`, butir pertama di bawah "Repo mode"

Yang TIDAK dibuktikan:
- Stub membuat urutan listing dan urutan selesainya pembacaan ditentukan test. Itu membuktikan
  hasil tidak bergantung pada urutan listing, bukan bahwa setiap sistem berkas nyata sudah dicoba.
  Hanya macOS (APFS) yang dijalankan.
- Tidak ada `scaffold` end-to-end yang dijalankan dua kali untuk membandingkan berkas di disk;
  buktinya di tingkat `detectStack`/`detectRepoContext`.

## Quality Gate

- `npm test`: exit 0, tiga kali. 393 test (373 lama + 20 baru), 392 lulus, 0 gagal, 1 todo
  (todo lama: fallback `implementation` di `test/kind-guard.test.js`).
- Lint, typecheck, build: tidak ada di `package.json`.
- `test/fixtures/`: tidak tersentuh.

## Proposed Spec Changes

-

## Catatan

### T1(a) — sumber ketidakstabilan

`src/utils/repo-context.js`, `findApps`: `await fg(pkgJsonPatterns, { cwd: rootDir })`, lalu
`.map(...)` tanpa pengurutan. Untuk pola `apps/*/package.json` fast-glob membaca `apps/`, lalu
membaca `apps/api` dan `apps/web` secara bersamaan dan mengeluarkan entri begitu tiap pembacaan
selesai. Urutan selesainya ditentukan thread pool, bukan urutan listing saja. A2 terbukti, dan
keduanya berlaku sekaligus: urutan listing dan hasil async yang digabung tanpa urutan.

`detectDatabase` (`src/steps/02-detect-stack.js:17`) mengiterasi daftar app, jadi urutan
`database` ikut goyah. Tidak ada sumber lain di `detectStack`: sisanya `readJsonSafe`/`exists`
pada path tetap. Jalur SINGLE_REPO selalu satu app, jadi tidak terkena.

### T1(b) — urutan yang tertanam

- `snapshots/mono-pnpm.json`: `stack.apps` = `apps/api`, `apps/web`; `CLAUDE.md` di dalamnya
  mendaftar `apps/api` lalu `apps/web`. Direkam lewat `test/helpers/mono-snapshot.js:39`, yang
  mengurutkan menurut `path`.
- `frozen-kinds/qa.mono-pnpm.json`: `(apps/web, apps/api)`. Ini bukan urutan deteksi: itu urutan
  peran (frontend lalu backend) dari `buildCandidates({ frontend: [web], backend: [api] })`, dan
  helper-nya mencari app dengan `find` menurut path. Tidak bertentangan dengan snapshot.
- Golden lain (`frozen-kinds` sisanya, `pre-sdd02`, `pre-sdd02b`): tidak memuat daftar app hasil
  deteksi.

Tidak ada pertentangan, jadi syarat STOP tidak terpicu.

### Jawaban Q-1

Urutan menurut `path` app, menaik. Itu satu-satunya urutan yang tertanam (snapshot). Urutan
deklarasi workspace tidak bisa dibedakan dari fixture (satu pola, `apps/*`) dan tidak dipilih:
di dalam satu pola `*` urutannya tetap harus ditentukan oleh sesuatu.

Satu keputusan saya sendiri di dalam "menurut path": perbandingan code-unit (`<`), bukan
`localeCompare` seperti di helper snapshot. Untuk `apps/api`/`apps/web` hasilnya sama, jadi
snapshot tidak bisa membedakan keduanya. Alasan: `localeCompare` bergantung pada locale dan ICU
mesin, sedangkan tujuan tiket adalah hasil yang sama di mana pun. Akibatnya huruf besar mendahului
huruf kecil (`packages/Zeta` sebelum `packages/config`), dan itu dikunci di test. Bila yang
dimaui `localeCompare`, perubahannya satu baris di `byAppPath` plus `WIDE_ORDER` di test.

### T1(c) — tempat lain yang membaca direktori atau glob

| Tempat | Dipakai untuk | Status |
|---|---|---|
| `src/utils/repo-context.js` `findApps` (`fg`) | daftar app | diperbaiki |
| `src/steps/02-detect-stack.js:17` `detectDatabase` | `database`, mengikuti urutan app | diperbaiki (lewat sumber) |
| `src/commands/golden-examples.js:42` `findCandidates` (`fg`, tanpa urutan) | kandidat golden example | temuan (lihat di bawah) |
| `src/utils/architecture-signatures.js:22` `hasMatch` (`fg`) | hanya `length > 0` | aman |
| `src/commands/complete-drafts.js:28` `listDraftFiles` (`fg`) | inventaris draft, `.sort()` | aman |
| `src/commands/complete-drafts.js:86` (`readdirSync`) | hanya `.some()` | aman |
| `src/utils/read-agent-roster.js:42` (`readdirSync`) | roster, `.sort()` | aman |
| `src/commands/export.js:87` (`readdirSync`) | `.sort()` | aman |
| `src/commands/curate-baseline.js:14` (`readdirSync`) | `.sort()` | aman |
| `src/commands/agents-sync.js:23` (`readdirSync`) | `.sort()` | aman |
| `src/commands/audit.js:169` (`readdirSync`) | `.sort()` | aman |
| `src/commands/skills.js:107` (`readdirSync`) | `.sort()` | aman |
| `src/commands/adr.js:15` (`readdirSync`) | hanya nomor ADR terbesar | aman |
| `src/util.js:14` (`readdirSync`) | hanya `length > 0` | aman |
| `src/commands/agents.js:260` `buildValidatorAgent` | mengurutkan sendiri (`localeCompare`) | aman, dibiarkan |
| `src/templates/skill-md.js:120` `buildVerifySkill` | mengurutkan sendiri (`localeCompare`) | aman, dibiarkan |

Pemakai `stack.apps` yang kini stabil lewat sumbernya, tanpa diubah: `skills.js:30`,
`agents.js:67`, `complete-drafts.js:75`, `audit.js:96`, `decision-signatures.js:36`,
`reference-docs.js:23`, serta pilihan prompt di `adr.js`, `golden-examples.js`,
`task-completion.js`. Satu-satunya `Promise.all` di `src/` (`golden-examples.js:42`) menjaga
urutan pola; yang tidak berurutan adalah isi tiap hasil `fg`.

### Temuan lain

1. **`golden-examples`: kandidat tidak berurutan pasti (tidak diperbaiki, di luar scope).**
   `findCandidates` mengembalikan hasil `fg` tanpa urutan; `scoreCandidates` mengurutkan menurut
   skor saja lalu memotong tiga teratas. Bila skor seri, tiga kandidat yang ditawarkan dan
   urutannya bisa berbeda antar run. Pengguna tetap memilih sendiri, jadi akibatnya pada pilihan
   yang ditawarkan, bukan penulisan diam-diam. Disimpulkan dari membaca kode, belum direproduksi.
   Perbaikannya kecil (urutan kedua menurut `relPath`) dan perlu tiket sendiri.
2. **Dua pembanding untuk hal yang sama.** Sumber kini memakai code-unit; `buildValidatorAgent`
   dan `buildVerifySkill` memakai `localeCompare`. Masing-masing stabil, tetapi untuk path dengan
   huruf besar atau tanda baca urutan checklist validator bisa berbeda dari urutan app di berkas
   lain. Tiket melarang menyentuh pengurutan di `buildValidatorAgent`, jadi dibiarkan.
3. `test/helpers/mono-snapshot.js:39` dan `test/repo-context.test.js:22` masih mengurutkan
   sendiri. Sekarang berlebih tetapi tidak salah; test lama tidak diubah.

### Hal tak terduga

1. Test "seven workspace packages … under a normal listing" juga merah sebelum perbaikan: dengan
   `workspaces: ['packages/*', 'apps/*']` hasil mengikuti urutan pola. Setelah perbaikan urutan
   deklarasi pola tidak lagi memengaruhi urutan app (dikunci di test explicit globs).
2. Stub harus di-import sebelum apa pun dari `src/`: `@nodelib/fs.scandir` menyalin `fs.readdir`
   saat dimuat. Tiap file test jalan di proses sendiri, jadi stub tidak bocor ke test lain.
3. `requirements.md` dan `tasks.md` sudah ada di `.ai/tasks/CAF-FIX-01/` saat mulai. `.ai/`
   di-gitignore: keduanya dan laporan ini tidak ikut commit.

## git diff --stat (main..HEAD)

```
 CLAUDE.md                       |  10 +++
 src/utils/repo-context.js       |  13 ++-
 test/fix01-detect-order.test.js | 181 ++++++++++++++++++++++++++++++++++++++++
 test/helpers/readdir-order.js   |  70 ++++++++++++++++
 4 files changed, 273 insertions(+), 1 deletion(-)
```

Status: SUCCESS
Test: 393 total, 392 lulus, 0 gagal, 1 todo
Commit: bd3dbd8
