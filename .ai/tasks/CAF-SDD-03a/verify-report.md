# Verify Report — CAF-SDD-03a

Ticket: CAF-SDD-03a — Jaring pengaman kind lama di caf-initiator
Status: NEEDS_HUMAN
Branch: `ai-agent/CAF-SDD-03a` (dari `ai-agent/CAF-SDD-01`, karena PR #15 CAF-SDD-01 masih OPEN)

## Ringkasan

Berhenti di T1, sebelum menulis kode apa pun. AC-2 mustahil dipenuhi untuk 3 dari 8 kind frozen
tanpa mengubah `src/templates/` atau logika `curate sync` — dua-duanya di luar batas tiket ini.
Aturan berhenti "salah satu AC mustahil atau bertentangan" berlaku.

Tidak ada perubahan di `src/`, `test/`, atau fixture. Tidak ada commit (`.ai/` di-gitignore, jadi
file ini dan `tasks.md` juga tidak ter-commit).

## Attempt Log

1. Baca `requirements.md`, `tasks.md`, `CLAUDE.md`, lokasi acuan T1, test pola. Working tree bersih.
2. Skrip eksplorasi di scratchpad: render tiap kandidat lewat jalur yang sama dengan
   `agents()` (`buildCandidates` / `buildSingleRepoCandidates` → `buildAgentMd` /
   `buildPmAgentMd` / `buildUxDesignerAgentMd`) pada `mono-pnpm` dan `single-nuxt`, baseline
   semua section, lalu bandingkan dengan `SYNCABLE_SECTIONS[header](detectKind(file))`.
3. Konfirmasi dengan `agentsSync` sungguhan (dry-run lalu write) pada direktori sementara:
   3 file ditimpa. STOP.

## Temuan pemblokir: AC-2 bertentangan dengan perilaku saat ini

AC-2 menuntut: file agent tiap kind frozen, di-baseline, lalu `curate sync` → byte-identik dan
semua section ter-track `IN_SYNC`. Hasil nyata:

| Kind frozen | Fixture | Section | Status | Akibat `curate sync` (write) |
|---|---|---|---|---|
| pm | mono-pnpm, single-nuxt | `Working Pattern (PIV)` | DRIFT | ditimpa dengan teks generik |
| ux-designer | mono-pnpm, single-nuxt | `Working Pattern (PIV)` | DRIFT | ditimpa dengan teks generik |
| qa | mono-pnpm saja | `Input` | DRIFT | nama app hilang |

Lima kind frozen lain (documentation, architect, devops, auditor, implementer) dan qa pada
`single-nuxt`: semua section `IN_SYNC`, byte-identik. Dry-run tidak menulis apa pun untuk semua kind.

Bukti (output `agentsSync` pada salinan sementara):

```
drifted: [".claude/agents/caf-pm.md#Working Pattern (PIV)",
          ".claude/agents/caf-qa.md#Input",
          ".claude/agents/caf-ux-designer.md#Working Pattern (PIV)"]

caf-qa.md  Input
  BEFORE: `verify-report.md` from the implementation agent (apps/web, apps/api) in `.caf/tasks/{TICKET-ID}/` (required).
  AFTER : `verify-report.md` from the implementation agent in `.caf/tasks/{TICKET-ID}/` (required).

caf-pm.md / caf-ux-designer.md  Working Pattern (PIV)
  BEFORE: 1. PLAN — first determine what's still unknown and needs to be asked of a human
          2. IMPLEMENT — write the document
          3. VERIFY — run the Verify Checklist below before claiming completion
  AFTER : 1. PLAN — write a plan first, don't touch code yet
          2. IMPLEMENT — execute per the plan
          3. VERIFY — run the Verify Checklist below before declaring done
```

Akar masalah:
- pm / ux-designer: `discoveryAgentMd()` menulis Working Pattern versi Discovery, sedangkan
  `SYNCABLE_SECTIONS['Working Pattern (PIV)']` selalu memanggil `buildWorkingPatternSection()`
  tanpa `kind`. `CLAUDE.md` sudah mencatat ini sebagai DRIFT yang disengaja dan belum diputuskan
  (`.ai/tasks/CAF-RETRYLOGIC-01/open-items.md`).
- qa: `buildAgentMd` merender `Input` dengan `appNames`; `SYNCABLE_SECTIONS.Input` memanggil
  `buildInputSection(kind)` tanpa `appNames`. Hanya muncul bila ada app frontend/backend yang
  di-assign (MONOREPO). `CLAUDE.md` menyebut gejalanya di bagian check-drafts.
- Reviewer punya DRIFT `Input` yang sama di `mono-pnpm`, tetapi reviewer tidak di-freeze (A3).

Memperbaikinya butuh mengubah `src/templates/` atau `src/utils/agent-sections.js` — keduanya
dilarang di 03a.

## Usulan perubahan spec (pilih satu)

**Opsi A (rekomendasi) — AC-2 mengunci perilaku nyata, pengecualian ditulis literal.**
Ubah AC-2 menjadi: "…then file tetap byte-identik dan semua section ter-track `IN_SYNC`,
kecuali tabel pengecualian literal di test: pm dan ux-designer `Working Pattern (PIV)` = DRIFT;
qa `Input` = DRIFT bila `appNames` tidak kosong (fixture `mono-pnpm`). Untuk pengecualian itu
test menegaskan hanya section tersebut yang berubah dan section lain byte-identik. Tiap
pengecualian punya test `todo` yang menjelaskan bahayanya." Tetap sesuai Outcome: 03b/03c tidak
bisa menambah DRIFT baru diam-diam, dan 3 DRIFT lama terdokumentasi, bukan tersembunyi. Tanpa
perubahan `src/`.

**Opsi B — persempit AC-2.** Keluarkan pm, ux-designer, dan qa@mono-pnpm dari AC-2 (tetap
di-freeze di AC-3). Lebih sederhana, tetapi 3 penimpaan itu tidak dijaga test sama sekali.

**Opsi C — perbaiki akarnya dulu di tiket terpisah.** Beri `Working Pattern (PIV)` cabang
Discovery dan buat `Input` qa/reviewer tidak ditimpa. Mengubah `src/templates/` dan/atau
`agent-sections.js`; untuk repo yang sudah ter-baseline perlu dipikirkan arah sinkronnya.
Baru setelah itu AC-2 bisa dipenuhi apa adanya.

## Acceptance Criteria

| AC | Status | Bukti |
|---|---|---|
| AC-1 | BELUM DIKERJAKAN | Eksplorasi: `detectKind` benar untuk semua 12 kind; test belum ditulis |
| AC-2 | MUSTAHIL (sebagian) | Lihat temuan di atas: 3 dari 8 kind frozen ditimpa `curate sync` |
| AC-3 | BELUM DIKERJAKAN | Golden belum dibuat; render tidak memuat tanggal atau path absolut |
| AC-4 | BELUM DIKERJAKAN | Eksplorasi: frontmatter `tools:` semua kind cocok dengan tabel AC-4 |
| AC-5 | BELUM DIKERJAKAN | `KNOWN_KINDS` berisi 12 kind |
| AC-6 | BELUM DIKERJAKAN | `HIDDEN_CANDIDATE_KINDS = ['devops']`, ada di `KNOWN_KINDS` |
| AC-7 | BELUM DIKERJAKAN | — |
| AC-8 | BELUM DIKERJAKAN | — |
| AC-9 | BELUM DIKERJAKAN | `git status` bersih; snapshot `mono-pnpm.json` tidak tersentuh |

## Quality Gate

- `npm test`: tidak dijalankan (tidak ada perubahan kode).
- `git diff --stat`: kosong.
- Snapshot `test/fixtures/snapshots/mono-pnpm.json`: tidak tersentuh.

## Catatan

**Konstanta yang di-export (T1).** Tidak perlu export baru:
- `KNOWN_KINDS`, `detectKind`, `SYNCABLE_SECTIONS` — sudah di-export dari `src/utils/agent-sections.js`.
- `HIDDEN_CANDIDATE_KINDS`, `buildCandidates`, `buildSingleRepoCandidates` — sudah di-export dari `src/commands/agents.js`.
- `TOOLS_BY_KIND` (`src/templates/agent-md.js`) tidak di-export dan tidak perlu: AC-4 membandingkan
  frontmatter hasil render dengan tabel literal. Lagi pula mengekspornya berarti menyentuh
  `src/templates/`, yang dilarang.

**Usulan jawaban Q-1.** Jangan ubah fallback di 03a. Sebelum rilis penghapusan penuh: buat
`detectKind` mengembalikan `null` untuk nama tak dikenal dan buat `agents-sync.js`/`audit.js`
melewati file itu (dilaporkan, tidak ditulis); pindahkan kebutuhan `skills.js:121` ke lookup
eksplisit. Sampai itu jadi, kind yang dihapus dari `KNOWN_KINDS` otomatis diperlakukan sebagai
`implementation` dan `Allowed Tools`-nya bisa ditimpa jadi Read+Write+Edit+Bash.

**Usulan jawaban Q-2.** Setuju dengan asumsi, dengan definisi presisi: pecah nama script pada
`:`, `-`, `_`, `.`; terlarang bila salah satu segmen persis `watch`, atau nama diawali
`pre`/`post` dan sisanya adalah nama script lain di `package.json` yang sama, atau sisanya
adalah nama slot (agar `{pretest, posttest}` saja tetap null). Aturan "sisanya nama script lain"
mencegah `prettier:lint` atau `postcss:build` ikut terbuang. `test:e2e`, `test:ci` tetap boleh.
Perlu keputusan: apakah `test:dev` / `build:dev` (sering watch-mode juga) ikut dilarang — usul: tidak, di luar Q-2.

**Hal tak terduga.**
- Penimpaan `Input` qa/reviewer di MONOREPO adalah kehilangan data nyata pada repo yang sudah
  di-baseline (nama app hilang), bukan hanya soal test. Layak tiket sendiri.
- `implementer` tidak muncul secara alami di `mono-pnpm` (hanya SINGLE_REPO). T4 meminta 8 kind
  pada kedua fixture; `detectStack({ mode: 'single' })` pada `mono-pnpm` berjalan dan merender
  `caf-implementer.md` dengan semua section `IN_SYNC`, jadi golden `implementer.mono-pnpm.json`
  bisa dibuat lewat `--mode single`. Perlu konfirmasi bahwa itu yang dimaksud.
- `devops` dirender dengan slug `devops` (tanpa prefix `caf-`) oleh `agentSlug`, sesuai catatan
  di `detectKind`; AC-1 sudah mengantisipasinya.
- `tasks.md` dan `verify-report.md` berada di `.ai/` yang di-gitignore, jadi tidak ikut commit.

---

# Lanjutan revisi 2

Status: SUCCESS
Tanggal: 2026-10-12
Acuan: `requirements.md` revisi 2 (opsi A untuk AC-2, golden `implementer` hanya `single-nuxt`,
akar DRIFT ke CAF-SDD-03a2). Bagian di atas adalah laporan run pertama (NEEDS_HUMAN di T1) dan
dibiarkan apa adanya.

## Attempt Log

1. Baseline sebelum perubahan: `npm test` 206 lulus, 0 gagal.
2. T2, T3, T7: `test/kind-guard.test.js` + helper `test/helpers/frozen-kinds.js`. Lulus pada percobaan pertama.
3. T4: skrip `make-golden.mjs` di scratchpad, dijalankan sekali, menulis 15 golden. Skrip menolak
   menimpa golden yang sudah ada dan menolak nilai berupa path absolut atau tanggal/jam.
4. T5, T6: `test/frozen-kinds.test.js`. Lulus pada percobaan pertama.
5. T8: `src/utils/package-scripts.js` + `test/package-scripts.test.js`. Lulus pada percobaan pertama.
6. T9: `npm test` penuh, exit 0. Tidak ada perbaikan ulang; tidak ada test lama yang diubah.
7. Uji mutasi tabel AC-2 (salinan sementara file test, sudah dihapus): menghapus baris qa dari
   tabel → test 17 gagal; menambah baris palsu `architect | mono-pnpm | Input | DRIFT` → test 17 gagal.

## Acceptance Criteria

| AC | Status | Bukti |
|---|---|---|
| AC-1 | PASS | `test/kind-guard.test.js` — "AC-1: detectKind returns the kind itself for caf-<kind>.md of every known kind" (12 kind literal, tiap entri `KNOWN_KINDS`, dan `devops.md`) |
| AC-2 | PASS | `test/frozen-kinds.test.js` — "AC-2: after generate + baseline, the non-IN_SYNC tracked sections are exactly the known false DRIFT table" (15 kombinasi kind+fixture, salinan fixture sementara, dry-run lalu write, kesetaraan himpunan terhadap `KNOWN_FALSE_DRIFT`, file di luar tabel byte-identik, file dalam tabel hanya berubah di section yang terdaftar). 5 test todo "diperbaiki di CAF-SDD-03a2", satu per baris tabel |
| AC-3 | PASS | `test/frozen-kinds.test.js` — 15 test "AC-3: <kind> on <fixture> renders exactly the golden tools + tracked sections" + "AC-3: golden directory holds exactly one file per frozen kind + fixture". Golden: `test/fixtures/frozen-kinds/*.json` (15 file) |
| AC-4 | PASS | `test/kind-guard.test.js` — "AC-4: frontmatter tools of every rendered kind match the literal table" (tabel `EXPECTED_TOOLS` literal, 17 baris) |
| AC-5 | PASS | `test/kind-guard.test.js` — "AC-5: all 12 kinds are still in KNOWN_KINDS"; pesan gagal memuat "Menghapus kind butuh rilis penghapusan penuh" |
| AC-6 | PASS | `test/kind-guard.test.js` — "AC-6: every HIDDEN_CANDIDATE_KINDS entry is a known kind" |
| AC-7 | PASS | `test/kind-guard.test.js` — "AC-7: an unknown kind (caf-foo.md) is not treated as implementation and is left alone by curate sync", `# TODO fallback berbahaya; putuskan sebelum rilis penghapusan penuh (Q-1)`. Gagal sebagai todo: sync menimpa `Allowed Tools`, `Input`, `Output` |
| AC-8 | PASS | `test/package-scripts.test.js` — 6 kasus x 4 slot (test, lint, typecheck, build) + 7 test tambahan |
| AC-9 | PASS | Lihat Quality Gate |

## Quality Gate

- `npm test`: exit 0. `# tests 263, # pass 257, # fail 0, # todo 6` (206 test lama semua lulus; 57 test baru, 6 di antaranya todo: 5 untuk AC-2, 1 untuk AC-7).
- `git diff --stat` (file ter-track): `src/utils/package-scripts.js | 32 ++++++++++++++++++++++++++++----`. Satu file.
- File baru: `test/kind-guard.test.js`, `test/frozen-kinds.test.js`, `test/package-scripts.test.js`, `test/helpers/frozen-kinds.js`, `test/fixtures/frozen-kinds/` (15 JSON).
- `test/fixtures/snapshots/mono-pnpm.json`: tidak tersentuh; `test/repo-context.test.js` lulus.
- `src/templates/` dan `src/utils/agent-sections.js`: tidak tersentuh.

## Catatan

**Export baru: nol.** Semua yang dibutuhkan test sudah di-export.

**Isi golden.** Tiap file: `kind`, `fixture`, `file`, `tools` (daftar dari frontmatter), dan
`sections` (isi tiap section yang ada di `SYNCABLE_SECTIONS` dan hadir di file). `Role`, `Scope`,
`Verify Checklist` sengaja tidak dibekukan: tidak ter-track, jadi tidak bisa ditimpa `curate sync`.
Konsekuensi: menambah entri baru ke `SYNCABLE_SECTIONS` akan menggagalkan golden kind yang punya
section itu. Itu disengaja (section baru yang ter-track = jalur timpa baru).

**Perilaku `package-scripts.js` yang dipilih (usulan jawaban Q-2).** Hanya jalur pola yang
disaring; exact-match tidak disaring.
- Watch: nama dipecah pada `:`, `-`, `_`, `.`, spasi; terlarang bila ada segmen persis `watch`
  (tidak peka huruf besar). `test:watcher` tetap boleh. camelCase (`testWatch`) TIDAK terdeteksi
  karena bukan segmen; bila perlu, itu keputusan tambahan.
- Lifecycle: nama diawali `pre`/`post` dan sisanya (a) nama script lain di `package.json` yang
  sama, atau (b) diawali pola slot itu. Jadi `pretest`, `posttest`, `pretest:ci`, `prebuild`,
  `pretype-check` terlarang; `prettier:lint`, `postcss:build`, `preview:build` tetap boleh.
  Ini lebih sempit daripada "semua `pre*`/`post*`" di teks Q-2, agar script biasa yang kebetulan
  berawalan `pre`/`post` tidak hilang. Semua kasus AC-8 terpenuhi. Bila Ganjar ingin `pre*`/`post*`
  harfiah, cukup satu baris diubah dan 1 test tambahan disesuaikan.
- `test:e2e`, `test:ci` tetap dipilih. `test:dev`/`build:dev` tidak dilarang (di luar Q-2).

**Usulan jawaban Q-1.** Tidak berubah dari laporan pertama: sebelum rilis penghapusan penuh,
`detectKind` mengembalikan `null` untuk nama tak dikenal, `agents-sync.js`/`audit.js` melewati dan
melaporkan file itu, dan `skills.js:121` memakai lookup eksplisit. Test todo AC-7 sudah menulis
perilaku aman itu sebagai asersi, jadi akan lulus saat diperbaiki.

**Hal tak terduga.**
- Tidak ada perubahan output untuk kedua fixture: tidak ada script watch/lifecycle di sana, jadi
  snapshot dan golden tidak terpengaruh perubahan `package-scripts.js`.
- Test todo AC-7 menunjukkan cakupan bahaya lebih luas dari `Allowed Tools`: untuk agent
  read-only bernama `caf-foo.md`, sync juga menimpa `Input` dan `Output`. Frontmatter `tools:`
  tidak ikut berubah (sync hanya menulis body section), jadi hak akses yang ditegakkan harness
  tetap; yang salah adalah teks `## Allowed Tools` yang dibaca agent.
- Reviewer punya DRIFT `Input` yang sama dengan qa di `mono-pnpm` tetapi tidak di-freeze (A3), jadi
  tidak dijaga test ini. 03a2 sebaiknya mencakupnya.
- Saat 03a2 memperbaiki akar DRIFT: test himpunan AC-2 akan gagal sampai baris tabel dan test
  todo-nya dihapus; golden pm/ux/qa tidak perlu berubah bila yang diperbaiki komparatornya.
- `.ai/` di-gitignore: `tasks.md` dan laporan ini tidak ikut commit.
