# Open Items — CAF-PRREVIEW-01 (warisan ke Checkpoint B)

## `in_reply_to_id` — status verifikasi

**REST resource `GET /repos/{owner}/{repo}/pulls/comments` — DIKONFIRMASI (2026-08-19).**

Divalidasi via `gh api repos/ganjardbc/umkm-pos/pulls/comments` (repo nyata, 46 review comment,
2 di antaranya reply):

- Thread-starter (`in_reply_to_id: null`), contoh id `3568235680`
  (`.gitignore` review comment dari `kilo-code-bot[bot]`).
- Reply ke thread itu (`in_reply_to_id: 3568235680`), contoh id `3570938260`, body
  `"Fixed in 0b786fe."` — field terisi ID comment induk persis seperti diasumsikan plan.md §4.
- Field lain hadir di objek yang sama: `pull_request_review_id`, `path`, `diff_hunk`,
  `html_url` (`.../pull/{n}#discussion_r{id}`) — cukup untuk keperluan Task D (path:line label,
  link balik).
- Comment GENERAL (`GET /repos/{owner}/{repo}/issues/{number}/comments`, dicoba di PR #81 repo
  yang sama) — dikonfirmasi TIDAK punya field `in_reply_to_id` sama sekali (field set:
  `author_association, body, created_at, html_url, id, issue_url, minimized, node_id,
  performed_via_github_app, reactions, updated_at, url, user`). Sesuai asumsi plan.md §4 — tidak
  ada struktur reply di general comment.

Kesimpulan Task A (Checkpoint A): asumsi desain scoped-fix di plan.md §1/§4 dan tasks.md Task D
langkah 2/3 (grouping thread berdasarkan `in_reply_to_id == null`) **valid, tidak perlu
redesign**.

**BELUM divalidasi — payload WEBHOOK `pull_request_review_comment` (beda dari REST resource di
atas).** Yang dikonfirmasi di sini adalah bentuk resource lewat `GET /pulls/comments`, BUKAN
bentuk `comment` object yang benar-benar dikirim GitHub ke endpoint webhook saat event
`pull_request_review_comment` terjadi. Kedua representasi biasanya sama (GitHub webhook payload
umumnya memakai representasi REST resource yang sama), tapi ini **asumsi, bukan fakta
terverifikasi** untuk payload webhook itu sendiri.

**Aksi wajib untuk Checkpoint B** (caf-orchestrator, webhook route baru): sebelum
mengimplementasikan parsing payload `pull_request_review_comment` di route webhook, capture 1
delivery nyata (`gh webhook forward` ke endpoint lokal, atau baca 1 delivery dari GitHub App
webhook log kalau sudah ada yang terpasang) dan konfirmasi field `comment.in_reply_to_id` ada
persis di payload webhook, bukan cuma di REST resource. Kalau strukturnya beda atau field ini
tidak ada di webhook — desain routing event (b) di plan.md §1 (scoped-fix trigger) perlu
direvisi sebelum implementasi route jalan.

**STATUS: RESOLVED (2026-08-19).** Divalidasi di caf-orchestrator Checkpoint B (poin 0,
`.ai/tasks/CAF-PRREVIEW-01/plan-checkpoint-b.md`) via capture nyata webhook.site + repo test
`caf-webhook-capture-test`. Field `comment.in_reply_to_id` ADA di payload webhook asli untuk
reply (contoh: `in_reply_to_id: 3809805822` pada comment id `3809806234`), TAPI **absent
(key tidak ada sama sekali) untuk comment awal** — beda dari REST resource di atas yang
eksplisit set `null`. Desain routing (b) tetap valid, tidak perlu redesign. Catatan konsistensi
untuk Task D langkah 2/3 di tasks.md Checkpoint A: grouping pakai `in_reply_to_id == null`
(loose equality JS) — ini SUDAH aman untuk kasus absent juga, karena `undefined == null`
bernilai `true` di JS. Kalau kode ditulis ulang pakai `===` (strict) atau bahasa lain, wajib
treat absent dan null sebagai signal yang sama (thread-starter, bukan reply).

## Event `pull_request_review` — DESCOPED dari Checkpoint B

Support event `pull_request_review` sebagai trigger awal alternatif (reviewer klik "Request
changes"/"Comment" di GitHub UI dengan body review): DESCOPED dari Checkpoint B
(CAF-PRREVIEW-01) karena `review.body`/`review.state` untuk delivery auto-generated (dari inline
comment biasa, bukan submit review formal) belum terverifikasi — ada resiko double-trigger kalau
filter salah. Repo test capture asli sudah terhapus sebelum sempat dicek. Sebelum event ini
diaktifkan: setup repo test baru, buat 1 inline comment biasa (BUKAN submit review formal),
capture delivery `pull_request_review` yang auto-generated, periksa `review.body` kosong dan/atau
`review.state` tidak match kondisi trigger yang salah.

## Entry baru untuk .ai/tasks/CAF-PRREVIEW-01/open-items.md (caf-initiator):

"Mode 'initial' (review PR menyeluruh dari nol, setara trigger /caf-review di webhook)
belum punya command interactive. /caf-fix-review (Checkpoint A) hanya mendukung
scoped/global — merespons comment yang sudah ada, bukan trigger review dari nol.
User confirm: kebutuhan aslinya adalah interactive dan webhook sama-sama harus bisa
'review PR' (initial) dan 'fixing hasil review' (scoped/global) — jadi ini genuine gap,
bukan by-design. Perlu ticket/checkpoint terpisah untuk menambah mode initial ke jalur
interactive (kemungkinan: perluas /caf-fix-review jadi terima mode tambahan, atau command
baru /caf-review versi interactive) — di luar scope CAF-PRREVIEW-01 poin 7 (verifikasi
end-to-end yang sedang berjalan)."

## Idempotency actor-login gap — masih terbuka setelah CAF-ORCH-PRREVIEW-03

**Status per 2026-09-04**: `CAF-ORCH-PRREVIEW-03` (caf-orchestrator) membuat webhook mode
`initial` (`RunPrReviewUseCase`) menjalankan kontrak INITIAL sungguhan (Verdict-producing) dan
posting via `pulls/{number}/reviews`, setara `/caf-review` interaktif — jadi ARTIFACT-CONTRACT
mismatch yang dulu bikin `GET pulls/{number}/reviews` (step 0.7, `review-command.js`) buta
terhadap review dari webhook **sudah tidak ada lagi**.

Yang **masih gap**: step 0.7 filter existing review lewat `user.login == {username}`
(`{username}` = user yang menjalankan `/caf-review` interaktif). Review dari webhook diposting
di bawah login bot/token pipeline, bukan login user manapun yang mungkin menjalankan
`/caf-review` manual — jadi filter ini tetap tidak match review hasil webhook meskipun sekarang
sama-sama PR Review object. Efek: `/caf-review` manual bisa dijalankan lagi di atas PR yang
sudah direview otomatis oleh webhook tanpa terdeteksi sebagai duplikat.

**Eksplisit di luar scope `CAF-ORCH-PRREVIEW-03`** (dikonfirmasi di ticket itu) — perbaikannya
ada di sisi `caf-initiator` (`review-command.js` step 0.7), bukan `caf-orchestrator`. Perlu
ticket terpisah: opsi kandidat — filter tambahan berdasar known bot login (dari config, bukan
hardcode), atau deteksi lain yang tidak bergantung pada identitas actor GitHub.