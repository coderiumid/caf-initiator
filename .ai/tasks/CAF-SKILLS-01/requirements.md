# CAF-SKILLS-01 — Skills untuk CAF (v1)

- Versi dokumen: **v2** (2026-10-07)
- Status: **Disetujui Ganjar (keputusan H1-H10 dikonfirmasi 2026-10-07)**; implementasi belum dimulai
- Repo implementasi: `caf-initiator` (v0.1.8, baseline `npm test` = 124 lulus)
- Repo lain: `caf-orchestrator` **tidak berubah**
- Riwayat: `.ai/tasks/CAF-SKILLS-01/` berisi `requirements.md`, `design.md`, `tasks.md`, `verify-report.md`

## 0. Perubahan dari v1

| Perubahan | Sebab |
|---|---|
| Semua skill berawalan `caf-` (H1) | Konsisten dengan FR-9; mencegah tabrakan dengan skill buatan tim |
| Gerbang runtime di `## Skills` hanya banner DRAFT, tanpa klausa "berisi TODO" (H2) | Skill konstan (`caf-no-guess`, `caf-escalate`, `caf-verify`) memang harus menyebut kata TODO |
| TODO dihitung hanya pada baris yang diawali `TODO` (H3 + tambahan) | Menghindari WARN/INFO abadi dan hitungan INFO yang membengkak (terbukti 5 menjadi 6) |
| Pointer ditulis lewat `writeIfAbsent` dengan `overwrite: true` + asersi "isi lama + tepat satu blok" (H4) | Invariant 4 versus preseden `agents-sync.js:152` yang memakai `fs.writeFileSync` |
| `--skill-dir` ditiadakan (H5) | `curate` tidak punya flag padanan |
| Pemetaan final termasuk architect dan documentation (H6) | Hasil perencanaan |
| `caf-verify` berbanner DRAFT bila satu slot tanpa script (H9); pointer tidak ditulis ke skill DRAFT | Agent sudah punya `## Verify Checklist`, kerugian kecil |
| Kind tak dikenal: prompt default "No" (H10) | Hindari pemetaan diam-diam ke `implementation` |
| Q1 ditutup (terverifikasi) | Lihat D3 |
| Tiket sampingan baru: DRIFT `## Input` qa/reviewer di MONOREPO | Temuan perencanaan |

## 1. Latar belakang

1. Coding manual lewat prompt bebas di Claude Code tidak memanggil agent, sehingga PIV, quality gate, dan aturan scope tidak ikut berlaku.
2. Agent headless di orchestrator butuh konvensi yang bisa dipakai ulang tanpa membengkakkan `CLAUDE.md` (batas <150 baris).
3. Skills (`.claude/skills/<nama>/SKILL.md`) menjawab keduanya: terpicu otomatis lewat `description` di sesi manual, dan bisa dibaca agent lewat pointer.
4. CAF harus tetap universal: tidak membawa pustaka konvensi framework bawaan, karena cepat basi dan bertentangan dengan prinsip "jangan menebak".

## 2. Bukti uji (umkm-pos, 2026-10-07)

Kondisi: macOS, agent `caf-planner` dengan `tools: [Read, Write]`, perintah `CAF_HEADLESS=1 claude --agent caf-planner --print --output-format json --permission-mode bypassPermissions` (sama dengan orchestrator), tanpa `--bare`. Skrip uji: `test-skill-preload.sh` (v4). **Versi `claude` saat uji di umkm-pos harus dicatat dengan `claude --version` di terminal yang sama** (mesin perencanaan: 2.1.292; jangan diasumsikan sama).

| Kasus | Kondisi | Hasil | Arti |
|---|---|---|---|
| B | Skill ada di repo; agent tanpa `skills:`, pointer, atau tool `Skill` | `NOT_FOUND` | Skill tidak bocor ke agent yang tidak diberi jalur |
| A1, A2 | `skills:` di frontmatter agent | `NOT_FOUND` x2 | Preload tidak berlaku di mode `--agent` |
| D | A + `--bare` | `ERROR`: agent `caf-planner` not found | `--bare` mematikan discovery agent CAF; dilarang di orchestrator |
| C | Tool `Skill` ditambahkan ke `tools` | `FOUND` | Jalan, tetapi ditolak (D2) |
| E1, E2 | Section `## Skills` berisi pointer `Read`; tanpa `skills:` dan tanpa tool `Skill` | `FOUND` x2 (`turns=2`) | **Mekanisme terpilih** |
| F | Skill berbanner DRAFT + aturan "abaikan DRAFT" | `NOT_FOUND` x1 | Aturan dipatuhi pada satu run |
| curate | `skills:` ditambahkan | identik pada `--audit-only` dan `--sync-only --dry-run` | Frontmatter tidak dilacak |
| Q1 (kode + eksperimen) | `Skills` didaftarkan di `TEMPLATE_SECTION_ORDER` tanpa `SYNCABLE_SECTIONS` | audit, sync, check-drafts, baseline identik; DRIFT 8 ke 8; 124 lulus | Aman (D3) |

**Batas bukti:** sampel kecil (E x2, F x1), hanya agent `caf-planner`, dan prompt langsung menanyakan isi skill. Kepatuhan pada tugas yang tidak menyinggung skill belum teruji (AC-9).

## 3. Tujuan dan non-tujuan

**Tujuan v1**
1. `caf-init scaffold skills` menulis skill universal ke `.claude/skills/<nama>/SKILL.md`.
2. Agent bisa menunjuk skill lewat section opsional `## Skills` (pointer `Read`).
3. `curate --check-drafts` mengenali skill dan pointer.
4. Output MONOREPO yang dibekukan (`test/fixtures/snapshots/mono-pnpm.json`) tetap identik byte demi byte.

**Non-tujuan v1 (ditunda)**
- Tracking manifest untuk file skill (butuh `fileHash` dan enumerator baru).
- `export` skill ke runner lain.
- Skeleton tier 2 dari deteksi framework, termasuk format Fakta/Keputusan.
- Deteksi non-Node (bahasa, ORM, test framework).
- Perubahan di orchestrator, tool `Skill` di agent, key `skills:` di frontmatter, dan flag `--skill-dir`.

## 4. Keputusan desain

| ID | Keputusan | Alasan / bukti |
|---|---|---|
| D1 | Skill hidup di `.claude/skills/<nama>/SKILL.md` | Pilihan Ganjar |
| D2 | Agent memakai skill lewat **pointer `Read` di `## Skills`**. Bukan `skills:`, bukan tool `Skill` | A gagal; C mengubah `## Allowed Tools` (syncable) sehingga semua repo lama jadi DRIFT dan auditor/devops ikut naik hak akses; E lolos |
| D3 | `## Skills` **opsional dan non-syncable**, builder mengembalikan `''` bila kosong, didaftarkan di `TEMPLATE_SECTION_ORDER` (wajib; tanpa itu `insertSection` menaruhnya sebelum `## Role`). Dirender **sebelum `## Constraints`** (`agent-md.js:635`) agar agent baru dan agent lama yang disisipi urutannya sama | Terverifikasi: empat command hanya mengiterasi `Object.keys(SYNCABLE_SECTIONS)` (`audit.js:195`, `agents-sync.js:69`, `check-drafts.js:69`, `curate-baseline.js:54`); satu-satunya pembaca `TEMPLATE_SECTION_ORDER` adalah `insertSection` (`agent-sections.js:129-146`) |
| D4 | `scaffold skills` **explicit-only**, tidak masuk `CHAIN_ORDER` | Meniru `feature-catalog-sync`; test meng-inject prompt berurutan |
| D5 | Gerbang runtime: **hanya banner `DRAFT`**. Skill berbanner DRAFT tidak dipakai agent | F lolos 1x. Jika tidak konsisten, naikkan jadi penjaga mekanis |
| D6 | Skill v1: `caf-verify`, `caf-scope-discipline`, `caf-no-guess`, `caf-escalate` (dirujuk agent) dan `caf-piv` (khusus sesi manual, tidak dipetakan ke kind mana pun) | Kasus B: agent tanpa pointer tidak melihat skill, jadi tidak perlu flag audiens |
| D7 | Pemetaan final (tabel konstanta di kode): implementasi (`frontend`/`backend`/`implementer`/`implementation`) = `caf-verify`, `caf-scope-discipline`, `caf-no-guess`, `caf-escalate`; `qa` = `caf-verify`, `caf-no-guess`; `planner`, `reviewer`, `architect`, `documentation` = `caf-scope-discipline`, `caf-no-guess`; `auditor`, `devops`, `pm`, `ux-designer` = kosong. Kind tak dikenal: prompt default "No" | H6, H10 |
| D8 | Pointer masuk ke agent **yang sudah ada** lewat preview + konfirmasi per file, meniru `agents-sync.js:127-146`. Hanya untuk skill yang filenya ada **dan tidak berbanner DRAFT**; agent yang sudah punya `## Skills` tidak pernah diedit; `--force` tidak berlaku untuk file agent. Jalur tulis: `writeIfAbsent` dengan `overwrite: true`, placeholder-check hanya pada blok sisipan, dengan **asersi**: isi baru = isi lama + tepat satu blok sisipan. Idempoten; run ulang setelah banner dihapus menambah pointer | `scaffold agents` memakai `writeIfAbsent` sehingga agent lama tak pernah dapat section baru. Ini satu-satunya jalur tulis ulang yang diizinkan (lihat invariant 4) |
| D9 | `caf-verify` memakai ulang `buildVerifyChecklist` (`agent-md.js:68`, tambah `export`) sehingga daftar command di skill dan di Verify Checklist agent berasal dari satu fungsi. Berbanner DRAFT bila ada satu slot tanpa script | H9 |
| D10 | Penghitungan TODO untuk skill: hanya baris yang diawali `TODO` (setelah penanda daftar opsional). Kata TODO dalam prosa tidak dihitung | H3 |

## 5. Requirements

**FR-1 Target baru.** `caf-init scaffold skills` didaftarkan di `TARGETS` dan `switch` (`scaffold.js:29,130-131`) dan help `index.js`. Path tetap `.claude/skills` (tanpa `--skill-dir`).

**FR-2 Template murni.** `src/templates/skill-md.js` berisi fungsi `build*Skill()` yang mengembalikan string. Deterministik: tanpa timestamp, tanpa urutan `readdir` yang tidak disortir, tanpa pemanggilan model. Skill konstan lahir lengkap, **tanpa banner dan tanpa baris yang diawali TODO**.

**FR-3 Jalur tulis.** Penulisan file skill lewat `writeIfAbsentGuarded` (collision check, placeholder guard, dry-run satu jalur dengan write). `--force` hanya bila eksplisit. Penyisipan pointer mengikuti D8.

**FR-4 `caf-verify` dari deteksi.** Isi dari `stack.packageManager`, `matchVerifyScripts`, dan `mode`, lewat `buildVerifyChecklist` (D9). MONOREPO: command di-scope per workspace (`--filter`). Exact-match nama script didahulukan sebelum pattern. Script tak terdeteksi ditulis sebagai baris `TODO` (bukan ditebak) dan skill berbanner DRAFT.

**FR-5 Section opsional.** `buildSkillsSection(skills)` mengembalikan `''` bila kosong. `buildAgentMd(..., skills = [])` menempelkan hasilnya **pada baris interpolasi yang sudah ada** (tanpa newline baru). Isi: daftar pointer + aturan "abaikan skill berbanner DRAFT". Tidak ada key `skills:` di frontmatter. Contoh heading `##` di template dibungkus fence.

**FR-6 Pointer ke agent yang ada.** Sesuai D8. `Skills` terdaftar di `TEMPLATE_SECTION_ORDER` dan **tidak** di `SYNCABLE_SECTIONS`. Langkah ini tidak pernah memanggil sync.

**FR-7 `check-drafts`.** Perluas `listDraftFiles` (`complete-drafts.js:19-38`) dengan glob `.claude/skills/*/SKILL.md`. Level: **FAIL** bila pointer menunjuk file yang tidak ada; **WARN** bila target pointer berbanner DRAFT; **WARN** bila ada baris TODO terbuka (predikat D10) tanpa banner; **INFO** untuk hitungan TODO (predikat D10). Tetap read-only.

**FR-8 `/caf-complete-drafts`.** Tambah blok instruksi untuk skill; AI melakukan glob `.claude/skills/*/SKILL.md` **saat dijalankan**, bukan dari daftar yang dibekukan saat generate. Perbaiki kalimat "hanya Role, Scope, Verify Checklist" (`complete-drafts-command.js:169,216-217`; `check-drafts.js:100`).

**FR-9 Tabrakan nama.** Semua skill universal berawalan `caf-`. Tambah pemeriksaan **tingkat folder** (`caf-x/` versus `x/`), karena `detectLegacyCollision` hanya melihat basename (`collision-check.js:12-18`) dan akan selalu kosong untuk `SKILL.md`.

**FR-10 Dokumentasi.** `README.md` (termasuk koreksi lisensi, URL clone, dan dokumentasi `--force`), `CLAUDE.md` initiator, dan `CAF.md` (bagian skills, temuan `--agent` versus `skills:`, larangan `--bare` di orchestrator).

**FR-11 Test.** Ekstrak `makeRepo` dari `repo-context.test.js:22` ke `test/helpers/` (atau duplikasi terkontrol), lalu penuhi AC di bagian 6.

## 6. Acceptance criteria

- [ ] **AC-1** `npm test`: seluruh test lama lulus (124) ditambah test baru; `git diff --stat test/fixtures/snapshots/` kosong.
- [ ] **AC-2** `scaffold skills --dry-run` pada fixture `single-nuxt` dan `mono-pnpm` tidak menulis apa pun (snapshot tree sebelum/sesudah identik).
- [ ] **AC-3** Run nyata menulis semua skill universal; run kedua tidak mengubah byte mana pun.
- [ ] **AC-4** Pada repo yang di-scaffold dengan versi lama: `curate --audit-only` memberi exit code yang sama dengan baseline, dan `curate --sync-only --dry-run` tidak melaporkan perubahan setelah `## Skills` disisipkan.
- [ ] **AC-5** Repo tanpa `package.json` (via `makeRepo`): `scaffold skills` tidak crash; `caf-verify` berisi baris `TODO` dan banner DRAFT.
- [ ] **AC-6** `check-drafts`: pointer ke file tidak ada menghasilkan FAIL; pointer ke skill DRAFT menghasilkan WARN; tree sebelum/sesudah identik (read-only).
- [ ] **AC-7** Hitungan DRIFT pada laporan sync tidak bertambah (baseline fixture: 8); agent pm/ux-designer tidak dianggap "missing".
- [ ] **AC-8** Tidak ada `{{...}}` generate-time tersisa di file skill.
- [ ] **AC-9 (dispatch nyata di umkm-pos, manual, wajib per CAF.md)** Dengan keluaran generator (bukan tulisan tangan):
  - a. E `FOUND` dan F `NOT_FOUND` pada skill hasil generator.
  - b. Fixture campur: dua skill dalam satu run (satu lengkap, satu DRAFT); agent hanya menerapkan yang lengkap.
  - c. Tugas yang **tidak menyinggung skill**: skill berisi aturan yang mengubah bentuk keluaran; agent tetap menerapkannya.
  - d. Diulang pada agent ber-`Bash` (`caf-qa` atau `caf-frontend`), bukan hanya planner.
  - e. Catat `claude --version` pada saat uji.
- [ ] **AC-10** Skill konstan menghasilkan 0 WARN dan 0 hitungan TODO pada `check-drafts` (predikat D10).
- [ ] **AC-11** Tidak ada pointer ke skill berbanner DRAFT setelah `scaffold skills`; run ulang setelah banner dihapus menambahnya.
- [ ] **AC-12** Asersi penyisipan: untuk setiap agent yang disisipi, menghapus blok sisipan mengembalikan isi lama byte demi byte; agent yang sudah punya `## Skills` tidak berubah.

## 7. Invariant yang wajib dijaga

1. Snapshot MONOREPO beku; jangan regenerate agar test lulus. Satu newline ekstra pun memecahkannya.
2. `SYNCABLE_SECTIONS` harus benar untuk semua `KNOWN_KINDS`; `## Skills` tidak boleh masuk.
3. `curate sync` hanya menulis `DRIFT`; tidak ada jalur tulis baru tanpa gerbang `current === baseline`.
4. `writeIfAbsent` tidak pernah menimpa; dry-run dan write satu jalur, termasuk placeholder-check. **Satu-satunya pengecualian** adalah penyisipan pointer (D8): preview + konfirmasi per file + asersi AC-12.
5. CLI tidak memanggil model; keluaran deterministik.
6. Jangan menebak: nilai tak terdeteksi menjadi `TODO` atau ditanyakan.
7. `check-drafts` read-only dan FAIL hanya untuk hal yang bisa dibuktikan kode.
8. Jangan menambah `Skill` ke `TOOLS_BY_KIND`; kind baru wajib masuk `KNOWN_KINDS`.
9. Heading `##` contoh di dalam template harus dibungkus code fence.
10. Daftar section terlarang dirender dari `SYNCABLE_SECTIONS`, bukan disalin tangan.

## 8. Risiko dan pertanyaan terbuka

| ID | Hal | Catatan |
|---|---|---|
| Q3 | Kepatuhan pada tugas nyata dan kind selain planner | Ditutup oleh AC-9 c dan d |
| Q4 | Hanya planner yang tahu soal mode headless (`agent-md.js:90-102`, TODO sengaja) | `caf-piv` yang menyuruh menunggu persetujuan tidak boleh dipetakan ke agent |
| Q5 | Padanan direktori skill di OpenCode, Cursor, Cline, Kiro tidak ada di `runner-targets.js` | `export` skill ditunda |
| Q6 | `--force` tidak memperbarui manifest | Sudah ada sebelumnya (tiket sampingan) |
| Q7 | Wording aturan di `## Skills` tanpa deteksi drift | Diterima untuk v1; tinjau setelah AC-9 |
| Q8 | Banner DRAFT pada `caf-verify` di sebagian besar repo | Diterima (H9); agent tetap punya `## Verify Checklist` |

## 9. Peta file (v1, urut dari yang paling berisiko)

| File | Perubahan |
|---|---|
| `src/templates/agent-md.js` | `buildSkillsSection`, param `skills`, interpolasi `:635` sebelum Constraints, `export buildVerifyChecklist` (`:68`) |
| `src/utils/agent-sections.js` | `TEMPLATE_SECTION_ORDER` saja |
| `src/commands/agents.js` | Oper `skills` (`:504-516`); hati-hati urutan prompt di test |
| `src/commands/check-drafts.js` | Banner, pointer, predikat TODO, level FAIL/WARN/INFO |
| `src/commands/complete-drafts.js`, `src/templates/complete-drafts-command.js` | `listDraftFiles`, blok instruksi, glob runtime |
| `src/utils/collision-check.js` | Pemeriksaan tingkat folder |
| `src/commands/scaffold.js`, `src/index.js` | Target dan help |
| **Baru:** `src/commands/skills.js`, `src/templates/skill-md.js`, `test/helpers/`, test | Fitur inti |
| `README.md`, `CLAUDE.md`, `CAF.md` | Dokumentasi |

Tidak disentuh di v1: `discovery-commands.js`, `audit.js`, `generate-manifest.js`, `curate-baseline.js`, `export.js`, `opencode-*-transform.js`, `repo-context.js`, `placeholder-check.js` (kecuali ada token runtime baru).

## 10. Tiket terpisah (temuan sampingan)

1. **(Prioritas tinggi)** Di MONOREPO, `## Input` milik qa/reviewer terbaca DRIFT tepat setelah `curate baseline`, dan `curate --sync-only` menggantinya dengan versi generik tanpa nama app (sync memanggil builder tanpa `appNames`). Sementara itu: jangan menjalankan `curate --sync-only` tanpa `--dry-run` di repo MONOREPO seperti umkm-pos.
2. `export --kind` tidak divalidasi; nilai asing membuat crash (`export.js:158`).
3. `TOOLS_LINE` tidak dibatasi ke blok frontmatter (`opencode-agent-transform.js:12`).
4. Komentar "fence-unaware" basi di `agent-md.js:298-301` dan `agent-sections.js:22-23`.
5. `--force` tidak memperbarui manifest (Q6).
6. Urutan daftar apps di output `curate` tidak stabil antar run.
7. Hanya planner yang diberi tahu soal mode headless (`agent-md.js:99-102`).
8. Berkas yang sudah ada dilewati sebelum placeholder-check, jadi tidak pernah divalidasi (`util.js:55-58`).
9. `caf-orchestrator`: catat larangan `--bare` (ADR atau assertion).