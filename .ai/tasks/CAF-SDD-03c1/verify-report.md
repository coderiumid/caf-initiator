# Verify Report

Status: NEEDS_HUMAN

Tiket: CAF-SDD-03c1 — Berhenti men-scaffold agent dan command yang dibuang
Tanggal: 2026-10-12
Branch: `ai-agent/CAF-SDD-03c1` (dari main `f6bd151` = `origin/main`, memuat merge 03b3 PR #23). Tanpa push, PR, atau merge.
Commit: `a384929` (golden, T2), `a2e803d` (WIP: test + implementasi T3/T4, **suite merah dengan sengaja**).

## Ringkasan

Berhenti di T4. AC-1 dan AC-2 tidak bisa dipenuhi bersamaan di `SINGLE_REPO` tanpa `--role`, dan
ini persis syarat STOP di spec ("command yang dipertahankan ternyata memerlukan salah satu yang
dibuang untuk berfungsi"):

- AC-1 menuntut `implementer` tidak ditawarkan dan tidak ditulis, di semua mode.
- Di `SINGLE_REPO` tanpa `--role`, `implementer` adalah satu-satunya agent implementasi.
- `/caf-run-pipeline` (dipertahankan) hanya ditawarkan bila Planner dan minimal satu agent
  implementasi dipilih (`src/commands/agents.js:625`). Tanpa `implementer`, ia tidak ditawarkan
  dan tidak ditulis.
- AC-2 menuntut himpunan command = himpunan sebelum dikurangi delapan, di semua mode. Di mode itu
  hasilnya dikurangi sembilan.

Bukti: 4 test baru yang memegang AC-2 secara harfiah gagal, hanya pada dua varian itu
(`single-nuxt` terdeteksi, dan `mono-pnpm --mode single`):

```
not ok - AC-2: single-nuxt.auto — the commands written are the ones recorded before, minus the eight dropped ones
  expected: caf-complete-drafts, caf-fix-review, caf-plan-ticket, caf-review, caf-run-pipeline
  actual:   caf-complete-drafts, caf-fix-review, caf-plan-ticket, caf-review
```

Empat varian lain (`mono-pnpm`, `single-nuxt --role frontend`, `--role backend`,
`single-nuxt --mode mono`) lulus AC-1 dan AC-2. Saya tidak mengubah spec dan tidak melunakkan
test.

Kesalahan proses dari saya: akibat ini sudah terlihat saat T1 (membaca `agents.js`), tetapi saya
menilainya "bukan pemblokir" dan baru menghubungkannya dengan bunyi AC-2 setelah test merah.
Seharusnya STOP sebelum `src/` disentuh. Karena itu ada commit WIP; lihat "Keadaan repo".

## Keputusan yang dibutuhkan

**D1 (pemblokir). `SINGLE_REPO` tanpa `--role`.** Pilih satu:
- (a) Terima: di mode itu repo baru tidak mendapat agent implementasi maupun `/caf-run-pipeline`;
  AC-2 diberi pengecualian. Pengguna harus memakai `--role frontend|backend`. Implementasi
  sekarang sudah begini.
- (b) `implementer` tetap ditawarkan sampai 03c3 (yang memang mengurus `SINGLE_REPO` dan `--role`);
  tiket ini menyembunyikan lima kind. AC-1 dan AC-5 diubah menjadi lima. Perubahan kode: satu kata.
- (c) Lain (mis. `--role` wajib di `SINGLE_REPO`): di luar scope tiket ini.

Usul saya: (b). Ia tidak meninggalkan mode yang setengah berfungsi, dan `SINGLE_REPO` toh dibahas
utuh di 03c3. Bila rilis npm memang ditahan sampai 03c3, (a) juga aman.

**D2 (AC-7). Snapshot `mono-pnpm.json`.** `test/helpers/mono-snapshot.js` merender semua kandidat,
yang tersembunyi juga, dan memanggil `/caf-run-pipeline` dengan `hasDocumentation: true`. Jadi
dengan mekanisme `HIDDEN_CANDIDATE_KINDS` snapshot **tidak berubah sama sekali**, dan test
snapshot lulus tanpa disentuh. Pilih satu:
- (a) Biarkan: nol entri berubah, tetapi snapshot lalu merekam berkas yang tidak lagi ditulis
  scaffold mana pun (`caf-documentation.md`, `caf-auditor.md`, `devops.md`).
- (b) Helper mengikuti scaffold nyata (lewati kind tersembunyi, `hasDocumentation: false`), lalu
  regenerasi. Hasil uji kering (tidak ditulis ke repo): 3 entri hilang dan **3 entri milik yang
  dipertahankan berubah**, rinciannya di T1(f). Perubahan pada `caf-run-pipeline.md` adalah
  pergantian cabang teks, bukan sekadar daftar, jadi menurut saya perlu izin eksplisit terhadap
  bunyi AC-7 ("tanpa perubahan pada entri ... yang dipertahankan").

**D3 (kecil). Teks CLI yang menjadi tidak benar** (bukan teks hasil generate, jadi tidak tercakup
"dilaporkan, tidak diperbaiki" secara jelas). Saya tidak mengubahnya. Daftar di T1(e) bagian B.
Perlu dijawab: diperbaiki di tiket ini, atau ikut 03c2/03c3.

## Checklist
- [ ] lint — tidak ada skrip lint di `package.json`
- [ ] typecheck — tidak ada skrip typecheck
- [ ] test — `npm test`, **exit 1**: 503 test, 491 lulus, 11 gagal, 1 todo. Rincian di "Test yang gagal".
- [ ] build — tidak ada langkah build

Baseline di main sebelum perubahan: 457 test, 456 lulus, 0 gagal, 1 todo.

## Acceptance Criteria
Test baru ada di `test/sdd03c1-stop-scaffold.test.js`. "6 varian" = `mono-pnpm.auto`,
`mono-pnpm.single`, `single-nuxt.auto`, `single-nuxt.auto.frontend`, `single-nuxt.auto.backend`,
`single-nuxt.mono`.

- AC-1: automated-test — ::"AC-1: <varian> — the six dropped kinds are not offered, and every other kind still is, in the same order" (baris 81, 6 varian), ::"… the agent files written are the ones recorded before, minus the six dropped kinds" (87, 6 varian), ::"AC-1: the goldens cover both fixtures, both modes and every --role" (97), ::"AC-1: SINGLE_REPO without --role writes no implementation agent; …" (106), ::"AC-1: scaffold has no flag that selects an agent kind past the picker" (117). Semua lulus. Kode: `src/commands/agents.js:47`, filter di `:470`. Catatan: lulus, tetapi akibatnya adalah D1.
- AC-2: automated-test — **GAGAL di 2 dari 6 varian** (D1). ::"AC-2: <varian> — the commands written are the ones recorded before, minus the eight dropped ones" (131) dan ::"… every other file of the default scaffold is still written" (140): lulus di 4 varian, gagal di `single-nuxt.auto` dan `mono-pnpm.single`. Lulus: ::"AC-2: the hidden commands are exactly the eight dropped ones, …" (145), ::"AC-2: <fixture> — a selection that still holds the auditor and PM writes none of their commands" (154), ::"… `scaffold feature-catalog-sync` writes nothing" (175), ::"… the builders of the eight dropped commands still render the text recorded before 03b3" (193). `/caf-plan` tidak ditulis di varian mana pun (asersi di baris 136). Kode: `agents.js:53-66`, `:588`, `:768-806`; `src/commands/feature-catalog-sync.js:39`.
- AC-3: automated-test — ::"AC-3: <varian> — nothing is written under .caf/discovery or .caf/audits (and nothing was before)" (219, 6 varian). Lulus, dan sudah lulus sebelum `src/` diubah: scaffold default memang tidak pernah menulis ke sana (Q-2).
- AC-4: automated-test — ::"AC-4: <fixture> — curate audit and curate sync (dry-run, then write) treat an old repo exactly as before" (233, 2 fixture). Lulus. Laporan audit sama persis dengan golden `test/fixtures/pre-sdd03c1/curate-old-repo.*.json` (direkam sebelum `src/` diubah): 59 section `IN_SYNC` di mono-pnpm, 54 di single-nuxt, nol untuk status lain; kedua sync mengembalikan daftar kosong; tidak ada berkas terhapus atau berubah.
- AC-5: automated-test — ::"AC-5: every dropped kind is still in KNOWN_KINDS and still detected from its file name" (275), ::"AC-5: HIDDEN_CANDIDATE_KINDS holds exactly the six dropped kinds, all of them known kinds" (285), ::"AC-5: the candidate definitions of the dropped kinds are still there — only the offer is gone" (293), ::"AC-5: the 15 frozen-kinds goldens are all there …" (302). Lulus. `test/frozen-kinds.test.js` dan `test/kind-guard.test.js` lulus tanpa diubah. Bergantung pada D1 bila (b) dipilih.
- AC-6: manual — daftar ada di T1(e) di bawah, dihasilkan dari berkas yang benar-benar ditulis scaffold di 6 varian setelah perubahan. Tidak ada teks yang diubah. Pemilik tiket perlu membacanya.
- AC-7: none — belum dikerjakan; snapshot tidak diregenerasi. Menunggu D2. `git diff --stat main..HEAD -- test/fixtures/snapshots` | keluaran kosong.
- AC-8: command — `npm test` | **exit 1** (`# tests 503, # pass 491, # fail 11, # todo 1`). `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | keluaran kosong. Test todo fallback `implementation` masih ada, satu (`test/kind-guard.test.js:118`).
- AC-9: none — belum dikerjakan; README dan CLAUDE.md tidak disentuh. Isinya bergantung pada D1.

Yang TIDAK dibuktikan: menu interaktif itu sendiri. `prompts.inject` melewati daftar pilihan, jadi
test membuktikan (1) filter yang dipakai menu dan (2) hasil scaffold ketika semua yang ditawarkan
dipilih. Bahwa menu memakai filter itu adalah `agents.js:470`.

## Test yang gagal (11)

| Test | Jumlah | Sebab | Tindak lanjut |
|---|---|---|---|
| `sdd03c1-stop-scaffold` AC-2, varian `single-nuxt.auto` dan `mono-pnpm.single` | 4 | D1 | menunggu keputusan |
| `devops-menu-hidden.test.js:18` "devops is listed in HIDDEN_CANDIDATE_KINDS …" | 1 | mengunci hitungan `offered.length === candidates.length - 1` | test lama yang boleh diubah (mengunci kandidat); belum diubah karena angkanya bergantung pada D1 |
| `sdd03b3-commands.test.js` AC-3 "a full scaffold on <fixture> …" | 4 | mengunci himpunan 13 command | sama |
| `sdd03b3-commands.test.js` AC-4 "the same 13 commands, …" | 2 | mengunci himpunan 13 command | sama |

Tidak ada test lain yang gagal: `frozen-kinds`, `kind-guard`, `repo-context` (snapshot),
`sdd02*`, `sdd03b1`, `sdd03b2`, `single-repo-scaffold`, `skills-*`, `complete-drafts` lulus tanpa
diubah.

## Proposed Spec Changes
- AC-2, bila D1(a): tambahkan pengecualian "di `SINGLE_REPO` tanpa `--role`, `/caf-run-pipeline` juga tidak ditulis karena tidak ada agent implementasi". Alasan: D1.
- AC-1, AC-5, Outcome, bila D1(b): enam kind menjadi lima; `implementer` pindah ke 03c3. Alasan: D1.
- AC-7: nyatakan apakah helper snapshot ikut berubah, dan bila ya, izinkan tiga entri pada T1(f) berubah. Alasan: D2.
- §3 Assumption A2: `devops` tersembunyi dari menu tetapi tetap ada di snapshot; "pola itu dipakai ulang" berarti snapshot tidak berubah. Alasan: D2.

## Catatan

### Jawaban Open Questions
- Q-1: lihat T1(a). Command tidak punya mekanisme tersembunyi; dibuat yang minimal (`HIDDEN_COMMAND_FILES` + `isHiddenCommand`), diperiksa di tempat command ditulis.
- Q-2: tidak. Lihat T1(b).

### Hasil T1

**(a) Titik masuk dan mekanisme tersembunyi.**
- Agent ditulis di satu tempat: `agents()` (`src/commands/agents.js`), dipanggil oleh `scaffold agents` dan oleh langkah "Agents" pada `scaffold` polos (`scaffold.js`, `TARGETS.agents`). Tidak ada perintah `init` terpisah: `scaffold` polos adalah rantai penuhnya.
- Kind dipilih hanya lewat satu multiselect, "Pick the agents to generate" (`agents.js:465-472`). Tidak ada jalur non-interaktif: `scaffold` tidak punya `--yes` maupun flag pemilih agent (flag-nya: `--dir`, `--dry-run`, `--app`, `--agent-dir`, `--command-dir`, `--force`, `--mode`, `--scope`, `--role`; dikunci test AC-1 baris 117). `--role` memilih kind agent implementasi di `SINGLE_REPO`, tetapi kandidatnya tetap harus dipilih di menu, jadi `--role implementer` tidak menjadi jalur eksplisit ke kind tersembunyi.
- Mode: `MONOREPO` memakai `buildCandidates` (setelah dua pemilih app), `SINGLE_REPO` memakai `buildSingleRepoCandidates`. Keduanya bermuara di menu yang sama, jadi satu filter mencakup semua mode.
- Mekanisme agent: `HIDDEN_CANDIDATE_KINDS`, dipakai hanya untuk menyaring pilihan menu. Definisi kandidat tetap ada.
- Command, 13 berkas, empat jalur: (1) `PREVIEW_COMMANDS`, otomatis saat role-nya dipilih: `caf-plan-ticket`, `caf-design-ticket`, `caf-qa-check`, `caf-review-ticket`; (2) otomatis saat Auditor atau PM dipilih: `caf-audit-scan`, `caf-audit-to-ticket`, `caf-discovery-start`, `caf-discovery-to-ticket`; (3) opt-in lewat konfirmasi: `caf-run-pipeline` (butuh Planner + agent implementasi), `caf-fix-review`, `caf-review` (butuh Reviewer); (4) target sendiri: `scaffold complete-drafts` (ada di rantai), `scaffold feature-catalog-sync` (hanya eksplisit).
- Tiga dari delapan command yang dibuang (`design-ticket`, `qa-check`, `review-ticket`) menempel pada kind yang dipertahankan, jadi menyembunyikan kind tidak cukup; pemeriksaan harus di tempat penulisan.

**(b) Folder discovery dan audit.** Scaffold default tidak membuat `.caf/discovery` atau `.caf/audits` dan tidak menulis templat ke sana. Satu-satunya jejak: `src/steps/04-generate-drafts.js:36-46` menambahkan empat baris ke `.gitignore` (`.caf/discovery/*/`, `!.caf/discovery/README.md`, `.caf/audits/*/`, `!.caf/audits/README.md`). Itu berkas di root, bukan di dalam dua folder itu; tidak diubah, dicatat sebagai temuan. Target `golden-examples`, `adr`, dan `task-completion` tidak dijalankan oleh helper golden (butuh banyak prompt); dari pembacaan kode mereka hanya menulis di `.caf/knowledge/` dan `.caf/workflows/`.

**(c) Himpunan berkas default sebelum perubahan.** Di `test/fixtures/pre-sdd03c1/<varian>.json` (commit `a384929`), direkam lewat perintah sungguhan pada salinan fixture (`test/helpers/default-file-set.js`: langkah draft Setup, `scaffold agents` dengan semua yang ditawarkan dipilih dan semua konfirmasi ya, `workflow`, `complete-drafts`, `feature-catalog-sync`).

| Varian | Agent | Command |
|---|---|---|
| `mono-pnpm.auto` | 10 | 13 |
| `mono-pnpm.single` | 9 (dengan `caf-implementer`) | 13 |
| `single-nuxt.auto` | 9 (dengan `caf-implementer`) | 13 |
| `single-nuxt.auto.frontend` / `.backend` | 9 | 13 |
| `single-nuxt.mono` | 8 (tanpa agent implementasi) | 12 (tanpa `caf-run-pipeline`, sudah begitu sebelumnya) |

**(d) Test yang mengunci kandidat, himpunan berkas default, atau hitungan.** `devops-menu-hidden.test.js:18` (hitungan kandidat yang ditawarkan); `sdd03b3-commands.test.js` (daftar literal `COMMAND_FILES` 13 berkas, dipakai AC-3 dan AC-4-nya) dan `test/helpers/commands-render.js`. Yang ternyata tidak terpengaruh: `kind-guard` (angka 13 adalah `KNOWN_KINDS`), `sdd03b1-validator` (filter `NO_TRACKER_PROMPT` sudah membuang tiga kind itu), `single-repo-scaffold`, `skills-scaffold`, `complete-drafts` (menyuntikkan kandidat langsung, melewati menu).

**(e) Teks yang masih menyebut agent atau command yang dibuang (temuan, tidak diubah).**

A. Berkas hasil scaffold default setelah perubahan. "semua" = keenam varian.

| Berkas | Baris | Kutipan | Varian |
|---|---|---|---|
| `.caf/knowledge/INDEX.md` | 8-9 | "documents under `.caf/discovery/` are per-feature drafts written by the PM Agent during the Discovery flow (Cluster 1)" | semua |
| `.caf/workflows/piv-workflow.md` | 24-27 | "Documentation — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)", sama untuk PM, UX Designer, Auditor | semua |
| `.claude/agents/caf-planner.md` | 33-49, 150 | "### Fallback — Discovery draft without a ticket", "the slug produced by `/caf-discovery-start`", "whether `.caf/discovery/{TICKET-ID}/prd.md` exists" | semua |
| `.claude/commands/caf-fix-review.md` | 14 | "`/caf-review-ticket` — run it only when you actually intend to respond to review comments now." | semua |
| `.claude/commands/caf-review.md` | 14 | "read-only preview like `/caf-review-ticket`" | semua |
| `.claude/commands/caf-run-pipeline.md` | 3 | "description: Run the entire Cluster 2 pipeline (Planner → Architect → implementation → Documentation → QA → Reviewer)" | yang punya agent implementasi |
| `.claude/commands/caf-run-pipeline.md` | 169, 173, 175, 365, 429 | "Don't proceed to Documentation/QA/Reviewer", "## 4. Documentation (non-blocking)", "This project has no Documentation Agent (`.claude/agents/caf-documentation.md` was not generated)", baris ringkasan "Documentation status" | sama |
| `.gitignore` | 1-4 | `.caf/discovery/*/`, `!.caf/discovery/README.md`, `.caf/audits/*/`, `!.caf/audits/README.md` | semua |

Tidak ditemukan: `caf-planner.md` hasil render tidak memuat kata "Documentation" (Finding di spec tentang urutan agent tidak muncul sebagai teks literal di berkas ini); `agent-handoff.md` tidak lagi menyebut satu pun agent yang dibuang.

B. Teks CLI, bukan berkas hasil generate (lihat D3).

| Lokasi | Kutipan | Kenapa tidak benar lagi |
|---|---|---|
| `src/commands/agents.js:80` (`CAF_WARNING`) | "Auditor is independent … it can be picked any time without Planner." | Auditor tidak ditawarkan |
| `src/commands/agents.js:431` | "SINGLE_REPO: the implementation agent is generated as caf-implementer.md." | tidak lagi dibuat (D1) |
| `src/index.js:69`, `:74-78` | bantuan `--scope` ("the implementer agent's scope") dan `--role` ("Omit for \"implementer\"") | sama |
| `src/index.js:56` dan bantuan `scaffold` | `feature-catalog-sync` masih terdaftar sebagai target | target masih ada, tetapi hanya mencetak "no longer scaffolded" dan tidak menulis |
| `src/commands/audit.js:138-146` | `curate audit` melaporkan gap opsional `caf-feature-catalog-sync.md` dengan saran `caf-init scaffold feature-catalog-sync` | di repo baru gap itu permanen dan sarannya tidak menghasilkan berkas. Sengaja tidak diubah: `curate` harus berperilaku sama (constraint AC-4) |
| `test/single-repo-scaffold.test.js:243` | judul test "SINGLE_REPO candidates: planner, implementer, qa, reviewer are offered" | memeriksa definisi kandidat, bukan yang ditawarkan; test tetap lulus, tidak diubah |

**(f) Entri snapshot yang terkait.** `mono-pnpm.json` punya 16 entri. Milik kind yang dibuang: `.claude/agents/caf-documentation.md`, `.claude/agents/caf-auditor.md`, `.claude/agents/devops.md`. Tidak ada entri command yang dibuang, dan tidak ada `caf-pm.md`/`caf-ux-designer.md` (helper melewatinya). Uji kering D2(b), dibandingkan per entri:

| Entri | Hasil |
|---|---|
| `caf-documentation.md`, `caf-auditor.md`, `devops.md` | hilang |
| `.caf/workflows/piv-workflow.md` | 2 baris: "- [x] Documentation" dan "- [x] Auditor" menjadi "- [ ] … — NOT present, …" |
| `.caf/workflows/agent-handoff.md` | 2 baris tabel hilang (Documentation, Auditor); "`devops.md` — artifact format not yet standard …" menjadi "No custom agents detected outside the standard CAF roles." |
| `.claude/commands/caf-run-pipeline.md` | section 4 berganti cabang (12 baris "Spawn Documentation …" menjadi 3 baris "This project has no Documentation Agent …"); 3 baris whitelist commit `caf-documentation` hilang; 5 baris penjelasan `docs/` hilang |
| 10 entri lain dan `stack` | sama |

### Yang dibangun (commit WIP `a2e803d`)
- `HIDDEN_CANDIDATE_KINDS` = `devops`, `documentation`, `implementer`, `pm`, `ux-designer`, `auditor` (`agents.js:47`). Tidak ada perubahan lain pada jalur agent.
- `HIDDEN_COMMAND_FILES` (8 berkas) dan `isHiddenCommand` (`agents.js:53-66`). Dipakai di loop `PREVIEW_COMMANDS` (`:588`), di blok command pendamping Auditor dan PM (`:765-806`, dua blok lama dijadikan satu loop; tracker tidak ditanyakan bila tidak ada yang ditulis), dan di awal `featureCatalogSync` (`feature-catalog-sync.js:39`, sebelum deteksi dan prompt).
- Tidak disentuh: `src/templates/`, `src/utils/` (termasuk `KNOWN_KINDS`), `scaffold.js`, `index.js`, `audit.js`, semua builder, 15 golden `frozen-kinds`, `pre-sdd02`, `pre-sdd02b`, `pre-sdd03b2`, `pre-sdd03b3`, `legacy-manifest`, `snapshots`. `git diff --stat main..HEAD` untuk path itu kosong.

### Test lama yang diubah
Tidak ada. Tujuh test lama gagal dan belum diubah (tabel "Test yang gagal").

### Entri snapshot yang berubah
Tidak ada. Snapshot tidak diregenerasi (D2).

### Hal tak terduga
1. **D1**: menyembunyikan `implementer` menghilangkan `/caf-run-pipeline` di `SINGLE_REPO` tanpa `--role`. Repo baru di mode itu hanya mendapat planner, architect, qa, reviewer.
2. **D2**: dengan mekanisme yang diminta spec, snapshot tidak berubah; AC-7 mengandaikan ada entri yang hilang.
3. **Isi `/caf-run-pipeline` di repo baru berubah walau template tidak disentuh.** Documentation tidak bisa dipilih lagi, jadi `hasDocumentation` selalu `false` dan command selalu dirender dengan cabang "This project has no Documentation Agent". Cabang itu sudah ada sebelumnya; command tetap berfungsi tanpa agent itu, jadi bukan pemblokir.
4. `curate sync` menulis `.claude/agents/.caf-sync-state.json` (`{}`) walau tidak ada yang di-sync. Perilaku lama, terekam di golden (`added`); test AC-4 memastikan tidak ada berkas lain yang bertambah.
5. Agent tersembunyi hanya di menu. Test yang menyuntikkan kandidat langsung (`single-repo-scaffold`, `skills-scaffold`) masih menghasilkan `caf-implementer.md`. Ini sama dengan perlakuan `devops` sejak awal dan sesuai "mekanisme yang sudah ada"; saya sengaja tidak menambah filter kedua setelah menu, karena itu akan mematahkan test `SINGLE_REPO` yang di luar scope. Command berbeda: diperiksa saat ditulis, jadi tetap tidak tertulis walau kind-nya disuntikkan.
6. Uji merah: sebelum implementasi, 31 dari 46 test baru gagal; 15 yang lulus adalah penjaga "tidak berubah" (AC-3, AC-4, sebagian AC-5).
7. `.ai/` ada di `.gitignore`: `requirements.md`, `tasks.md`, dan laporan ini tidak masuk commit.

### Keadaan repo
- Working tree bersih. Dua commit lokal di `ai-agent/CAF-SDD-03c1`.
- `a384929` sah apa pun keputusannya (golden, direkam sebelum `src/` disentuh).
- `a2e803d` adalah WIP dengan suite merah; pesan commit-nya menyatakan itu. Jangan di-push apa adanya. Setelah D1 sampai D3 dijawab, commit ini saya amend menjadi commit akhir; bila ingin mulai bersih: `git reset --hard a384929`.
- Belum dikerjakan: pembaruan 7 test lama (T5), regenerasi snapshot (T7), README dan CLAUDE.md (T8).

### git diff --stat main..HEAD
```
 src/commands/agents.js                             |  99 ++++---
 src/commands/feature-catalog-sync.js               |  19 +-
 .../pre-sdd03c1/curate-old-repo.mono-pnpm.json     | 236 ++++++++++++++++
 .../pre-sdd03c1/curate-old-repo.single-nuxt.json   | 228 +++++++++++++++
 test/fixtures/pre-sdd03c1/mono-pnpm.auto.json      |  83 ++++++
 test/fixtures/pre-sdd03c1/mono-pnpm.single.json    |  80 ++++++
 .../pre-sdd03c1/single-nuxt.auto.backend.json      |  80 ++++++
 .../pre-sdd03c1/single-nuxt.auto.frontend.json     |  80 ++++++
 test/fixtures/pre-sdd03c1/single-nuxt.auto.json    |  80 ++++++
 test/fixtures/pre-sdd03c1/single-nuxt.mono.json    |  75 +++++
 test/helpers/default-file-set.js                   | 114 ++++++++
 test/helpers/old-repo.js                           |  70 +++++
 test/sdd03c1-stop-scaffold.test.js                 | 305 +++++++++++++++++++++
 13 files changed, 1510 insertions(+), 39 deletions(-)
```

Status: NEEDS_HUMAN — 503 test (491 lulus, 11 gagal, 1 todo) — commit `a384929`, `a2e803d` (WIP)

---

# Lanjutan revisi 2

Bagian di atas adalah STOP pertama (revisi 1), dibiarkan apa adanya. Bagian ini menggantikan
status akhirnya. Nomor baris di bawah mengacu ke commit `f0d392d`.

Status: SUCCESS

Tanggal: 2026-10-12
Spec: `requirements.md` dan `tasks.md` revisi 2 (D1b, D2b, D3), dibaca ulang sampai habis.
Commit: `a384929` (golden, tidak berubah), `f0d392d` (WIP `a2e803d` + perbaikan, di-squash lewat `git reset --soft a384929`). Lokal saja: tanpa push, PR, atau merge.

## Checklist
- [ ] lint — tidak ada skrip lint di `package.json`
- [ ] typecheck — tidak ada skrip typecheck
- [x] test — `npm test`, exit 0: 503 test, 502 lulus, 0 gagal, 1 todo
- [ ] build — tidak ada langkah build

## Acceptance Criteria
Test baru ada di `test/sdd03c1-stop-scaffold.test.js`. "6 varian" = `mono-pnpm.auto`,
`mono-pnpm.single`, `single-nuxt.auto`, `single-nuxt.auto.frontend`, `single-nuxt.auto.backend`,
`single-nuxt.mono`.

- AC-1: automated-test — ::"AC-1: <varian> — the five dropped kinds are not offered, and every other kind still is, in the same order" (baris 85, 6 varian; termasuk "implementer is offered where it was"), ::"… the agent files written are the ones recorded before, minus the five dropped kinds" (92, 6 varian; termasuk "implementer is written where it was"), ::"AC-1: the goldens cover both fixtures, both modes and every --role" (103), ::"AC-1: every mode that had an implementation agent still has it — SINGLE_REPO without --role keeps caf-implementer.md" (112), ::"AC-1: scaffold has no flag that selects an agent kind past the picker" (123). Kode: `src/commands/agents.js:49`, filter menu di blok multiselect "Pick the agents to generate".
- AC-2: automated-test — ::"AC-2: <varian> — the commands written are the ones recorded before, minus the eight dropped ones" (137, 6 varian, kini lulus di keenamnya; memuat asersi `/caf-plan` tidak ditulis), ::"… every other file of the default scaffold is still written" (146, 6 varian), ::"AC-2: the hidden commands are exactly the eight dropped ones, …" (151), ::"AC-2: <fixture> — a selection that still holds the auditor and PM writes none of their commands" (160), ::"… `scaffold feature-catalog-sync` writes nothing" (181), ::"… the builders of the eight dropped commands still render the text recorded before 03b3" (199). Kode: `agents.js:55-68`, `:587`, `:767-790`; `src/commands/feature-catalog-sync.js:39`.
- AC-3: automated-test — ::"AC-3: <varian> — nothing is written under .caf/discovery or .caf/audits (and nothing was before)" (225, 6 varian). Scaffold default memang tidak pernah menulis ke sana (Q-2), jadi tidak ada kode yang dihentikan.
- AC-4: automated-test — ::"AC-4: <fixture> — curate audit and curate sync (dry-run, then write) treat an old repo exactly as before" (239, 2 fixture). Repo memuat keenam kind (lima yang disembunyikan + `implementer` di single-nuxt) dan 13 command. Laporan audit sama persis dengan golden `curate-old-repo.*.json`: 59 dan 54 section `IN_SYNC`, nol untuk status lain; kedua sync mengembalikan daftar kosong; tidak ada berkas terhapus atau berubah.
- AC-5: automated-test — ::"AC-5: every dropped kind is still in KNOWN_KINDS and still detected from its file name" (281, keenam kind), ::"AC-5: HIDDEN_CANDIDATE_KINDS holds exactly the five dropped kinds (no implementer), all of them known kinds" (291), ::"AC-5: the candidate definitions of the dropped kinds are still there — only the offer is gone" (300), ::"AC-5: the 15 frozen-kinds goldens are all there …" (309). `test/frozen-kinds.test.js` dan `test/kind-guard.test.js` lulus tanpa diubah.
- AC-6: manual — sudah ditulis: daftar "Teks yang masih menyebut agent atau command yang dibuang" di bawah, dihasilkan dari berkas yang ditulis scaffold di 6 varian pada `f0d392d`. Tidak ada teks hasil generate yang diubah. Pemilik tiket perlu membacanya.
- AC-7: manual — sudah dijalankan: uji kering lalu regenerasi; hasilnya di "Entri snapshot yang berubah". `git diff --stat main..HEAD -- test/fixtures/snapshots` | `mono-pnpm.json | 11 +-`. Selisih = 3 entri hilang + 3 entri berubah, persis daftar yang diizinkan; 10 entri lain dan `stack` byte-identik. Pemilik tiket perlu membaca `git diff main..HEAD -- test/fixtures/snapshots/mono-pnpm.json`.
- AC-8: command — `npm test` | exit 0 (`# tests 503, # pass 502, # fail 0, # todo 1`); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds` | keluaran kosong. Test todo fallback `implementation` masih ada, satu (`test/kind-guard.test.js:118`).
- AC-9: manual — sudah ditulis: `README.md:145-147` (daftar agent dan command yang di-scaffold), `README.md:353` bagian "No longer scaffolded" (lima agent, delapan command, repo lama tetap, `implementer` sampai 03c3, rilis npm menunggu SDD-04), `README.md:419` (orchestrator dan `caf-documentation`); tabel target tidak lagi memuat `feature-catalog-sync`. `CLAUDE.md:413` sampai akhir (bagian "No longer scaffolded"), `CLAUDE.md:91`, `:337-340`, `:377-382`. Pemilik tiket perlu membaca bagian-bagian itu.
- AC-10: manual — sudah dijalankan sebagian: `node src/index.js scaffold agents --help` | target yang terdaftar `golden-examples|adr|agents|task-completion|workflow|skills|complete-drafts`, tanpa `feature-catalog-sync`; bantuan `--role` dan `--scope` tidak berubah (`git diff main..HEAD -- src/index.js` hanya menyentuh import, dua daftar target, dan bantuan `--command-dir`). `node src/index.js scaffold feature-catalog-sync --dir test/fixtures/mono-pnpm` | "/caf-feature-catalog-sync is no longer scaffolded — nothing written." Daftar koreksi di "Pesan CLI yang dikoreksi". **Alur menu interaktif tidak saya jalankan di terminal** (butuh TTY); isinya dibuktikan lewat filter yang sama di test AC-1. Pemilik tiket perlu menjalankan `caf-init scaffold agents` sekali di fixture.

Yang TIDAK dibuktikan: menu interaktif itu sendiri (`prompts.inject` melewati daftar pilihan),
dan perilaku caf-orchestrator pada repo tanpa `caf-documentation`.

## Proposed Spec Changes
-

## Catatan

### Yang berubah terhadap revisi 1
- `implementer` dikeluarkan dari `HIDDEN_CANDIDATE_KINDS` (D1b). Konflik AC-1/AC-2 hilang: keenam varian lulus.
- Golden `test/fixtures/pre-sdd03c1/` **tidak diubah**. Isinya rekaman sebelum perubahan (daftar path), tidak ada yang menyebut `implementer` sebagai tersembunyi; yang disesuaikan hanya daftar di test baru (`DROPPED_KINDS` lima, `RETIRED_KINDS` enam untuk AC-4 dan AC-5). `git diff --stat a384929..HEAD -- test/fixtures/pre-sdd03c1` kosong.
- Hasil T1(a) sampai (d) di bagian atas tetap berlaku. T1(e) dan (f) digantikan daftar di bawah.

### Pesan CLI yang dikoreksi (T4b, D3)

| Lokasi | Sebelum | Sesudah |
|---|---|---|
| `src/commands/agents.js:77` (`CAF_WARNING`) | diakhiri baris kosong + "Auditor is independent (proactive scan, does not wait for a ticket) — it can be picked any time without Planner. The recommendation above still applies to the normal ticket-driven flow." | tiga baris itu dihapus; tiga baris pertama tidak berubah |
| `src/index.js:46`, `:49` (deskripsi dan argumen `scaffold`) | daftar target memuat `feature-catalog-sync` | daftar dari `OFFERED_TARGETS` (`scaffold.js:43-44`), tanpa `feature-catalog-sync` |
| `src/commands/scaffold.js:125` (pesan target tak dikenal) | "choices:" memuat `feature-catalog-sync` | memakai `OFFERED_TARGETS` |
| `src/index.js:56` (bantuan `--command-dir`) | "only used by agents/feature-catalog-sync targets" | "only used by agents/complete-drafts targets" (`complete-drafts` memang menerima `commandDir`) |
| `src/commands/feature-catalog-sync.js:39-48` (pesan baru, dari WIP) | menjalankan deteksi, prompt arsitektur, lalu menulis | "/caf-feature-catalog-sync is no longer scaffolded — nothing written. An existing … is left as it is." |

Tidak diubah, dengan alasan:
- Bantuan `--role` dan `--scope` (dilarang spec), dan peringatan "SINGLE_REPO: the implementation agent is generated as caf-implementer.md" (benar lagi setelah D1b).
- Pesan "✗ UX Designer was selected without Product Manager" dan judul section command Auditor/PM di `agents.js`: tidak terjangkau lagi dari menu, jadi tidak pernah tercetak. Dibiarkan (kode mati di luar scope).
- `src/commands/audit.js:138-146`: `curate audit` masih melaporkan `caf-feature-catalog-sync.md` sebagai gap opsional dengan saran `caf-init scaffold feature-catalog-sync`. Sengaja tidak disentuh karena `curate` harus berperilaku sama (constraint AC-4). Di repo baru gap opsional itu permanen, dan sarannya berujung pada pesan "no longer scaffolded". **Ini satu-satunya pesan yang masih mengarah ke command yang dibuang**; perlu keputusan di tiket berikutnya.
- Target `feature-catalog-sync` tetap ada di `TARGETS` (hanya keluar dari bantuan), supaya saran `curate` di atas tidak berujung "unknown target".

### Test lama yang diubah

| Berkas | Perubahan | Alasan |
|---|---|---|
| `test/devops-menu-hidden.test.js:24` | `candidates.length - 1` menjadi `candidates.length - HIDDEN_CANDIDATE_KINDS.length`, komentar di atasnya | mengunci jumlah kandidat yang ditawarkan |
| `test/sdd03b3-commands.test.js:267` (AC-3, 4 test) | prakondisi himpunan command: 13 menjadi `WRITTEN_FILES` (5) | mengunci himpunan command |
| `test/sdd03b3-commands.test.js:298-306` (AC-4, 2 test) | judul; himpunan command menjadi `WRITTEN_FILES`; pembanding per berkas lewat `SINCE_03C1` (`:59-83`) | mengunci himpunan command, dan isi dua command yang memuat daftar agent yang dibuang (lihat hal tak terduga 1) |
| `test/helpers/mono-snapshot.js:52-56`, `:102` | hanya merender kandidat yang ditawarkan; `hasDocumentation` diturunkan dari kandidat | T7, D2b |

Golden `pre-sdd03b3` tidak diregenerasi. Asersi "golden memuat 13 command" tetap ada. Delapan
command yang dibuang kini dibandingkan dengan golden itu lewat builder-nya di test baru (baris
199), jadi tidak ada command yang lepas dari penguncian byte.

Test lama lain tidak berubah. `test/helpers/old-repo.js` (helper baru dari commit golden) diberi
simpan/pulihkan `process.exitCode`, karena `audit()` menyetelnya ke 1 pada gap wajib dan itu
membuat berkas test keluar dengan kode 1 walau semua test lulus.

### Entri snapshot yang berubah (T7)
Uji kering dijalankan sebelum menulis, hasilnya sama dengan yang diregenerasi. Format berkas
terjaga (`JSON.stringify(…, null, 2)` + newline menghasilkan ulang berkas lama byte demi byte
sebelum perubahan). 16 entri menjadi 13.

Hilang (3): `.claude/agents/caf-documentation.md`, `.claude/agents/caf-auditor.md`, `.claude/agents/devops.md`.

Berubah (3):

`.caf/workflows/piv-workflow.md` — 2 baris, cabang "NOT present" roster yang sudah ada:
```
- - [x] Documentation
+ - [ ] Documentation — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)
- - [x] Auditor
+ - [ ] Auditor — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)
```

`.caf/workflows/agent-handoff.md` — 2 baris tabel hilang, 1 baris berganti (cabang "tanpa agent custom" yang sudah ada):
```
- | Documentation | update `docs/` (parallel, non-blocking) |
- | Auditor | `audit-report.md` (in `.caf/audits/{DATE}/`, not `.caf/tasks/` — see CAF.md Cluster 4) |
- - `devops.md` — artifact format not yet standard, needs manual definition (TODO)
+ No custom agents detected outside the standard CAF roles.
```

`.claude/commands/caf-run-pipeline.md` — cabang `hasDocumentation: false` yang sudah ada:
```
- Spawn Documentation (`.claude/agents/caf-documentation.md`) to update the documentation to match
- the changes already written.
- … (10 baris lagi: prompt verbatim, "This stage is NON-BLOCKING …", "Do not retry this stage …")
+ This project has no Documentation Agent (`.claude/agents/caf-documentation.md` was not
+ generated) — skip this stage, note "not available" in the final summary. This is not a
+ pipeline failure.
- - `caf-documentation`: `README.md`
- - `caf-documentation`: `CHANGELOG.md`
- - `caf-documentation`: `docs/`
- `docs/` is whitelisted as one whole folder (not a specific subpath) because the Documentation
- … (3 baris lagi + 1 baris kosong)
```

Tidak berubah (10): `CLAUDE.md`, `AGENTS.md`, `.caf/tasks/README.md`, `.caf/workflows/task-completion.md`, `caf-planner.md`, `caf-architect.md`, `caf-frontend.md`, `caf-backend.md`, `caf-qa.md`, `caf-reviewer.md`; juga `stack` dan urutan kunci.

Catatan terhadap bunyi instruksi: dua dari tiga entri (`piv-workflow.md`, `agent-handoff.md`)
berubah lewat cabang roster ("NOT present", "No custom agents"), bukan lewat cabang "no
Documentation Agent" secara harfiah. Ketiganya ada di daftar yang diizinkan dan persis sama dengan
uji kering revisi 1 yang menjadi dasar D2b, jadi saya tidak STOP. Tidak ada teks template yang
berubah (`git diff --stat main..HEAD -- src/templates src/utils` kosong).

### Teks yang masih menyebut agent atau command yang dibuang (AC-6, temuan, tidak diubah)
"semua" = keenam varian.

| Berkas | Baris | Kutipan | Varian |
|---|---|---|---|
| `.caf/knowledge/INDEX.md` | 8-9 | "documents under `.caf/discovery/` are per-feature drafts written by the PM Agent during the Discovery flow (Cluster 1)" | semua |
| `.caf/workflows/piv-workflow.md` | 24-27 | "Documentation — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)", sama untuk PM, UX Designer, Auditor | semua |
| `.claude/agents/caf-planner.md` | 33-49, 150 | "### Fallback — Discovery draft without a ticket", "the slug produced by `/caf-discovery-start`", "whether `.caf/discovery/{TICKET-ID}/prd.md` exists" | semua |
| `.claude/commands/caf-fix-review.md` | 14 | "`/caf-review-ticket` — run it only when you actually intend to respond to review comments now." | semua |
| `.claude/commands/caf-review.md` | 14 | "read-only preview like `/caf-review-ticket`" | semua |
| `.claude/commands/caf-run-pipeline.md` | 3 | "description: Run the entire Cluster 2 pipeline (Planner → Architect → implementation → Documentation → QA → Reviewer)" | 5 varian (semua kecuali `single-nuxt.mono`) |
| `.claude/commands/caf-run-pipeline.md` | 169, 173, 175, 365, 429 | "Don't proceed to Documentation/QA/Reviewer", "## 4. Documentation (non-blocking)", "This project has no Documentation Agent (`.claude/agents/caf-documentation.md` was not generated)", "{docsNote — Documentation status from stage 4 …", baris tabel "Documentation" | sama |
| `.gitignore` | 1-4 | `.caf/discovery/*/`, `!.caf/discovery/README.md`, `.caf/audits/*/`, `!.caf/audits/README.md` | semua |

`implementer` tidak masuk daftar: ia tetap di-scaffold. Tidak ditemukan penyebutan `devops`,
`caf-design-ticket`, `caf-qa-check`, `caf-audit-*`, `caf-discovery-to-ticket`, atau
`feature-catalog` di berkas hasil scaffold.

### Hal tak terduga
1. **Dua command yang dipertahankan berbeda isi dari golden 03b3 walau template-nya tidak berubah**, karena isinya bergantung pada agent yang ada:
   - `/caf-complete-drafts`: inventaris draft kehilangan empat baris (`caf-auditor.md`, `caf-documentation.md`, `caf-pm.md`, `caf-ux-designer.md`).
   - `/caf-run-pipeline`: dirender dengan `hasDocumentation: false` (sama dengan entri snapshot di atas).
   Test 03b3 tidak dilonggarkan menjadi "boleh beda": untuk `/caf-complete-drafts` ia menuntut golden dikurangi tepat empat baris itu; untuk `/caf-run-pipeline` ia lebih dulu membuktikan builder hari ini dengan `hasDocumentation: true` masih sama dengan golden, lalu menuntut berkas hasil scaffold sama dengan render `false` dari panggilan yang sama. `/caf-plan-ticket` tetap byte-identik. Saya menilai ini masuk "daftar yang mencantumkan kind yang dibuang", bukan diff di luar izin; bila pemilik tiket menilai lain, ini yang perlu dilihat (`test/sdd03b3-commands.test.js:59-83`).
2. `curate audit` di repo baru (lihat "Tidak diubah" pada pesan CLI).
3. Agent tersembunyi hanya di menu, sama seperti `devops` sejak awal. Test yang menyuntikkan kandidat langsung masih bisa menghasilkan berkasnya; pengguna tidak punya jalur itu. Command berbeda: diperiksa saat ditulis.
4. Jumlah test tetap 503 dibanding WIP: satu test AC-1 diganti isinya, tidak ada yang ditambah atau dibuang.
5. Dari revisi 1, masih berlaku: `curate sync` menulis `.claude/agents/.caf-sync-state.json` walau tidak ada yang di-sync (perilaku lama, terekam di golden).
6. `.ai/` ada di `.gitignore`: `requirements.md`, `tasks.md`, dan laporan ini tidak masuk commit.

### Tidak tersentuh
`src/templates/`, `src/utils/` (termasuk `KNOWN_KINDS`), `src/commands/audit.js`, semua builder;
`test/fixtures/frozen-kinds/` (15 golden), `pre-sdd02/`, `pre-sdd02b/`, `pre-sdd03b2/`,
`pre-sdd03b3/`, `legacy-manifest/`, `pre-sdd03c1/` (sejak `a384929`). `git diff --stat main..HEAD`
untuk path itu kosong. Apa pun di caf-orchestrator.

### git diff --stat main..HEAD
```
 CLAUDE.md                                          |  63 ++++-
 README.md                                          |  26 +-
 src/commands/agents.js                             | 104 ++++---
 src/commands/feature-catalog-sync.js               |  19 +-
 src/commands/scaffold.js                           |   8 +-
 src/index.js                                       |   8 +-
 test/devops-menu-hidden.test.js                    |   4 +-
 .../pre-sdd03c1/curate-old-repo.mono-pnpm.json     | 236 ++++++++++++++++
 .../pre-sdd03c1/curate-old-repo.single-nuxt.json   | 228 +++++++++++++++
 test/fixtures/pre-sdd03c1/mono-pnpm.auto.json      |  83 ++++++
 test/fixtures/pre-sdd03c1/mono-pnpm.single.json    |  80 ++++++
 .../pre-sdd03c1/single-nuxt.auto.backend.json      |  80 ++++++
 .../pre-sdd03c1/single-nuxt.auto.frontend.json     |  80 ++++++
 test/fixtures/pre-sdd03c1/single-nuxt.auto.json    |  80 ++++++
 test/fixtures/pre-sdd03c1/single-nuxt.mono.json    |  75 +++++
 test/fixtures/snapshots/mono-pnpm.json             |  11 +-
 test/helpers/default-file-set.js                   | 114 ++++++++
 test/helpers/mono-snapshot.js                      |  12 +-
 test/helpers/old-repo.js                           |  74 +++++
 test/sdd03b3-commands.test.js                      |  39 ++-
 test/sdd03c1-stop-scaffold.test.js                 | 312 +++++++++++++++++++++
 21 files changed, 1662 insertions(+), 74 deletions(-)
```

Status: SUCCESS — 503 test (502 lulus, 1 todo, 0 gagal) — commit `a384929`, `f0d392d`
