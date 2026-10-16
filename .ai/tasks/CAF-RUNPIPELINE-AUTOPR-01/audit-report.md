# Audit Report — CAF-RUNPIPELINE-AUTOPR-01

Audit atas Task 1-7 (auto-commit/push/PR di `/caf-run-pipeline`). Ini AUDIT, tidak ada kode
diubah — satu bug nyata ditemukan (poin 3), dilaporkan apa adanya, tidak di-fix.

---

## 1. Konfirmasi investigasi base branch (7.2)

**Status: DEVIASI-DISENGAJA — tapi kutipan sumber di plan.md SALAH, dikoreksi di sini.**

Investigasi ulang ke `caf-orchestrator` menemukan `plan.md` bagian 7.2 mengutip file yang
**tidak dipakai runtime** untuk menentukan `job.baseBranch`. Runtime path sebenarnya:

- `src/config/schema.ts:138` — `baseBranch: z.string().default('main')`, field di
  `repo` (config env single-repo, v1 bootstrap — komentar di baris 122-123: *"v1 targets a
  single repo (one Linear team -> one codebase)"*).
- `src/presentation/web/routes/webhooks.ts:86` — `baseBranch: config.repo.baseBranch` — ini
  yang benar-benar dipakai untuk mengisi `JobPayload.baseBranch`.
- `src/application/use-cases/run-agent-pipeline.use-case.ts:122` dan `:406` — `job.baseBranch`
  dipakai apa adanya di `gitService.clone()` dan `createPullRequest({ base: job.baseBranch })`.

`project-config.schema.ts:13` (yang dikutip `plan.md`) adalah schema **berbeda** —
`ProjectConfig`/`projectRegistry`, dipetakan lewat `project-context-mapper.ts:8` ke
`JobProjectContext.baseBranch`, disimpan di `JobPayload.projectConfig.baseBranch` (field
**terpisah**, lihat `domain/interfaces/queue.interface.ts:13-31`). Field ini TIDAK dipakai untuk
menentukan `base` PR — yang dipakai selalu `JobPayload.baseBranch` top-level dari
`config.repo.baseBranch`. Ini bukan bug di orchestrator (disengaja — komentar `schema.ts:122-123`
eksplisit bilang v1 single-repo), tapi kutipan `plan.md` salah alamat.

**Kesimpulan yang tidak berubah**: baik lewat `schema.ts:138` (default statis, bisa dioverride
lewat env config) maupun `project-config.schema.ts:13` (field wajib per-project), **base branch
orchestrator selalu config-sourced, tidak pernah deteksi runtime lewat GitHub API.**
`/caf-run-pipeline` pakai `gh repo view --json defaultBranchRef` — **BEDA mekanisme secara
hasil** dari orchestrator dalam satu skenario nyata: kalau `config.repo.baseBranch`/
`project.baseBranch` di-set eksplisit ke branch yang BUKAN default branch GitHub repo (mis. tim
merge ke `release` walau GitHub default masih `main`), orchestrator akan target `release`,
`/caf-run-pipeline` akan target `main`. Divergensi ini **sudah dicatat sebagai deviasi
disengaja** di `plan.md` bagian 7.2 (alasannya tetap valid: run-pipeline generik lintas-repo,
tidak ada config setara yang bisa diandalkan) — kesimpulannya tidak berubah, cuma sitasinya
perlu dikoreksi.

**Tindak lanjut yang disarankan (bukan bug, tapi housekeeping)**: update `plan.md` bagian 7.2
untuk mengganti sitasi `project-config.schema.ts:13` jadi `schema.ts:138` +
`webhooks.ts:86` sebagai sumber sebenarnya. Tidak dilakukan di audit ini (scope audit = laporkan,
bukan edit dokumen keputusan).

---

## 2. Isi Section 7 hasil generate

**Status: PASS.**

Generate ulang lewat `buildRunPipelineMd({ implementationRoles: ['caf-frontend','caf-backend'],
appPaths: { 'caf-frontend': 'apps/web', 'caf-backend': 'apps/api' }, ... })`.

### `commitScopeList()` — source (`run-pipeline-command.js:177-182`)

```js
function commitScopeList(implementationRoles, appPaths) {
  const appLines = implementationRoles
    .filter((role) => appPaths[role])
    .map((role) => `- \`${role}\`: \`${appPaths[role]}/\``);
  return [`- \`.caf/tasks/{TICKET-ID}/\` (artifact)`, ...appLines].join('\n');
}
```

### Section 7 — full generated output

````
## 7. Commit, Push, PR (SUCCESS)

**Stage ini HANYA dijalankan kalau Reviewer APPROVE.** Kalau pipeline berhenti di stage
manapun sebelum ini (implementasi NEEDS_HUMAN, gate QA/Reviewer exhausted), **lewati seluruh
section ini** dan langsung ke "Berhenti Terkendali" di bawah — jangan commit apapun.

Jalankan ketujuh langkah ini **berurutan**. Tiap langkah dengan kondisi STOP wajib berhenti di
situ, tidak lanjut ke langkah berikutnya — commit yang scope-nya salah atau push yang menabrak
branch remote tidak bisa gampang dibatalkan setelah terjadi.

### 7.1 Whitelist scope

Path yang boleh masuk commit (HANYA ini, bukan seluruh working tree):

- `.caf/tasks/{TICKET-ID}/` (artifact)
- `caf-frontend`: `apps/web/`
- `caf-backend`: `apps/api/`

`git status --porcelain` → cocokkan **setiap** path yang berubah ke whitelist di atas.

Ada path yang berubah TAPI tidak masuk whitelist manapun → **STOP, JANGAN commit apapun**.
Tampilkan daftar path mencurigakan ke user, jelaskan ini kemungkinan file di luar scope agent
yang ditugaskan (bug atau scope creep di subagent). Minta user putuskan manual — lanjut commit
sendiri setelah verifikasi, atau investigasi dulu. Di Ringkasan Akhir, catat status sebagai
"SUCCESS tapi commit dibatalkan — scope drift terdeteksi", bukan status SUCCESS polos.

### 7.2 Commit

`git add --` diikuti daftar path eksplisit dari 7.1 yang benar-benar berubah (**bukan**
`git add -A`), lalu:

```
git commit -m "AI agent pipeline: {TICKET-ID}"
```

Tanpa `--allow-empty`. Kalau commit gagal karena tidak ada apapun untuk di-commit ("nothing
to commit") — itu sinyal aneh (implementasi dilaporkan selesai tapi tidak ada diff sama
sekali) → **STOP**, laporkan ke user, jangan lanjut ke push/PR.

### 7.3 Guard — fetch sebelum push

```
git fetch origin ai-agent/{TICKET-ID}
```

Kalau fetch gagal karena branch belum ada di remote sama sekali, itu bukan kegagalan guard —
lanjut anggap "remote belum ada" (langkah berikutnya).

- **Remote belum ada** → aman, lanjut ke 7.4.
- **Remote ada**, dan `git merge-base --is-ancestor origin/ai-agent/{TICKET-ID} HEAD`
  sukses (exit 0) → SHA remote adalah ancestor HEAD lokal, aman, lanjut ke 7.4.
- **Remote ada**, dan `git merge-base --is-ancestor` gagal (exit != 0) → SHA remote BUKAN
  ancestor HEAD lokal. **STOP sebelum push.** Ini sinyal branch remote sudah diubah pihak lain
  (orchestrator, atau run `/caf-run-pipeline` lain) sejak guard 0.2 dijalankan di awal command
  ini. Tampilkan ke user: SHA remote, `git log --oneline` branch remote itu, dan commit lokal
  yang baru dibuat di 7.2 (masih ada di working tree, belum ter-push). **JANGAN force-push,
  JANGAN merge/rebase otomatis** — itu keputusan manusia.

**Keterbatasan yang harus disampaikan ke user di titik ini**: ini best-effort, bukan jaminan
absolut — race condition antara fetch-check ini dan push di 7.4 tetap mungkin (window kecil,
tapi ada) kalau pihak lain push persis di antara dua langkah itu. Tidak ada lock terdistribusi
yang tersedia dari sisi command ini untuk menutup celah itu sepenuhnya — sama pola limitasi
dengan guard 0.2.

### 7.4 Push

```
git push --set-upstream origin ai-agent/{TICKET-ID}
```

### 7.5 Deteksi base branch

```
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name
```

Simpan hasilnya sebagai `{BASE-BRANCH}`. **Jangan hardcode `main`** — repo target bisa
pakai `master`, `develop`, atau nama lain.

### 7.6 Cek PR existing (idempotensi)

```
gh pr list --head ai-agent/{TICKET-ID} --state open --json url,number
```

- **Ada hasil** → PR untuk branch ini sudah ada (mis. dibuka manual user setelah run
  NEEDS_HUMAN sebelumnya, sekarang run lanjutan berhasil SUCCESS). **Jangan** panggil
  `gh pr create` — push di 7.4 sudah cukup untuk update branch yang mendasari PR itu. Ambil
  URL dari hasil `gh pr list`, catat untuk Ringkasan Akhir sebagai "PR sudah ada, branch sudah
  diupdate" — bukan error.
- **Kosong** → lanjut ke 7.7.

### 7.7 `gh pr create`

Title:
```
{TICKET-ID}: {judul ticket dari section Ticket}
```

Body — struktur identik `buildPrBody` di caf-orchestrator (`run-agent-pipeline.use-case.ts`),
supaya dua jalur eksekusi menghasilkan bentuk PR yang sama:

```
Ticket: {TICKET-ID}
{deskripsi ticket dari section Ticket}

## Reports
- Requirements: `.caf/tasks/{TICKET-ID}/requirements.md`
- Verify: `.caf/tasks/{TICKET-ID}/verify-report.md`
- QA: `.caf/tasks/{TICKET-ID}/qa-report.md`
- Review: `.caf/tasks/{TICKET-ID}/review-notes.md`

{docsNote — status Documentation dari stage 4: SUCCESS / GAGAL (non-blocking) / TIDAK TERSEDIA,
kalimat setara yang sudah dipakai di Ringkasan Akhir}

{isi mentah qa-report.md}

{isi mentah review-notes.md}
```

Tidak ada blok peringatan skip-gate (`qualityGateWarning` di orchestrator) — command ini tidak
punya fitur skip QA/Reviewer, jadi tidak applicable.

Base: `{BASE-BRANCH}` dari 7.5. Simpan URL hasil `gh pr create` untuk Ringkasan Akhir.
````

### Cek eksplisit

- **STOP-kalau-path-di-luar-whitelist jadi instruksi eksplisit di markdown command** (bukan
  cuma komentar source): **YA** — lihat 7.1 di atas, kalimat "STOP, JANGAN commit apapun" ada
  literal di body command yang dibaca Claude Code saat eksekusi, bukan cuma komentar
  `commitScopeList()` di source JS.
- **Urutan langkah**: **PERSIS** whitelist-check (7.1) → commit (7.2) → fetch-guard (7.3) →
  push (7.4) → base-branch-detection (7.5) → PR-existing-check (7.6) → `gh pr create` (7.7).
  Sama dengan yang disepakati di `plan.md`/`tasks.md` Task 4, tidak ada penyimpangan urutan.

---

## 3. Grep-audit final

**Status: 1 FAIL ditemukan di luar dua file yang dianggap "sudah diubah" — lihat di bawah.**

Grep dijalankan atas `src/templates/run-pipeline-command.js` dan `src/commands/agents.js`
(generated output = hasil evaluasi template, sudah tercakup lewat inspeksi poin 2 di atas — tidak
ada salinan terpisah di repo ini yang perlu di-grep ulang).

### `"tidak ada push"` / variannya

- `run-pipeline-command.js:28` — `"...verifikasi di section 7 bahwa tidak ada push yang sudah
  terjadi sebelum main thread sendiri yang push..."` — **BENAR, bukan stale.** Ini komentar
  source (bukan body command) yang menjelaskan mitigasi terhadap subagent push liar, konteksnya
  eksplisit soal verifikasi subagent, bukan klaim "command ini tidak pernah push".
- `run-pipeline-command.js:529` (checklist Verify) — `"[ ] **Tidak ada push**"` — **BENAR,
  bukan stale.** Ada di dalam blok "Kalau run berakhir NEEDS_HUMAN" (dikonfirmasi baca ulang
  konteks sekitar baris 522-533), bukan berlaku untuk jalur SUCCESS. Scoping-nya benar.

### `"belum di-push"` / `"buka PR manual"`

- Tidak ada match sama sekali untuk frasa persis ini di kedua file. Frasa terkait yang ADA:
  - `run-pipeline-command.js:435` — `"...belum ter-push..."` — dalam konteks 7.3 (commit lokal
    yang belum sempat push karena guard STOP) — **BENAR, bukan stale**, ini state transien yang
    memang bisa terjadi di jalur SUCCESS-tapi-di-STOP-7.3.
  - `run-pipeline-command.js:579` — `"...belum di-commit/push..."` — closing text untuk jalur
    NEEDS_HUMAN — **BENAR, sudah diupdate** sesuai Task 6, bukan sisa frasa lama.

### `"sengaja tidak"`

- Tidak ada match di `run-pipeline-command.js`.
- **`agents.js:354`** — `"// /caf-run-pipeline sengaja TIDAK ikut pola PREVIEW_COMMANDS
  (auto-generate begitu role-nya dipilih)..."` — **BENAR, bukan stale.** Ini soal command TIDAK
  auto-generate begitu role dipilih (perlu konfirmasi eksplisit `generateRunPipeline`), sama
  sekali beda topik dari "sengaja tidak push/PR". Tidak berubah oleh task ini, tetap valid.

### `ALLOWED_TOOLS` duplikat/stale di tempat lain

- Hanya satu definisi `ALLOWED_TOOLS`, di `run-pipeline-command.js`. Tidak ada salinan atau
  referensi ke daftar tool lama di file lain (`agents.js`, template lain). **PASS.**

### Hardcoded `"main"` sebagai base branch

- **Tidak ada** match `'main'`/`"main"`/`` `main` `` di kedua file. Base branch murni dari
  `gh repo view --json defaultBranchRef` (7.5), tidak ada fallback hardcode ke `main` di
  manapun. **PASS.**

### ⚠️ FAIL — Peringatan CLI di `agents.js:387` kontradiksi langsung dengan behavior baru

Di luar dua file "resmi" yang disebut task, ditemukan **satu bug nyata** yang relevan langsung
ke ticket ini — teks peringatan yang ditampilkan CLI ke user **sebelum** `/caf-run-pipeline`
digenerate, tepat di titik keputusan `generateRunPipeline` confirm prompt:

```js
// src/commands/agents.js:375-388
console.log(
  kleur.yellow(
    '⚠ /caf-run-pipeline menjalankan seluruh pipeline Klaster 2 dalam satu sesi Claude Code:\n' +
      '  checkout branch `ai-agent/{TICKET-ID}` dan MENULIS KODE APLIKASI lewat agent\n' +
      '  implementasi. Ini satu-satunya command hasil caf-initiator yang melakukan keduanya.\n' +
      '\n' +
      '  Command ini untuk project yang BELUM/TIDAK pakai caf-orchestrator. Kalau project ini\n' +
      '  sudah pakai orchestrator, dua penulis kode bisa menangani ticket yang sama secara\n' +
      '  paralel. Command-nya punya guard (cek branch lokal + remote, cek verify-report.md\n' +
      '  SUCCESS), tapi guard itu tidak bisa mendeteksi orchestrator yang baru mulai dan belum\n' +
      '  push branch.\n' +
      '\n' +
      '  Command ini TIDAK push dan TIDAK buka PR — itu tetap manual.'   // <-- baris 387
  )
);
```

Baris 387 secara literal bilang **"Command ini TIDAK push dan TIDAK buka PR — itu tetap
manual"** — ini persis kalimat lama yang seharusnya sudah tidak berlaku sejak Section 7
ditambahkan (Task 4). Sekarang command **AUTO-push dan AUTO `gh pr create`** di jalur SUCCESS,
tanpa tanya. User yang membaca peringatan ini sebelum menekan "yes" di prompt
`generateRunPipeline` akan diberi informasi yang salah tentang risiko command yang mereka
generate — persis kelas risiko yang paragraf ini seharusnya menjelaskan (paragraf ini ADA
justru karena command ini "paling berisiko dari semua yang digenerate caf-initiator").

**Dampak**: bukan bug fungsional di command yang digenerate (Section 7 sendiri sudah benar,
lihat poin 2) — ini bug di **CLI generator**, informasi yang salah diberikan ke user PADA SAAT
keputusan generate diambil. Severity tinggi karena sifatnya: user men-generate command
auto-push/auto-PR sambil percaya command itu tidak akan push/PR sama sekali.

**Tidak di-fix di audit ini** (sesuai instruksi) — dilaporkan untuk keputusan lanjutan.

---

## 4. Skenario verifikasi manual (a-d)

**Status: TIDAK DIJALANKAN.**

`gh auth status` dicek — **terautentikasi** (`ganjardbc`, scope `repo`, `workflow`), jadi
prasyarat auth terpenuhi. Yang TIDAK dilakukan: menyiapkan repo test nyata dan benar-benar
dispatch `/caf-run-pipeline` end-to-end (Planner → implementasi → QA → Reviewer → Section 7).

Alasan berhenti sebelum mengeksekusi 4 skenario ini, bukan kegagalan diam-diam:

1. **Biaya dan efek samping nyata.** Tiap skenario men-spawn rangkaian subagent penuh (Planner,
   Frontend/Backend, QA, Reviewer) yang menulis kode sungguhan, membuat branch, dan (skenario a,
   b, d) membuka PR asli di GitHub — bukan operasi lokal yang bisa dibatalkan dengan mudah.
   Ini masuk kategori "hard-to-reverse / visible to others" yang menurut instruksi kerja perlu
   konfirmasi eksplisit sebelum dieksekusi, bukan diasumsikan diotorisasi oleh scope audit.
2. **Temuan poin 3 lebih layak diselesaikan dulu.** Menjalankan skenario a/b/d sekarang berarti
   benar-benar melakukan auto-push + auto-PR persis seperti yang peringatan CLI (masih) bilang
   TIDAK akan terjadi — kalau memang mau didemonstrasikan live, sebaiknya setelah keputusan soal
   temuan poin 3 diambil (fix teksnya, atau sengaja dibiarkan untuk sesi berikutnya), supaya
   siapa pun yang menjalankan skenario ini paham betul apa yang mereka setujui.
3. **Setup skenario c dan d butuh urutan manual presisi** (push commit dummy / buka PR manual
   SEBELUM run) di repo yang sama yang dipakai skenario a/b — kalau dilakukan tergesa tanpa
   keputusan eksplisit soal repo test mana yang dipakai dan dibuang setelahnya, berisiko
   meninggalkan artifact (branch, PR) di repo nyata yang tidak diminta dibersihkan.

**Rekomendasi**: setelah keputusan soal temuan poin 3 (Section 5 di bawah) diambil, jalankan
4 skenario ini sebagai sesi terpisah dengan repo test yang sudah ditentukan eksplisit oleh user
(nama repo, apakah boleh dibuang branch/PR-nya setelah selesai).

---

## Ringkasan

| # | Item | Status |
|---|---|---|
| 1 | Konfirmasi base branch (7.2) | **DEVIASI-DISENGAJA** — kesimpulan `plan.md` tetap benar, tapi sitasi filenya salah (`project-config.schema.ts:13` → seharusnya `schema.ts:138` + `webhooks.ts:86`). Housekeeping, bukan bug. |
| 2 | Isi Section 7 hasil generate | **PASS** — urutan 7.1-7.7 persis sesuai kesepakatan, STOP-condition whitelist eksplisit di body command. |
| 3 | Grep-audit stale phrases | **1 FAIL** — `agents.js:387`, peringatan CLI masih bilang "TIDAK push dan TIDAK buka PR", kontradiksi langsung dengan Section 7 yang baru. Sisanya (`run-pipeline-command.js`) semua PASS/benar secara kontekstual. |
| 4 | 4 skenario verifikasi manual | **TIDAK DIJALANKAN** — butuh keputusan eksplisit soal repo test + urutan penyelesaian temuan #3 dulu. |

**JANGAN tandai ticket selesai** — sesuai instruksi. Menunggu keputusan:
1. Fix `agents.js:387` (dan opsional koreksi sitasi `plan.md` 7.2) — di sesi terpisah, bukan
   bagian audit ini.
2. Repo test mana yang dipakai untuk skenario 4a-4d, dan apakah artifact (branch/PR) di repo
   itu boleh dibuang setelah verifikasi selesai.
