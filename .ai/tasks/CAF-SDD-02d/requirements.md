# CAF-SDD-02d — Planner lebih tegas, status konsisten, curate audit mendeteksi rollout yang kurang
Status: APPROVED (Q-1 sampai Q-3 dijawab "ikut rekomendasi", 13 Okt 2026)
Source: chat (Uji 5 di umkm-pos dan laporan audit caf-initiator pasca-02c, 13 Okt 2026, temuan 2, 3, 4)
Repo target: `caf-initiator`
Bergantung pada: 02c dan 03d ter-merge ke main (sudah).

## 1. Outcome
Planner tidak lagi meninggalkan TODO "belum dibaca" untuk fakta yang bisa ia baca, tidak menulis section placeholder, tidak menerbitkan `tasks.md` saat ada pertanyaan BLOCKING, membuka pesan akhir dengan baris `Status:` polos, dan menulis status penolakan di tempat yang jelas. Planner hanya memakai satu konvensi status. `curate audit` memberi peringatan bila agent lama punya `tools:` yang berbeda dari template kind-nya atau tidak punya pointer ke skill aktif yang seharusnya ia baca.

## 2. Scope
In:
- Planner `## Output`: aturan baru (lihat AC-1 sampai AC-6) dan `## Input`: satu konvensi status (AC-7). Hanya dua section ini yang berubah; keduanya di-track `curate sync`.
- `curate audit` (mode audit-only): dua pemeriksaan baru berstatus peringatan (AC-10, AC-11).
- Test, golden pra-tiket, snapshot terbatas, README dan CLAUDE.md.

Out:
- Isi skill `caf-spec` (hash tetap), `caf-traceability`, `tools:`, `## Skills`, `## Allowed Tools` planner.
- Agent selain planner, command, orchestrator.
- Memperbaiki rollout otomatis (`curate sync` tetap tidak menulis `## Skills` dan frontmatter).
- Aturan bahasa artefak planner.

## 3. Constraints and Assumptions
- Finding (Uji 5): planner meninggalkan dua TODO "belum dibaca" padahal punya `Read`, `Glob`, `Grep`; menulis `## Decisions Already Made` berisi `- -`; menulis `tasks.md` placeholder empat baris saat Q-1 dan Q-2 `[BLOCKING]` belum dijawab; pesan akhir tidak diawali `Status:` polos; beberapa AC `automated test` tanpa nama berkas.
- Finding (audit): planner `## Output` menyuruh berhenti dengan `Status: NEEDS_HUMAN` saat menolak mengubah spec APPROVED tanpa menyebut berkas; kalimat sebelumnya melarang menulis `requirements.md` termasuk baris statusnya.
- Finding (audit): planner `## Input` memakai heading `## Status: PLAN` untuk `requirements.md`, sedangkan `## Output` memakai baris `Status:` (`DRAFT`/`NEEDS_CLARIFICATION`/`APPROVED`/`NEEDS_HUMAN`).
- Finding (audit): `curate audit` tidak membandingkan frontmatter `tools:` dengan template, dan `curate --check-drafts` hanya memeriksa pointer yang ada, bukan yang kurang. Planner repo lama dengan `tools: [Read, Write]` dan tanpa pointer `caf-spec` dilaporkan "already in sync", 0 fail, 0 warn.
- Finding (orchestrator): orchestrator hari ini mewajibkan `tasks.md` dari planner dan membaca `SUCCESS` dari `verify-report.md`; penanganan `NEEDS_CLARIFICATION` di sisi orchestrator belum ada (SDD-04b).
- Constraint: teks planner di luar `## Input` dan `## Output` tidak berubah satu byte pun; di dua section itu hanya aturan baru dan kalimat status yang disebut AC-7 yang berubah.
- Constraint: hash `caf-spec` tetap `b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0`; aturan baru ditulis di `## Output`, bukan di skill (skill tidak ikut `curate sync`).
- Constraint: `tools:` semua agent, golden `frozen-kinds`, dan test `todo` fallback `implementation` tidak berubah; bila sebuah golden `frozen-kinds` memuat `## Input`/`## Output` planner, T1 mencatatnya dan eksekutor STOP `NEEDS_HUMAN` sebelum `src/`.
- Constraint: pemeriksaan audit baru hanya peringatan (exit code audit tidak berubah), deterministik, tanpa memanggil model.
- Assumption A1: branch `ai-agent/CAF-SDD-02d` dari main terbaru.
- Assumption A2 (T1): tabel `tools:` per kind dan pemetaan skill per kind (`SKILLS_BY_KIND`) tersedia sebagai data yang bisa dipakai audit.
- Assumption A3 (T1): `## Input` planner di-track `curate sync`.

## 4. Decisions Already Made
- Aturan perilaku planner ditulis di planner `## Output`/`## Input` supaya ikut `curate sync` ke repo lama.
- Planner berhenti `NEEDS_HUMAN` saat diminta mengubah spec APPROVED (02c); tiket ini hanya menentukan tempat statusnya.
- Q-1: penolakan mengubah spec APPROVED ditulis sebagai baris `Status: NEEDS_HUMAN` pertama `verify-report.md` bersama `## Proposed Spec Changes` (jawaban Ganjar, 13 Okt 2026).
- Q-2: `tasks.md` tidak ditulis selama ada pertanyaan BLOCKING tanpa `Answer:`; penanganan di orchestrator dijadwalkan di SDD-04b.
- Q-3: dua pemeriksaan `curate audit` baru berstatus peringatan, exit code tidak berubah.

## 5. Open Questions
- Q-1 [BLOCKING] Saat planner menolak mengubah spec APPROVED, status penolakan ditulis di mana: (a) baris `Status: NEEDS_HUMAN` di baris pertama `verify-report.md` bersama bagian `## Proposed Spec Changes` (rekomendasi: orchestrator sudah membaca berkas ini dan membaca `NEEDS_HUMAN` sebagai bukan-lulus), atau (b) hanya di pesan akhir, tanpa jejak berkas? — Answer: (a) baris `Status: NEEDS_HUMAN` di baris pertama `verify-report.md` bersama `## Proposed Spec Changes` (ikut rekomendasi).
- Q-2 [NON-BLOCKING] Selama ada pertanyaan `[BLOCKING]` tanpa `Answer:`, `tasks.md` tidak ditulis sama sekali (rekomendasi; sesuai aturan 02 dan catatan bahwa orkestrator akan menangani status `NEEDS_CLARIFICATION` di SDD-04b), atau boleh satu baris penanda `BLOCKED`? — Answer: `tasks.md` tidak ditulis sama sekali selama ada pertanyaan BLOCKING tanpa `Answer:` (ikut rekomendasi).
- Q-3 [NON-BLOCKING] Pemeriksaan audit baru berstatus peringatan dan tidak mengubah exit code (rekomendasi, karena `tools:` bisa sengaja dikustomisasi), atau gagal (FAIL)? — Answer: Peringatan, exit code tidak berubah (ikut rekomendasi).
## 6. Acceptance Criteria
- AC-1: When planner dirender (fixture `mono-pnpm` dan `single-nuxt`), then `## Output` menyatakan: fakta repo yang bisa dibaca dengan `Read`/`Glob`/`Grep` dibaca dulu; tidak ada TODO "belum dibaca" di artefak; yang tidak bisa dipastikan menjadi `Finding:` tanpa klaim atau pertanyaan. Verify: automated test atas teks hasil render.
- AC-2: When planner dirender, then `## Output` menyatakan: section tanpa isi ditulis `Tidak ada`, bukan placeholder (`- -`, kosong, `TBD`). Verify: automated test.
- AC-3: When planner dirender, then `## Output` menyatakan perilaku sesuai Q-2 selama ada pertanyaan `[BLOCKING]` tanpa `Answer:`. Verify: automated test.
- AC-4: When planner dirender, then `## Output` menyatakan penolakan mengubah spec APPROVED ditulis sebagai sesuai Q-1 (berkas dan baris `Status:` disebut eksplisit), konsisten dengan larangan menulis `requirements.md`. Verify: automated test.
- AC-5: When planner dirender, then `## Output` menyatakan pesan akhir diawali baris `Status: <nilai>` polos (tanpa bold atau tanda lain) dengan nilai dari himpunan status yang sama dengan artefak. Verify: automated test.
- AC-6: When planner dirender, then `## Output` menyatakan AC berbentuk `automated test` menyebut berkas test, atau menyebut task yang membuat berkasnya. Verify: automated test.
- AC-7: When planner dirender, then `## Input` dan `## Output` memakai satu konvensi status (baris `Status:`); heading `## Status: PLAN` tidak lagi muncul sebagai konvensi status `requirements.md`. Verify: automated test (bila T1 menunjukkan frasa itu merujuk hal lain, dicatat dan AC disesuaikan lewat NEEDS_HUMAN).
- AC-8: When planner dirender, then bagian selain `## Input` dan `## Output` identik byte-for-byte dengan golden pra-tiket (`test/fixtures/pre-sdd02d/`), `tools:`, `## Skills`, `## Allowed Tools` tidak berubah, dan hash `caf-spec` tetap. Verify: automated test dengan golden.
- AC-9: When file planner hasil 02c di-baseline di repo sementara lalu `curate sync` dijalankan, then `## Input` dan `## Output` ditulis dengan teks baru, planner yang dikustomisasi tidak ditimpa, dan file agent lain tidak berubah. Verify: automated test.
- AC-10: When `curate --audit-only` dijalankan di repo yang agent-nya punya `tools:` berbeda dari template kind-nya, then audit mencetak peringatan yang menyebut berkas, daftar tools sekarang, dan daftar tools template; when `tools:` sama, then tidak ada peringatan tambahan. Verify: automated test (salinan fixture sementara).
- AC-11: When `curate --audit-only` dijalankan di repo yang punya skill aktif (tanpa banner DRAFT) yang dipetakan ke kind sebuah agent tetapi agent itu tidak punya pointer ke skill itu di `## Skills`, then audit mencetak peringatan yang menyebut agent dan skill dan perintah/langkah manual yang benar; skill berbanner DRAFT tidak menghasilkan peringatan. Verify: automated test.
- AC-12: When `curate --audit-only` dijalankan di repo hasil scaffold bersih, then tidak ada peringatan baru dan exit code sama dengan sebelum tiket; pada repo uji AC-10/AC-11 exit code juga tidak berubah (sesuai Q-3). Verify: automated test.
- AC-13: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri `caf-planner.md` yang berubah (dicatat). Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-14: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
- AC-15: When README dan CLAUDE.md dibaca, then tertulis aturan baru planner, dua peringatan `curate audit`, dan catatan rollout (`curate sync` membawa `## Input`/`## Output`; `tools:` dan pointer tetap manual dan kini terdeteksi oleh audit). Verify: manual: baca bagian terkait.