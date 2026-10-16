# Plan — Auto-commit/push/PR di `/caf-run-pipeline`

**Ticket:** CAF-RUNPIPELINE-AUTOPR-01
**Repo:** `caf-initiator`
**Status:** APPROVED — siap lanjut ke `tasks.md` setelah 2 gap tambahan (bagian 7) diinvestigasi
**Revisi:** v2 — menambahkan bagian 7 (gap yang belum tercakup di draft v1) dan menutup dua item approval yang sebelumnya open di draft v1

---

## Konteks

Keputusan sudah final (bukan open question):

- Status **SUCCESS** → auto-commit, auto-push, auto `gh pr create`, tanpa tanya.
- Status **NEEDS_HUMAN** → JANGAN commit apapun.

Yang diinvestigasi di plan ini: 4 titik teknis yang bisa mengubah desain implementasi, ditambah
2 gap yang ditemukan saat review draft v1 (bagian 7).

---

## 1. Template saat ini (dibaca)

`src/templates/run-pipeline-command.js` → generate `.claude/commands/caf-run-pipeline.md`.

Kondisi sekarang:
- `ALLOWED_TOOLS` sengaja TIDAK punya `Bash` polos, `Bash(gh:*)`, `Bash(git push:*)` — larangan
  push/PR di-enforce harness (baris 19-40).
- Section "## Verify" (baris 363-375) dan penutup (baris 399-402) eksplisit bilang "belum
  di-push... buka PR manual".
- Guard 0.1-0.4 (baris 212-277) sudah ada: working tree bersih, cek branch lokal+remote
  `ai-agent/{TICKET-ID}`, cek `verify-report.md` lama, baru `git checkout -b`.
- `implementationRoles` yang di-generate cuma nama role (`agentSlug(kind, app)`), BUKAN path
  app — lihat `src/commands/agents.js:360-362`. Tidak ada data path filesystem per role yang
  sampai ke template saat ini.

Perubahan yang dibutuhkan: tambah stage commit/push/PR di akhir (setelah Reviewer APPROVE),
ubah `ALLOWED_TOOLS`, teruskan data app-path baru ke `buildRunPipelineMd`.

---

## 2. Investigasi konvensi caf-orchestrator

Repo: `github.com/ganjardbc/caf-orchestrator` (di-clone ke scratchpad untuk baca).

### 2a. Commit message

`src/infrastructure/git/git.service.ts:95-101` (`GitService.commitAll`):

```ts
async commitAll(targetDir: string, message: string): Promise<void> {
  await runGit(['add', '-A'], targetDir);
  await runGit(['commit', '-m', message, '--allow-empty'], targetDir);
}
```

Dipanggil di `src/application/use-cases/run-agent-pipeline.use-case.ts:393`:

```ts
await gitService.commitAll(repoPath, `AI agent pipeline: ${job.ticketKey}`);
await gitService.push(repoPath, branch);
```

Jadi: **satu commit**, di akhir (setelah Documentation, sebelum PR), pesan literal
`AI agent pipeline: {TICKET-KEY}` — tanpa body, tanpa conventional-commit prefix, tanpa
kutipan hasil QA/Reviewer di pesan commit itu sendiri. `--allow-empty` dipakai supaya
push/PR tetap jalan meski karena suatu alasan tidak ada diff (edge case, bukan jalur utama).

`git add -A` dipakai apa adanya — bukan scoped. Ini aman di orchestrator karena `targetDir`
adalah **clone fresh sekali pakai** di workspace ephemeral (`WORKSPACE_ROOT`, dihapus di
`finally { cleanupWorkspace }`) — tidak ada kemungkinan file lain nyasar di situ.

**Gap**: tidak ada konvensi commit message yang lebih kaya (bukan cuma "belum ada", memang
sengaja minimal). Tidak diusulkan format baru di sini — instruksi eksplisit user: format harus
identik, jangan bikin konvensi kedua sepihak. Kalau nanti mau format lebih kaya (mis. sertakan
ringkasan QA/Reviewer di body commit), itu perubahan bersama ke **kedua** repo, di luar scope
task ini.

### 2b. Format judul + body PR

`src/infrastructure/vcs/github.service.ts:27-49` (`GithubService.createPullRequest`) — POST ke
GitHub REST API langsung (bukan `gh` CLI) dengan `{ title, head, base, body }`.

Title, dari `run-agent-pipeline.use-case.ts:407`:
```
`${job.ticketKey}: ${job.ticketTitle}`
```

Body, dari `buildPrBody()` (baris 38-69 di use-case yang sama):
```
[qualityGateWarning + '' jika ada skip QA/Reviewer]
Ticket: {ticketKey}
{ticketDescription}

## Reports
- Requirements: `.caf/tasks/{ticketKey}/requirements.md`
- Verify: `.caf/tasks/{ticketKey}/verify-report.md`
- QA: `.caf/tasks/{ticketKey}/qa-report.md`
- Review: `.caf/tasks/{ticketKey}/review-notes.md`

{docsNote}

{qaReport.raw}

{reviewerReport.raw}
```

`qaReport.raw` dan `reviewerReport.raw` adalah **isi mentah** `qa-report.md` /
`review-notes.md` (lihat `report-reader.js`, tidak dibaca ulang di sini — cukup jelas dari
tipe `QaReport`/`ReviewerReport` yang field-nya `{ status, raw }` / `{ verdict, raw }`) — jadi
laporan ditempel utuh ke body PR, bukan diringkas.

`qualityGateWarning` cuma muncul kalau QA atau Reviewer di-skip lewat Skip Agents directive
dari Planner — fitur yang **belum ada** di `/caf-run-pipeline` template (template ini tidak
parse skip directive sama sekali, semua stage implementasi yang ada di `implementationRoles`
selalu jalan). Jadi bagian ini tidak applicable untuk run-pipeline versi sekarang — dilewati
apa adanya, bukan ditiru kosong.

### 2c. Kesimpulan — identik, bukan konvensi kedua

`/caf-run-pipeline` akan pakai **persis**:
- Commit message: `AI agent pipeline: {TICKET-ID}`
- PR title: `{TICKET-ID}: {ticket title}`
- PR body: struktur sama (Ticket + description, `## Reports` dengan 4 link, docsNote note,
  qa-report.md mentah, review-notes.md mentah) — tanpa blok `qualityGateWarning` (tidak ada
  skip di jalur ini).

`docsNote` di orchestrator dihasilkan dari hasil run Documentation agent (3 kemungkinan
string). Run-pipeline template sudah punya section 4 (Documentation, non-blocking) yang
menyimpan status ke ringkasan akhir — dipakai ulang sebagai `docsNote` dengan pemetaan yang
sama (SUCCESS / GAGAL non-blocking / TIDAK TERSEDIA → kalimat setara).

> Lihat **bagian 7.2** untuk gap yang ditemukan soal `base` (belum dibahas di investigasi ini).

---

## 3. Scope commit — path eksplisit, bukan `git add -A`

Konfirmasi naming: repo ini sudah full migrasi ke `.caf/tasks/` (lihat isi
`run-pipeline-command.js` — semua referensi artifact sudah `.caf/tasks/{TICKET-ID}/...`,
tidak ada sisa `.ai/tasks/` pasca CAF-REORG). **Artifact scope: `.caf/tasks/{TICKET-ID}/`.**
(Catatan: task planning INI di repo `caf-initiator` sendiri masih pakai `.ai/tasks/` — itu
dev-artifact `caf-initiator` sendiri, beda dari artifact yang digenerate template untuk target
repo. Tidak relevan ke keputusan ini.)

**Kenapa TIDAK ikut `git add -A` seperti orchestrator**: orchestrator aman karena clone
ephemeral sekali pakai. `/caf-run-pipeline` jalan di **working directory persisten milik
user** — kalaupun guard 0.1 memastikan tree bersih sebelum mulai, subagent implementasi bisa
saja (bug atau scope creep) menulis file di luar app yang ditugaskan. `git add -A` akan
menelan itu diam-diam ke commit yang auto-push + auto-PR tanpa direview manusia dulu — beda
tingkat risiko dari orchestrator yang PR-nya memang selalu direview manusia sebelum merge,
tapi commit yang salah scope tetap `commit` yang harus diperbaiki lewat force-push/amend kalau
ketahuan setelah PR dibuka. Scoping eksplisit mengubah "file nyasar" dari kegagalan senyap
jadi STOP yang kelihatan.

**Desain**: repo target commit di `caf-initiator` adalah repo **arbitrary** (bisa monorepo
`apps/*`, bisa single-app) — path app tidak diketahui statis saat template digenerate kecuali
diteruskan. Sekarang `implementationRoles` di `agents.js:360-362` cuma kirim nama role, bukan
path. **Perlu tambahan param** `appPaths: Record<role, path>` diteruskan ke
`buildRunPipelineMd`, diisi dari data yang sudah ada di `detectStack()` (app dir per
`apps/*/package.json`, atau `.` untuk repo single-app non-monorepo) — data ini sudah dihitung
step 02, cuma belum sampai ke command generator ini.

**✅ Approved:** `appPaths` boleh masuk signature `buildRunPipelineMd` dan mengubah `agents.js`
(lihat bagian 8 — keputusan final).

Runtime, sebelum commit:
1. `git status --porcelain` → daftar semua path yang berubah (bukan cuma yang di-add).
2. Whitelist = `.caf/tasks/{TICKET-ID}/` ∪ `{appPaths[role] untuk role yang benar-benar
   di-spawn di stage 3}`.
3. Kalau ADA path di luar whitelist → **STOP, jangan commit**. Tampilkan daftar path
   mencurigakan ke user, minta keputusan manual (commit manual setelah verifikasi, atau
   investigasi kenapa ada file di luar scope). Ini pengaman baru yang tidak ada di
   orchestrator — perlu karena orchestrator tidak punya kelas risiko "file nyasar di working
   tree yang sudah ada isinya sebelum run mulai".
4. Kalau semua path masuk whitelist → `git add -- <path1> <path2> ...` (daftar eksplisit,
   bukan `-A`), lalu `git commit -m "AI agent pipeline: {TICKET-ID}"` (tanpa `--allow-empty` —
   di jalur SUCCESS harus ada diff; kalau kosong itu sendiri sinyal aneh yang layak STOP, bukan
   ditutupi commit kosong seperti orchestrator).

Repo single-app non-monorepo: `appPaths[role] = '.'` untuk semua role → whitelist efektif jadi
seluruh repo (minus exclude bawaan git seperti `node_modules` yang toh tidak pernah muncul di
`git status`). Itu tetap "eksplisit" secara desain (bukan `-A` yang implicit), walau hasil
akhirnya menyapu semua — konsisten karena memang scope agent-nya memang seluruh repo di kasus
itu.

---

## 4. Granularitas commit

**Rekomendasi: Opsi A — satu commit gabungan di akhir**, identik dengan orchestrator.

Alasan:
- Retry gate (QA/Reviewer) di desain command ini **menulis ulang di tempat** — bukan
  incremental changeset yang berarti sendiri-sendiri. Commit per-stage berarti commit
  "implementasi v1" lalu "fix dari QA" lalu "fix dari Reviewer" — riwayat itu isinya bukan
  potongan kerja yang berdiri sendiri untuk `bisect`, cuma iterasi menuju kondisi final.
  Bisect di antara commit-commit itu tidak berguna: commit tengah `implementasi v1` belum
  tentu lulus QA, jadi `bisect` bisa berhenti di state yang sudah diketahui rusak.
- Command jadi jauh lebih kompleks kalau harus commit di banyak titik: butuh scope-whitelist
  yang sama di tiap titik commit (bukan cuma sekali di akhir), dan retry loop existing (section
  gate) harus disisipi logic commit tanpa mengubah semantik retry yang sudah didokumentasikan
  hati-hati di `gateSection()` (baris 116-157 di template).
- Selaras dengan orchestrator: satu commit final artinya histori antara dua jalur eksekusi
  (manual command vs orchestrator) terlihat sama bentuknya di `git log` — tujuan poin 2c.

Trade-off yang disadari: kalau retry gate jalan berkali-kali, histori commit final tidak
menunjukkan iterasi itu terjadi (cuma keliatan di `qaRetryCount`/`reviewerRetryCount` yang
dilaporkan di Ringkasan Akhir, dan di `qa-report.md`/`review-notes.md` yang sudah tertaut di
body PR). Diterima — bisect granular bukan use case yang didukung command ini.

---

## 5. Guard sebelum push

Baru — belum ada di desain lama. Ditambahkan **setelah** commit lokal, **sebelum** `git push`.

```
git fetch origin ai-agent/{TICKET-ID} 2>&1   # atau: git ls-remote --heads origin ai-agent/{TICKET-ID}
```

- Remote branch **belum ada** → aman, lanjut push (`--set-upstream`).
- Remote branch **ada** dan SHA-nya sama dengan parent commit lokal sebelum commit final tadi
  (artinya kita sendiri yang push sebelumnya, mis. lanjut dari NEEDS_HUMAN run lama di 0.2/0.3)
  → aman, lanjut push biasa (fast-forward).
- Remote branch **ada** dengan SHA yang BUKAN ancestor dari HEAD lokal → **STOP sebelum
  push**. Ini sinyal branch remote sudah diubah pihak lain (orchestrator, atau run lain) sejak
  guard 0.2 dijalankan di awal command ini. Laporkan ke user: SHA remote, `git log
  --oneline` branch remote itu, dan commit lokal yang baru dibuat (belum ter-push, masih ada
  di working tree). **JANGAN force-push, JANGAN merge/rebase otomatis** — itu keputusan
  manusia.

**✅ Approved:** kriteria "SHA remote adalah ancestor HEAD lokal → aman" dipakai sebagai
definisi final (lihat bagian 8).

**Keterbatasan yang didokumentasikan apa adanya** (sama seperti guard 0.2 yang sudah ada):
ini best-effort, bukan jaminan absolut — race condition antara fetch-check dan push tetap
mungkin (window kecil, tapi ada) kalau orchestrator push persis di antara dua langkah itu.
Tidak ada lock terdistribusi yang tersedia dari sisi command ini untuk menutup celah itu
sepenuhnya. Disebutkan ke user di body command, sama pola dengan limitasi 0.2.

---

## 6. Diff yang direncanakan ke `run-pipeline-command.js`

- `ALLOWED_TOOLS`: tambah `Bash(git add:*)`, `Bash(git commit:*)`, `Bash(git fetch:*)`,
  `Bash(git push:*)`, `Bash(gh pr create:*)`, **`Bash(gh pr list:*)`** (baru, lihat 7.1),
  **`Bash(gh repo view:*)`** (baru, lihat 7.2). Hapus/update komentar baris 19-26 yang bilang
  "sengaja tidak ada" — itu sekarang salah, tulis ulang jadi "auto-commit/push/PR SETELAH
  Reviewer APPROVE, dengan guard di bawah" dan tetap catatan soal subagent yang punya tool
  lebih luas dari main thread.
- Signature `buildRunPipelineMd`: tambah param `appPaths` (map role → path relatif),
  diteruskan dari `agents.js` (perlu ubah `agents.js:360-395` untuk hitung & kirim path, bukan
  cuma nama role — sumber datanya dari hasil `detectStack()` yang sudah dihitung step 02, saat
  ini tidak sampai ke pemanggilan `buildRunPipelineMd`).
- Section baru "## 7. Commit, Push, PR (SUCCESS)" setelah section 6 Reviewer, isi: whitelist
  scope (poin 3), commit (poin 3-4), guard fetch (poin 5), **deteksi base branch (poin 7.2)**,
  push, **cek PR existing (poin 7.1)**, `gh pr create` kondisional dengan title/body identik
  orchestrator (poin 2c).
- Section "Berhenti Terkendali (NEEDS_HUMAN)" (baris 352-361): tambah kalimat eksplisit bahwa
  jalur ini **tidak pernah sampai** ke section commit/push/PR — sudah tersirat dari struktur
  (`return`/stop di tiap gate sebelum section commit), tapi ditulis eksplisit supaya tidak
  ambigu buat pembaca command.
- Section "## Verify" (baris 363-375): checklist "Tidak ada push" perlu diubah jadi kondisional
  — untuk run yang berakhir NEEDS_HUMAN, checklist "tidak ada push" tetap seperti sekarang;
  untuk run SUCCESS, checklist baru: push memang terjadi, PR memang dibuat **atau PR existing
  terdeteksi dan dilaporkan** (poin 7.1), dan URL PR dilaporkan di Ringkasan Akhir.
- Penutup command (baris 399-402): ganti kalimat "belum di-push... buka PR manual" jadi
  kondisional sesuai status akhir (SUCCESS → tampilkan URL PR; NEEDS_HUMAN → kalimat lama tetap
  berlaku).
- `description` di frontmatter (baris 176): update — sekarang bilang "tanpa buka PR", perlu
  jadi "auto-PR saat SUCCESS, tanpa PR saat NEEDS_HUMAN".

---

## 7. Gap tambahan (ditemukan saat review draft v1 — wajib ditutup sebelum `tasks.md`)

### 7.1 Idempotensi `gh pr create`

Draft v1 belum bahas apa yang terjadi kalau push berhasil tapi `gh pr create` gagal karena PR
untuk branch itu **sudah ada**. Skenario nyata: run sebelumnya berhenti NEEDS_HUMAN, user
sempat buka PR manual dari branch itu, lalu run ulang berhasil SUCCESS — command sekarang coba
`gh pr create` lagi ke branch yang sama dan error.

**Desain:** sebelum `gh pr create`, cek dulu:
```
gh pr list --head ai-agent/{TICKET-ID} --state open --json url,number
```
- Kalau hasil kosong → lanjut `gh pr create` seperti biasa.
- Kalau ada hasil → **jangan** panggil `gh pr create`. Push tetap jalan (itu aman, cuma update
  branch yang mendasari PR existing). Ambil URL dari hasil `gh pr list`, laporkan sebagai "PR
  sudah ada, branch sudah diupdate" di Ringkasan Akhir — bukan dianggap error.

Ditambahkan ke `ALLOWED_TOOLS`: `Bash(gh pr list:*)`.

### 7.2 Base branch tidak boleh di-hardcode `main`

Draft v1 menyalin `{ title, head, base, body }` dari orchestrator (poin 2b) tapi tidak
menyebutkan bagaimana `base` ditentukan di sana. Perlu investigasi tambahan ke
`github.service.ts` / config `caf-orchestrator` sebelum ditulis ke `tasks.md`:

- **Kalau orchestrator hardcode `base` dari `caf.config.yaml`** (per-repo config) →
  `/caf-run-pipeline` butuh sumber setara. Karena command ini generik lintas project (tidak
  selalu punya `caf.config.yaml` orchestrator), fallback yang diusulkan: deteksi default branch
  repo secara runtime lewat `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`,
  bukan asumsi `main`.
- **Kalau orchestrator sudah deteksi runtime** → pakai mekanisme yang sama persis (poin 2c:
  identik, bukan konvensi kedua).

Ditambahkan ke `ALLOWED_TOOLS`: `Bash(gh repo view:*)`.

**Status: DITUTUP.** (Koreksi sitasi pasca audit — lihat `audit-report.md` bagian 1: draf
sebelumnya salah kutip `project-config.schema.ts:13`, field itu tidak dipakai runtime untuk
`base` PR. Sumber yang benar-benar dipakai:)

```ts
// src/config/schema.ts:138 — field `repo.baseBranch`, config env single-repo (v1 bootstrap)
baseBranch: z.string().default('main'),
```

`baseBranch` adalah field **config statis** (`schema.ts:138`, default `'main'`, bisa dioverride
lewat env config), dibaca apa adanya di `src/presentation/web/routes/webhooks.ts:86`
(`baseBranch: config.repo.baseBranch`) saat membangun `JobPayload`, lalu dipakai langsung di
`gitService.clone()` dan `createPullRequest({ base: job.baseBranch })`
(`run-agent-pipeline.use-case.ts:122`, `:406`). **Tidak ada deteksi runtime di orchestrator sama
sekali** — jadi tidak ada mekanisme identik yang bisa disalin (poin 2c tidak applicable di titik
ini, karena sumbernya memang beda kelas: config file single-repo vs command generik lintas-repo).

(Catatan: repo juga punya `project-config.schema.ts:13`, field `baseBranch` wajib per-project di
`ProjectConfig`/`projectRegistry` — tapi ini dipetakan ke `JobProjectContext.baseBranch`, field
**terpisah** di `JobPayload.projectConfig.baseBranch`, bukan yang dipakai untuk `base` PR.
Kesimpulannya tidak berubah — jalur manapun yang dilihat, baseBranch orchestrator tetap
config-sourced, tidak pernah deteksi runtime.)

Konsekuensi buat `/caf-run-pipeline`: karena command ini digenerate untuk project arbitrary
tanpa jaminan ada `caf.config.yaml` setara orchestrator, **fallback yang diusulkan dipakai**:
deteksi runtime lewat `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Ini
bukan pelanggaran "identik, bukan konvensi kedua" — prinsip itu berlaku untuk hal yang memang
punya konvensi di orchestrator (commit message, PR title/body shape). Base branch tidak punya
konvensi untuk ditiru, jadi command ini bebas pakai pendekatan yang masuk akal untuk kondisinya
sendiri.

Tidak ada perubahan ke poin 2c/6 di atas — desain section commit/PR yang sudah ditulis tetap
berlaku, cukup tambah satu langkah deteksi `base` sebelum `gh pr create` (sudah tercatat di
poin 6 sebagai "deteksi base branch (poin 7.2)").

---

## 8. Keputusan final (sebelumnya open di draft v1)

| Item | Keputusan |
|---|---|
| `appPaths` masuk signature `buildRunPipelineMd` + ubah `agents.js` | **Approved** — diperlukan, bukan scope creep problematik (bagian 3) |
| Kriteria guard fetch: SHA remote = ancestor HEAD lokal → aman | **Approved** (bagian 5) |
| Idempotensi `gh pr create` (bagian 7.1) | Desain ditetapkan, siap masuk `tasks.md` |
| Sumber base branch (bagian 7.2) | **Ditutup** — orchestrator pakai config statis wajib (`baseBranch`), tidak ada mekanisme runtime untuk ditiru; `/caf-run-pipeline` pakai `gh repo view --json defaultBranchRef` |

---

## Rencana Verifikasi (sebelum implementasi dianggap selesai nanti)

- `node src/index.js --dir /tmp/scratch-repo --dry-run` tetap jalan bersih (tidak ada regresi
  ke step lain).
- Generate `/caf-run-pipeline` ke repo scratch dummy (monorepo `apps/web` + `apps/api`, dan
  terpisah single-app), baca file hasil generate manual — pastikan:
  - `ALLOWED_TOOLS` baru match yang didaftar di bagian 6 (termasuk `gh pr list`, `gh repo view`).
  - Section baru commit/PR ada dan referensi TICKET-ID/appPaths konsisten dengan pola
    `{TICKET-ID}` placeholder yang dipakai section lain.
- Dispatch nyata di fixture repo kecil, ticket sederhana → cek commit scope benar (`git show
  --stat`, tidak ada file di luar yang diharapkan).
- Simulasi status NEEDS_HUMAN → pastikan working tree tetap dirty, tidak ada commit sama sekali.
- Simulasi remote branch collision (buat commit dummy manual di remote branch sebelum jalanin
  command) → pastikan guard bagian 5 kena, bukan force-push.
- **Baru:** simulasi PR sudah ada duluan (buka PR manual dari branch `ai-agent/{TICKET-ID}`
  sebelum run) → pastikan command mendeteksi lewat `gh pr list`, tidak coba `gh pr create`
  kedua kali, dan URL PR lama tetap dilaporkan benar.
- **Baru:** jalankan di repo dengan default branch bukan `main` (mis. `master` atau `develop`)
  → pastikan `base` PR terisi benar, bukan hardcode `main`.
- Tidak ada test suite di project ini (dicatat di `CLAUDE.md`) — verifikasi manual di atas
  adalah satu-satunya jalur, tidak ada `npm test` untuk dijalankan.
- Tidak dijalankan end-to-end lewat Claude Code sungguhan di task PLAN ini — itu bagian dari
  implementasi/`tasks.md` berikutnya, di luar scope menulis `plan.md`.

---

## Langkah selanjutnya

1. ~~Investigasi bagian 7.2~~ — **selesai**, tidak mengubah desain section commit/PR yang sudah
   disepakati.
2. Tulis `tasks.md` dengan breakdown task konkret berbasis dokumen ini.
3. Implementasi dijalankan sebagai sesi Claude Code terpisah di `caf-initiator`, bukan dalam
   plan ini.
