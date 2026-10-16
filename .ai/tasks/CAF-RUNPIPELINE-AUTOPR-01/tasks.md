# Tasks — Auto-commit/push/PR di `/caf-run-pipeline`

Sumber: `plan.md` (APPROVED, semua gap termasuk 7.2 sudah ditutup). Task di bawah dieksekusi
berurutan — masing-masing bergantung pada state file yang dihasilkan task sebelumnya.

Scope file yang disentuh:
- `src/templates/run-pipeline-command.js`
- `src/commands/agents.js`

Tidak ada test suite di project ini — verifikasi tiap task manual sesuai instruksi Verify.

---

## Task 1 — Alirkan `appPaths` dari `detectStack()` ke `buildRunPipelineMd`

**File:** `src/commands/agents.js`

1. Cari data app-dir yang sudah dihitung `02-detect-stack.js` (per `apps/*/package.json`, atau
   root `.` untuk repo single-app) — data itu sudah ada di objek stack yang mengalir lewat
   pipeline `index.js`, tinggal dipetakan ke `role → path`.
2. Bangun `appPaths: Record<string, string>` sejajar dengan `implementationRoles` (baris
   360-362 existing): untuk tiap `c` di `selected` yang `kind` frontend/backend/implementation,
   `appPaths[agentSlug(c.kind, c.app)] = <path app c.app dari stack, atau '.' kalau bukan
   monorepo>`.
3. Teruskan `appPaths` sebagai param baru ke `buildRunPipelineMd({...})` (baris ~393-398).

**Verify:** `node src/index.js --dir <scratch monorepo apps/web+apps/api> --dry-run` lalu
generate agents interaktif (atau baca kode manual) — pastikan `appPaths` terisi path benar per
role, bukan `undefined`. Ulangi untuk scratch repo single-app → `appPaths[role] === '.'`.

---

## Task 2 — Ubah signature `buildRunPipelineMd` terima `appPaths`

**File:** `src/templates/run-pipeline-command.js`

1. Tambah `appPaths = {}` ke destructured params `buildRunPipelineMd` (baris 168-173).
2. Simpan sebagai data yang bisa dirender ke command markdown — Task 5 butuh ini buat tulis
   whitelist scope commit secara eksplisit di body command (mis. daftar `- {role}:
   {appPaths[role]}` yang dibaca command saat runtime).

**Verify:** baca file hasil generate, pastikan param baru sampai ke output tanpa merusak
section lain yang sudah ada.

---

## Task 3 — Update `ALLOWED_TOOLS` dan komentar terkait

**File:** `src/templates/run-pipeline-command.js`

1. Tambah ke `ALLOWED_TOOLS` (baris 27-40): `Bash(git add:*)`, `Bash(git commit:*)`,
   `Bash(git fetch:*)`, `Bash(git push:*)`, `Bash(gh pr create:*)`, `Bash(gh pr list:*)`,
   `Bash(gh repo view:*)`.
2. Update komentar baris 19-26 — hapus klaim "sengaja TIDAK ada push/PR", ganti dengan:
   auto-commit/push/PR terjadi HANYA di jalur SUCCESS (setelah Reviewer APPROVE, lewat guard di
   section commit baru), NEEDS_HUMAN tetap tidak pernah sampai ke situ. Pertahankan catatan
   soal subagent yang punya tool lebih luas dari main thread (masih relevan — subagent implementasi
   tetap dilarang push/PR sendiri lewat instruksi prompt, cuma sekarang MAIN THREAD yang
   melakukannya di akhir, bukan subagent).
3. Update `description` di frontmatter (baris 176): dari "...tanpa buka PR" jadi
   "...auto-commit/push/PR saat SUCCESS, tanpa PR saat NEEDS_HUMAN".

**Verify:** baca ulang komentar — pastikan tidak ada kalimat yang masih bilang command ini
"tidak pernah push/PR" (itu sekarang salah untuk jalur SUCCESS).

---

## Task 4 — Section baru "## 7. Commit, Push, PR (SUCCESS)"

**File:** `src/templates/run-pipeline-command.js`, setelah section 6 Reviewer (baris ~348-350,
sebelum "## Berhenti Terkendali").

Isi section, urutan **wajib**:

### 7.1 Whitelist scope
- Render daftar path yang boleh masuk commit: `.caf/tasks/{TICKET-ID}/` + tiap `appPaths[role]`
  untuk role yang benar-benar disebut di `agentsToRun`/section 3 run ini (bukan semua role yang
  digenerate — hanya yang dispawn run ini).
- `git status --porcelain` → cocokkan tiap path berubah ke whitelist.
- Ada path di luar whitelist → **STOP di sini, JANGAN commit apapun.** Tampilkan daftar path
  mencurigakan, minta user putuskan manual. Treat seperti stop NEEDS_HUMAN tapi dengan label
  sendiri di Ringkasan Akhir ("SUCCESS tapi commit dibatalkan — scope drift terdeteksi").

### 7.2 Commit
- `git add -- {daftar path whitelist yang benar-benar berubah}` (bukan `-A`).
- `git commit -m "AI agent pipeline: {TICKET-ID}"` — **tanpa** `--allow-empty`. Kalau commit
  gagal karena tidak ada diff (nothing to commit), itu sinyal aneh (implementasi selesai tapi
  tidak ada perubahan) → STOP, laporkan ke user, jangan lanjut push/PR.

### 7.3 Guard fetch sebelum push
- `git fetch origin ai-agent/{TICKET-ID}` (atau `git ls-remote --heads origin
  ai-agent/{TICKET-ID}` kalau fetch gagal karena branch belum ada di remote — itu kondisi aman,
  bukan error).
- Remote branch tidak ada → aman, lanjut.
- Remote ada, SHA-nya ancestor dari HEAD lokal (`git merge-base --is-ancestor <remote-sha>
  HEAD`) → aman, lanjut.
- Remote ada, SHA BUKAN ancestor → **STOP sebelum push.** Tampilkan SHA remote, `git log
  --oneline` branch remote, commit lokal yang baru dibuat (belum ter-push). Jangan force-push,
  jangan merge/rebase otomatis. Sebutkan limitasi race-condition apa adanya (sama pola limitasi
  guard 0.2).

### 7.4 Push
- `git push --set-upstream origin ai-agent/{TICKET-ID}`.

### 7.5 Deteksi base branch
- `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` → simpan sebagai `base`.
  Jangan hardcode `main`.

### 7.6 Cek PR existing (idempotensi)
- `gh pr list --head ai-agent/{TICKET-ID} --state open --json url,number`.
- Ada hasil → **jangan** `gh pr create`. Ambil URL dari hasil ini, catat "PR sudah ada, branch
  sudah diupdate" untuk Ringkasan Akhir.
- Kosong → lanjut 7.7.

### 7.7 `gh pr create`
- Title: `{TICKET-ID}: {ticket title dari section Ticket}`.
- Body, identik struktur orchestrator (`buildPrBody`, plan.md poin 2c): `Ticket: {TICKET-ID}` +
  deskripsi ticket, `## Reports` dengan link ke requirements.md/verify-report.md/qa-report.md/
  review-notes.md, docsNote (dari hasil section 4 Documentation run ini), isi mentah
  `qa-report.md`, isi mentah `review-notes.md`. Tidak ada blok `qualityGateWarning` (tidak ada
  fitur skip di command ini).
- Base: hasil 7.5.
- Simpan URL hasil `gh pr create` untuk Ringkasan Akhir.

**Verify:** baca section baru — pastikan urutan 7.1→7.7 tidak bisa dilompati (tiap langkah
punya STOP condition eksplisit sebelum lanjut ke langkah berikutnya), dan tidak ada langkah
yang mengasumsikan `base`/PR-URL sebelum langkah yang menghasilkannya jalan.

---

## Task 5 — Update section "Berhenti Terkendali (NEEDS_HUMAN)"

**File:** `src/templates/run-pipeline-command.js` (baris ~352-361 existing)

Tambah kalimat eksplisit: jalur NEEDS_HUMAN (dari implementasi, gate QA, atau gate Reviewer)
**tidak pernah** mencapai section 7 — commit/push/PR TIDAK terjadi sama sekali, working tree
tetap dirty seperti kondisi terakhir agent berhenti. Ini bukan perubahan behavior (sudah
tersirat dari `return`/stop tiap gate), cuma menghilangkan ambiguitas buat pembaca command.

**Verify:** baca ulang — pastikan tidak kontradiksi dengan section 7 yang baru ditambahkan.

---

## Task 6 — Update section "## Verify" dan penutup command

**File:** `src/templates/run-pipeline-command.js` (baris ~363-375 Verify, ~399-402 penutup)

1. Checklist "Verify" jadi kondisional per status akhir:
   - NEEDS_HUMAN: checklist lama tetap (tidak ada push — cek `git status -sb`).
   - SUCCESS: checklist baru — push memang terjadi, PR dibuat ATAU PR existing terdeteksi
     (Task 4 §7.6) dan URL-nya benar, tidak ada file di luar whitelist yang ter-commit (`git
     show --stat` HEAD, cocokkan ke whitelist §7.1).
2. Penutup command: ganti kalimat "belum di-push... buka PR manual" jadi kondisional —
   SUCCESS → tampilkan URL PR (baru atau existing) dan branch; NEEDS_HUMAN → kalimat lama
   ("kode ada di branch X, belum di-push, buka PR manual") tetap berlaku apa adanya.

**Verify:** baca ulang seluruh command dari awal sampai akhir sekali jalan — pastikan tidak ada
sisa kalimat yang mengklaim command ini "tidak pernah push/PR" tanpa kualifikasi status.

---

## Task 7 — Verifikasi end-to-end template generation

Tidak ada perubahan kode di luar 2 file di atas. Verifikasi manual sesuai `plan.md` bagian
"Rencana Verifikasi":

1. `node src/index.js --dir /tmp/scratch-repo --dry-run` — pastikan step lain tidak regresi.
2. Generate `/caf-run-pipeline` ke scratch monorepo (`apps/web` + `apps/api`) — baca file hasil,
   cocokkan `ALLOWED_TOOLS` (Task 3), `appPaths` per role (Task 1-2), section 7 lengkap (Task 4).
3. Ulangi untuk scratch single-app repo — `appPaths[role] === '.'`, section 7 tetap valid secara
   tekstual (whitelist jadi seluruh repo, tapi tetap dirender eksplisit, bukan `-A` literal di
   command).
4. Baca ulang seluruh file `run-pipeline-command.js` hasil akhir sekali dari atas ke bawah untuk
   cek konsistensi lintas section (Task 1-6 saling bergantung, gampang salah satu section punya
   asumsi yang sudah tidak berlaku setelah section lain diubah).

**Tidak termasuk task ini** (di luar scope sesi ini, perlu env dengan `gh` auth + repo GitHub
nyata): dispatch nyata command lewat Claude Code sungguhan, simulasi remote-branch-collision,
simulasi PR-existing, simulasi base-branch bukan `main`. Item-item itu tetap tercatat di
`plan.md` sebagai verifikasi lanjutan yang dilakukan user secara manual setelah command ini
di-generate ke repo target sungguhan.
