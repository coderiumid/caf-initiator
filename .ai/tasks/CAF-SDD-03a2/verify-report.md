# Verify Report — CAF-SDD-03a2

Ticket: CAF-SDD-03a2 — Perbaiki DRIFT palsu pada `curate sync`
Tanggal: 2026-10-12
Branch: `ai-agent/CAF-SDD-03a2` (dari `ai-agent/CAF-SDD-03a`, commit a679ede)
Commit: `4fc92cf` (lokal; tidak di-push, tidak ada PR)

## Ringkasan

Dua DRIFT palsu diperbaiki di akarnya, tanpa mengubah satu byte pun file yang di-generate dan
tanpa mengubah format manifest:

- `Working Pattern (PIV)` pm/ux-designer: `buildWorkingPatternSection(kind)` kini mengembalikan
  teks Discovery yang memang sudah dirender.
- `Input` qa/reviewer di MONOREPO: daftar app dibaca kembali dari section di file, lalu template
  dirender dengan daftar itu. Bila daftar tidak bisa dibaca dengan pasti, section tidak pernah
  DRIFT: dibiarkan dan dilaporkan.

Tabel pengecualian dan 5 test `todo` AC-2 dari 03a dihapus. Deteksi `Watch` camelCase ditambahkan.

## Rencana dan format manifest (T1)

Format manifest saat ini (`.caf/.generate-manifest.json`), tidak diubah:

```json
{ "version": 1,
  "files": { ".claude/agents/caf-qa.md": { "sections": { "Input": {
    "hash": "sha256:<hex>", "templateVersion": "caf-initiator@0.1.9", "lastSyncedAt": "<ISO>" } } } } }
```

Temuan T1 yang menentukan rancangan:
- `scaffold agents` tidak menulis manifest sama sekali; manifest baru ada setelah `curate baseline`
  atau `curate sync`. Jadi "catat `appNames` saat generate" tidak punya tempat menulis, dan saat
  baseline satu-satunya sumber `appNames` adalah file itu sendiri.
- Empat pemanggil `SYNCABLE_SECTIONS[header](kind)`: `agents-sync.js`, `audit.js`,
  `curate-baseline.js`, `check-drafts.js`. Dua terakhir hanya butuh "apakah section bagian dari
  kind" atau membandingkan terhadap baseline, jadi tidak perlu diubah.

## Attempt Log

1. Baseline sebelum perubahan: `npm test` 263 test, 257 lulus, 6 todo.
2. Merekam `test/fixtures/legacy-manifest/mono-pnpm.generate-manifest.json` dengan `curateBaseline`
   dari kode a679ede (sebelum `src/` disentuh), lewat skrip sekali jalan di scratchpad yang
   menolak menimpa.
3. T2: `test/false-drift.test.js` + 3 test camelCase. Merah: 14 gagal (4 AC-1, 2 AC-2, 2 AC-3,
   3 AC-4, 1 CUSTOMIZATION, 2 camelCase).
4. T3, T4, T6: perbaikan. Test baru hijau. Suite penuh: 3 gagal, semuanya test lama yang mengunci
   perilaku lama (lihat "Hal tak terduga").
5. T5 + pembaruan 2 test lama di `retry-logic-role-aware.test.js`. Hijau.
6. Menambah unit test parser. 1 gagal: ekspektasi saya salah (`(apps/web,apps/api)` saya kira
   harus `null`). Parser membacanya sebagai satu nama dan merender balik identik, jadi aman.
   Ekspektasi diganti dengan test properti round-trip. Kode `src/` tidak diubah di langkah ini.
7. T7 docs, T8 `npm test` penuh exit 0, commit.

## Acceptance Criteria

| AC | Status | Bukti |
|---|---|---|
| AC-1 | PASS | `test/false-drift.test.js` — "AC-1: pm on mono-pnpm …", "AC-1: ux-designer on mono-pnpm …", "AC-1: pm on single-nuxt …", "AC-1: ux-designer on single-nuxt — "## Working Pattern (PIV)" is IN_SYNC and the file survives curate sync" (audit: nol non-IN_SYNC; dry-run lalu write; file dan manifest byte-identik). Kode: `src/templates/agent-md.js:440`, `src/utils/agent-sections.js:64` |
| AC-2 | PASS | `test/false-drift.test.js` — "AC-2: qa on mono-pnpm — "## Input" is IN_SYNC, keeps its app list, and the file survives curate sync" dan yang sama untuk reviewer. Kode: `src/utils/agent-sections.js:84` (`parseInputAppNames`), `:105` (`templateForExistingSection`), `src/commands/agents-sync.js:83`, `src/commands/audit.js:205` |
| AC-3 | PASS | `test/false-drift.test.js` — "AC-3: qa on mono-pnpm — a template change outside the app list is synced and the app list survives" dan yang sama untuk reviewer. Hasil sync sama byte-for-byte dengan render baru; baseline maju; run kedua no-op |
| AC-4 | PASS | `test/false-drift.test.js` — "AC-4: a manifest written by the pre-fix code — curate sync keeps the app list of qa and reviewer Input" (fixture `test/fixtures/legacy-manifest/mono-pnpm.generate-manifest.json`, diperbaiki lewat parse) dan "AC-4: qa / reviewer on mono-pnpm — an Input whose app list can't be read is reported, never written" (dilaporkan tanpa menulis) |
| AC-5 | PASS | `npm test` exit 0. `test/frozen-kinds.test.js` — "AC-2: after generate + baseline, every tracked section of every frozen kind is IN_SYNC and curate sync writes nothing" (himpunan non-IN_SYNC `[]`). Tabel `KNOWN_FALSE_DRIFT` dan 5 test todo dihapus. Todo fallback tetap: `test/kind-guard.test.js:117`. `git diff --stat a679ede HEAD -- test/fixtures/frozen-kinds test/fixtures/snapshots` kosong |
| AC-6 | PASS | `test/package-scripts.test.js` — "camelCase: a *Watch script alone leaves the slot null", "camelCase: a *Watch script next to the real one picks the real one", "camelCase: "watch" as a mere substring is not watch mode". 31 test AC-8 dari 03a tetap lulus tanpa diubah. Kode: `src/utils/package-scripts.js:20` |
| AC-7 | PASS (manual) | `README.md:257-261`: blok "Known issue" diganti penjelasan perilaku baru. `CLAUDE.md:209-237`: klaim "masih DRIFT, sengaja dibiarkan terbuka" dihapus, diganti aturan `templateForExistingSection`. Dicocokkan dengan AC-1 sampai AC-4 |

## Quality Gate

- `npm test`: exit 0. `# tests 278, # pass 277, # fail 0, # todo 1`.
  Dari 263: minus 5 todo AC-2, plus 20 test baru (17 di `false-drift.test.js`, 3 camelCase).
  Dua test lama di `retry-logic-role-aware.test.js` diganti dua test baru (lihat catatan).
- 15 golden `test/fixtures/frozen-kinds/` dan `test/fixtures/snapshots/mono-pnpm.json`: tidak tersentuh.
- Tidak ada lint/build di `package.json`.
- `curate sync` hanya dijalankan pada salinan fixture di direktori sementara.

## Catatan

### Mekanisme `appNames` yang dipilih, dan alasannya

Dipilih: **parse dari section `Input` di file, tanpa field manifest baru.** Ini menyimpang dari
usulan Q-1 (simpan di manifest + fallback parse). Alasannya:

1. Jalur tulis tidak membutuhkannya. Hanya DRIFT yang ditulis, dan DRIFT mensyaratkan
   current = baseline. Jadi daftar app di file saat ini pasti daftar yang di-baseline. Membaca
   dari file sama kuatnya dengan membaca dari manifest.
2. Nilai di manifest pun akan berasal dari parse. `scaffold agents` tidak menulis manifest, jadi
   saat `curate baseline` sumbernya tetap file. Field itu hanya cache dari parse yang sama.
3. Fallback parse tetap wajib untuk semua repo yang ada hari ini (AC-4). Field manifest berarti
   dua jalur untuk hasil yang sama.
4. Tanpa field baru, kompatibilitas manifest tidak perlu dibuktikan lewat migrasi.

Yang dikorbankan: bila pengguna mengedit daftar app dengan tangan, statusnya `CONFLICT`, padahal
`CUSTOMIZATION` lebih tepat. Dua-duanya tidak pernah ditulis, jadi hanya soal label. Bila label itu
penting, field manifest bisa ditambahkan nanti secara aditif.

Aturan parse (`parseInputAppNames`): jangkar frasa `from the implementation agent`, diikuti
` (a, b)` atau tidak sama sekali. Hasil: daftar nama, `[]` bila kalimat ada tanpa daftar, `null`
bila tidak pasti (kalimat hilang atau diubah, daftar kosong, kurung bersarang, dua daftar). Test
properti menjamin apa pun yang diterima parser dirender balik menjadi kalimat yang sama.

Bila `null`: pembanding memakai `templateHash = baselineHash`, sehingga hasilnya hanya `IN_SYNC`
atau `CUSTOMIZATION`, tidak pernah `DRIFT`. `curate sync` mencetak section itu sebagai "could not
be compared" dan mengembalikannya di `unverifiable`. Tidak ada status ke-6; `compareSection` dan
gerbang `if (status !== DRIFT) continue` tidak disentuh.

### Kompatibilitas manifest lama

Format tidak berubah: tidak ada field baru, `version` tetap 1. Manifest dari kode pre-fix dibaca
apa adanya. Bukti: fixture direkam oleh `curate baseline` pada a679ede dan dipakai test AC-4; file
agent dan file manifest byte-identik setelah dry-run dan write.

Akibat bagi repo yang sudah ter-baseline: `Input` qa/reviewer dan `Working Pattern` pm/ux yang
tadinya DRIFT kini `IN_SYNC` tanpa tindakan apa pun. Repo yang **sudah telanjur** di-sync dengan
versi lama (daftar app sudah hilang, teks Discovery sudah jadi generik) tidak dipulihkan: `Input`
tanpa daftar terbaca sah sebagai `[]`, dan `Working Pattern` generik di pm/ux kini terbaca DRIFT
lalu dikembalikan ke teks Discovery oleh sync berikutnya. Yang kedua adalah perbaikan otomatis;
yang pertama perlu diisi ulang manual.

### Usulan jawaban Q-1

Parse dari file saja, tanpa field manifest (alasan di atas). Tidak ada perubahan format, jadi
syarat STOP untuk format yang tidak kompatibel mundur tidak terpicu. Bila Ganjar tetap ingin field
manifest, itu tambahan aditif di atas kode ini dan butuh izin mengubah `curate-baseline.js`.

### Usulan jawaban Q-2

Setuju dengan batas di spec, diimplementasikan sebagai: batas camelCase (huruf kecil atau angka
diikuti huruf besar) diperlakukan sebagai pemisah segmen, lalu aturan lama berlaku (segmen persis
`watch`, tidak peka huruf besar). Hasil: `testWatch`, `buildWatch`, `watchTest`, `test:unitWatch`
terlarang; `watchman:build`, `testWatcher`, `stopwatch:test` tetap boleh. `watchTest` (Watch di
depan) ikut terlarang karena simetris dengan `watch:test` yang sudah dilarang di 03a; ini sedikit
lebih luas dari kalimat Q-2 ("setelah huruf kecil"). Exact-match tetap tidak disaring.

### Hal tak terduga

- **File di luar daftar "boleh diubah" ikut disentuh: `src/commands/audit.js`** (10 baris).
  `audit.js` memakai pembanding yang sama; tanpa perubahan itu `curate audit` masih melaporkan
  DRIFT untuk section yang oleh sync dianggap IN_SYNC. Perlu konfirmasi bahwa ini diterima.
- **Dua test lama mengunci perilaku lama** dan diubah: di `test/retry-logic-role-aware.test.js`,
  "curate sync leaves a correctly-generated Discovery agent unchanged on every guarded/role-aware
  section" (menegaskan `drifted = [Working Pattern]`) dan "Working Pattern (PIV) content still
  differs … drift-syncs to the generic wording". Keduanya bertentangan langsung dengan AC-1 dan
  A2. Diganti dengan: file pm/ux byte-identik setelah sync, dan output builder sama dengan yang
  dirender `discoveryAgentMd()`. Satu komentar usang di `test/discovery-sections.test.js` diperbarui.
- **Teks Discovery kini ada di dua tempat**: `discoveryAgentMd()` dan `buildWorkingPatternSection`.
  `discovery-commands.js` tidak ada di daftar yang boleh diubah, jadi konstanta bersama tidak
  dibuat. Test di atas dan golden pm/ux gagal bila keduanya berbeda.
- Komentar di `src/templates/agent-md.js:103-107` ("app assignment isn't recoverable") kini usang.
  Dibiarkan karena izin di file itu hanya sebatas `buildWorkingPatternSection`.
- `curate audit` tidak menampilkan section yang "tidak bisa dibandingkan"; hanya `curate sync` yang
  mencetaknya. Di audit section itu terhitung `IN_SYNC` atau `CUSTOMIZATION`.
- Parser terikat pada frasa `from the implementation agent`. Bila 03b mengubah frasa itu di
  template reviewer, parser harus tetap mengenali bentuk lama; bila tidak, semua `Input`
  qa/reviewer lama menjadi "tidak bisa dibandingkan" (aman, tetapi tidak akan pernah ter-sync).
  Dicatat di CLAUDE.md.
- Frasa jangkar `from the ${who}` tidak pernah berubah sejak commit pertama repo ini (99fdd3e,
  dicek lewat `git show`), jadi parser mengenali `Input` qa/reviewer dari semua versi template
  yang ada di riwayat git. Jalur "tidak bisa dibandingkan" hanya terpicu oleh kalimat yang diubah
  dengan tangan lalu di-baseline.
- `.ai/` di-gitignore: laporan ini, `requirements.md`, dan `tasks.md` tidak ikut commit.

## git diff --stat (a679ede..4fc92cf)

```
 CLAUDE.md                                          |  33 ++-
 README.md                                          |  11 +-
 src/commands/agents-sync.js                        |  36 ++-
 src/commands/audit.js                              |  10 +-
 src/templates/agent-md.js                          |  19 +-
 src/utils/agent-sections.js                        |  52 ++++-
 src/utils/package-scripts.js                       |   7 +-
 test/discovery-sections.test.js                    |   6 +-
 test/false-drift.test.js                           | 249 +++++++++++++++++++++
 .../mono-pnpm.generate-manifest.json               |  73 ++++++
 test/frozen-kinds.test.js                          | 115 +++-------
 test/package-scripts.test.js                       |  22 ++
 test/retry-logic-role-aware.test.js                |  81 ++++---
 13 files changed, 565 insertions(+), 149 deletions(-)
```

Status: SUCCESS
Test: 278 total, 277 lulus, 0 gagal, 1 todo (fallback `implementation`, AC-7 di 03a)
Commit: 4fc92cf
