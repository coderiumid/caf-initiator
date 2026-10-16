# CAF-SDD-03g — agent berkind tak dikenal tidak lagi diperlakukan sebagai `implementation`
Status: APPROVED (Q-1 dijawab Ganjar 15 Okt 2026; Q-2 dan Q-3 diputuskan konsultan, Ganjar boleh membatalkan)
Source: chat (backlog "fallback kind tak dikenal ke `implementation` diganti skip dan laporkan" di CAF-SDD-PROGRESS.md; test `todo` AC-7 di `test/kind-guard.test.js`)
Repo target: `caf-initiator`
Bergantung pada: 03c2d ter-merge.

## 1. Outcome
Berkas agent yang namanya bukan kind yang dikenal dan bukan agent per-aplikasi buatan CAF tidak lagi dibandingkan, di-baseline, di-sync, atau diberi pointer skill dengan template `implementation`. CAF melewatinya dan melaporkannya. Dengan begitu agent custom (misalnya agent read-only buatan tim) tidak lagi bisa ditulis ulang menjadi `Read`+`Write`+`Edit`+`Bash` oleh `curate sync`. Agent per-aplikasi yang memang dibuat CAF (aplikasi monorepo di luar frontend/backend, berkas `<slug-aplikasi>.md`) tetap dikenali sebagai `implementation` seperti sekarang.

## 2. Scope
In:
- Pengenalan kind berkas agent (`detectKind` di `src/utils/agent-sections.js` dan pemanggilnya): kind yang dikenal tetap; `implementation` hanya bila nama berkas sama dengan slug agent per-aplikasi untuk aplikasi yang terdeteksi; selebihnya tak dikenal.
- Perilaku untuk berkas tak dikenal di `curate audit`, `curate sync`, `curate baseline`, `curate --check-drafts`, dan `scaffold skills` (penawaran `## Skills`).
- Penerusan `--mode` ke deteksi yang kini dibutuhkan `curate sync` dan `curate baseline`.
- Test `todo` AC-7 di `test/kind-guard.test.js` menjadi test biasa yang lulus; test, golden pra-tiket, README.md, CLAUDE.md, CAF.md.

Out:
- Teks agent, template, dan berkas yang ditulis scaffold (tidak ada yang berubah); `KNOWN_KINDS` (tidak ada kind baru); penawaran agent per-aplikasi di `scaffold agents`.
- Cara orchestrator memilih agent (tidak memakai `detectKind`).
- Agent yang ditulis tangan dengan nama yang kebetulan sama dengan slug aplikasi: tetap diperlakukan sebagai `implementation` (batas yang diketahui, dicatat di dokumentasi).
- `export` (`opencode-*-transform.js`), `readAgentRoster`, kecuali T1 menemukan bahwa keduanya memakai fallback yang sama; bila ya, catat di Proposed Spec Changes, jangan ubah.

## 3. Constraints and Assumptions
- Finding: `detectKind(filename)` mengembalikan kind dari `KNOWN_KINDS` (dengan atau tanpa awalan `caf-`), dan `'implementation'` untuk nama lain apa pun; dipanggil di `audit.js`, `agents-sync.js`, `curate-baseline.js`, `check-drafts.js`, dan `skills.js` (juga `isRecognizedKind` di `skills.js`).
- Finding: `scaffold agents` menulis agent kind `implementation` untuk aplikasi monorepo di luar penugasan frontend/backend, dengan nama berkas `agentSlug('implementation', app)` (slug path aplikasi tanpa `apps/`/`packages/`, lalu slug nama paket, lalu `app`); fixture `mono-pnpm` hanya punya `apps/web` dan `apps/api`, jadi tidak menghasilkan agent seperti itu.
- Finding: `curate baseline` merekam isi saat ini sebagai baseline untuk setiap berkas agent, sehingga untuk berkas custom status berikutnya adalah `DRIFT` terhadap template `implementation` dan `curate sync` menulisnya; test `todo` AC-7 menggambarkan kasus ini dengan isi agent `devops` di `caf-foo.md`.
- Finding: `audit` dan `check-drafts` sudah mendeteksi stack/konteks repo; `agentsSync` dan `curateBaseline` belum, dan `curate` hanya meneruskan `repoMode` ke audit.
- Finding: `rolloutWarnings` melewati kind `implementation`; `addSkillPointers` menawarkan `## Skills` ke berkas yang tidak dikenali dengan jawaban bawaan No.
- Constraint: slug agent per-aplikasi dihitung dengan `agentSlug('implementation', app)` atas aplikasi dari `detectStack` dengan `--mode` yang sama; tidak ada turunan slug kedua. Kind yang dikenal diperiksa lebih dulu, seperti sekarang.
- Constraint: berkas tak dikenal tidak pernah ditulis atau diubah oleh perintah mana pun, tidak mendapat baseline, dan tidak dibandingkan dengan template kind apa pun; nilai "tak dikenal" tidak pernah diteruskan ke builder template.
- Constraint: laporan untuk berkas tak dikenal adalah peringatan saja (`warn`/`WARN`), bukan gap atau `FAIL`; tidak menaikkan exit code. Berkas yang sebelumnya menghasilkan gap karena dibandingkan dengan template `implementation` kini tidak menghasilkannya.
- Constraint: hasil scaffold (semua berkas yang ditulis), golden `frozen-kinds`, dan snapshot `mono-pnpm.json` tidak berubah satu byte pun.
- Constraint: tidak ada flag CLI baru; kosakata disalin dari teks yang sudah ada; kata TODO tidak ditulis literal di teks baru; CLI tidak memanggil model; output deterministik.
- Assumption A1 (T1): pemanggil `detectKind` di `src/` hanya enam tempat di Finding pertama (termasuk `isRecognizedKind`); dasar: `git grep` konsultan. T1 mencatat semuanya, termasuk di `export` dan `readAgentRoster`.
- Assumption A2 (T1): fixture repo lama (`test/helpers/old-repo.js`, laporan `pre-sdd03c1/curate-old-repo.*.json`) hanya berisi berkas berkind dikenal, sehingga laporannya tidak berubah; dasar: roster scaffold default. Bila ternyata berisi berkas tak dikenal, STOP `NEEDS_HUMAN`.
- Assumption A3 (T1): `curate baseline` adalah subaksi `curate` sehingga `--mode` sudah tersedia di CLI-nya; dasar: `src/index.js` mendeklarasikan `--mode` pada `curate`.
- Assumption A4 (T1): `listDraftFiles` memasukkan semua berkas agent, sehingga `check-drafts` melihat berkas tak dikenal.
- Assumption A5: branch `ai-agent/CAF-SDD-03g` dari main terbaru yang sudah memuat 03c2d.

## 4. Decisions Already Made
- `KNOWN_KINDS` harus memuat setiap kind yang dikenali; kind yang hilang darinya jatuh ke `implementation` dan itu risiko eskalasi hak (CAF-DEVOPS-KIND-01). Tiket ini menutup risiko itu untuk berkas di luar `KNOWN_KINDS`.
- Peringatan adalah `warn` saja, tidak pernah gap, tidak mengubah exit code (CAF-SDD-02d).
- `curate sync` hanya menulis `DRIFT` (invariant tetap).
- Q-1: berkas dikenali sebagai `implementation` hanya bila namanya sama dengan slug agent per-aplikasi dari aplikasi yang terdeteksi; selebihnya tak dikenal, dilewati dan dilaporkan (Ganjar, 15 Okt 2026).
- Q-2: di `curate audit`, berkas tak dikenal mendapat satu peringatan rollout per berkas dan tidak ada entri bagian (konsultan, 15 Okt 2026).
- Q-3: `scaffold skills` tidak menawarkan `## Skills` ke berkas tak dikenal; ia mencetak satu baris bahwa pointer boleh ditambah dengan tangan (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [BLOCKING] Bagaimana CAF mengenali agent `implementation` buatannya sendiri setelah fallback dicabut: (a) cocokkan nama berkas dengan slug aplikasi yang terdeteksi, atau (b) berhenti men-scaffold agent per-aplikasi dan anggap semua nama lain tak dikenal? — Answer: (a) (Ganjar, 15 Okt 2026).
- Q-2 [NON-BLOCKING] Di `curate audit`, berkas tak dikenal: (a) satu peringatan rollout (`check: 'unknown-kind'`) tanpa entri bagian (rekomendasi: sama dengan dua peringatan rollout lain, laporan bagian tetap tentang berkas yang dikenali), atau (b) satu entri `ok`/`declined` di laporan bagian? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).
- Q-3 [NON-BLOCKING] `scaffold skills` dan berkas tak dikenal tanpa `## Skills`: (a) tidak ditawari, satu baris dicetak (rekomendasi: skill untuk kind yang tidak diketahui adalah tebakan), atau (b) tetap ditawari dengan jawaban bawaan No seperti sekarang? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When kind ditentukan untuk berkas `caf-foo.md`, `my-agent.md`, setiap nama kind yang dikenal (dengan dan tanpa `caf-`), dan berkas `<slug>.md` untuk aplikasi terdeteksi di repo sementara (monorepo dengan aplikasi di luar frontend/backend, dan SINGLE_REPO), then kind yang dikenal tetap sama seperti sebelum tiket, `<slug>.md` adalah `implementation`, dan dua nama pertama tak dikenal. Verify: automated test.
- AC-2: When `curate sync` dijalankan (juga `--dry-run`) di repo sementara dengan `caf-foo.md` berisi agent read-only yang punya baseline manifest, then berkas itu identik byte-for-byte, tidak ada bagian yang di-sync atau ditambahkan untuknya, dan hasil run menyebutnya sebagai berkas yang dilewati karena kind tak dikenal. Verify: automated test (test AC-7 `kind-guard.test.js`, tanpa `todo`).
- AC-3: When `curate sync` dijalankan di repo sementara dengan agent per-aplikasi `<slug>.md` buatan scaffold yang bagiannya `DRIFT`, then bagian itu di-sync seperti sebelum tiket. Verify: automated test.
- AC-4: When `curate baseline` dijalankan (juga `--dry-run` dan `--yes`) di repo dengan berkas tak dikenal, then manifest tidak mendapat entri untuk berkas itu dan run menyebutnya dilewati; berkas berkind dikenal dan agent per-aplikasi di-baseline seperti sebelum tiket. Verify: automated test.
- AC-5: When `curate audit` dijalankan di repo dengan berkas tak dikenal, then berkas itu mendapat tepat satu peringatan `unknown-kind` (menyebut bahwa berkas tidak dibandingkan, di-sync, atau di-baseline), tidak ada entri bagian atau gap untuknya, dan exit code sama dengan repo yang sama tanpa berkas itu. Verify: automated test.
- AC-6: When `curate audit` dijalankan pada fixture repo lama, then laporannya sama persis dengan yang direkam. Verify: automated test (`test/fixtures/pre-sdd03c1/curate-old-repo.*.json`).
- AC-7: When `curate --check-drafts` dijalankan di repo dengan berkas tak dikenal yang punya baseline manifest, then tidak ada `FAIL` untuk bagian berkas itu dan ada satu `WARN` bahwa bagiannya tidak diperiksa karena kind tak dikenal; temuan untuk berkas lain sama dengan golden pra-tiket. Verify: automated test dengan golden `test/fixtures/pre-sdd03g/`.
- AC-8: When `scaffold skills` dijalankan di repo dengan berkas tak dikenal tanpa `## Skills`, then berkas itu tidak ditawari dan tidak diubah, dan satu baris dicetak bahwa pointer boleh ditambah dengan tangan; agent per-aplikasi tanpa `## Skills` tetap ditawari seperti sebelum tiket. Verify: automated test.
- AC-9: When `curate`, `curate --sync-only`, dan `curate baseline` dijalankan dengan `--mode single` dan `--mode mono`, then deteksi aplikasi untuk pengenalan agent per-aplikasi memakai mode itu. Verify: automated test.
- AC-10: When hasil scaffold default (semua fixture dan varian `--role`) dirender, then sama dengan golden pra-tiket, snapshot `mono-pnpm.json` tidak berubah, dan golden `frozen-kinds` tidak berubah. Verify: automated test; lalu command: `git diff --stat -- test/fixtures/snapshots/ test/fixtures/frozen-kinds/` | expect: kosong.
- AC-11: When README.md, CLAUDE.md, dan CAF.md dibaca, then bagian perilaku saat ini menyatakan aturan pengenalan kind (kind dikenal, agent per-aplikasi dari aplikasi terdeteksi, selebihnya dilewati dengan peringatan), batas yang diketahui (agent tulisan tangan dengan nama slug aplikasi), dan kalimat yang menyebut fallback `implementation` untuk nama apa pun diperbarui; catatan sejarah tiket tidak ditulis ulang. Verify: manual: baca bagian terkait.
- AC-12: When `npm test` dijalankan, then semua test lulus dan tidak ada test `todo` lagi. Verify: command: `npm test` | expect: exit 0 dan ringkasan `todo 0`.
