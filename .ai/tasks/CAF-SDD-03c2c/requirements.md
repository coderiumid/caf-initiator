# CAF-SDD-03c2c — /caf-run menggantikan /caf-run-pipeline; /caf-plan-ticket berhenti di-scaffold; routing repo tunggal mengikuti bagian tasks.md
Status: APPROVED (Q-1 diputuskan konsultan, Ganjar boleh membatalkan; keputusan lain berasal dari kesepakatan SDD 12 Okt 2026, cek orchestrator 15 Okt 2026, dan usulan 2 laporan 03c3)
Source: chat (sisa 03c2b/03c2c di CAF-SDD-PROGRESS.md; kesepakatan SDD: lima command akhir `/caf-plan`, `/caf-run`, `/caf-review`, `/caf-fix-review`, `/caf-complete-drafts`)
Repo target: `caf-initiator`
Bergantung pada: 03c2b ter-merge (menyentuh README.md dan CLAUDE.md di bagian yang sama).

## 1. Outcome
Repo baru hasil `caf-init` mendapat command `/caf-run` (isi sama dengan `/caf-run-pipeline` yang lama) dan tidak lagi `/caf-plan-ticket`, sehingga lima command di lapangan sama dengan lima command akhir. Di repo tunggal dengan dua agent seluruh-repo (`caf-frontend`, `caf-backend`), langkah memilih agent mengikuti bagian `## Frontend Tasks` / `## Backend Tasks` di `tasks.md`, sama dengan cara orchestrator, sehingga command tidak bertanya pada tiap tugas. Repo lama tidak berubah kecuali lewat scaffold ulang yang disengaja.

## 2. Scope
In:
- Nama command: berkas yang ditulis scaffold, judul, pesan dan prompt interaktif di `src/commands/agents.js`, dan semua rujukan di teks yang dihasilkan (`/caf-review`, `/caf-fix-review`, `/caf-run` sendiri) berubah dari `/caf-run-pipeline` ke `/caf-run`.
- Scaffold di repo yang sudah punya `caf-run-pipeline.md`: berkas lama tidak disentuh, `caf-run.md` ditulis di sampingnya, satu catatan dicetak (Q-1).
- `/caf-plan-ticket`: tidak lagi ditulis scaffold (`HIDDEN_COMMAND_FILES`); builder dan berkas di repo lama tetap.
- Langkah "cara memilih agent" di `/caf-run` untuk roster dua agent seluruh-repo.
- Test, golden pra-tiket, snapshot terbatas, README.md, CLAUDE.md, CAF.md (hanya rujukan nama command).

Out:
- Rename `caf-verify` ke `caf-self-verify` dan peringatan pointer skill usang (tiket sendiri, 03c2d).
- Perilaku `/caf-run` selain nama dan routing repo tunggal; `/caf-run` menerima deskripsi bebas (jalur chat, tiket sendiri); nama nilai state (`qaRetryCount`, `validatorRetryCount`, `reviewerRetryCount`).
- Nama command webhook (`/caf-review`, `/caf-fix-review`, `/caf-retry-pipeline`, `/caf-approve-spec`), `/caf-plan`, `/caf-complete-drafts`.
- Isi kind agent, `## Input`/`## Output` agent, skill, `tools:`, golden `frozen-kinds`; orchestrator.
- Kalimat retry: `/caf-run-pipeline` sudah memisahkan retry verify internal agent (3x) dari gate (1x), dan `AGENTS.md` menyebut retry verify agent; keduanya tidak diubah (T1 memastikan).

## 3. Constraints and Assumptions
- Finding (cek orchestrator, 15 Okt 2026): orchestrator tidak pernah memanggil `/caf-run-pipeline`, `/caf-plan-ticket`, atau skill `caf-verify`; ia menjalankan agent lewat `claude --agent <nama>`. Command yang dikenalnya hanya komentar PR `/caf-review`, `/caf-fix-review`, `/caf-retry-pipeline`, `/caf-approve-spec`.
- Finding (orchestrator): task-router mengarahkan tugas ke `caf-frontend` atau `caf-backend` dari header `## Frontend Tasks` dan `## Backend Tasks` di `tasks.md`.
- Finding (03c3): di SINGLE_REPO kedua agent berscope seluruh repo, sehingga langkah 4 di `/caf-run-pipeline` ("cocok lebih dari satu agent → tanya pengguna") bertanya untuk setiap tugas.
- Finding: `/caf-run-pipeline` ditulis `agents()` lewat prompt opt-in ("Generate /caf-run-pipeline?") ke `.claude/commands/caf-run-pipeline.md`; komentar dan teksnya menyebut nama itu di empat tempat di dalam command dan satu-dua tempat di `/caf-review` dan `/caf-fix-review`.
- Finding: command tidak di-track `curate`; repo lama tetap memakai berkas lamanya sampai berkas itu dihapus dan di-scaffold ulang.
- Finding: `/caf-plan` (03c2) menggantikan `/caf-plan-ticket`; `/caf-plan-ticket` adalah pembungkus main-thread yang meniru Planner, dan `HIDDEN_COMMAND_FILES` memuat delapan command yang sudah dihentikan sejak 03c1.
- Constraint: isi `/caf-run` identik dengan `/caf-run-pipeline` hasil sebelum tiket kecuali penggantian nama dan, hanya untuk roster dua agent seluruh-repo, bagian cara memilih agent; MONOREPO tidak berubah selain nama.
- Constraint: `/caf-review` dan `/caf-fix-review` berubah hanya pada rujukan nama command; penanda kontrak webhook yang dipegang `REVIEW_MARKERS` dan `FIX_REVIEW_MARKERS` tidak berubah.
- Constraint: berkas `caf-run-pipeline.md` dan `caf-plan-ticket.md` yang sudah ada di repo tidak dihapus, ditimpa, atau diubah; builder `/caf-plan-ticket` tidak dibuang (tahap pertama, seperti 03c1).
- Constraint: tidak ada flag CLI baru dan tidak ada tebakan: routing repo tunggal diputuskan dari data roster yang sudah diterima builder.
- Constraint: kosakata disalin dari teks yang sudah ada; kata TODO tidak ditulis literal di teks baru; CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1 (T1): nama berkas command ditulis di satu tempat di `agents()` dan prompt serta pesan interaktifnya di satu blok; dasar: pembacaan kode oleh konsultan. T1 mencatat semua tempat nama itu muncul di `src/`, `test/`, dan dokumentasi.
- Assumption A2 (T1): builder bagian "cara memilih agent" menerima data scope per role sehingga roster dua agent seluruh-repo dapat dikenali tanpa flag baru; dasar: builder sudah memakai `roleLine` dan scope tiap agent. Bila tidak ada data yang cukup, STOP `NEEDS_HUMAN`.
- Assumption A3 (T1): helper test (`commands-render.js`, `default-file-set.js`, `mono-snapshot.js`) menulis nama berkas dari scaffold sungguhan, jadi hanya hasil yang berubah, bukan golden pra-tiket; golden lama (`pre-sdd03b3`, `pre-sdd03c1`, `pre-sdd03c2`, `pre-sdd03c3`, `pre-sdd03f`) tidak diubah.
- Assumption A4 (T1): `AGENTS.md` ("retry (max 3x)") menjelaskan retry verify satu agent, bukan retry gate; bila ternyata menjelaskan gate, catat di Proposed Spec Changes tanpa mengubahnya.
- Assumption A5: branch `ai-agent/CAF-SDD-03c2c` dari main terbaru yang sudah memuat 03c2b.

## 4. Decisions Already Made
- Lima command akhir: `/caf-plan`, `/caf-run`, `/caf-review`, `/caf-fix-review`, `/caf-complete-drafts`; command komentar PR adalah kontrak webhook dan tidak direname (SDD-summary 12 Okt).
- Orchestrator tidak bergantung pada nama `/caf-run-pipeline` atau `/caf-plan-ticket` (cek 15 Okt).
- Perubahan command tidak mencapai repo lama lewat `curate sync`; pengguna menghapus berkas lalu scaffold ulang (CAF-SDD-03b3).
- Tahap pertama penghentian = berhenti menulis; builder dan berkas lama tetap sampai rilis penghapusan penuh (CAF-SDD-03c1).
- Q-1: scaffold di repo yang sudah punya `caf-run-pipeline.md` menulis `caf-run.md` di sampingnya dan mencetak satu catatan bahwa berkas lama boleh dihapus (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Repo yang sudah punya `caf-run-pipeline.md` dan di-scaffold ulang: (a) `caf-run.md` ditulis di sampingnya, berkas lama tidak disentuh, satu catatan dicetak (rekomendasi: migrasi eksplisit, pola 03c2 dan 03c3), atau (b) tidak menulis `caf-run.md` selama berkas lama ada? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When scaffold default dirender (fixture `mono-pnpm` dan `single-nuxt`, opt-in `/caf-run` diterima), then `.claude/commands/caf-run.md` ditulis, `caf-run-pipeline.md` dan `caf-plan-ticket.md` tidak ditulis, `caf-plan.md` tetap ditulis, dan daftar berkas lain sama dengan golden pra-tiket. Verify: automated test (bandingkan daftar berkas dengan `test/fixtures/pre-sdd03c2c/`).
- AC-2: When `/caf-run` dirender untuk roster MONOREPO (gate `qa` dan `validator`) dan roster SINGLE_REPO `--role frontend` atau `--role backend`, then isinya sama dengan `/caf-run-pipeline` golden pra-tiket setelah `/caf-run-pipeline` diganti `/caf-run` (dan hanya itu). Verify: automated test dengan golden.
- AC-3: When `/caf-run` dirender untuk roster SINGLE_REPO default (`caf-frontend` dan `caf-backend` seluruh-repo), then langkah memilih agent menyatakan: tugas di bawah `## Frontend Tasks` ditangani `caf-frontend`, di bawah `## Backend Tasks` ditangani `caf-backend`, bertanya kepada pengguna hanya bila tugas berada di luar kedua bagian itu, dan agen tanpa tugas tidak di-spawn; bagian lain command sama dengan golden pra-tiket setelah penggantian nama. Verify: automated test.
- AC-4: When `scaffold agents` dijalankan di repo sementara yang sudah punya `caf-run-pipeline.md` (termasuk versi yang dikustomisasi), then berkas itu identik byte-for-byte, `caf-run.md` ditulis, dan satu catatan dicetak yang menyebut berkas lama boleh dihapus; when repo tanpa berkas lama, then catatan tidak dicetak. Verify: automated test.
- AC-5: When `HIDDEN_COMMAND_FILES` dan builder `/caf-plan-ticket` diperiksa, then `caf-plan-ticket.md` ada di `HIDDEN_COMMAND_FILES` (kini sembilan berkas), builder tetap ada dan menghasilkan teks identik dengan golden pra-tiket, dan berkas `caf-plan-ticket.md` di repo lama tidak disentuh scaffold ulang. Verify: automated test.
- AC-6: When `/caf-review` dan `/caf-fix-review` dirender, then keduanya berbeda dari golden pra-tiket hanya pada rujukan `/caf-run-pipeline` yang menjadi `/caf-run`, dan semua penanda kontrak webhook tetap ada. Verify: automated test dengan golden dan `REVIEW_MARKERS`/`FIX_REVIEW_MARKERS`.
- AC-7: When semua berkas hasil scaffold default dan teks interaktif yang dicetak `agents()` diperiksa, then tidak ada yang menyebut `/caf-run-pipeline` atau `/caf-plan-ticket` sebagai command yang tersedia. Verify: automated test atas hasil render; lalu command: `git grep -n -E "caf-run-pipeline|caf-plan-ticket" -- src` | expect: kosong, atau hanya baris yang memang menyebut nama lama (builder `/caf-plan-ticket`, `HIDDEN_COMMAND_FILES`, catatan AC-4, komentar sejarah) dicatat satu per satu di `verify-report.md`.
- AC-8: When `curate audit` dijalankan pada fixture repo lama, then laporannya sama persis dengan yang direkam. Verify: automated test (`test/fixtures/pre-sdd03c1/curate-old-repo.*.json`).
- AC-9: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri dalam daftar T1 yang berubah (diperkirakan: `caf-run-pipeline.md` menjadi `caf-run.md`, `caf-plan-ticket.md` hilang, dan entri lain bila T1 membuktikan teksnya menyebut nama command), dicatat per entri. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-10: When README.md, CLAUDE.md, dan CAF.md dibaca, then tertulis bahwa roster default memuat `/caf-run` dan tidak `/caf-plan-ticket`, bahwa `/caf-run-pipeline` dan `/caf-plan-ticket` di repo lama dibiarkan (dihapus manual, lalu scaffold ulang bila ingin teks baru), pola migrasi AC-4, dan routing repo tunggal; rujukan ke `/caf-run-pipeline` dan `/caf-plan-ticket` di bagian perilaku saat ini diperbarui, sedangkan catatan sejarah tiket (03b3, 03c1, 03f) tidak ditulis ulang. Verify: manual: baca bagian terkait.
- AC-11: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
