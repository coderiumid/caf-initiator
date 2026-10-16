# CAF-SKILLS-01 — Temuan Empiris: Skills untuk Agent CAF

Status: jalur `--agent` disetujui Ganjar (2026-10-08); jalur sesi manual belum terbukti (lihat bagian 8). Fitur: `caf-init scaffold skills` + section opsional `## Skills` di definisi agent.
Versi Claude Code saat uji: 2.1.292. Repo uji: umkm-pos (MONOREPO), agent `caf-planner` dan `caf-frontend`.

## 1. Bagaimana skill sampai ke agent yang dijalankan orchestrator

Orchestrator menjalankan `claude --agent <nama> --print --output-format json --permission-mode bypassPermissions` dengan `CAF_HEADLESS=1`.

| Mekanisme | Hasil di mode `--agent` |
|---|---|
| Field `skills:` di frontmatter agent (preload) | TIDAK berlaku (skill tidak dimuat) |
| Skill ada di `.claude/skills/` tanpa pointer | Agent tidak menemukannya (kontrol selalu NOT_FOUND) |
| Tool `Skill` ditambahkan ke `tools:` | Bekerja, tapi pemicu berbasis `description` (non-deterministik) |
| `--bare` | Melewati discovery; agent CAF jadi "not found" |
| **Pointer `Read` di section `## Skills`** | **Dipilih.** Bekerja, tanpa tool atau frontmatter tambahan |

## 2. Wording yang terbukti

- Wording awal ("Before you start, `Read` every skill file listed here...") diabaikan: agent membaca skill 0 dari 12 run pada tugas biasa.
- Wording tegas dipakai: "MANDATORY FIRST STEP: before you write any answer or call any other tool, call `Read` once for EACH skill file listed below, then apply them for the whole task. Answering or acting before reading them is a violation of this agent definition:". Hasil: agent membaca skill di 99 dari 99 run.
- Posisi section tetap sebelum `## Constraints`. Memindahkannya ke atas lebih buruk (gerbang DRAFT dilanggar 3 dari 6 run).

## 3. Gerbang DRAFT

- Skill berbanner DRAFT diabaikan agent secara probabilistik, bukan pasti. Banner satu baris: planner 9/9, frontend 6/9 diabaikan.
- Banner final (tiga baris blockquote, baris `DRAFT` pertama, ditambah "> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed."): 0 pelanggaran dari 10 run. Belum signifikan secara statistik (p ~ 0,15).
- Generator tidak pernah menulis pointer ke skill DRAFT. Kebocoran hanya mungkin bila manusia menambah pointer manual sebelum menghapus banner.
- `check-drafts` memberi WARN bila banner terhapus sebagian (baris "Agents: ... NOT ready" tersisa tanpa baris `DRAFT`): skill akan diabaikan agent selamanya.

## 4. Kepatuhan pada aturan skill

Dengan konvensi yang wajar ("beri awalan [CAF-1], [CAF-2]... pada butir rencana"): 41 dari 42 run menerapkannya (~98%). Ini panduan, bukan penegakan; penegakan tetap di tahap Verify/QA/Reviewer PIV.

## 5. Pelajaran untuk merancang uji perilaku agent

- Aturan uji berupa token acak berlabel "disuntik/uji" ditolak agent sebagai prompt injection. Itu bukan temuan tentang skill, itu artefak uji. Pakai konvensi yang masuk akal dan beralasan.
- Prompt uji tidak boleh bertentangan dengan instruksi yang diuji (mis. "tanpa membuka file" melawan "Read skill dulu").
- Catat apakah agent membaca file skill (`baca-skill=N` dari tool_use di stream-json) supaya "tidak membaca" dan "membaca tapi mengabaikan" terbedakan.
- Selalu pakai kontrol (agent tanpa pointer, skill yang sama ada di repo) dan ulangan >=3; tetapkan kriteria sebelum melihat hasil.
- Uji dijalankan dengan `test-ac9.sh` (di luar repo uji, branch `test/*`, tree bersih; membersihkan dengan `git checkout -- . && git clean -fd`).

## 6. Keputusan

- Pemetaan kind ke skill: implementasi (frontend/backend/implementer/implementation) = caf-verify, caf-scope-discipline, caf-no-guess, caf-escalate; qa = caf-verify, caf-no-guess; planner/reviewer/architect/documentation = caf-scope-discipline, caf-no-guess; auditor/devops/pm/ux-designer = kosong; caf-piv tidak dipetakan.
- Pointer `caf-verify` ke agent yang sudah punya `## Skills` ditambah manual (agent yang sudah punya section itu tidak pernah diedit; run ulang mencetak pointer yang kurang). Agent ber-CRLF dilewati.
- `## Skills` tidak syncable (didaftarkan hanya di `TEMPLATE_SECTION_ORDER`); snapshot MONOREPO tetap byte-identik.
- WARN untuk pointer ke caf-piv dibuang.
- `.ai/` di-gitignore; artifact tiket tidak ikut git.

## 7. Tiket lanjutan

1. Sampel gerbang DRAFT lebih besar (>=20 run per kind, termasuk qa dan backend).
2. `check-drafts` mode ketat: pointer ke skill DRAFT = FAIL (untuk CI).
3. Drift tracking untuk skill (manifest) dan cek script pada `caf-verify`.
4. Tambah baris pointer ke `## Skills` yang sudah ada (dengan asersi isi lama + satu baris).
5. Bug MONOREPO: `## Input` qa/reviewer DRIFT di sync (interim: jangan `curate --sync-only` tanpa `--dry-run` di umkm-pos).
6. Export skill ke runner lain, deteksi non-Node, uji preload di jalur subagent `/caf-run-pipeline`.
7. Sesi manual: keputusan mekanisme (lihat bagian 8) dan `test-manual.sh` v2.

## 8. Sesi manual (tanpa `--agent`) — hasil uji 2026-10-08

Skrip `test-manual.sh` v1, `claude --print` biasa (tanpa `--agent`, tanpa `CAF_HEADLESS`), RUNS=5, Claude Code 2.1.292, umkm-pos. Di mode ini tidak ada pointer `## Skills`; skill hanya terpicu lewat `description` di SKILL.md.

| Prompt | Kontrol (tanpa skill) | Perlakuan (dengan skill) |
|---|---|---|
| P_VERIFY: "cek apakah pekerjaan di repo ini sudah siap di-commit" | skill 0/5, penomoran 0/5 | skill terdeteksi dimuat 4/5, **penomoran [CAF-1] 5/5** (10-12 turn pada run yang memuat kelima skill) |
| P_FEAT: "aku mau bikin fitur notifikasi untuk transaksi yang gagal" | skill 0/5, penomoran 0/5 | **skill dimuat 0/5, penomoran 0/5**, turns=1 |

Pembacaan:
- Skill terpicu andal pada prompt verifikasi (cocok dengan description caf-verify).
- Skill TIDAK terpicu pada prompt fitur baru. Ini skenario motivasi awal tiket, jadi untuk sesi manual kepatuhan CAF belum terbukti.
- Batasan uji (jangan dibaca sebagai bukti final): P_FEAT melarang edit/tool dan menyuruh jawab langsung di chat (turns=1), sehingga model tidak punya alasan memuat skill; detektor hanya menangkap tool `Skill` dan `Read` ke `.claude/skills/`, jadi run 1 P_VERIFY (terdeteksi kosong, tetapi penomoran diterapkan) kemungkinan memuat lewat Bash/Grep.
- Kesimpulan sementara: mekanisme sesi manual berbasis description bersifat non-deterministik dan, untuk prompt fitur, belum bekerja. Jalur `--agent` (bagian 1-6) tidak terpengaruh.

Opsi tindak lanjut (belum diputuskan):
1. Perbaiki `description` skill (terutama caf-piv dan caf-no-guess) agar cocok dengan frasa prompt fitur nyata, lalu ukur ulang.
2. Mekanisme pasti: blok terkelola kecil di CLAUDE.md yang menunjuk caf-piv (penambahan terkelola, tidak menimpa CLAUDE.md yang ada). Keputusan desain terpisah dari PR #12.
3. Revisi `test-manual.sh` v2: prompt fitur polos dengan `--permission-mode plan`, detektor tambahan untuk Bash/Grep ke `.claude/skills/`.