# Tasks — CAF-PRREVIEW-01, Checkpoint A (caf-initiator saja)

Sumber: `plan.md` (semua 6 poin) + 5 klarifikasi tambahan dari prompt tasks.md (lihat
masing-masing task di bawah, dirujuk balik ke klarifikasinya). Checkpoint B (caf-orchestrator:
webhook route, permission check versi SDK, use-case baru) **TIDAK ada di sini** — tasks.md
terpisah setelah Checkpoint A selesai dan di-approve.

Scope file yang (kemungkinan) disentuh Checkpoint A:
- `src/templates/agent-md.js` (buildInputSection cabang reviewer)
- `src/utils/agent-sections.js` (kalau SYNCABLE_SECTIONS/KNOWN_KINDS perlu berubah)
- `src/commands/agents-sync.js`, `src/commands/audit.js` (konsumen SYNCABLE_SECTIONS — cek
  saja, kemungkinan besar tidak perlu diubah karena mereka generic terhadap kind)
- `src/templates/ticket-preview-commands.js` (command companion baru)
- `src/commands/agents.js` (daftarkan command baru, kalau modelnya company command generatif —
  keputusan ada di Task D)

Tidak ada test suite di project ini — verifikasi tiap task manual (generate ke scratch dir,
baca hasil).

---

## Task A — Investigasi lanjutan `in_reply_to_id` (paling awal, prasyarat Task D)

Klarifikasi #2. Scope Checkpoint A cuma pakai REST API (`gh api .../pulls/{n}/comments`), bukan
payload webhook mentah — tapi field yang sama dipakai untuk bedain INLINE vs GENERAL di daftar
`/caf-fix-review.md`, jadi validasi ulang dulu sebelum Task D menulis command yang bergantung
padanya.

1. `gh api repos/{owner}/{repo}/pulls/comments` (list-review-comments-in-a-repository) ATAU
   `gh api repos/{owner}/{repo}/pulls/{number}/comments` di repo nyata yang punya minimal satu
   PR dengan review comment ber-reply (buat dulu kalau belum ada — repo test kecil, bukan repo
   produksi). Konfirmasi field `in_reply_to_id` muncul persis di objek comment: `null` untuk
   comment awal thread, terisi ID comment induk untuk reply.
2. Cocokkan field ini dengan asumsi plan.md §4 (comment inline = kandidat scoped fix, comment
   general dari `issues/{n}/comments` tidak punya field ini sama sekali — konfirmasi juga field
   itu benar-benar tidak ada di objek issues/comments).
3. **OPEN ITEM, catat eksplisit di bagian bawah task ini (bukan diselesaikan di sini)**: status
   field `in_reply_to_id` pada payload WEBHOOK `pull_request_review_comment` (beda dari REST
   resource `/pulls/comments/{id}` yang divalidasi di langkah 1) — ini scope Checkpoint B.
   Tulis catatan ke `.ai/tasks/CAF-PRREVIEW-01/open-items.md` (file baru) sebagai warisan untuk
   tasks.md Checkpoint B nanti: "REST resource `in_reply_to_id` dikonfirmasi [tanggal, hasil
   Task A]. Payload webhook `pull_request_review_comment` BELUM divalidasi — validasi ulang
   sebelum implementasi route webhook di Checkpoint B, jangan asumsikan struktur sama."

**STOP condition:** kalau langkah 1 menemukan field `in_reply_to_id` TIDAK ada, atau nilainya
tidak konsisten (null utk semua comment termasuk reply asli, atau field lain yang dipakai untuk
threading) — berhenti, laporkan sebagai temuan yang mengubah desain Task D (kandidat: field lain
yang mengindikasikan reply, atau kesimpulan "GitHub API tidak expose threading untuk PR review
comment", yang berarti scoped-fix harus redesign total). Jangan lanjut ke Task B dengan asumsi
yang belum terkonfirmasi.

**Verify:** output `gh api` tersimpan (screenshot/paste ke `open-items.md` sebagai bukti), field
`in_reply_to_id` terverifikasi ada + null/terisi sesuai ekspektasi pada minimal 1 thread nyata
(1 comment awal + 1 reply).

---

## Task B — Desain kerangka kontrak output mode post-PR

Klarifikasi #3. Kerangka saja (bukan implementasi) — cukup untuk memandu Task C/D, detail penuh
(format markdown lengkap, dsb) boleh disempurnakan saat implementasi Task D kalau ada gap kecil,
tapi 3 keputusan di bawah **wajib final** sebelum Task D mulai:

1. **Nama & lokasi file**: `.caf/tasks/{TICKET-ID}/fix-review-log.md`. Alasan: konsisten
   namespace dengan artifact PIV lain (`verify-report.md`, `qa-report.md`, `review-notes.md`
   semua di folder yang sama) — bukan folder baru, supaya tooling yang sudah baca
   `.caf/tasks/{TICKET-ID}/` (mis. audit/report-reader pattern di caf-orchestrator Checkpoint B
   nanti) tidak perlu path baru. Nama beda dari `review-notes.md` supaya tidak bentrok/tertimpa
   — file itu tetap milik gate pre-PR.
2. **Isi minimal** — bukan verdict tunggal seperti `review-notes.md`, tapi log per-comment:
   ```
   ## Fix Review Log — {TICKET-ID}
   Generated: {timestamp}
   Triggered by: {mode: scoped | global}

   ### Comment {comment_id atau url} [{INLINE path:line | GENERAL}]
   > {kutipan comment asli, dipotong kalau panjang}
   Status: FIXED | SKIPPED | NOT_APPLICABLE
   Catatan: {alasan singkat, terutama wajib diisi untuk SKIPPED/NOT_APPLICABLE}
   ```
   Satu blok `### Comment ...` per comment yang diproses. Mode global → semua comment
   outstanding masing-masing dapat blok sendiri (bukan satu ringkasan gabungan) — supaya per-
   comment traceable, sejalan alasan kontrak QA/Reviewer existing (satu file, status granular).
3. **Jalur komunikasi balik ke GitHub** — **reply ke comment asli** (bukan cuma post comment
   ringkasan baru), via `gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/
   replies` untuk comment INLINE yang statusnya FIXED/SKIPPED/NOT_APPLICABLE. Alasan: reviewer
   manusia melihat balasan tepat di thread yang relevan (UX GitHub native), bukan harus
   korelasikan comment umum baru dengan comment lama. Untuk mode GLOBAL atau comment GENERAL
   (tidak punya endpoint reply — general comment bukan review comment), fallback: satu comment
   baru di `issues/{number}/comments` yang isinya ringkasan (embed isi `fix-review-log.md` atau
   link ke commit/file-nya kalau di-commit). Command WAJIB melakukan reply-per-inline-comment
   DAN satu comment ringkasan penutup (bukan salah satu saja) — reply per-comment untuk
   traceability, ringkasan penutup untuk reviewer yang tidak buka tiap thread.

**Verify:** baca ulang 3 keputusan di atas — pastikan Task D bisa diimplementasi tanpa perlu
keputusan desain baru yang belum ada di sini (kalau ketemu gap saat Task D, balik ke task ini
dulu, jangan improvisasi diam-diam di tengah Task D).

---

## Task C — Extend `caf-reviewer.md` template: input opsional komentar manusia

Klarifikasi #1 (pola Documentation Agent, `buildInputSection` baris 152-157) + disiplin
grep-audit sebelum ubah (sudah dilakukan investigasi awal — dikonfirmasi 4 titik di bawah,
verifikasi ulang di awal task ini sebelum edit untuk pastikan tidak ada titik baru sejak plan.md
ditulis).

1. **Grep ulang dulu** (`grep -rn "buildInputSection\|SYNCABLE_SECTIONS" src/`) — konfirmasi 4
   titik berikut masih semua tempat yang relevan:
   - `src/templates/agent-md.js:145` — `buildInputSection`, cabang `kind === 'reviewer'` (fungsi
     sumber, di sini logic utama berubah).
   - `src/utils/agent-sections.js:26` — `SYNCABLE_SECTIONS.Input = (kind) => buildInputSection
     (kind)`, dipanggil **tanpa** `appNames` (selalu fallback generic phrasing, appNames=[]
     default). Perubahan di agent-md.js harus tetap masuk akal saat dipanggil begini — jangan
     bikin cabang baru yang WAJIB appNames, karena existing callers tidak pernah passing itu.
   - `src/commands/agents-sync.js` — pemakai `SYNCABLE_SECTIONS` untuk regenerate section
     "Input" pada file existing (**overwrite** — behavior existing, bukan baru; konten baru dari
     langkah ini otomatis ikut ter-propagate ke file lama saat user jalankan sync, sesuai
     desain sync yang sudah ada. Cukup pastikan hasil generatenya tetap valid markdown, tidak
     perlu ubah logic agents-sync.js sendiri).
   - `src/commands/audit.js:174-175` — pemakai read-only (bandingkan isi file vs canonical,
     laporkan drift) — sama, tidak perlu diubah, cukup pastikan hasil baru tetap comparable.
2. **Ubah `buildInputSection(kind, appNames)` cabang `reviewer`** (`agent-md.js:145-151`):
   tambahkan paragraf baru **setelah** kalimat wajib existing (`verify-report.md` +
   `qa-report.md`), berpola sama seperti cabang `documentation` (baris 152-157) — eksplisit
   "opsional, bukan syarat wajib":
   ```
   Opsional — kalau dipanggil dari mode post-PR (`/caf-fix-review`, bukan gate pre-PR pipeline
   normal), agent ini juga menerima komentar reviewer manusia dari GitHub (teks comment +
   metadata INLINE path:line atau GENERAL, dan mode scoped/global) sebagai input tambahan,
   disisipkan langsung di prompt spawn oleh command tersebut — bukan file artifact terpisah di
   `.caf/tasks/{TICKET-ID}/`. Kalau tidak ada input ini (mode pre-PR normal), lanjut seperti
   biasa dari `verify-report.md`/`qa-report.md` saja.
   ```
3. **JANGAN** ubah `TOOLS_BY_KIND.reviewer` atau `TOOLS_RATIONALE.reviewer` — mode post-PR tetap
   read-only terhadap kode (`Read`, `Bash` untuk `git diff`, `Write` untuk artifact) sesuai
   plan.md §2, tidak ada kebutuhan tool baru untuk MENULIS kode. (Reply ke GitHub via `gh api`
   adalah tanggung jawab command `/caf-fix-review.md`, bukan agent — lihat Task D, agent tetap
   cuma menulis `fix-review-log.md`.)
4. **Output section** (`buildOutputSection`, `agent-md.js:283-297`) — TIDAK diubah. Artifact
   default kind reviewer tetap `review-notes.md` (dari `ARTIFACT_BY_ROLE`) untuk mode pre-PR;
   `fix-review-log.md` (Task B) bukan bagian dari kontrak Output generik ini — disebutkan hanya
   di command `/caf-fix-review.md` (Task D) sebagai artifact spesifik mode itu, supaya
   `buildOutputSection` tidak perlu tahu tentang mode yang datangnya dari command lain (agent
   sendiri agnostic terhadap siapa yang memanggilnya, konsisten desain existing).

**Verify:** `node src/index.js --dir /tmp/scratch-repo --dry-run` lalu generate agent Reviewer
interaktif — baca `caf-reviewer.md` hasil, pastikan section Input berisi paragraf pre-PR
(existing, tidak berubah teksnya) + paragraf baru opsional post-PR, dan tidak merusak parsing
`agent-sections.js` (jalankan `caf-init audit` — kalau ada command itu — atau baca manual bahwa
`## Input` tetap satu section, bukan kepecah jadi dua header).

---

## Task D — `/caf-fix-review.md`, command baru

Klarifikasi #1 (companion command baru, bukan agent baru) + Task A (prasyarat: field
`in_reply_to_id` dari REST API dikonfirmasi) + Task B (kontrak output) harus selesai dulu.

1. **File baru**: `src/templates/fix-review-command.js`, export `buildFixReviewMd({ agentDir })`
   — pola sama `previewCommandMd()` di `ticket-preview-commands.js` (banner DRAFT, blok
   `notAPipelineTrigger` **TIDAK dipakai di sini** — command ini BEDA dari 4 preview command
   existing: dia BUKAN preview manual read-only, dia benar-benar memanggil `caf-reviewer.md`
   dan menulis balik ke GitHub. Jangan copy blok itu apa adanya, tulis "Setelah Selesai" versi
   sendiri yang jujur soal efek sampingnya (reply ke PR, file baru di `.caf/tasks/`).
2. **Isi command, urutan wajib:**
   - **0. Permission check** (Task E) — paling awal, sebelum fetch comment apapun. Gagal → diam-
     diam stop (lihat Task E untuk detail "diam-diam").
   - **0.5. Resolusi PR number** (baru — WAJIB sebelum langkah 1, karena langkah 1 butuh
     `{owner}/{repo}/{number}` yang sudah resolve, bukan given):
     - Frontmatter `argument-hint: [PR-number, contoh: "81"]`. `$ARGUMENTS` adalah **PR number**,
       BUKAN TICKET-ID — beda dari command lain di project ini yang argumennya TICKET-ID, catat
       ini eksplisit di body command supaya tidak tertukar.
     - `$ARGUMENTS` kosong → auto-detect dari branch aktif: `git branch --show-current`. Match
       pattern `ai-agent/{TICKET-ID}` → cari PR-nya via `gh pr list --head ai-agent/{TICKET-ID}
       --json number,url` (reuse pola persis 7.6 `run-pipeline-command.js`, jangan tulis ulang
       logic gh-nya). Tidak ketemu PR untuk branch itu, ATAU branch aktif tidak match pattern
       `ai-agent/*` → tanya user PR number-nya langsung, **STOP** sampai dijawab — jangan menebak.
     - TICKET-ID (dibutuhkan Task B untuk path `.caf/tasks/{TICKET-ID}/fix-review-log.md`)
       DI-DERIVE dari PR yang sudah resolve di atas, bukan dideteksi terpisah: `gh pr view
       {number} --json headRefName`, parse pattern `ai-agent/{TICKET-ID}` dari `headRefName`.
       PR-nya bukan dari branch pattern itu (PR manual, bukan hasil `caf-run-pipeline`/
       orchestrator) → tanya user TICKET-ID-nya manual, **STOP** sampai dijawab.
   - **1. Fetch comment**: `gh api repos/{owner}/{repo}/pulls/{number}/comments` (inline,
     field `in_reply_to_id` per Task A) **DAN** `gh api repos/{owner}/{repo}/issues/{number}/
     comments` (general), pakai `{owner}/{repo}/{number}` hasil resolve langkah 0.5. Gabungkan,
     label eksplisit `[INLINE {path}:{line}]` vs `[GENERAL]` (plan.md §4).
   - **2. Tampilkan daftar** ke user (chat, bukan file), dengan **grouping per-thread untuk
     INLINE**:
     - Comment INLINE dengan `in_reply_to_id == null` → satu ENTRY bernomor (thread-starter).
       Reply-reply dengan `in_reply_to_id` terisi ke thread yang sama TIDAK jadi entry
       terpisah — tampilkan ter-indent/quote di bawah thread-starter-nya (mis. `↳ reply:
       {teks}`), urut kronologis, supaya user lihat histori diskusi tapi cuma pilih satu nomor
       per thread.
     - Comment GENERAL (`issues/{n}/comments`) tidak punya struktur reply — semua tetap entry
       terpisah apa adanya, tidak ada grouping yang applicable di sini.
     - Opsi terakhir eksplisit "semua" (global fix), selalu ada terlepas jumlah entry.
   - **3. User pilih** — satu nomor thread INLINE → scoped, **bawa SELURUH histori thread**
     (comment awal + semua reply, urut kronologis — bukan cuma comment awal) sebagai context;
     satu nomor GENERAL → scoped, comment tunggal apa adanya (tidak ada histori thread untuk
     dibawa); "semua" → global (seluruh comment outstanding, tidak difilter status resolved —
     command TIDAK punya cara cek status "resolved" GitHub dari `gh api` biasa tanpa GraphQL,
     jadi catat sebagai TODO project-specific: "opsional, tambahkan filter resolved via GraphQL
     kalau reviewer manusia resolve comment secara manual dan tidak mau itu ikut ke-fix ulang").
   - **4. Spawn `caf-reviewer.md`** — prompt WAJIB memuat: TICKET-ID (sudah resolve dari langkah
     0.5, bukan dideteksi ulang di sini), comment/thread terpilih apa adanya (untuk thread
     INLINE: seluruh histori dari langkah 3, bukan cuma comment awal; label INLINE/GENERAL +
     path:line kalau ada), instruksi tulis `fix-review-log.md` (Task B kontrak), dan larangan
     eksplisit berikut — **konstanta baru** `FIX_REVIEW_PROHIBITION` di `fix-review-command.js`,
     **BUKAN** reuse `PUSH_PR_PROHIBITION` dari `run-pipeline-command.js` (kalimat itu merujuk
     "section 7" yang tidak eksis di command ini — command ini tidak punya section commit/push/
     PR sama sekali, kontraknya beda total, jadi sumber kalimatnya juga harus beda supaya tidak
     ikut berubah kalau `run-pipeline-command.js` diedit nanti untuk alasan lain):
     ```
     Jangan `git push`, jangan `gh api` apapun ke GitHub, jangan ubah status ticket di tracker —
     tulis `fix-review-log.md` saja. Komunikasi balik ke GitHub itu tugas main thread command
     ini, dilakukan setelah kamu selesai.
     ```
   - **5. Baca `fix-review-log.md`** hasil, untuk tiap comment: **reply** ke comment asli
     (INLINE via `gh api .../pulls/comments/{id}/replies` — untuk thread yang di-fix, reply
     ditujukan ke comment paling akhir dalam thread itu, bukan selalu comment awal; GENERAL
     tidak punya endpoint reply — skip reply individual, cuma masuk ringkasan) sesuai Task B
     keputusan #3, lalu **post comment ringkasan** ke `issues/{number}/comments`.
   - **6. Tampilkan ringkasan ke user** di chat — link ke reply/comment yang baru dibuat.
3. **Daftarkan ke `agents.js`** — **TIDAK** ikut pola `PREVIEW_COMMANDS` (baris 31-36, auto-
   generate begitu Reviewer dipilih) karena command ini punya efek samping nyata ke GitHub
   (bukan preview). Ikuti pola `/caf-run-pipeline` sebagai gantinya (baris 371-418): generate
   HANYA kalau Reviewer sudah dipilih DAN user confirm eksplisit lewat prompt konfirmasi
   terpisah (`generateFixReview`), dengan warning text yang jujur soal efek samping (reply
   otomatis ke PR orang, bukan cuma commit lokal). Tempatkan section baru setelah section
   `/caf-run-pipeline` yang sudah ada di `agents.js`.

**Verify:** generate ke scratch repo (Reviewer dipilih + confirm generate), baca
`caf-fix-review.md` hasil — pastikan:
- Urutan 0 → 0.5 → 1 → 6 lengkap, tidak ada langkah yang hilang atau kepotong akibat penyisipan
  0.5.
- Frontmatter `argument-hint` menyebut PR number (bukan TICKET-ID), dan body command jelas
  membedakan jalur `$ARGUMENTS` terisi vs auto-detect dari branch vs tanya user (dua STOP
  condition langkah 0.5 eksplisit tertulis, bukan tersirat).
- Daftar comment langkah 2: thread INLINE ber-reply tampil sebagai satu entry + reply
  ter-indent, bukan reply-nya ikut jadi entry bernomor terpisah. Comment GENERAL tetap satu
  entry per comment.
- Larangan di langkah 4 berbunyi `FIX_REVIEW_PROHIBITION` (kalimat "tulis fix-review-log.md
  saja... komunikasi balik itu tugas main thread"), **BUKAN** kalimat `PUSH_PR_PROHIBITION`
  dari `run-pipeline-command.js` (yang menyebut "section 7") — cek tidak ada sisa referensi ke
  konstanta/kalimat lama itu di file hasil generate.
- Command TIDAK muncul kalau Reviewer tidak dipilih atau user jawab tidak saat prompt
  konfirmasi (behavior lama, tidak berubah oleh revisi ini).

---

## Task E — Permission check versi CLI

Klarifikasi #4 (catatan permanen "cek sisi satunya" harus di kode, bukan cuma tasks.md).

1. Snippet/section di `caf-fix-review.md` (bagian awal command, Task D langkah 0):
   ```
   ## 0. Permission Check (WAJIB, sebelum langkah apapun di bawah)
   `gh api repos/{owner}/{repo}/collaborators/{username}/permission --jq .permission`
   — {username} adalah pemilik comment yang memicu command ini (untuk mode interactive:
   user Claude Code yang menjalankan command ini sendiri, ambil dari `gh api user --jq .login`).
   Hasil BUKAN salah satu dari `write`, `maintain`, `admin` → **STOP, jangan proses apapun**.
   TIDAK ada pesan error ke user, TIDAK ada comment/reply ke GitHub — command berhenti diam-diam.
   (Threshold ini dirujuk ke satu sumber: `.ai/tasks/CAF-PRREVIEW-01/plan.md` §5 — kalau
   threshold berubah, update di sana dulu, lalu di sini DAN di sisi webhook caf-orchestrator
   Checkpoint B. JANGAN update salah satu sisi saja.)
   ```
2. Tambahkan **komentar permanen** (bukan cuma di tasks.md — permintaan eksplisit klarifikasi
   #4) di `src/templates/fix-review-command.js`, dekat literal threshold array/string:
   ```js
   // Threshold permission (write/maintain/admin) HARUS sinkron dengan sisi webhook
   // caf-orchestrator (checkpoint CAF-PRREVIEW-01 B, src/infrastructure/vcs/github-permission.ts
   // atau setara). Rujukan tunggal: caf-initiator .ai/tasks/CAF-PRREVIEW-01/plan.md §5.
   // Ubah threshold di sini? Cek juga sisi orchestrator sudah diupdate — JANGAN cuma satu sisi.
   ```

**Verify:** baca `caf-fix-review.md` hasil generate — section "0. Permission Check" ada di
posisi paling awal (sebelum fetch comment), threshold match plan.md §5 (`write`, `maintain`,
`admin`), bahasa "diam-diam stop, tidak ada pesan balik" eksplisit tertulis. Baca
`fix-review-command.js` — komentar sinkronisasi ada dan reachable (dekat literal, bukan di
kepala file jauh dari kode yang dimaksud).

---

## Task F — Rencana verifikasi Checkpoint A

Klarifikasi #5. Tidak ada test suite — verifikasi manual, sama pola CAF-RUNPIPELINE-AUTOPR-01.

1. `node src/index.js --dir /tmp/scratch-caf-prreview --dry-run` — pastikan step lain (audit,
   detect-stack, detect-tracker, generate-drafts) tidak regresi akibat perubahan Task C.
2. Generate agent (Planner + minimal 1 implementasi + Reviewer dipilih) ke scratch repo —
   konfirmasi Task C (§ Input caf-reviewer.md) dan Task D (`/caf-fix-review.md` muncul setelah
   confirm) sama-sama benar dalam satu run generate.
3. `caf-init scaffold agents` (atau command sync yang relevan) di scratch repo yang SUDAH punya
   `caf-reviewer.md` versi lama (sebelum Task C) — jalankan sync, konfirmasi section Input
   ter-update ke versi baru tanpa merusak section lain (uji jalur `agents-sync.js`/`audit.js`
   yang digrep di Task C langkah 1).
4. Baca ulang `caf-fix-review.md` dan `caf-reviewer.md` hasil akhir dari atas ke bawah sekali
   jalan — cek konsistensi lintas file (larangan push/PR sama redaksi, threshold permission sama
   angka, kontrak `fix-review-log.md` di command match apa yang diminta ke agent).

**Tidak termasuk task ini** (butuh env `gh` auth + PR nyata + Claude Code sungguhan menjalankan
command): dispatch nyata `/caf-fix-review` di PR sungguhan, simulasi reply GitHub API nyata,
simulasi permission check dengan user beneran non-collaborator. Item ini diwariskan sebagai
verifikasi manual user setelah command digenerate ke repo target sungguhan — sama pola
CAF-RUNPIPELINE-AUTOPR-01.

**CATATAN WAJIB, jangan dihapus dari file ini:** Checkpoint A **TIDAK bisa dianggap selesai
end-to-end** sampai Checkpoint B (caf-orchestrator: webhook route, permission check versi SDK,
use-case `run-pr-review`) juga selesai dan **di-dry-run bareng** Checkpoint A. Verifikasi di
Task F ini terbatas ke jalur interactive (`/caf-fix-review` manual) saja — konsistensi hasil
antara jalur interactive dan webhook (syarat inti ticket, plan.md §2/§3) baru bisa diverifikasi
setelah keduanya ada. **Jangan tandai ticket CAF-PRREVIEW-01 sebagai closed di akhir Checkpoint
A**, terlepas dari hasil Task A-F — status ticket tetap open, tunggu Checkpoint B.

---

STOP setelah tasks.md ini. Menunggu approval sebelum implementasi Task A dst.
