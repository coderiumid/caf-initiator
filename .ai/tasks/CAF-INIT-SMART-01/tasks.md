# CAF-INIT-SMART-01 — tasks

Aturan kerja: kerjakan **semua task berurutan dalam satu sesi, satu branch** (`CAF-INIT-SMART-01`). Satu commit lokal per task. Jangan push, jangan publish. Baca `requirements.md` dulu. Bila ada yang bertentangan dengan kode yang ada, berhenti dan laporkan; jangan menebak. Jangan mengubah keputusan D1-D11.

## T0 — Orientasi (tanpa commit)
Baca kode `scaffold`, picker multi-app golden-examples, dan lokasi penyimpanan pilihan tracker. Catat lokasi file yang akan disentuh di bagian "Catatan eksekusi" di bawah.

## T1 — Modul `detect` (AC1) — `test/detect.test.js`
Fungsi read-only: package manager, monorepo, app + stack + slug, scripts, default branch, git host. Fixture monorepo pnpm untuk tes. Tidak menulis apa pun ke disk.

## T2 — Sinyal tracker dan `recommend()` (AC2, AC5) — `test/recommend.test.js`
Hitung sinyal per tracker sesuai D2. `recommend()` murni: input hasil `detect`, output tracker (tunggal/ambigu/nol), app golden-examples yang layak, agent set. Kriteria "app layak" sesuai D4. Tes unit lengkap, termasuk kasus git host tanpa sinyal tracker.

## T3 — Flow ringkasan dan `Proceed?` (AC3, AC4) — `test/scaffold-flow.test.js`
Alur: detect → picker tracker bila perlu → ringkasan (tracker + alasan, app golden-examples, agent set, file dibuat/di-skip) → `Proceed? (Y/n/e)`. `e` membuka picker lalu kembali ke ringkasan. Pakai ulang picker yang ada.

## T4 — Flag dan mode non-interaktif (AC6, AC8) — `test/non-interactive.test.js`, `test/idempotent.test.js`
`--yes`, `--tracker`, `--apps`, `--apps none`, `--agents`, `--dry-run`. Non-TTY tanpa prompt, gagal jelas bila tracker ambigu. `--dry-run` tidak menulis file. Konflik file sesuai D8.

## T5 — Preselect golden-examples (AC5)
Picker multi-app memakai hasil `recommend()` sebagai preselect. `--yes` memakai rekomendasi yang sama. Perbarui tes picker lama yang mengasumsikan "tanpa preselect".

## T6 — Konvensi default prompt (AC7) — `test/prompt-defaults.test.js`
Audit semua prompt di `caf-init`. Terapkan D6. Tambahkan tes yang memindai definisi prompt: setiap prompt punya default, prompt timpa/hapus default `N`, notasi huruf besar konsisten.

## T7 — Banner (AC9) — `test/banner.test.js`
`src/utils/banner.js` dengan `renderBanner({ color, tagline })` murni, tanpa dependency baru. Aturan tampil dan turun warna sesuai D11. Tes snapshot berwarna dan tanpa warna, plus tes aturan tampil.

## T8 — Dokumentasi (AC11)
Perbarui README (tanpa CHANGELOG; berkas itu tidak ada dan tidak dibuat): flow baru, tabel flag, aturan banner, catatan bahwa preselect golden-examples membalik keputusan lama, dan perubahan deteksi tracker (README tidak lagi sinyal; GitLab Issues ditambah). Sertakan penanda `CAF-INIT-SMART-01`.

## T9 — Verifikasi akhir (AC10)
Jalankan `npm test` (typecheck/lint = N/A, tidak ada tooling). Jalankan `caf-init scaffold --dry-run` pada fixture dan pada satu repo nyata bila tersedia. Tulis hasil ke `verify-report.md` di folder ini, dengan status per AC.

## Catatan eksekusi
Temuan T0 (repo JS ESM + npm; picker/prompt dipakai ulang):
- Prompt: semua lewat `prompts` (24 pemanggilan di `src/`). Rencana: `src/utils/ask.js` membungkus `prompts` (sama persis saat interaktif; saat mode otomatis mengembalikan default), `import prompts from` diganti ke wrapper itu. `prompts.inject` di tes tetap bekerja.
- Tracker: `src/steps/03-detect-tracker.js` (diubah ke sinyal D2 + picker 4 pilihan), dikonsumsi `src/commands/setup.js` -> `04-generate-drafts.js` -> `claude-md.js`, `agents-md.js`, `tasks-readme.js` (string; tanpa berkas config baru).
- Deteksi: `src/utils/repo-context.js` (`detectRepoContext`, dipakai ulang oleh `src/utils/detect.js` baru), slug app dari `agentSlug` (`src/templates/agent-md.js`).
- Picker multi-app: `src/commands/golden-examples.js` (`pickApps`, `scanApp`) — preselect dari `recommend()`.
- Chain: `src/commands/scaffold.js` (`runScaffold` lama = konfirmasi per step, dipertahankan; alur baru `runSmartScaffold` di `src/commands/scaffold-flow.js`). Flag di `src/index.js`.
- File baru: `src/utils/{detect,tracker-signals,recommend,ask,banner}.js`, `src/commands/scaffold-flow.js`; tes `test/{detect,recommend,scaffold-flow,non-interactive,idempotent,prompt-defaults,banner}.test.js`.
- Tersentuh: `src/util.js` (log tulis + kebijakan timpa D8), `setup.js`, `01-audit-existing-tools.js`, `adr.js`, `agents.js`, `task-completion.js`, `skills.js`, `golden-examples.js`, `index.js`, `README.md`.
- Tracker `gitlab`: template tracker hanya string, jadi `GitLab Issues` ditambah tanpa template khusus (tidak ada teks spesifik PR yang bergantung pada tracker).
- Tes lama yang mengandalkan README "Linear" sebagai sinyal diperbarui (perubahan perilaku D2 disengaja).