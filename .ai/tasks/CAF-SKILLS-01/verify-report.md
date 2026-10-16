# Verify Report: CAF-SKILLS-01 — Skills untuk CAF (v1)

- **Status: PASS.** AC-1 s.d. AC-8, AC-10, AC-12 lulus; AC-11 lulus dengan batasan (Deviasi 6);
  **AC-9 PASS dengan batasan** (dispatch nyata dijalankan manusia di umkm-pos, lihat bagian 3a).
- Tanggal: 2026-10-08 (revisi 3: penutupan; revisi 2 = tindak lanjut hasil AC-9)
- Branch: `feat/caf-skills-01` (dari `main` @ `3b327af`), 13 commit kode. Tidak di-push, tidak
  di-merge.
- Laporan ini file lokal dan **tidak di-commit** (`.ai/` di-gitignore). Commit laporan lama
  `780c3e1` sudah tidak ada di branch mana pun saat revisi ini dimulai (`git branch --contains
  780c3e1` kosong); bukan saya yang menghapusnya.
- Acuan: `requirements.md` v2. Di mana `design.md`/`tasks.md` berbeda, requirements v2 yang
  diikuti (lihat Deviasi).

## 1. Quality gate

| Gate | Hasil |
|---|---|
| `npm test` | **191 lulus, 0 gagal** (baseline 124 + 67 test baru; 4 di antaranya dari revisi 2) |
| `git diff --stat main -- test/fixtures/snapshots/` | kosong (dicek setelah tiap task dan di akhir) |
| lint / format / typecheck | **tidak ada** script-nya di `package.json` (`scripts`: `start`, `test`, `release`). Dilaporkan sebagai gap, tidak dibuat-buat |
| dependency baru | tidak ada (`package.json` tidak berubah) |

## 2. Attempt log per task

| Task | Commit | Percobaan | Catatan |
|---|---|---|---|
| 0 Baseline | (tanpa commit) | 1 | 124 lulus, tree bersih, branch dibuat dari `main` |
| 1 Builder `## Skills` + `skills = []` | `0215a6b` | 1 | 131 lulus. Termasuk `export buildVerifyChecklist` dan ekstraksi `makeRepo` (FR-11) |
| 2 `TEMPLATE_SECTION_ORDER` | `c6cc653` | 2 | Percobaan 1: satu test baru gagal karena asumsi bentuk blok salah (`insertSection` menulis 4 baris: kosong, heading, isi, kosong). Test diperbaiki, kode tidak berubah. 135 lulus |
| 3 Template skill | `ca4017e` | 1 | 145 lulus |
| 4 `scaffold skills` (tulis skill) | `7c537c4` | 1 | 158 lulus |
| 5 Penyisipan pointer (D8) | `6a87573` | 2 | Percobaan 1: satu test gagal karena helper test salah menghitung jumlah prompt (qa tidak ditanya bila tak ada skill yang bisa dipakai). Test diperbaiki, kode tidak berubah. 173 lulus |
| 6 `scaffold agents` mengoper `skills` | `ef24085` | 1 | 176 lulus |
| 7 `check-drafts` + `listDraftFiles` | `80f0df0` | 1 | 186 lulus |
| 8 `/caf-complete-drafts` | `0ea697d` | 1 | 187 lulus |
| 9 Dokumentasi | `5ba0d23` | 1 | 187 lulus |
| 10 Verify | (laporan lokal) | 1 | lihat bagian 3 dan 4 |
| 11 AC-9 | - | - | dijalankan manusia di umkm-pos; hasil di bagian 3a |
| R2-1 Kalimat pembuka `## Skills` | `3a72ff8` | 1 | 188 lulus (+1 test; 1 test lama dikunci ke wording baru) |
| R2-2 Baris kedua banner DRAFT | `5065fad` | 1 | 190 lulus (+2 test; test dry-run parity diperluas) |
| R2-3 Instruksi hapus kedua bagian banner | `c2eeccb` | 1 | 190 lulus (asersi ditambah di test `/caf-complete-drafts`) |
| R2-4 `check-drafts` WARN banner separuh | `533088d` | 1 | 191 lulus (+1 test) |

Tidak ada task yang mencapai batas 3 retry.

## 3. Acceptance criteria

| AC | Status | Bukti |
|---|---|---|
| AC-1 | PASS | `npm test`: 187 lulus (124 lama + 63 baru). `git diff --stat main -- test/fixtures/snapshots/` kosong. Test `buildAgentMd: no skills and skills: [] are byte-identical for every kind` (`test/skills-section.test.js`) |
| AC-2 | PASS | Test `AC-2: --dry-run writes nothing — single-nuxt` / `— mono-pnpm` (`test/skills-scaffold.test.js`). E2E langkah a: `tree-unchanged=yes` di 4 varian |
| AC-3 | PASS | Test `AC-3: a real run writes every skill, a second run changes no byte` (2 fixture) dan `pointers: idempotent — a second run shows no prompt and changes no byte`. E2E langkah b: `created=5`; langkah c: `tree-unchanged=yes` |
| AC-4 | PASS | Test `AC-4/AC-7: audit and sync dry-run report the same before and after ## Skills is inserted` dan `AC-4/AC-7 end to end … real scaffold skills` (tanpa dan dengan manifest). E2E langkah d: exit code sama dengan sebelum fitur (0→0, 1→1, 1→1, 1→1) dan keluaran `identical-to-pre=yes`; langkah e: `identical-to-pre=yes`, `mentions-Skills=0` |
| AC-5 | PASS | Test `AC-5: a repo without package.json does not crash; caf-verify is a DRAFT full of TODO lines` (memakai `makeRepo` dari `test/helpers/make-repo.js`): 5 skill tertulis, banner ada, 4 baris TODO, tanpa command karangan |
| AC-6 | PASS | Test `AC-6: a pointer at a file that does not exist is a FAIL, and the check writes nothing` (exit 1, 4 FAIL, tree identik) dan `AC-6: a pointer at a DRAFT skill is a WARN, not a FAIL` (`test/skills-check-drafts.test.js`) |
| AC-7 | PASS | E2E mono + manifest: baris DRIFT sebelum fitur = 4 (audit) + 4 (sync) = **8**; sesudah = 4 + 4 = **8**; `agent sections tracked: 55 in-sync, 4 drift` tidak berubah. pm/ux-designer: test AC-4/AC-7 memastikan tidak ada entri "missing" dan `## Skills` tidak pernah dilaporkan; E2E: kedua file tidak mendapat section |
| AC-8 | PASS | Test `AC-8: no generate-time placeholder in any skill, for every repo shape` (single, mono, kosong, lengkap) dan `dry-run parity …` yang memeriksa file di disk |
| AC-9 | **PASS dengan batasan** | Dijalankan manusia di umkm-pos, `claude` 2.1.292. Bukti dan batasan di bagian 3a. Angka di sana dilaporkan oleh penguji; tidak diulang dari repo ini |
| AC-10 | PASS | Test `AC-10: generator output — constant skills give 0 WARN and no TODO count; nothing fails`. E2E langkah f: jumlah WARN sama dengan sebelum fitur (10→10, 11→11, 0→0, 0→0) dan 0 WARN menyebut skill/pointer |
| AC-11 | PASS dengan batasan (keputusan user) | Paruh pertama: test `pointers: every mapped kind gets its section, only usable skills are listed …` dan E2E `pointers-to-draft=0`. Paruh kedua: test `AC-11: after the banner is removed, a re-run points agents without a Skills section at the skill — and never edits one that has it`. Agent yang **sudah** punya `## Skills` tidak mendapat pointer otomatis (lihat Deviasi 6) |
| AC-12 | PASS | Test `isPureInsertion: accepts one inserted block, rejects any other change`; test `pointers: every mapped kind …` (membuang blok mengembalikan isi lama byte demi byte, untuk tiap agent); test `AC-12: an agent that already has a ## Skills section is never edited, whatever it says`; test `pointers: --force never rewrites an agent definition` |

## 3a. AC-9 — dispatch nyata di umkm-pos (dilaporkan penguji)

**Status: PASS dengan batasan** (keputusan Ganjar). Semua angka di bagian ini dilaporkan penguji;
tidak diulang dari repo ini. Versi: `claude` 2.1.292.

### Run eksplorasi (yang melahirkan revisi 2)

| Yang diuji | Hasil | Arti |
|---|---|---|
| Wording pointer lama ("Before you start, `Read` …"), tugas c/t | skill dibaca **0/12** | Wording lama gagal; diganti (`3a72ff8`) |
| Wording tegas ("MANDATORY FIRST STEP …") | skill dibaca **69/69** | Wording yang dipakai generator |
| Aturan keluaran yang wajar di dalam skill | diterapkan **22/22** | Skill yang dibaca memang diterapkan |
| Gerbang DRAFT, banner satu kalimat, planner | dipatuhi **9/9** | |
| Gerbang DRAFT, banner satu kalimat, frontend | dipatuhi **6/9** (3 pelanggaran) | Tidak cukup untuk agent implementasi |
| Gerbang DRAFT, banner tegas, frontend | dipatuhi **5/5** | Dasar penambahan baris "Agents: …" (`5065fad`) |
| Varian "section `## Skills` dipindah ke atas" | **3/6** melanggar gerbang | Ditolak; posisi tetap sebelum `## Constraints` |

### Run konfirmasi (generator default)

Keluaran generator apa adanya dari branch ini, umkm-pos, `RUNS=5`, agent `caf-planner` dan
`caf-frontend`.

| Kasus | caf-planner | caf-frontend |
|---|---|---|
| Agent membaca skill (semua kasus) | **30/30** gabungan kedua agent | |
| a+b: kode skill lengkap muncul, skill DRAFT diabaikan | 5/5 | 5/5 |
| Gerbang DRAFT | **0 pelanggaran dari 10** run (gabungan) | |
| c: tugas yang tidak menyinggung skill | 5/5 | 4/5 |
| t | 5/5 | 5/5 |

### Ringkasan gabungan

| Ukuran | Hasil |
|---|---|
| Pembacaan skill, wording lama vs wording tegas | 0/12 vs **99/99** |
| Aturan skill diterapkan | **41/42** (~98%) |
| Gerbang DRAFT, frontend: banner satu baris vs banner final | 6/9 dipatuhi vs **0/10 pelanggaran** (belum signifikan, p~0,15) |

### Batas

- Kepatuhan bersifat **probabilistik**, bukan penegakan.
- Sampel kecil.
- Hanya 2 kind yang diuji (`planner`, `frontend`).
- Generator tidak pernah menulis pointer ke skill DRAFT, jadi kebocoran gerbang hanya mungkin bila
  manusia menambah pointer manual sebelum menghapus banner; `check-drafts` memberi WARN untuk itu.

Pelajaran uji: aturan berupa token acak yang diberi label "disuntik"/"uji" **ditolak agent sebagai
prompt injection**. Itu perilaku keamanan agent, bukan temuan tentang mekanisme skill. Uji
kepatuhan harus memakai aturan keluaran yang wajar.

## 4. Uji fixture di direktori sementara

Lokasi: scratchpad sesi di bawah `/private/tmp/…` (bukan repo ini, bukan umkm-pos). Target: salinan
`single-nuxt` (10 file agent) dan `mono-pnpm` (11 file agent) yang di-scaffold dengan kode `main`,
masing-masing dua varian: tanpa manifest dan dengan `curate baseline`. "Sebelum fitur" diukur
dengan salinan `src/` dari `main`.

| Langkah | single, tanpa manifest | single, bermanifest | mono, tanpa manifest | mono, bermanifest |
|---|---|---|---|---|
| Sebelum fitur: audit exit / baris DRIFT (audit+sync) / CONFLICT | 0 / 0+0 / 0 | 1 / 2+2 / 0 | 1 / 0+0 / 0 | 1 / 4+4 / 0 |
| a. `scaffold skills --dry-run` | 5 skill "would write", 6 agent "would add", tree tidak berubah | sama | 5 skill, 7 agent, tree tidak berubah | sama |
| b. run nyata (jawaban `y`) | 5 skill dibuat, 6 agent disisipi, 0 pointer ke skill DRAFT | sama | 5 skill, 7 agent, 0 pointer ke DRAFT | sama |
| c. run kedua | tree tidak berubah | tree tidak berubah | tree tidak berubah | tree tidak berubah |
| d. `curate --audit-only` | exit 0, keluaran identik dengan sebelum fitur | exit 1, identik | exit 1, identik | exit 1, identik (`55 in-sync, 4 drift`) |
| e. `curate --sync-only --dry-run` | identik, DRIFT 0 | identik, DRIFT 2 | identik, DRIFT 0 | identik, DRIFT 4 |
| f. `curate --check-drafts` | exit 0, 0 fail, 10 warn (sama dengan sebelum fitur) | exit 0, 0 fail, 0 warn | exit 0, 0 fail, 11 warn (sama) | exit 0, 0 fail, 0 warn |

**Uji diulang setelah revisi 2 (wording + banner baru), hasil sama di semua sel:** dry-run 5 skill
+ 6/7 agent dan tree tidak berubah; run nyata 5 skill, 6/7 agent disisipi, 0 pointer ke skill
DRAFT; run kedua tree tidak berubah; `--audit-only` dan `--sync-only --dry-run` identik dengan
sebelum fitur (baris DRIFT 0+0, 2+2, 0+0, **4+4**; CONFLICT 0); `--check-drafts` exit 0 dengan
jumlah warn sama dengan sebelum fitur (10, 0, 11, 0). Tambahan yang diperiksa: semua agent yang
disisipi memuat "MANDATORY FIRST STEP" (6 dan 7 file); `caf-verify` punya 3 baris blockquote
banner; setelah dua baris kalimat `DRAFT` dihapus tangan dan baris "Agents: …" dibiarkan,
`--check-drafts` mengeluarkan
`WARN … DRAFT banner only partly removed: agents will ignore this skill forever — delete the line "Agents: this skill is NOT ready..." too`.

Catatan:
- Skill DRAFT terdeteksi di langkah f pada semua varian:
  `INFO .claude/skills/caf-verify/SKILL.md — 1 TODO(s) still open — DRAFT, agents skip this skill until it is finished`.
- Peringatan DRAFT juga muncul di langkah a dan b: `⚠ caf-verify: DRAFT — a verification script was not detected …`.
- Jumlah agent yang disisipi sesuai pemetaan D7: single = architect, documentation, implementer,
  planner, qa, reviewer; mono = architect, backend, documentation, frontend, planner, qa, reviewer.
  auditor, devops, pm, ux-designer tidak disentuh.
- DRIFT yang ada sebelum fitur (pm/ux `Working Pattern`, qa/reviewer `Input`) adalah tiket
  terpisah §10.1 dan tidak dikerjakan di sini.
- Jalur CLI nyata dipakai untuk semua langkah (`node src/index.js …`), termasuk prompt di langkah b.

## 5. Deviasi

1. **Nama skill.** `design.md` memakai `scope-discipline`/`no-guess`; requirements v2 (D6, H1)
   menetapkan `caf-scope-discipline`/`caf-no-guess`. Diikuti: requirements.
2. **Pointer ke skill DRAFT.** `design.md` §7 menulis pointer ke skill DRAFT lalu memberi WARN;
   requirements v2 (D8, AC-11) melarangnya. Diikuti: requirements. Berlaku juga untuk agent baru
   dari `scaffold agents` (`usableSkillPaths`).
3. **Commit.** `tasks.md` berkata "tidak commit"; instruksi fase ini meminta satu commit per task.
   Diikuti: instruksi.
4. **File test lama.** `tasks.md` berkata file test lama tidak diubah; FR-11 meminta `makeRepo`
   diekstrak. `test/repo-context.test.js` berubah hanya pada import (fungsi lokal dipindah ke
   `test/helpers/make-repo.js`); isi test tidak berubah.
5. **Dua pemeriksaan tambahan di `design.md` tidak dibuat** karena tidak ada di FR-7: WARN untuk
   pointer ke `caf-piv`, dan perluasan pemeriksaan script (`SCRIPT_CHECKED`) ke file skill.
6. **AC-11 vs AC-12 (ditanyakan ke user di sesi ini, dijawab "Jangan edit").** D8 meminta run ulang
   menambah pointer setelah banner dihapus, tetapi juga melarang mengedit agent yang sudah punya
   `## Skills`. Karena semua kind terpetakan punya `caf-no-guess`, setelah run pertama semua agent
   sudah punya section itu. Hasil: run ulang menambah pointer hanya ke agent yang **belum** punya
   `## Skills`; untuk yang sudah punya, command mencetak pointer yang kurang dan user menambahkannya
   sendiri.
7. **Penolakan CRLF.** Agent ber-line-ending CRLF tidak disisipi (asersi "isi lama + satu blok"
   gagal karena `insertSection` menyambung dengan LF); command mencetak alasan dan melewatinya.
   Ini akibat langsung asersi AC-12, bukan fitur baru.
8. **Teks INFO.** Untuk skill DRAFT, baris INFO hitungan TODO diberi akhiran "— DRAFT, agents skip
   this skill until it is finished". Level tetap INFO.
9. **File di luar peta file (§9):** tidak ada.
10. Laporan ini semula di-commit dengan `git add -f` (`780c3e1`). Commit itu sudah tidak ada di
    branch; sejak revisi 2 laporan hanya file lokal (lihat Keputusan).

Deviasi revisi 2 (tindak lanjut AC-9, terhadap requirements v2 dan `design.md` §6):

11. **Kalimat pembuka `## Skills` diganti** (`3a72ff8`) menjadi "MANDATORY FIRST STEP: before you
    write any answer or call any other tool, call `Read` once for EACH skill file listed below,
    then apply them for the whole task. Answering or acting before reading them is a violation of
    this agent definition:". Paragraf setelah daftar, posisi section, dan `''` untuk daftar kosong
    tidak berubah. Agent yang sudah disisipi dengan wording lama **tidak** ikut berubah (section
    non-syncable, Q7): di repo seperti itu section harus diganti tangan.
12. **Banner DRAFT skill mendapat satu baris tambahan** (`5065fad`): "> Agents: this skill is NOT
    ready. Do not apply any rule in this file; ignore it entirely until this banner is removed."
    Banner yang ada terdiri dari **dua baris fisik** (satu kalimat `DRAFT` yang dibungkus), jadi
    baris baru ditaruh setelah baris kedua, bukan setelah baris pertama: menaruhnya di tengah akan
    memotong kalimat. Kalimat `DRAFT` tidak berubah; `hasSkillDraftBanner` tidak berubah.
13. **Instruksi hapus banner menyebut kedua bagiannya** (`c2eeccb`): `/caf-complete-drafts`,
    peringatan di `scaffold skills`, dan README.
14. **`check-drafts` WARN untuk banner yang terhapus separuh** (`533088d`): baris "Agents: this
    skill is NOT ready" masih ada tetapi file tidak lagi diawali kalimat `DRAFT`. Read-only.
15. **Batas yang didokumentasikan:** gerbang DRAFT probabilistik; generator tidak pernah menulis
    pointer ke skill DRAFT, sehingga kebocoran hanya mungkin lewat pointer yang ditambah manual
    sebelum banner dihapus.

## 6. Keputusan (Ganjar)

1. AC-9 ditutup **PASS dengan batasan**.
2. Pointer `caf-verify` yang praktis selalu manual: **diterima**.
3. WARN untuk pointer ke `caf-piv`: **dibuang**.
4. Cek script pada file skill: **tiket lanjutan**, bersama drift tracking untuk skill.
5. `.ai/` **tidak ikut git**; laporan ini tetap file lokal.
6. Agent berwording lama **tidak dimigrasi** (fitur belum dirilis).

## 7. Tiket lanjutan

Sesuai `CAF-SKILLS-01-FINDINGS.md` §7 (disetujui Ganjar 2026-10-08):

1. Sampel gerbang DRAFT lebih besar (>=20 run per kind, termasuk qa dan backend).
2. `check-drafts` mode ketat: pointer ke skill DRAFT = FAIL (untuk CI).
3. Drift tracking untuk skill (manifest) dan cek script pada `caf-verify`.
4. Tambah baris pointer ke `## Skills` yang sudah ada (dengan asersi isi lama + satu baris).
5. Bug MONOREPO: `## Input` qa/reviewer DRIFT di sync (interim: jangan `curate --sync-only` tanpa
   `--dry-run` di umkm-pos).
6. Export skill ke runner lain, deteksi non-Node, uji preload di jalur subagent
   `/caf-run-pipeline`.

Tiket sampingan lain ada di requirements §10.

## 8. Verifikasi akhir (2026-10-08, read-only)

| Perintah | Hasil |
|---|---|
| `git log --oneline main..HEAD` | 13 commit, `0215a6b` … `533088d` (lihat `pr-description.md`) |
| `git ls-files .ai/` | kosong |
| `git diff --stat main...HEAD -- test/fixtures/snapshots/ package.json package-lock.json` | kosong |
| `npm test` | 191 lulus, 0 gagal |
| Commit laporan `780c3e1` | tidak ada di branch mana pun |
| `git status --short` | bersih |

Catatan: branch sudah di-push dan PR #12 sudah dibuat pada 2026-10-07 atas permintaan user
(sebelum instruksi penutupan "jangan push/PR"). Tidak ada push atau perubahan PR setelah itu.
