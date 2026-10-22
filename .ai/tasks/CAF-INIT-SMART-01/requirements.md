# CAF-INIT-SMART-01 — `caf-init scaffold` cepat ala Spec Kit

Repo: `caf-initiator` · Branch: `CAF-INIT-SMART-01` · Commit: lokal saja, tidak push, tidak publish

## 1. Outcomes

- `caf-init scaffold` selesai dengan **1 Enter** di jalur normal (tracker punya sinyal tunggal), **2 Enter** bila tracker ambigu, **0 Enter** dengan `--yes`.
- Semua hal yang bisa disimpulkan dideteksi otomatis; hanya yang tidak bisa disimpulkan yang ditanya.
- Setiap prompt punya default yang jelas; tidak ada prompt destruktif dengan default `Y`.
- Ada banner "CAF" rata kiri dengan tagline, mengikuti gaya `specify`.

## 2. Scope

**In scope**
- Modul deteksi (read-only, `src/utils/detect.js`), `recommend()` tunggal, flow ringkasan + `Proceed?`, flag, preselect golden-examples, banner, konvensi default prompt, dokumentasi.

**Out of scope**
- Perubahan orchestrator, perubahan format artifact, perintah selain `scaffold` (kecuali banner tanpa argumen), efek outline ganda pada banner, penambahan agent baru, npm publish.

## 3. Constraints dan asumsi

- Ini lanjutan dari CAF-INIT-DOCS-REMOVE (sudah merged): picker multi-app golden-examples, `scaffold` yang juga membuat skills, dan struktur prompt yang ada **dipakai ulang**, bukan ditulis ulang. **Baca kode yang ada dulu**; lokasi file mengikuti struktur repo.
- Repo ini JavaScript ESM, npm, tanpa TypeScript: semua path dan istilah `.ts` menjadi `.js` (mis. `src/utils/banner.js`). Tidak ada tooling baru (tanpa typecheck/lint, tanpa skrip baru di `package.json`).
- Tanpa dependency baru untuk banner (ANSI escape langsung). Dependency prompt yang sudah ada tetap dipakai.
- Pilihan tracker tidak disimpan di berkas konfigurasi baru: tetap berupa nilai di memori selama satu run dan dirender ke `CLAUDE.md`, `AGENTS.md`, dan README tasks seperti sekarang (hasil `src/steps/03-detect-tracker.js`).
- Scaffold hanya menambah file; file yang sudah ada tidak ditimpa tanpa persetujuan.
- Agent yang hidden (`caf-validator`, `caf-architect`) tetap hidden. Agent implementasi per-app tetap dikenali lewat kecocokan nama file dengan slug app yang terdeteksi (aturan 03g).

## 4. Keputusan yang sudah final (jangan ditanya ulang)

- **D1 Deteksi otomatis** (berlaku untuk repo TARGET, bukan caf-initiator): package manager (lockfile pnpm/npm/yarn), monorepo + daftar app (`pnpm-workspace.yaml`, `turbo.json`, `workspaces`), stack per app (dependency `package.json`), slug app, perintah test/lint/build (`scripts`), default branch, git host dari `git remote`.
- **D2 Tracker:** sinyal dihitung per tracker. Tepat **satu** tracker bersinyal → terpilih otomatis, tanpa prompt sendiri, alasan tampil di ringkasan. Nol atau lebih dari satu → picker **tanpa preselect**. Tracker **tidak pernah ditebak**. Git host saja bukan sinyal tracker.
  - Linear: `.linear/` (sinyal kuat, dipertahankan), `LINEAR_API_KEY` di `.env*`, atau referensi `linear.app` di repo
  - Jira: `atlassian.yml` (sinyal kuat, dipertahankan), `JIRA_*` di `.env*`, atau `atlassian.net`
  - GitHub Issues: `.github/ISSUE_TEMPLATE` **dan** remote GitHub
  - GitLab Issues: `.gitlab/issue_templates` **dan** remote GitLab
  - **Perubahan perilaku yang disengaja:** kata "linear"/"jira" di README tidak lagi dihitung sebagai sinyal. Picker menawarkan Linear, Jira, GitHub Issues, GitLab Issues. Tracker `gitlab` ditambahkan sebagai nilai string `GitLab Issues` (template tracker bersifat string-agnostik; tidak ada integrasi lain).
- **D3 Flow:** deteksi → (picker tracker bila perlu) → ringkasan satu layar → `Proceed? (Y/n/e)` default `Y`; `e` membuka picker untuk ubah tracker/app/agent lalu kembali ke ringkasan.
- **D4 Golden-examples:** preselect app yang layak (app yang dijalankan/di-deploy, stack dikenali, ada kode nyata; bukan `packages/*` shared atau config-only). **Ini membalik keputusan lama "tanpa preselect".** Preselect berlaku di mode interaktif; `--yes` hanya melewati prompt dan memakai rekomendasi yang sama.
- **D5 Agent set:** tidak ditanya terpisah; tampil di ringkasan, bisa diubah lewat `e` atau `--agents`.
- **D6 Konvensi prompt:** default `Y` untuk jalur tidak merusak; default `N` bila `Y` berarti menimpa/menghapus. Notasi huruf besar menandai default: `(Y/n)`, `(y/N)`.
- **D7 `recommend()`:** satu fungsi murni, sumber tunggal untuk picker, ringkasan, dan `--yes`.
- **D8 Konflik file:** default skip dan laporkan. Bila ada konflik, satu pertanyaan gabungan (Timpa semua / **Skip semua** / Pilih satu per satu), default Skip semua.
- **D9 Non-TTY:** tidak pernah menampilkan prompt. Bila tracker ambigu, gagal dengan pesan yang mengarah ke `--tracker`.
- **D10 Flag:** `--yes`, `--tracker linear|jira|github|gitlab`, `--apps a,b`, `--apps none`, `--agents ...`, `--dry-run`, `--no-banner`.
- **D11 Banner:** huruf blok "CAF" rata kiri; gradasi biru `#7AA2F7` (baris 1-2) → teal `#7FD6C2` (3-4) → lavender abu `#A9A9C4` (5); tagline kuning italic `#E8D98F`: "Coderium Agent Framework — Spec-Driven Agentic Delivery"; hint abu `#6E6E85`: "Run 'caf-init --help' for usage information". Tampil saat `caf-init` tanpa argumen dan di awal `scaffold`. Tidak tampil di non-TTY, saat `--yes`, `--no-banner`, atau env `CAF_NO_BANNER`. Hormati `NO_COLOR` (tampil tanpa warna). Turun otomatis truecolor → 256-color → tanpa warna. `renderBanner({ color, tagline })` adalah fungsi murni yang mengembalikan string.

## 5. Pertanyaan terbuka

- Tidak ada yang memblokir.

## 6. Acceptance criteria

- **AC1** Deteksi mengenali package manager, monorepo, app, stack, slug, scripts, default branch, dan git host pada fixture monorepo pnpm.
  Verify: command: `node --test test/detect.test.js` | expect: semua lulus
- **AC2** Tracker dengan tepat satu tracker bersinyal terpilih otomatis tanpa prompt; nol atau >1 menampilkan picker tanpa preselect; git host saja tidak menghasilkan sinyal.
  Verify: command: `node --test test/recommend.test.js` | expect: semua lulus
- **AC3** Jalur tracker sinyal tunggal hanya meminta 1 konfirmasi (`Proceed?`); tracker ambigu meminta 2.
  Verify: command: `node --test test/scaffold-flow.test.js` | expect: semua lulus
- **AC4** `Proceed?` default `Y`; `e` membuka picker lalu kembali ke ringkasan.
  Verify: command: `node --test test/scaffold-flow.test.js` | expect: semua lulus
- **AC5** Golden-examples dipreselect untuk app layak dan tidak untuk package shared/config-only; `--yes` memakai hasil `recommend()` yang sama.
  Verify: command: `node --test test/recommend.test.js` | expect: semua lulus
- **AC6** `--yes` tanpa tracker yang jelas gagal dengan exit code non-nol dan pesan menyebut `--tracker`; di non-TTY tidak ada prompt.
  Verify: command: `node --test test/non-interactive.test.js` | expect: semua lulus
- **AC7** Setiap prompt punya default; tidak ada prompt yang berarti timpa/hapus dengan default `Y`; notasi huruf besar konsisten.
  Verify: command: `node --test test/prompt-defaults.test.js` | expect: semua lulus
- **AC8** File yang sudah ada di-skip dan dilaporkan; `--dry-run` tidak menulis file apa pun.
  Verify: command: `node --test test/idempotent.test.js` | expect: semua lulus
- **AC9** Banner: snapshot berwarna dan tanpa warna benar; tidak tampil di non-TTY, `--yes`, `--no-banner`, `CAF_NO_BANNER`; `NO_COLOR` menghapus warna.
  Verify: command: `node --test test/banner.test.js` | expect: semua lulus
- **AC10** Seluruh suite lulus. Typecheck dan lint = N/A (repo JavaScript tanpa tooling itu; tidak ditambah).
  Verify: command: `npm test` | expect: exit 0
- **AC11** README menjelaskan flow baru, flag, banner, perubahan preselect, dan perubahan deteksi tracker. Tidak ada CHANGELOG.md (tidak dibuat).
  Verify: command: `grep -n "CAF-INIT-SMART-01" README.md` | expect: ada entri