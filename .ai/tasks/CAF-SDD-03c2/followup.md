# Follow-up CAF-SDD-03c2 (baca saja)

Tidak ada berkas repo yang diubah, tidak ada commit. Render dijalankan dengan skrip di scratchpad terhadap direktori sementara.

## 1. `git grep -n -E "caf-discovery-start|caf-review-ticket|PM Agent" -- src` (35 baris)

Dasar klasifikasi: kind `pm`, `ux-designer`, `auditor`, `documentation`, `devops` ada di `HIDDEN_CANDIDATE_KINDS`, dan 8 command ada di `HIDDEN_COMMAND_FILES`. Jadi tidak ada jalur scaffold bawaan yang menulis builder-nya.

Tidak ada baris yang masuk (c). Yang paling dekat dengan (c) hanya satu, ditandai di bawah.

| Baris | Kelas | Alasan |
|---|---|---|
| `agents.js:68` | (a) | Nama `caf-discovery-start.md` di `HIDDEN_COMMAND_FILES`. Ini daftar yang melarang penulisan. |
| `agents.js:75` | (a) | Sama, untuk `caf-review-ticket.md`. |
| `agents.js:89` | (a) | Entri `PREVIEW_COMMANDS` `caf-review-ticket.md`. Dilewati oleh `isHiddenCommand`, jadi tidak pernah ditulis. |
| `agents.js:505` | (a) | Komentar kode (UX Designer tanpa PM). |
| `agents.js:517` | (a) | Pesan konsol saat UX Designer dipilih tanpa PM. Picker tidak menawarkan kedua kind itu, jadi tidak tercapai dari scaffold bawaan. Hanya tercapai kalau test menyuntikkan kandidat. |
| `agents.js:828` | (a) | Judul grup command PM. Grup disaring `HIDDEN_COMMAND_FILES`, jadi tidak pernah dicetak. |
| `agents.js:831` | (a) | Nama berkas dalam grup yang sama. |
| `agent-md.js:112` | (b) | `buildInputSection` untuk `pm`/`ux-designer`. Ikut hasil scaffold hanya untuk repo lama yang punya `caf-pm.md`/`caf-ux-designer.md`, dan `curate` membandingkan section itu dengan golden `frozen-kinds`. Konteks sah: kind itu memang memakai `/caf-discovery-start`. Tidak ikut scaffold repo baru. |
| `discovery-commands.js:1` | (a) | Komentar kepala berkas. |
| `discovery-commands.js:42, 47, 51` | (a) | Isi builder `/caf-discovery-start` (hidden). Tidak ikut scaffold baru. |
| `discovery-commands.js:60` | (a) | Komentar JSDoc. |
| `discovery-commands.js:70` | (a) | `description` frontmatter `/caf-discovery-start`. |
| `discovery-commands.js:116, 118, 123, 130, 132, 151` | (a) | Isi builder `/caf-discovery-start`. |
| `discovery-commands.js:226` | (b) | Teks `## Input` UX Designer. Ikut hasil hanya untuk repo lama yang punya `caf-ux-designer.md`. Sah: kind itu memang menerima `prd.md` dari PM. |
| `discovery-commands.js:281` | (b) | `## Input` PM/UX (`focus.input`). Alasan sama dengan `agent-md.js:112`. |
| `discovery-commands.js:305, 306` | (b) | Badan `caf-pm.md`/`caf-ux-designer.md`, yang menunjuk `/caf-discovery-start`. Hanya repo lama. Sah untuk repo itu. |
| `discovery-commands.js:311` | (a) | Komentar JSDoc. |
| `discovery-commands.js:321` | (b) | `description` frontmatter `caf-pm.md` (repo lama). |
| `discovery-commands.js:355, 366, 371` | (b) | Teks `caf-ux-designer.md` (repo lama) yang menyebut PM Agent. Sah untuk kind itu. |
| `discovery-to-ticket.js:6` | (a) | Komentar kode. |
| `discovery-to-ticket.js:187, 188, 208` | (a) | Isi builder `/caf-discovery-to-ticket` (hidden). Tidak ikut scaffold baru. |
| `run-pipeline-command.js:5` | (a) | Komentar kode. |
| `ticket-preview-commands.js:3` | (a) | Komentar kode. |

Catatan (c): tidak ada. Dua hal yang masih ada di hasil scaffold baru tetapi tidak terjaring pola ini, sudah dicatat di `verify-report.md`: baris `.gitignore` `.caf/discovery/` dan `.caf/audits/` (Out of Scope, sengaja), serta `.caf/discovery/` di `INDEX.md` (AC-11 hanya meminta "PM Agent"). Yang paling layak dicek ulang oleh Anda adalah yang kedua, karena folder itu tidak lagi ditulis scaffold. Itu bukan temuan dari pola ini.

## 2. `piv-workflow.md` lewat `readAgentRoster`, tiga repo sementara

Hanya baris checklist yang relevan ditampilkan persis seperti dirender. Baris peran lain (Planner, Architect, Frontend, Backend, Reviewer) tampil "NOT present … (TODO: confirm …)" di ketiga kasus karena fixture memang hanya berisi satu atau dua berkas. Itu benar dan tidak berkaitan dengan QA/Validator. Documentation, PM, UX Designer dan Auditor tampil "not scaffolded". `custom: []` di ketiganya.

| Kasus | Baris QA | Baris Validator | TODO / "NOT present" yang salah? |
|---|---|---|---|
| (i) hanya `caf-qa.md` | `- [x] QA` | tidak ada baris | Tidak. Tidak ada baris Validator, sehingga tidak ada "NOT present" untuknya. Sama dengan perilaku sebelum tiket. |
| (ii) hanya `caf-validator.md` | tidak ada baris | `- [x] Validator` | Tidak. Tidak ada baris "QA — NOT present … TODO". |
| (iii) keduanya | `- [x] QA` | `- [x] Validator` | Tidak. Keduanya `[x]`. |

## 3. Apakah test yang ada mengunci kasus (i) dan (iii)?

Belum, tidak secara langsung. Tidak ada test yang memanggil `readAgentRoster` pada direktori nyata untuk ketiga kasus itu.
- **(ii)** terkunci tidak langsung oleh snapshot `mono-pnpm.json` (`test/helpers/mono-snapshot.js` memanggil `readAgentRoster` pada roster tanpa `caf-qa.md` dan dengan `caf-validator.md`) dan oleh `sdd03c2-validator-default` (scaffold bawaan dipakai oleh `scaffold workflow`). Test itu tidak memeriksa isi baris QA/Validator secara eksplisit.
- **(i)** tidak terkunci. `test/sdd03f-stale-text.test.js` memeriksa `piv-workflow.md` untuk roster yang diberikan sebagai objek ke `buildPivWorkflowMd`, bukan lewat `readAgentRoster`. `test/helpers/old-repo.js` menjalankan `workflow()` pada repo yang punya `caf-qa.md`, tetapi test yang memakainya membandingkan laporan `curate`, bukan isi `piv-workflow.md`.
- **(iii)** tidak terkunci sama sekali.

Klaim di `verify-report.md` bahwa "repo yang hanya punya `caf-qa.md` terbaca persis seperti sebelumnya" saya periksa sekarang lewat render di atas, bukan lewat test yang ada.
