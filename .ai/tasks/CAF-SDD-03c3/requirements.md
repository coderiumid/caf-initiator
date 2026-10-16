# CAF-SDD-03c3 — Repo tunggal memakai frontend + backend; implementer digantikan; builder command tersembunyi dibuang
Status: APPROVED (Q-1 dijawab Ganjar 15 Okt 2026; Q-2 dan Q-3 diputuskan konsultan, Ganjar boleh membatalkan)
Source: chat (daftar 03c3 di CAF-SDD-PROGRESS.md; kesepakatan SDD 12 Okt 2026: `implementer` dibuang dari roster akhir; follow-up 03c2: klasifikasi 35 baris `git grep`)
Repo target: `caf-initiator`
Bergantung pada: 03c2 ter-merge (pola `SUPERSEDED_CANDIDATE_KINDS`, roster validator).

## 1. Outcome
Repo tunggal (SINGLE_REPO, mis. single-nuxt) hasil `caf-init` mendapat `caf-frontend` dan `caf-backend` sebagai agent implementasi default, sama dengan roster akhir lima agent dan dengan cara orchestrator mengarahkan tugas. `implementer` tidak lagi ditawarkan, tetapi kind-nya tetap ada untuk repo lama. `--role frontend|backend` tetap memilih satu agent. Builder command yang sudah tersembunyi sejak 03c1 dan tidak terjangkau dari CLI dibuang. Repo lama tidak berubah kecuali lewat scaffold ulang yang disengaja.

## 2. Scope
In:
- Roster default SINGLE_REPO: `implementer` diganti `frontend` dan `backend`; `implementer` disaring lewat `SUPERSEDED_CANDIDATE_KINDS`.
- `--role frontend` dan `--role backend`: hasil tidak berubah.
- Scaffold di repo yang sudah punya `caf-implementer.md`: berkas itu tidak disentuh, `caf-frontend.md` dan `caf-backend.md` ditambahkan bila belum ada, satu catatan dicetak (Q-2).
- Teks yang mendaftar agent mengikuti roster: `/caf-run-pipeline`, `/caf-complete-drafts`, `piv-workflow.md`, `agent-handoff.md`, `readAgentRoster`.
- Kode mati (Q-3): builder untuk delapan command di `HIDDEN_COMMAND_FILES` yang tidak terjangkau dari CLI, dan cabang yang tidak tercapai dari scaffold bawaan (pesan UX Designer tanpa PM, grup command PM), beserta test yang hanya menguji kode itu.
- Test, golden pra-tiket, snapshot terbatas, README.md dan CLAUDE.md.

Out:
- Kind `implementer` (template, golden `implementer.single-nuxt.json`), kind `pm`, `ux-designer`, `auditor`, `documentation`, `devops` dan teks agent-nya (dipakai `curate` untuk repo lama).
- Daftar `HIDDEN_COMMAND_FILES` dan `HIDDEN_CANDIDATE_KINDS` (tetap ada); pesan target CLI "is no longer scaffolded".
- Fallback kind tak dikenal ke `implementation` (tiket sendiri); `architect` (menunggu `caf-design`); semua isi 03c2b (rename, `/caf-plan-ticket`, planner `## Constraints`, `INDEX.md`).
- Isi `## Output`, `## Input`, `tools:`, `## Skills`, `## Retry Logic` agent frontend dan backend; isi skill; orchestrator.

## 3. Constraints and Assumptions
- Finding (audit): default scaffold single-nuxt = planner, architect, implementer, validator, reviewer (setelah 03c2); roster SINGLE_REPO dibangun `buildSingleRepoCandidates()`.
- Finding (03d): `--role frontend|backend` di SINGLE_REPO memakai kind `frontend`/`backend`; 03d menguji kedua varian itu; `test/fixtures/pre-sdd03c1/` mengunci path-nya.
- Finding (03c2): `qa` disaring lewat `SUPERSEDED_CANDIDATE_KINDS` karena golden `frozen-kinds` merender semua kandidat; `/caf-complete-drafts`, `piv-workflow.md`, `agent-handoff.md`, dan `readAgentRoster` bergantung pada daftar agent.
- Finding (progres 04b): orchestrator mengarahkan tugas `tasks.md` ke `caf-frontend`/`caf-backend`; routing ke `caf-implementer` sengaja tidak dibuat.
- Finding (follow-up 03c2): `discovery-to-ticket.js` dan builder `/caf-discovery-start` di `discovery-commands.js` tidak ditulis jalur scaffold bawaan; `discovery-commands.js` juga memuat teks agent PM dan UX Designer yang dipakai repo lama (harus tetap).
- Constraint: kind `implementer` dan golden-nya tidak berubah; berkas `caf-implementer.md` yang ada tidak dihapus, ditimpa, atau diubah.
- Constraint: hasil `--role frontend` dan `--role backend` identik byte-for-byte dengan golden pra-tiket; MONOREPO (mono-pnpm) tidak berubah kecuali karena penghapusan kode mati (seharusnya tidak ada entri snapshot yang berubah).
- Constraint: kode hanya dibuang bila T1 membuktikan tidak ada pemanggil di `src/` selain sesama kode mati, dan tidak ada target CLI yang menulisnya; teks agent kind lama, `HIDDEN_COMMAND_FILES`, dan pesan target "no longer scaffolded" tetap.
- Constraint: golden `frozen-kinds` tidak berubah; test `todo` fallback `implementation` tetap ada.
- Constraint: kosakata disalin dari teks yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Constraint: CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1 (T1): menambah `frontend` dan `backend` ke roster SINGLE_REPO memakai builder yang sama dengan `--role`; dasar: 03d menguji kedua varian `--role` di single-nuxt. T1 mencatat bagaimana `--role` memilih kind dan apa yang dirender bila keduanya ada.
- Assumption A2 (T1): teks frontend dan backend versi `--role` tidak menyatakan dirinya satu-satunya agent implementasi; dasar: kind yang sama dipakai bersama di MONOREPO. Bila T1 menemukan kalimat yang bertentangan dengan keberadaan dua agent, STOP `NEEDS_HUMAN`.
- Assumption A3 (T1): `/caf-run-pipeline` menyebut agent implementasi dari roster (bukan hard-code `caf-implementer`); dasar: 03c2 menemukan gate di-hard-code, jadi bagian implementasi juga harus diperiksa. T1 mencatat cabangnya.
- Assumption A4 (T1): builder delapan command tersembunyi hanya dipanggil test dan sesama kode mati; T1 mencatat semua pemanggil, termasuk `PREVIEW_COMMANDS`, target CLI, dan `curate audit`.
- Assumption A5 (T1): `scaffold agents` menulis-bila-belum-ada (03c2 A6 benar); T1 mencatat perilaku pada repo yang punya `caf-implementer.md` dan sebagian `caf-frontend.md`/`caf-backend.md`.
- Assumption A6: branch `ai-agent/CAF-SDD-03c3` dari main terbaru yang sudah memuat 03c2.

## 4. Decisions Already Made
- Roster akhir lima agent; `implementer` dibuang dari roster (SDD-summary 12 Okt).
- Kind lama yang disingkirkan dari roster tetap ada untuk repo lama dan disaring `SUPERSEDED_CANDIDATE_KINDS` (03c2).
- Repo lama bermigrasi dengan scaffold ulang yang menambah agent baru; tidak ada penghapusan otomatis (03c2 Q-1).
- Q-1: SINGLE_REPO default = dua agent, `caf-frontend` dan `caf-backend`, keduanya untuk seluruh repo; `--role` tetap memilih satu (jawaban Ganjar, 15 Okt 2026).
- Q-2: repo yang punya `caf-implementer.md` dan di-scaffold ulang mendapat `caf-frontend.md` dan `caf-backend.md` di sampingnya, `caf-implementer.md` tidak disentuh, catatan dicetak (konsultan, 15 Okt 2026).
- Q-3: kode mati yang dibuang hanya builder command tersembunyi dan cabang tak tercapai; kind agent lama dan teksnya tetap sampai rilis penghapusan penuh (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [BLOCKING] Agent implementasi default SINGLE_REPO setelah `implementer` keluar dari roster: (a) dua agent, frontend dan backend (rekomendasi: cocok dengan roster akhir dan routing orchestrator), (b) hanya frontend, atau (c) hanya backend? — Answer: (a) dua agent, frontend dan backend (Ganjar, 15 Okt 2026).
- Q-2 [NON-BLOCKING] Repo yang sudah punya `caf-implementer.md` dan di-scaffold ulang: tambah frontend dan backend di sampingnya tanpa menyentuh implementer, dengan catatan (rekomendasi, sama dengan pola 03c2), atau tidak menambah apa pun? — Answer: tambah, dengan catatan (keputusan konsultan; Ganjar boleh membatalkan).
- Q-3 [NON-BLOCKING] Cakupan kode mati: hanya builder command tersembunyi dan cabang tak tercapai (rekomendasi: kind agent lama masih dipakai `curate` untuk repo lama), atau juga kind agent lama? — Answer: hanya builder command dan cabang tak tercapai (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When scaffold default dirender untuk fixture `single-nuxt` tanpa `--role`, then daftar agent adalah planner, architect, frontend, backend, validator, reviewer; daftar command sama dengan golden pra-tiket. Verify: automated test (bandingkan daftar berkas dengan `test/fixtures/pre-sdd03c3/`).
- AC-2: When scaffold `single-nuxt` dijalankan dengan `--role frontend` atau `--role backend`, then daftar berkas dan isi tiap berkas identik byte-for-byte dengan golden pra-tiket. Verify: automated test.
- AC-3: When scaffold default dirender untuk fixture `single-nuxt`, then `caf-frontend.md` dan `caf-backend.md` identik dengan hasil `--role frontend` dan `--role backend` masing-masing. Verify: automated test.
- AC-4: When `implementer` dicek terhadap daftar kandidat, then ia tidak ditawarkan di SINGLE_REPO maupun MONOREPO, disaring lewat `SUPERSEDED_CANDIDATE_KINDS`, dan `HIDDEN_CANDIDATE_KINDS` tetap lima kind. Verify: automated test.
- AC-5: When `scaffold agents` dijalankan di repo sementara SINGLE_REPO yang sudah punya `caf-implementer.md` (termasuk versi yang dikustomisasi), then `caf-implementer.md` identik byte-for-byte, `caf-frontend.md` dan `caf-backend.md` ditulis (berkas yang sudah ada tidak ditimpa), dan satu catatan dicetak yang menyebut bahwa orchestrator mengarahkan tugas ke `caf-frontend`/`caf-backend`; when repo tanpa `caf-implementer.md`, then catatan tidak dicetak. Verify: automated test.
- AC-6: When `/caf-run-pipeline` dirender dengan roster SINGLE_REPO default, then langkah implementasi menyebut `caf-frontend` dan `caf-backend` dan tidak menyebut `caf-implementer`; when dirender dengan roster berisi `implementer`, then identik byte-for-byte dengan golden pra-tiket. Verify: automated test.
- AC-7: When `readAgentRoster` dan `piv-workflow.md` dirender untuk repo sementara berisi (i) hanya `caf-implementer.md`, (ii) hanya `caf-frontend.md` + `caf-backend.md`, (iii) ketiganya, then tiap agent yang ada tercentang, agent tersebut tidak tercatat sebagai agent kustom, dan tidak ada baris Implementer "NOT present" pada kasus (ii). Verify: automated test.
- AC-8: When `/caf-complete-drafts` dan `agent-handoff.md` dirender dengan roster SINGLE_REPO default, then keduanya berbeda dari golden pra-tiket hanya pada daftar agent. Verify: automated test dengan golden.
- AC-9: When scaffold mono-pnpm dijalankan, then daftar berkas dan isinya identik dengan golden pra-tiket. Verify: automated test.
- AC-10: When kode mati (Q-3) dibuang, then nama builder yang dibuang tidak lagi muncul di `src/`, target CLI untuk command itu tetap mencetak pesan "no longer scaffolded", dan teks agent kind lama (PM, UX Designer, dan lainnya) yang dibandingkan golden `frozen-kinds` tidak berubah. Verify: automated test; lalu command: `git grep -n -E "<nama builder yang dibuang, dari daftar T1>" -- src` | expect: kosong.
- AC-11: When scaffold lengkap (agents, commands, skills, workflow) dijalankan di fixture `single-nuxt` lalu `curate --audit-only` dijalankan di hasilnya, then tidak ada peringatan untuk `caf-frontend`, `caf-backend`, atau `caf-validator`. Verify: automated test.
- AC-12: When snapshot diregenerasi, then hanya entri dalam daftar T1 yang berubah (untuk mono-pnpm diperkirakan tidak ada), dicatat per entri. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-13: When README.md dan CLAUDE.md dibaca, then tertulis bahwa roster default SINGLE_REPO memuat `caf-frontend` dan `caf-backend`, bahwa `--role` memilih satu, bahwa `implementer` disaring sebagai kind yang digantikan dan tetap dibaca untuk repo lama, dan langkah migrasi repo lama (scaffold ulang menambah dua agent; `caf-implementer.md` tidak dihapus otomatis). Verify: manual: baca bagian terkait.
- AC-14: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
