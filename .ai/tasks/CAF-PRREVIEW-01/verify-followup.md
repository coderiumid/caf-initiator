# Verify Follow-up — CAF-PRREVIEW-01 Checkpoint A

Hasil investigasi + fix untuk 3 poin yang diminta sebelum commit. Belum di-commit — menunggu
review.

---

## 1. FIX — bug `ALLOWED_TOOLS` di `fix-review-command.js`

**Keputusan: jalur tunggal, `gh repo view` — TIDAK ditambah fallback `git remote`.** Alasan:
command ini selalu jalan di dalam repo yang sudah di-clone dengan remote GitHub (`gh` sudah jadi
prasyarat keras di seluruh command ini — permission check langkah 0 dan resolusi PR di 0.5
sama-sama sudah bergantung penuh ke `gh` auth; kalau `gh` tidak ke-auth, command ini sudah gagal
lebih awal di langkah 0, jadi fallback `git remote` di 0.5 tidak menyelamatkan apapun).

**Perubahan** (`src/templates/fix-review-command.js`):
- `ALLOWED_TOOLS`: tambah `'Bash(gh repo view:*)'`.
- `prResolutionSection()`: hapus mention `"atau remote origin"`, ganti jadi kalimat eksplisit
  kenapa `gh repo view` sendiri cukup (dikutip apa adanya dari hasil akhir):
  > Simpan hasil resolusi sebagai `{owner}`, `{repo}` (dari `gh repo view --json owner,name`
  > — command ini jalan di dalam repo yang sudah di-clone dengan remote GitHub, jadi `gh repo
  > view` sendiri cukup, tidak perlu fallback `git remote`), `{number}`, dan `{TICKET-ID}` —
  > dipakai di semua langkah berikutnya.

**Grep ulang — SEMUA `gh`/`git` yang disebut di teks (semua `*Section()`), match ke
`ALLOWED_TOOLS` satu per satu:**

`ALLOWED_TOOLS` final:
```
Read, Grep, Glob, Task, Bash(git branch:*), Bash(gh pr list:*), Bash(gh pr view:*),
Bash(gh repo view:*), Bash(gh api:*)
```

| Baris | Command disebut | Konteks | Status |
|---|---|---|---|
| 18-19 | `git branch`, `gh api` | komentar penjelasan `ALLOWED_TOOLS` | N/A (komentar, bukan teks command) |
| 28 | `git branch` | `permissionCheckSection`/komentar `FIX_REVIEW_PROHIBITION` area | **MATCH** — `Bash(git branch:*)` |
| 29 | `gh pr list` | komentar penjelasan | **MATCH** — `Bash(gh pr list:*)` |
| 30 | `gh pr view` | komentar penjelasan | **MATCH** — `Bash(gh pr view:*)` |
| 31 | `gh repo view` | komentar penjelasan (baru) | **MATCH** — `Bash(gh repo view:*)` (baru ditambahkan) |
| 32 | `gh api` | komentar penjelasan | **MATCH** — `Bash(gh api:*)` |
| 43, 47, 60, 62 | `gh api` | `FIX_REVIEW_PROHIBITION` (larangan) + `permissionCheckSection()` (dieksekusi: permission check, `gh api user`) | **MATCH** (yang dieksekusi) — `Bash(gh api:*)`; yang di baris 47 (`FIX_REVIEW_PROHIBITION`) adalah **larangan**, bukan command yang dijalankan, jadi sengaja TIDAK butuh entry allowlist |
| 47 | `git push` | `FIX_REVIEW_PROHIBITION` — "Jangan `git push`..." | **INTENTIONAL GAP** — ini larangan eksplisit ke subagent, bukan command yang boleh/perlu dijalankan main thread. Sengaja TIDAK ada di `ALLOWED_TOOLS` — itu justru yang benar. |
| 87 | `git branch` | `prResolutionSection()` — `git branch --show-current` | **MATCH** — `Bash(git branch:*)` |
| 92 | `gh pr list` | `prResolutionSection()` — `gh pr list --head ai-agent/{TICKET-ID} --json number,url` | **MATCH** — `Bash(gh pr list:*)` |
| 107 | `gh pr view` | `prResolutionSection()` — `gh pr view {number} --json headRefName` | **MATCH** — `Bash(gh pr view:*)` |
| 117 | `gh repo view` | `prResolutionSection()` — `gh repo view --json owner,name` | **MATCH** — `Bash(gh repo view:*)` (baru, FIX poin ini) |
| 119 | `git remote` | `prResolutionSection()` — disebut hanya untuk bilang **"tidak perlu"** fallback ini | **N/A** — bukan command yang dieksekusi, murni penjelasan kenapa TIDAK dipakai. Tidak butuh entry allowlist karena tidak pernah dijalankan. |
| 129, 130 | `gh api` | `fetchCommentsSection()` — `pulls/{number}/comments`, `issues/{number}/comments` | **MATCH** — `Bash(gh api:*)` |
| 175 | `gh api` | `userChoiceSection()` — disebut dalam konteks "tidak punya cara cek status resolved lewat `gh api` REST tanpa GraphQL" (penjelasan keterbatasan) | **MATCH secara umum** (`gh api` generik disebut) — bukan command spesifik baru yang perlu di-allow terpisah |
| 220 | `gh api` | `replySection()` — `pulls/comments/{comment_id}/replies` | **MATCH** — `Bash(gh api:*)` |
| 232 | `gh api` | `replySection()` — narasi "post comment ringkasan" | **MATCH** — `Bash(gh api:*)` |
| 243 | `gh api` | `replySection()` — `issues/{number}/comments -f body=...` (post summary) | **MATCH** — `Bash(gh api:*)` |
| 290 | `git push` | `## Batasan` — "Command ini TIDAK pernah `git push`..." | **INTENTIONAL GAP** — sama seperti baris 47, ini larangan/pernyataan batasan, bukan command yang dijalankan. |

**Kesimpulan grep:** setelah fix, SEMUA command `gh`/`git` yang benar-benar **dieksekusi** oleh
command ini (`git branch`, `gh pr list`, `gh pr view`, `gh repo view`, `gh api`) match ke
`ALLOWED_TOOLS`. Dua kemunculan `git push` dan satu `git remote` bukan gap — masing-masing
adalah larangan eksplisit (`git push`) atau penjelasan mengapa suatu jalur TIDAK dipakai
(`git remote`), tidak pernah muncul sebagai instruksi "jalankan ini".

---

## 2. Detail bug backtick — Task D, rendering awal `fix-review-command.js`

**Lokasi persis:** `buildFixReviewMd()`, bagian body command (sekarang baris ~265-267 di file
final), tepat di kalimat pembuka "Tujuan: jalur interactive untuk mode post-PR Reviewer Agent
..." — kalimat yang menyebut agent `caf-reviewer.md` sebagai pembanding mode pre-PR.

**Akar sebab:** nested backtick di template literal JS — sama kelas masalah dengan pola yang
sudah dikenal project ini (helper `roleLine()` di `run-pipeline-command.js` dan versi duplikat
di `fix-review-command.js` SENGAJA mengembalikan string yang SUDAH dibungkus backtick sendiri:
`` `${role}` (`${agentDir}/${role}.md`) ``). Kode awal (SEBELUM fix) memanggil helper itu sambil
MEMBUNGKUSNYA LAGI dengan backtick manual di titik pemanggilan:

```js
// SEBELUM (bug):
manusia di PR yang sudah dibuka, beda dari \`${roleLine('caf-reviewer', agentDir)}\` mode
```

`roleLine('caf-reviewer', agentDir)` sendiri sudah menghasilkan string markdown seperti
`` `caf-reviewer` (`.claude/agents/caf-reviewer.md`) `` (lengkap dengan backtick di dalamnya).
Dibungkus backtick tambahan di titik panggil menghasilkan markdown rusak — backtick ganda/
bersarang yang tidak valid sebagai code-span tunggal, keluar sebagai:

```
beda dari ``caf-reviewer` (`.claude/agents/caf-reviewer.md`)` mode
```

(persis seperti yang muncul di render pertama saat verifikasi Task F — dua backtick berdempet
di awal, satu backtick nyasar di akhir).

**SESUDAH fix** (baris final, ~266):
```js
manusia di PR yang sudah dibuka, beda dari ${roleLine('caf-reviewer', agentDir)} mode
```
Backtick manual di titik panggil dihapus — `roleLine()` sudah membawa backtick-nya sendiri,
titik panggil tinggal interpolasi apa adanya.

**Bukti konkret sebelum/sesudah:** tidak ada file diff/stash tersimpan (perbaikan dilakukan
langsung via `Edit` tool saat sesi implementasi sebelumnya, tidak lewat git — working tree saat
itu belum pernah di-commit sama sekali sejak file ini dibuat, jadi tidak ada revisi git untuk
di-diff). Cuplikan "SEBELUM" di atas direkonstruksi dari transcript sesi sebelumnya (isi editor
yang sempat dibaca sebelum fix, dikutip verbatim dari situ), bukan dari file yang masih ada di
disk — versi "SEBELUM" itu sendiri tidak lagi bisa dijalankan ulang untuk diverifikasi.

**Grep ulang file FINAL — semua kemunculan backtick di dalam template literal `` `...` ``:**

Pola yang dicek: baris di dalam fungsi `*Section()` mana pun yang punya `` \` `` (backtick
di-escape, ciri khas berada di dalam template literal luar) yang MEMBUNGKUS pemanggilan fungsi
(interpolasi `${...}`) — itu pola paling berisiko kena masalah yang sama (helper yang sudah
menghasilkan backtick sendiri, dibungkus backtick lagi di titik pakai).

```
grep -n '\\`\${' src/templates/fix-review-command.js
```
→ **tidak ada match** di file final — tidak ada lagi pola `` \`${...}\` `` (interpolasi yang
dibungkus backtick manual) di seluruh file. Satu-satunya pemanggilan `roleLine()` yang tersisa
(baris 181, `## 4. Spawn ${roleLine('caf-reviewer', agentDir)}`) TIDAK dibungkus backtick
tambahan — sudah benar sejak awal (bug cuma ada di SATU dari dua titik pemanggilan `roleLine()`
di file ini).

**Kemunculan backtick lain yang dicek (semua kutipan command shell, `gh api ...`/`git ...`)** —
diperiksa satu per satu, semuanya AMAN karena berupa backtick tunggal membungkus teks statis
(bukan hasil interpolasi fungsi lain yang sudah membawa backtick sendiri):
- `` \`gh api repos/{owner}/{repo}/collaborators/{username}/permission --jq .permission\` `` —
  aman, isi statis.
- `` \`{username}\` ``, `` \`gh api user --jq .login\` `` — aman, statis.
- Interpolasi `` \`${PERMISSION_THRESHOLD.join('\`, \`')}\` `` (baris 63) — pola BEDA dari bug
  di atas: di sini interpolasi menyisipkan STRING BIASA (hasil `.join()` array, bukan hasil
  fungsi yang sudah membawa backtick sendiri), lalu literal `` \` `` dipakai untuk memisah tiap
  item (`write`, `maintain`, `admin`) — ini pola yang disengaja dan valid, bukan varian bug yang
  sama. Diverifikasi outputnya lewat render aktual: menghasilkan `` `write`, `maintain`, `admin` ``
  — benar.
- Semua blok fenced code (` ``` `) yang mengutip command (`git branch --show-current`,
  `gh pr list ...`, `gh pr view ...`, `gh api ...`) — aman, bukan template literal bersarang,
  murni teks statis di dalam fenced block.

**Kesimpulan poin 2:** hanya SATU titik yang kena bug (satu dari dua pemanggilan `roleLine()`),
sudah diperbaiki dan diverifikasi lewat render ulang. Tidak ditemukan pola serupa lain yang
belum ketahuan di file final.

---

## 3. Metode verifikasi confirm-flow — dikoreksi, sudah dijalankan ulang dengan benar

**Klaim sebelumnya tidak akurat.** Verifikasi Task F yang dilaporkan sebelumnya HANYA memanggil
`buildFixReviewMd()` dan `buildAgentMd()` langsung — skip logic confirm sepenuhnya. Baris
`if (generateFixReview) {...} else {...}` di `agents.js` **tidak pernah benar-benar
dieksekusi** oleh verifikasi sebelumnya. Klaim "equivalent coverage" salah — dua hal itu tidak
setara: yang diverifikasi sebelumnya cuma "template builder menghasilkan markdown yang benar",
bukan "wiring confirm/prompts di agents.js bekerja".

**Verifikasi tambahan yang BARU SAJA dijalankan** (bukan unit test permanen di `tests/` — project
ini tidak punya test suite/runner sama sekali, jadi ini script sekali-pakai di `/tmp`, sama
pola verifikasi manual yang sudah dipakai task-task lain di project ini):

1. `/tmp/prompts-mock.mjs` — mock untuk package `prompts`, meniru jawaban:
   - `select` role frontend → `null` ("tidak ada")
   - `select` role backend → pilih app yang terdeteksi (`.`)
   - `multiselect` "Pilih agent yang mau digenerate" → `['reviewer']` (kind reviewer saja)
   - `confirm` `generateRunPipeline` → `false` (tidak relevan, planner tidak dipilih)
   - `confirm` `generateFixReview` → dikontrol env var `TEST_CONFIRM_FIX_REVIEW`
2. `/tmp/loader.mjs` — custom ESM loader (`--experimental-loader`) yang meng-intercept specifier
   `'prompts'` di `agents.js` dan mengarahkannya ke mock di atas — **bukan** memanggil
   `buildFixReviewMd()` langsung, ini benar-benar menjalankan `agents()` utuh dari
   `src/commands/agents.js`, termasuk `detectStack`, `pickRoleApps`, `buildCandidates`, blok
   multiselect utama, DAN blok `if (reviewerPicked) { ... if (generateFixReview) {...} else
   {...} }` yang baru ditambahkan.
3. `/tmp/run-agents-confirm-test.mjs` — entry script yang memanggil
   `agents({ dir: scratchDir, dryRun: false })` lalu cek apakah
   `.claude/commands/caf-fix-review.md` benar-benar ditulis ke disk.

**Hasil run 1 — `TEST_CONFIRM_FIX_REVIEW=false`:**
```
Reviewer dipilih — tawarkan command /caf-fix-review (opsional)
⚠ /caf-fix-review MEMBALAS PR ORANG LAIN DI GITHUB: ...
/caf-fix-review tidak digenerate

caf-fix-review.md exists = false
written: [ '.claude/agents/caf-reviewer.md', '.claude/commands/caf-review-ticket.md' ]
```
File **TIDAK** ditulis, tidak masuk daftar `written` — sesuai ekspektasi cabang `else`.

**Hasil run 2 — `TEST_CONFIRM_FIX_REVIEW=true`:**
```
Reviewer dipilih — tawarkan command /caf-fix-review (opsional)
⚠ /caf-fix-review MEMBALAS PR ORANG LAIN DI GITHUB: ...
  created  /tmp/scratch-confirm-test-true/.claude/commands/caf-fix-review.md

caf-fix-review.md exists = true
written: [ '.claude/agents/caf-reviewer.md', '.claude/commands/caf-review-ticket.md',
           '.claude/commands/caf-fix-review.md' ]
```
File **DITULIS**, masuk daftar `written`, isinya (dicek `head -5`) sudah membawa fix
`ALLOWED_TOOLS` dari poin 1 (`Bash(gh repo view:*)` ada di frontmatter hasil generate) —
konfirmasi tambahan bahwa jalur generate BENAR-BENAR memanggil `buildFixReviewMd()` versi
terbaru, bukan versi ter-cache.

**Bug baru dari verifikasi tambahan ini:** tidak ada bug baru di `agents.js` sendiri — wiring
`if/else` bekerja sesuai desain di kedua cabang. Satu catatan minor (bukan bug fungsional,
murni artefak lingkungan test): script `getCallLog()` di `prompts-mock.mjs` yang dipanggil
langsung dari entry script mengembalikan array kosong meski mock jelas terpanggil (dibuktikan
dari hasil `written` di atas) — dugaan penyebab: macOS me-resolve `/tmp` sebagai symlink ke
`/private/tmp`, sehingga import langsung `'/tmp/prompts-mock.mjs'` dari entry script dan
resolusi loader `'file:///tmp/prompts-mock.mjs'` dari `agents.js` berakhir sebagai DUA modul
ESM berbeda di cache (URL berbeda secara string meski merujuk file yang sama secara fisik) —
bukan bug di kode yang diverifikasi (`agents.js`/`fix-review-command.js`), murni artefak
setup test sekali-pakai ini. Tidak memengaruhi validitas hasil di atas karena assersi utama
(file tertulis/tidak, isi `written[]`) diverifikasi lewat filesystem langsung, bukan lewat
call log.

**Kesimpulan poin 3:** klaim sebelumnya dikoreksi. Confirm-flow SEKARANG benar-benar
teruji lewat eksekusi nyata `agents()` dengan `prompts` di-mock, dua kasus (`true`/`false`)
keduanya menghasilkan perilaku yang benar sesuai desain tasks.md Task D poin 3.

---

## File sementara yang dipakai (tidak masuk repo)

- `/tmp/prompts-mock.mjs`, `/tmp/loader.mjs`, `/tmp/run-agents-confirm-test.mjs` — script
  verifikasi sekali-pakai, di luar working tree `caf-initiator`. Scratch repo test
  (`/tmp/scratch-confirm-test*`) sudah dihapus setelah verifikasi.

STOP — belum ada commit. Menunggu review hasil ini.
