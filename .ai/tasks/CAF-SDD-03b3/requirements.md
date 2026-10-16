# CAF-SDD-03b3 — Command `/caf-plan` dan command review yang spec-aware
Status: APPROVED (disetujui Ganjar, 12 Okt 2026)
Source: chat (CAF-SDD-SUMMARY.md bagian 8; hasil SDD-02, 02b, 03b1, 03b2)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-03b2 sudah ter-merge ke main.

## 1. Outcome
Initiator punya command `/caf-plan` yang menjalankan alur Specify, Clarify, Plan, Tasks lewat agent `caf-planner` dari chat, baik dengan ticket ID maupun deskripsi bebas. Command `/caf-review` dan `/caf-fix-review` menjadi sadar-spec tanpa mengubah kontrak webhook-nya. `/caf-plan` tersembunyi sampai penyambungan, supaya tidak ada command yang bergantung pada skill `caf-spec` berbanner DRAFT di repo pengguna.

## 2. Scope
In:
- Builder command `/caf-plan` (hanya terjangkau dari test; tidak masuk scaffold default).
- Perubahan teks `/caf-review` dan `/caf-fix-review` pada section yang sudah ada.
- Test, termasuk uji `curate sync` bila command ter-track.
- Snapshot `mono-pnpm.json` terbatas pada entri command yang berubah.

Out:
- Menghapus atau berhenti menulis `/caf-plan-ticket` dan command lain yang akan dibuang (03c).
- Rename `/caf-run-pipeline` menjadi `/caf-run` (03c).
- Menyambungkan `/caf-plan` ke scaffold default (setelah banner `caf-spec` dicabut di 02c).
- Perubahan nama, argumen, atau penanda keluaran pada kontrak webhook (`/caf-review`, `/caf-fix-review`, `/caf-retry-pipeline`, `/caf-approve-spec`).
- Perubahan orchestrator dan template agent.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: `/caf-plan-ticket` dan semua command lain selain `/caf-review` dan `/caf-fix-review` tetap byte-identik.
- Constraint: `/caf-review` dan `/caf-fix-review`: nama, argumen, dan penanda keluaran yang dibaca webhook tidak berubah; tidak ada header section baru; hanya section yang dicatat T1 yang berubah.
- Constraint: `/caf-plan` tidak menyalin aturan planner; ia memanggil agent `caf-planner` dan merujuk aturannya (satu sumber).
- Constraint: nama `/caf-plan` tidak boleh sama dengan nama skill mana pun.
- Constraint: test lama hanya boleh berubah bila mengunci teks `/caf-review` atau `/caf-fix-review` pada section yang berubah; tiap perubahan didaftar di `verify-report.md`. Perubahan lain: STOP `NEEDS_HUMAN`.
- Constraint: 15 golden `frozen-kinds`, golden `pre-sdd02`, `pre-sdd02b`, `pre-sdd03b2`, dan test 03a/03a2/02/02b/03b1/03b2 tidak berubah selain yang disebut di atas.
- Assumption A1: branch `ai-agent/CAF-SDD-03b3` dari main terbaru.
- Assumption A2: `/caf-plan` menerima satu argumen: ticket ID atau teks bebas. Untuk teks bebas, folder artefak memakai slug kebab-case pendek (maksimal lima kata) dari teks itu.
- Assumption A3: `/caf-plan` berhenti setelah `tasks.md` ditulis; persetujuan spec dan implementasi bukan bagian command ini.
- Assumption A4: perilaku command di berbagai harness mengikuti pola yang sudah dipakai command lain; T1 memetakan.
- Finding: `/caf-plan-ticket` dan `/caf-plan` hidup berdampingan sementara waktu; penggantiannya di 03c.

## 4. Decisions Already Made
- `/caf-plan` menggantikan `/caf-plan-ticket` pada akhirnya; keduanya berdampingan sampai 03c.
- Nama `/caf-review`, `/caf-fix-review`, `/caf-retry-pipeline`, `/caf-approve-spec` tidak diubah karena menjadi kontrak webhook.
- `/caf-fix-review` tidak mengedit spec: komentar review yang meminta perubahan tujuan, scope, atau AC dicatat sebagai usulan di `verify-report.md` dan diangkat ke manusia.
- `/caf-review` yang tidak menemukan folder artefak tetap menjalankan review kode dan menyatakannya, bukan gagal.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Bagaimana command dibuat, dilacak oleh `curate`, dan di-sync hari ini; bagaimana `/caf-plan-ticket` mendapat isi ticket; dan bagaimana command memanggil agent (nama agent, subagent)? T1 memetakan. Bila command tidak ter-track, hal itu dicatat sebagai batasan (repo lama perlu scaffold ulang). — Answer:
- Q-2 [NON-BLOCKING] Apa saja penanda keluaran dan argumen `/caf-review` dan `/caf-fix-review` yang dibaca webhook? T1 mendaftar dan keduanya dikunci test. — Answer:

## 6. Acceptance Criteria
- AC-1: When builder `/caf-plan` dipanggil (kedua fixture), then menghasilkan berkas `caf-plan.md` dengan struktur dan frontmatter sama dengan pola command lain (hasil T1), tanpa placeholder `{{...}}` tersisa. Verify: automated test.
- AC-2: When isi `/caf-plan` dibaca, then menyatakan: menerima ticket ID atau teks bebas; slug kebab-case maksimal lima kata untuk teks bebas; folder artefak `.caf/tasks/<ID-atau-slug>/`; memanggil agent `caf-planner` tanpa menyalin aturannya; bila `requirements.md` berstatus `NEEDS_CLARIFICATION` dan jawabannya terisi maka melanjutkan; bila `APPROVED` maka tidak mengubah tujuan, scope, atau AC dan menulis usulan di `verify-report.md`; berhenti setelah `tasks.md` tanpa memulai implementasi. Verify: automated test atas token-token tersebut.
- AC-3: When `caf-init scaffold` default dijalankan (kedua fixture, semua mode), then `caf-plan.md` tidak ditulis dan tidak ada entri `/caf-plan` di snapshot; builder terjangkau dari test. Verify: automated test; `git diff --stat` tidak menyentuh entri `/caf-plan` di `test/fixtures/snapshots/`.
- AC-4: When command lain dirender, then `/caf-plan-ticket` dan semua command selain `/caf-review` dan `/caf-fix-review` identik byte-for-byte dengan sebelum perubahan, dan nama `/caf-plan` tidak sama dengan nama skill atau `/caf-plan-ticket`. Verify: automated test dengan golden yang disimpan sebelum perubahan.
- AC-5: When `/caf-review` dirender, then menyatakan: menemukan folder artefak dari argumen, PR, branch, atau ID ticket dan meneruskannya ke reviewer; bila tidak ditemukan, menjalankan review kode saja dan menyatakannya di keluaran; penanda keluaran yang dicatat T1 identik byte-for-byte dengan sebelum perubahan. Verify: automated test dengan golden.
- AC-6: When `/caf-fix-review` dirender, then menyatakan: komentar yang meminta perubahan tujuan, scope, atau AC tidak mengedit `requirements.md`, ditulis sebagai usulan di `verify-report.md` dan ditandai butuh keputusan manusia; perbaikan kode lain berjalan seperti biasa; penanda keluaran identik byte-for-byte dengan sebelum perubahan. Verify: automated test dengan golden.
- AC-7: When golden `/caf-review` dan `/caf-fix-review` lama (`test/fixtures/pre-sdd03b3/`) dibandingkan dengan render baru, then section selain yang dicatat T1 identik byte-for-byte dan tidak ada header baru; bila command ter-track, `curate sync` dari golden lama menulis section yang berubah dan tidak menimpa command yang dikustomisasi pengguna. Verify: automated test.
- AC-8: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then entri yang berubah hanya `/caf-review` dan `/caf-fix-review` (ditambah entri lain hanya jika T1 membuktikan menyalin teks yang sama). Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-9: When `npm test` dijalankan, then semua test lulus, 15 golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`.
- AC-10: When CLAUDE.md dan README dibaca, then `/caf-plan` didokumentasikan sebagai command tersembunyi sampai penyambungan, perubahan `/caf-review` dan `/caf-fix-review` tercantum, dan tidak ada klaim yang bertentangan. Verify: manual: baca bagian terkait.