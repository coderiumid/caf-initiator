# Plan: CAF-PRREVIEW-01 — caf-pr-review (investigasi, belum implementasi)

Status: INVESTIGASI SELESAI, menunggu approval. Jangan lanjut ke tasks.md sebelum disetujui.

Repo: caf-initiator (generator Layer 1/2) + caf-orchestrator (Layer 5, cross-repo investigation).

## Konteks final (dari ticket, tidak berubah)
- caf-reviewer (existing): pre-PR, wajib, otomatis, bagian PIV pipeline — TIDAK diganti.
- caf-pr-review (baru): post-PR, on-demand, reaktif komentar review manusia.
- Wajib share satu review engine dengan caf-reviewer.
- Dua jalur trigger: webhook (caf-orchestrator) + interactive (command Claude Code), harus konsisten.
- Whitelist: `gh api repos/{owner}/{repo}/collaborators/{username}/permission --jq .permission`,
  proses hanya kalau write/maintain/admin, selain itu diam (log internal saja).
- `/caf-fix-review` interactive: tampilkan daftar comment, user pilih (satu = scoped, "semua" = global).

---

## 1. Tipe event GitHub — KESIMPULAN

Dikonfirmasi via docs.github.com/en/webhooks/webhook-events-and-payloads (bukan ingatan):

| Event | Action values | Field kunci | Threading |
|---|---|---|---|
| `issue_comment` | created, edited, deleted, pinned, unpinned | `comment.body`, `issue.*` (issue ATAU PR — PR juga punya `issue` object di webhook ini) | **Tidak ada** field reply/thread. Linear, murni. |
| `pull_request_review_comment` | created, edited, deleted | `comment.*` (inline, per-baris kode), `pull_request.*` | **Ada** — REST resource untuk review comment (`GET /repos/{o}/{r}/pulls/comments`) punya field `in_reply_to_id` (null = top-level thread starter, terisi = reply ke comment lain). Webhook payload `comment` object memakai representasi resource yang sama, jadi field ini ada di payload — tapi halaman webhook-events-and-payloads sendiri tidak mengenumerasi field nested secara lengkap, jadi **verifikasi ulang dengan payload asli** (capture 1x delivery nyata, mis. lewat webhook debug endpoint atau `gh api repos/{o}/{r}/pulls/comments/{id}`) sebelum implementasi final — residual risk kecil, bukan blocker desain. |
| `pull_request_review` | submitted, edited, dismissed | `review.body` (top-level, bukan inline), `review.state` (approved / changes_requested / commented) | Ini event submit review manusia (klik "Approve"/"Request changes" di GitHub UI dengan body comment), BUKAN comment biasa. |

**Pemetaan trigger (WAJIB):**
- **(a) trigger AWAL `/caf-review`** (comment biasa "tolong review lagi", general, bukan reply,
  bukan inline): **`issue_comment`** (action: created). Juga relevan: **`pull_request_review`**
  (action: submitted, state: changes_requested/commented dengan body) — reviewer manusia yang
  klik "Request changes" dan menulis catatan di body review juga valid sebagai trigger ulang.
- **(b) trigger `/caf-fix-review` SCOPED** (reply ke comment spesifik, inline code comment):
  **`pull_request_review_comment`** (action: created, `comment.in_reply_to_id` terisi ATAU
  balasan langsung di thread comment tsb — reply ke inline review comment).
- **(c) trigger `/caf-fix-review` GLOBAL** (comment umum minta "fix semua", bukan reply):
  **`issue_comment`** (action: created) — sama event dengan (a), dibedakan lewat isi/intent
  comment (parsing teks), bukan lewat tipe event.

**Implikasi desain route (WAJIB dicatat):** (a)/(c) sama-sama `issue_comment`, tapi (b) beda
event (`pull_request_review_comment`). Route webhook caf-orchestrator **harus subscribe ke
DUA event type**: `issue_comment` dan `pull_request_review_comment` (opsional tambahan
`pull_request_review` untuk (a) varian approve/changes_requested). Tidak bisa satu handler
generic — payload shape beda (comment vs review vs issue), jadi minimal butuh 2 route handler
terpisah yang keduanya bermuara ke logic pembeda intent yang sama (scoped vs global vs initial).
GitHub App/webhook config perlu mencentang ketiga event ini di subscription list.

---

## 2. Struktur review engine caf-reviewer — KESIMPULAN

Dibaca: `src/commands/agents.js`, `src/templates/agent-md.js`, `src/templates/
ticket-preview-commands.js` (caf-initiator — ini yang menggenerate `caf-reviewer.md`,
bukan file statis yang di-commit).

**Temuan penting — asumsi ticket meleset di satu titik:** `caf-reviewer.md` BUKAN file
kaya-rubrik yang bisa langsung "dipisah kriterianya". Ia digenerate generik oleh
`buildAgentMd({kind:'reviewer',...})` (`agent-md.js:329`) — isinya cuma boilerplate PIV
(Role/Scope/Tools/Input/Output/Verify Checklist) plus TODO project-specific untuk Scope.
Tidak ada rubrik severity/kategori temuan yang di-bake-in seperti yang dipunya Auditor
(`buildAuditContractSections` di `ticket-preview-commands.js:240` — Auditor PUNYA kontrak
laporan eksplisit `WHAT_TO_LOOK_FOR` + `reportSkeleton` dari `audit-report-format.js`, Reviewer
TIDAK). Artinya: **tidak ada "satu sumber kriteria review" yang sudah ada untuk diekstrak** —
itu perlu DIBUAT, bukan direfaktor dari yang sudah ada.

Kontrak yang SUDAH ada dan dipakai caf-orchestrator (`report-reader.ts` pola
`readReviewerReport`, lihat task CAF-REVIEWER-AGENT-INTEGRATION/plan.md di caf-orchestrator):
- Reviewer menulis `.caf/tasks/{TICKET-ID}/review-notes.md` dengan `## Verdict: APPROVE /
  CHANGES REQUESTED / DEFER` — diparse via regex sederhana.
- Reviewer dipanggil generik: prompt "Review implementasi ... tulis review-notes.md", isi
  kriteria 100% ada di file `caf-reviewer.md` itu sendiri (yang project-specific, hasil edit
  manual manusia setelah generate — bukan template caf-initiator lagi setelah user
  melengkapi TODO).
- **`/caf-run-pipeline` (interactive, caf-initiator) SUDAH memanggil `caf-reviewer.md` yang
  sama** untuk gate-nya (`run-pipeline-command.js:402`, label
  `` Reviewer (`${agentDir}/caf-reviewer.md`) ``) — pola retry-nya (`reviewerRetryCount`,
  max 1x retry) sudah mirror 1:1 logic orchestrator. Jadi preseden "satu file dipanggil dari
  dua jalur, hasil harus konsisten" **sudah ada dan sudah bekerja** untuk caf-reviewer vs
  /caf-run-pipeline — pola yang sama harus dipakai caf-pr-review vs webhook-nya.

**Rekomendasi struktur (minim resiko drift):**
- **JANGAN** buat `caf-pr-review.md` sebagai agent definition terpisah dengan kriteria
  ter-copy manual. Itu persis pola drift yang ticket ingin hindari.
- Perluas `caf-reviewer.md` (agent yang SAMA, kind `reviewer`) agar bisa menerima **konteks
  tambahan opsional**: bukan cuma `verify-report.md` + `qa-report.md` (pre-PR), tapi juga
  "komentar reviewer manusia di PR" sebagai input opsional untuk mode post-PR. Ini konsisten
  dengan pola `buildInputSection(kind, appNames)` di `ticket-preview-commands.js:145` — tambah
  cabang baru di situ untuk describe input tambahan kondisional (mirror pola Documentation
  Agent yang inputnya juga opsional, baris 152-157), BUKAN bikin file terpisah.
- Command companion BARU tetap perlu (bukan agent baru): `/caf-fix-review.md` di
  `.claude/commands/` — pola sama seperti `caf-review-ticket.md` (companion command generik,
  lihat `PREVIEW_COMMANDS` di `agents.js:31-36`), tapi tugasnya beda: bukan preview manual,
  tapi orchestrasi "baca daftar comment → user pilih → spawn caf-reviewer.md dengan prompt
  yang menyisipkan comment terpilih sebagai konteks scoped/global". Command ini yang jadi
  jalur interactive; ia MEMANGGIL `caf-reviewer.md` yang sama, tidak menduplikasi kriteria.
  Sisi webhook (caf-orchestrator) juga harus memanggil agent yang sama (`agentRunner.run
  ('reviewer', ...)`) dengan prompt yang membawa comment context yang sama shape-nya —
  itu yang menjaga konsistensi hasil, bukan file terpisah.
- Kontrak output `review-notes.md` (Verdict APPROVE/CHANGES REQUESTED/DEFER) **tetap dipakai
  apa adanya** untuk mode pre-PR. Untuk mode post-PR (`/caf-fix-review`), butuh kontrak output
  BARU yang beda tujuannya (bukan verdict gate, tapi "apakah fix untuk komentar X sudah
  selesai" — perlu didesain di tasks.md nanti, dicatat di sini sebagai open item, bukan
  keputusan final).

---

## 3. Pola webhook route existing caf-orchestrator — KESIMPULAN

Dibaca: `src/presentation/web/routes/webhooks.ts`, `src/infrastructure/vcs/security.ts`,
`src/infrastructure/queue/client.ts`, `src/domain/interfaces/queue.interface.ts`.

**Route GitHub webhook BELUM ADA sama sekali** di codebase ini — satu-satunya webhook route
yang eksis adalah `/linear` (Linear ticket transition). Jadi tidak ada "konvensi GitHub webhook
existing" untuk diikuti secara harfiah; yang ada adalah konvensi Linear webhook yang polanya
generik dan reusable:

1. **Signature verification** — `verifyLinearSignature()` (`security.ts`): HMAC-SHA256 atas raw
   body, dibandingkan pakai `timingSafeEqual`. Pola ini reusable persis untuk GitHub — GitHub
   webhook signature format `sha256=<hex>` (beda dari Linear yang hex polos tanpa prefix, lihat
   komentar di `security.ts:1-4`), jadi butuh fungsi baru `verifyGitHubSignature()` dengan parsing
   prefix `sha256=` tapi HMAC/timingSafeEqual logic-nya identik — cocok jadi function sibling di
   file yang sama, bukan modul baru.
2. **Replay/freshness guard** — Linear pakai `Linear-Timestamp` header + tolerance window.
   GitHub webhook TIDAK punya header timestamp setara (GitHub tidak expose delivery timestamp
   di header standar) — replay protection GitHub harus pakai jalur lain: dedupe by
   `X-GitHub-Delivery` header (event delivery ID, GitHub kirim ini di semua webhook, setara
   `Linear-Delivery`) via `claimDelivery()` pattern yang sudah ada (`delivery-dedupe.ts`) — ini
   reusable langsung, cukup ganti sumber ID header.
3. **Job enqueue** — `pipelineQueue.addJob('agent-pipeline', jobData)` pakai queue name statis
   `'agent-pipeline'` (BullMQ `Queue` bernama tetap `QUEUE_NAME = 'agent-pipeline'`, lihat
   `client.ts:9`) dan job NAME `'agent-pipeline'` juga — job type dibedakan lewat isi payload,
   bukan queue/job-name terpisah. **Rekomendasi**: caf-pr-review REUSE queue yang sama (jangan
   bikin queue BullMQ baru — nambah worker/infra tanpa perlu), tapi pakai job name baru
   (mis. `'pr-review'`) di queue yang sama supaya worker bisa route berdasarkan job.name, dan
   `JobPayload` butuh varian union baru (`JobPayload | PrReviewJobPayload`) — bukan reuse
   `run-agent-pipeline.use-case.ts` mentah-mentah (use-case itu untuk pipeline PIV penuh:
   checkout branch baru, spawn planner→implementation→qa→reviewer→docs→commit; caf-pr-review
   cuma perlu spawn SATU agent reviewer di branch PR yang sudah ada). Rekomendasi: use-case baru
   `run-pr-review.use-case.ts`, sejenis pola tapi lebih sederhana (checkout branch PR existing,
   bukan buat baru; tidak ada QA/implementation gate).

---

## 4. Sumber daftar comment mode interactive — KESIMPULAN

Dikonfirmasi via GitHub REST docs (docs.github.com/en/rest/pulls/comments,
docs.github.com/en/rest/issues/comments) — bukan ingatan:

- `gh api repos/{owner}/{repo}/pulls/{number}/comments` → **review comments** (inline,
  per-baris kode, terikat ke `path`+`line`, punya `in_reply_to_id`). **Ini yang bisa jadi
  target SCOPED fix** (reply ke thread spesifik).
- `gh api repos/{owner}/{repo}/issues/{number}/comments` → **general comments** (percakapan
  umum di tab Conversation — PR adalah issue di GitHub API, jadi endpoint issues yang dipakai).
  **Ini cuma bisa jadi trigger GLOBAL fix**, tidak ada anchor line/file untuk discriminate scope.
- `gh pr view {number} --comments` → wrapper yang menampilkan **general comments saja** (setara
  endpoint issues/comments), TIDAK menyertakan inline review comments. Tidak cukup sendirian.

**Kesimpulan wajib:** `/caf-fix-review` interactive HARUS memanggil KEDUA endpoint (`pulls/
{n}/comments` dan `issues/{n}/comments`), gabungkan jadi satu daftar dengan **label jelas per
jenis** — mis. `[INLINE: path/to/file.ts:42] "comment text..."` vs `[GENERAL] "comment
text..."` — supaya user paham comment mana yang jadi scoped fix (inline, replies ke
`in_reply_to_id` thread yang sama) vs yang otomatis jatuh ke global (general). Pilihan "semua"
tetap available terlepas jenis. Ini konsisten dengan temuan poin 1: scoped fix cuma applicable
untuk inline comment (event `pull_request_review_comment`), general comment (`issue_comment`)
tidak punya struktur reply untuk discriminate — jadi UI daftar harus mencerminkan batasan ini,
bukan menyamaratakan.

---

## 5. Permission check — satu sumber kebenaran

Threshold DIDOKUMENTASIKAN DI SINI sebagai rujukan tunggal kedua sisi (sesuai instruksi ticket):

> **Threshold whitelist caf-pr-review**: proses request HANYA jika permission level commenter
> ∈ `{write, maintain, admin}` (dari `GET /repos/{owner}/{repo}/collaborators/{username}/
> permission` — field `.permission`). Level `read`/`none`/tidak terdaftar sebagai collaborator
> → **diam-diam tidak merespons** (tidak post error/komentar balik ke PR), log internal saja.

Dua implementasi TERPISAH tapi WAJIB endpoint+threshold identik (endpoint sama, threshold sama,
tooling beda — ini masuk akal, bukan duplikasi berbahaya selama endpoint/threshold-nya satu
sumber rujukan):
- **Interactive** (`/caf-fix-review.md`, markdown command): `gh api repos/{owner}/{repo}/
  collaborators/{username}/permission --jq .permission` — CLI call, dijalankan Claude Code
  lewat Bash tool.
- **Webhook** (caf-orchestrator, TypeScript): Octokit/fetch ke endpoint REST yang SAMA
  (`GET /repos/{owner}/{repo}/collaborators/{username}/permission`), SDK call bukan CLI.
  Direkomendasikan jadi satu fungsi `checkReviewPermission()` reusable, sejenis
  `verifyLinearSignature()`, ditaruh di modul infra sejenis `vcs/security.ts` atau file baru
  `vcs/github-permission.ts` — dipanggil dari route webhook DAN (kalau caf-orchestrator juga
  yang menjalankan bagian dari alur interactive suatu hari) dari use-case yang sama.
- Kalau threshold berubah nanti (mis. tambah `triage`), update DI SINI (plan.md ini) dulu,
  baru propagate ke kedua jalur — supaya tidak berubah cuma di satu sisi. Saran tambahan:
  simpan threshold sebagai const/array (`['write', 'maintain', 'admin']`) di SATU tempat kode
  (mis. constant yang diimpor prompt command interactive-nya juga, via referensi teks eksplisit
  ke file itu) supaya bukan cuma didokumentasikan tapi juga secara mekanis satu sumber.

---

## 6. Dependency ke backlog multi-repo (item A) — KESIMPULAN

Dibaca: `src/config/project-config.schema.ts`, `src/config/project-registry.ts`,
`caf.config.yaml`, `src/presentation/web/routes/webhooks.ts`.

**Temuan:** Groundwork multi-repo SUDAH ADA sebagian (checkpoint CAF-REGISTRY-1/2/3) — tapi
BELUM DIKONSUMSI. `caf.config.yaml` komentar eksplisit: *"Multi-project registry foundation
(CAF-REGISTRY-1). Not yet consumed by any existing code — repo.*/workspace.dir above remain
the values actually used by the pipeline until a later checkpoint migrates it over."*
`ProjectRegistry` baru punya `getByPrefix()` (routing by Linear ticket prefix) — **belum ada**
`getByRepoCloneUrl()`/`getByRepoFullName()` untuk routing by identitas repo GitHub. Route
`/linear` yang eksis pun masih pakai `config.repo.cloneUrl` hardcoded tunggal, BUKAN registry.

**Resiko rework untuk route caf-pr-review baru:** RENDAH-SEDANG, bisa dimitigasi dari desain
awal tanpa menunggu item A selesai:
- Payload webhook GitHub SELALU membawa `repository.full_name`/`repository.clone_url` secara
  native (tidak seperti Linear yang perlu extract prefix dari ticket ID) — jadi route BARU ini
  justru punya identitas repo built-in sejak hari pertama, tidak perlu menebak.
- **Rekomendasi desain forward-compatible**: route caf-pr-review terima dan simpan
  `repository.full_name` di job payload sejak awal (field baru, mis. `repoFullName`), meskipun
  untuk sekarang cukup divalidasi against SATU repo yang dikonfigurasi (`config.repo.cloneUrl`
  atau env var baru `PR_REVIEW_ALLOWED_REPO`) — bukan lookup registry penuh. Ini price murah:
  tidak menambah kompleksitas hari ini, tapi kalau item A (registry wiring) selesai nanti,
  migrasinya cukup ganti validasi "match satu repo" jadi "lookup ke `ProjectRegistry.
  getByRepoFullName()`" — TIDAK perlu ubah shape payload/route/webhook subscription.
- Kalau desain awal SEBALIKNYA hardcode assumsi single-repo tanpa menyimpan `repoFullName`
  sama sekali (mis. langsung pakai `config.repo.cloneUrl` di semua tempat tanpa field repo di
  payload), itu BARU jadi rework signifikan nanti — job payload shape harus diubah, konsumen
  job (worker) harus diubah, dan tidak backward-compatible dengan job lama di queue.
- Catat sebagai **keputusan desain wajib untuk tasks.md nanti**: job payload `PrReviewJobPayload`
  WAJIB punya field repo identity dari awal, walau resolusinya masih single-repo untuk saat ini.

---

## Ringkasan keputusan yang perlu approval sebelum tasks.md

1. Webhook subscribe ke 2 event (`issue_comment`, `pull_request_review_comment`) + opsional
   `pull_request_review` — 2+ route handler, bukan 1 generic handler.
2. `caf-reviewer.md` DIPERLUAS (bukan file baru) untuk terima input komentar manusia opsional;
   `/caf-fix-review.md` adalah command BARU (bukan agent baru) yang orchestrate pemilihan
   comment lalu spawn `caf-reviewer.md` yang sama.
3. Kontrak output baru dibutuhkan untuk mode post-PR (beda dari `review-notes.md` verdict gate)
   — didesain di tasks.md, belum diputuskan bentuknya di sini.
4. Reuse BullMQ queue `agent-pipeline` yang sama, job name baru (`pr-review`), use-case baru
   `run-pr-review.use-case.ts` (bukan reuse `run-agent-pipeline.use-case.ts` mentah).
5. Permission check: satu fungsi per sisi (CLI vs SDK), endpoint+threshold dirujuk ke plan.md
   ini (§5) sebagai sumber tunggal.
6. Interactive comment list: gabungkan `pulls/{n}/comments` + `issues/{n}/comments`, label
   jelas INLINE vs GENERAL.
7. Job payload `PrReviewJobPayload` menyimpan `repository.full_name` dari awal, walau resolusi
   repo saat ini tetap single-repo (`config.repo.cloneUrl` match) — forward-compatible ke
   registry multi-repo (item A) tanpa migrasi payload nanti.

STOP di sini. Menunggu approval sebelum lanjut `tasks.md`.
