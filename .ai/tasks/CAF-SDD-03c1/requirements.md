# CAF-SDD-03c1 — Berhenti men-scaffold agent dan command yang dibuang
Status: APPROVED (revisi 2 setelah NEEDS_HUMAN di T4; keputusan D1 sampai D3 dijawab 12 Okt 2026)
Source: chat (CAF-SDD-SUMMARY.md bagian 3 dan 8; hasil 03a sampai 03b3)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-03b3 sudah ter-merge ke main.

## 1. Outcome
Repo baru yang di-scaffold tidak lagi mendapat lima agent (`documentation`, `devops`, `pm`, `ux-designer`, `auditor`) dan delapan command yang sudah dibuang dari desain SDD. Repo lama tidak terpengaruh: berkasnya tidak dihapus, dan `curate` tetap bisa mengaudit dan men-sync-nya.

## 2. Scope
In:
- Menyembunyikan lima kind agent dari scaffold (kandidat dan jalur non-interaktif) dengan mekanisme `HIDDEN_CANDIDATE_KINDS` yang sudah ada, dan mekanisme setara untuk command.
- Menghentikan penulisan delapan command: `discovery-start`, `discovery-to-ticket`, `audit-scan`, `audit-to-ticket`, `design-ticket`, `feature-catalog-sync`, `qa-check`, `review-ticket`.
- Menghentikan scaffold folder dan templat discovery atau audit bila scaffold default menulisnya.
- Audit teks hasil generate yang masih menyebut agent atau command yang dibuang (dilaporkan, tidak diperbaiki).
- Test, regenerasi snapshot terbatas, dan dokumentasi.

Out:
- Menghapus kind dari `KNOWN_KINDS` atau menghapus builder (tetap, beku).
- Menghapus atau mengubah berkas di repo pengguna.
- Rename (`/caf-run-pipeline`, `caf-verify`, `qa`), penyambungan `validator` dan `/caf-plan`, `SINGLE_REPO`, kode mati, koreksi teks "3x", fallback `implementation` (tiket-tiket berikutnya).
- Menghentikan agent `implementer`: di SINGLE_REPO tanpa `--role` ia satu-satunya agent implementasi dan `/caf-run-pipeline` bergantung padanya; ditentukan di 03c3 bersama perilaku peran default.
- Menghentikan agent `architect` dan `qa`: `architect` masih dipakai planner untuk `design.md` sampai skill `caf-design` ada; `qa` sampai validator disambungkan bersama orchestrator.
- Perubahan teks template apa pun dan perubahan orchestrator.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: builder kind yang dibuang, 15 golden `frozen-kinds`, dan semua teks template tidak berubah satu byte pun.
- Constraint: `curate audit` dan `curate sync` pada repo yang sudah memuat berkas kind atau command yang dibuang tetap berperilaku seperti sebelumnya (IN_SYNC, tanpa penghapusan, tanpa peringatan baru).
- Constraint: perubahan test lama hanya pada test yang mengunci kandidat scaffold, himpunan berkas default, atau hitungan yang mencantumkan kind atau command yang dibuang; tiap perubahan didaftar di `verify-report.md`. Perubahan lain: STOP `NEEDS_HUMAN`.
- Constraint: pesan CLI yang menjadi tidak benar karena kind disembunyikan (mis. kind yang disebut "dapat dipilih" atau "dibuat sebagai") boleh dikoreksi seminimal mungkin; tiap perubahan didaftar di `verify-report.md`. Bantuan `--role` dan `--scope` tidak diubah.
- Constraint: bila temuan T1 bertentangan dengan sebuah AC, STOP `NEEDS_HUMAN` saat itu juga, sebelum menyentuh `src/`.
- Constraint: bila agent atau command yang dipertahankan ternyata memerlukan salah satu yang dibuang untuk berfungsi (mis. pemetaan skill, handoff, workflow), STOP `NEEDS_HUMAN` dengan bukti.
- Assumption A1: branch `ai-agent/CAF-SDD-03c1` dari main terbaru.
- Assumption A2: `devops` sudah disembunyikan dari menu hari ini; pola itu dipakai ulang.
- Assumption A3: repo pengguna lama menyimpan berkas yang sudah ditulis; hanya repo baru yang berubah.
- Finding: di SINGLE_REPO tanpa `--role`, `implementer` adalah satu-satunya agent implementasi, dan `/caf-run-pipeline` hanya ditawarkan bila ada Planner dan agent implementasi (temuan T4 revisi 1).
- Finding: helper snapshot hari ini merender kandidat tersembunyi juga, sehingga snapshot merekam berkas yang tidak lagi ditulis scaffold.
- Finding: planner hari ini mengeluarkan urutan agent yang masih mencantumkan Architect dan Documentation. Pipeline repo baru yang kehilangan Documentation harus ditangani orchestrator (SDD-04), maka rilis npm menunggu SDD-04.

## 4. Decisions Already Made
- Hapus bertahap: berhenti menulis lebih dulu, kind tetap dikenali; penghapusan penuh di rilis berikutnya.
- Rilis npm versi baru menunggu orchestrator (SDD-04) menangani agent yang tidak ada di repo baru.
- Tidak ada jalur untuk memilih kind tersembunyi secara eksplisit (sudah demikian untuk `devops` dan `validator`).
- D1 opsi (b): `implementer` tetap di-scaffold sampai 03c3; tiket ini menyembunyikan lima kind.
- D2 opsi (b): helper snapshot mengikuti scaffold nyata dan snapshot diregenerasi, karena snapshot harus merekam apa yang benar-benar ditulis.
- D3: pesan CLI yang menjadi tidak benar dikoreksi di tiket ini, seminimal mungkin.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Bagaimana mekanisme tersembunyi untuk command hari ini, dan apa semua titik masuk yang menulis agent dan command (menu interaktif, `--yes` atau non-interaktif, mode `MONOREPO` dan `SINGLE_REPO`, perintah `init` penuh)? T1 memetakan; bila command tidak punya mekanisme setara, dibuat yang minimal dan serupa. — Answer:
- Q-2 [NON-BLOCKING] Apakah scaffold default menulis folder atau templat discovery atau audit (`.caf/discovery`, `.caf/audits`)? T1 menjawab. — Answer:

## 6. Acceptance Criteria
- AC-1: When `scaffold agents` dijalankan (kedua fixture, semua mode, interaktif dan non-interaktif), then `documentation`, `devops`, `pm`, `ux-designer`, `auditor` tidak ditawarkan dan tidak ditulis, `implementer` tetap ditawarkan dan ditulis seperti sebelumnya, dan himpunan berkas yang ditulis sama dengan himpunan sebelum perubahan dikurangi lima kind itu (golden daftar path `test/fixtures/pre-sdd03c1/`). Verify: automated test.
- AC-2: When `scaffold` command dijalankan (kedua fixture, semua mode), then delapan command yang dibuang tidak ditulis, dan himpunan command yang ditulis sama dengan himpunan sebelum perubahan dikurangi delapan itu; `/caf-plan` tetap tidak ditulis. Verify: automated test dengan golden daftar path.
- AC-3: When scaffold default dijalankan, then tidak ada berkas di `.caf/discovery` atau `.caf/audits` yang ditulis, bila sebelumnya ditulis (hasil Q-2). Verify: automated test.
- AC-4: When repo yang sudah memuat berkas enam kind dan delapan command yang dibuang (di-baseline) dijalankan dengan `curate audit` dan `curate sync` (dry-run dan write), then semua section ber-track `IN_SYNC`, tidak ada berkas dihapus atau berubah, dan tidak ada peringatan baru. Verify: automated test.
- AC-5: When `KNOWN_KINDS` dan `detectKind` diperiksa, then semua kind yang dibuang masih terdaftar dan terdeteksi; `HIDDEN_CANDIDATE_KINDS` memuat lima kind itu (tanpa `implementer`) dan tetap subset dari `KNOWN_KINDS`; 15 golden `frozen-kinds` lulus tanpa perubahan. Verify: automated test.
- AC-6: When audit teks hasil generate selesai, then `verify-report.md` mendaftar setiap berkas hasil scaffold default (file dan kutipan) yang masih menyebut agent atau command yang dibuang sebagai ada, dengan status "temuan" (tidak diubah di tiket ini). Verify: manual: baca daftar di `verify-report.md`.
- AC-7: When helper snapshot dibuat mengikuti scaffold nyata dan `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then selisihnya hanya (a) penghapusan entri milik kind yang disembunyikan dan (b) perubahan pada `piv-workflow.md`, `agent-handoff.md`, dan `caf-run-pipeline.md` yang bersumber semata dari cabang kondisional yang sudah ada ("tanpa Documentation Agent"), tanpa mengubah teks template; entri kind atau command lain tidak berubah. Verify: manual: baca `git diff` snapshot dan cocokkan dengan uji kering T1/T4 yang dicatat di `verify-report.md`; perubahan di luar daftar itu: STOP.
- AC-8: When `npm test` dijalankan, then semua test lulus dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`.
- AC-9: When README dan CLAUDE.md dibaca, then daftar agent dan command yang di-scaffold sudah benar, ada catatan bahwa lima agent dan delapan command tidak lagi di-scaffold, `implementer` bertahan sampai 03c3 tetapi tetap ada di repo lama, dan ada catatan bahwa rilis npm menunggu SDD-04. Verify: manual: baca bagian terkait.
- AC-10: When pesan CLI scaffold dibaca (peringatan, daftar pilihan, bantuan), then tidak ada pesan yang menyatakan kind atau command yang disembunyikan dapat dipilih atau dibuat; tiap koreksi didaftar di `verify-report.md`, dan bantuan `--role` serta `--scope` tidak berubah. Verify: manual: baca daftar koreksi dan jalankan `caf-init scaffold agents --help` serta alur menu di fixture.