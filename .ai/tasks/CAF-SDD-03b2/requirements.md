# CAF-SDD-03b2 — Reviewer yang memeriksa spec
Status: APPROVED (disetujui Ganjar, 12 Okt 2026)
Source: chat (CAF-SDD-SUMMARY.md bagian 3 dan 10; hasil SDD-02, 02b, 03b1)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-03b1 dan CAF-FIX-01 sudah ter-merge ke main.

## 1. Outcome
Agent `caf-reviewer` yang di-generate memeriksa perubahan terhadap spec, bukan hanya kualitas kode: penyimpangan scope, task yang tidak dikerjakan, kepatuhan ADR, perubahan spec setelah disetujui, dan AC yang belum terbukti otomatis. Kontrak verdict yang dibaca orchestrator hari ini tidak berubah.

## 2. Scope
In:
- Teks agen `reviewer`, hanya di section yang sudah ada (tanpa header baru).
- Test, termasuk uji `curate sync` dari reviewer versi lama.
- Snapshot `mono-pnpm.json` terbatas pada entri reviewer dan entri lain yang terbukti menyalin teks yang sama.

Out:
- Command `/caf-review` dan `/caf-fix-review` spec-aware dan `/caf-plan` (03b3).
- Pemetaan skill baru ke reviewer (diputuskan setelah ada data dispatch).
- Perubahan orchestrator, pembacaan verdict, atau jalur pengiriman review (SDD-04).
- Rename atau penghapusan agen lain, kind `qa`.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: frontmatter `tools:` reviewer, kerangka verdict (token dan bentuk baris yang dibaca orchestrator), dan jalur keluaran review yang ada hari ini tidak berubah.
- Constraint: section `Input` reviewer tidak berubah satu byte pun, sehingga parser daftar app (03a2) tetap berlaku tanpa penyesuaian.
- Constraint: tidak ada header section baru di berkas agen reviewer (sync tidak menulis section baru ke berkas lama). Bila perubahan tidak muat tanpa header baru, STOP `NEEDS_HUMAN`.
- Constraint: reviewer tidak menjalankan ulang test atau gerbang verifikasi (itu tugas validator) dan tidak mengedit kode, test, atau spec.
- Constraint: test lama hanya boleh berubah bila mengunci teks reviewer pada section yang berubah; tiap perubahan didaftar di `verify-report.md`. Perubahan lain: STOP.
- Constraint: 15 golden `frozen-kinds`, golden `pre-sdd02`, `pre-sdd02b`, dan test 03a/03a2/02/02b/03b1 tidak berubah selain yang disebut di atas.
- Assumption A1: branch `ai-agent/CAF-SDD-03b2` dari main terbaru.
- Assumption A2: reviewer membaca berkas artefak di `.caf/tasks/<ID-atau-slug>/`; `design.md` dan `validate-report.md` bersifat opsional ("bila ada"), karena validator belum tersambung.
- Assumption A3: ADR berada di `.caf/knowledge/decisions/`.
- Assumption A4: pemeriksaan "spec berubah setelah disetujui" memakai riwayat git `requirements.md` (commit yang menetapkan `Status: APPROVED` dan commit sesudahnya).

## 4. Decisions Already Made
- Verdict dan jalur keluaran review tidak diubah; yang bertambah hanya isi pemeriksaan.
- AC dengan bukti `manual`, `build-only`, `none`, atau tanpa baris bukti dilaporkan reviewer sebagai "perlu dicek manusia", bukan dihitung lulus.
- Usulan perubahan spec di `verify-report.md` ("Proposed Spec Changes") selalu diangkat ke manusia oleh reviewer.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Section reviewer mana yang memuat pemeriksaan baru dan di mana kerangka verdict serta jalur keluaran review berada hari ini? T1 memetakan; bila tidak ada section yang cocok tanpa header baru, STOP `NEEDS_HUMAN`. — Answer:
- Q-2 [NON-BLOCKING] Test mana yang mengunci teks reviewer? T1 mendaftar dan menandai mana yang boleh berubah. — Answer:

## 6. Acceptance Criteria
- AC-1: When agent `reviewer` dirender (fixture `mono-pnpm` dan `single-nuxt`), then isinya menyuruh membaca `requirements.md`, `tasks.md`, `design.md` bila ada, `verify-report.md`, `validate-report.md` bila ada, ADR, dan diff perubahan. Verify: automated test atas teks hasil render.
- AC-2: When reviewer dirender, then pemeriksaan scope menyatakan: berkas atau perubahan di diff yang tidak tercakup task atau Scope In dilaporkan sebagai temuan penyimpangan scope, dan task yang tidak tercermin di diff dilaporkan sebagai task belum dikerjakan, masing-masing menyebut id task atau butir Scope. Verify: automated test atas teks hasil render.
- AC-3: When reviewer dirender, then pemeriksaan AC menyatakan: tiap AC dipetakan ke task dan baris bukti di `verify-report.md`; AC berbukti `manual`, `build-only`, `none`, atau tanpa baris bukti dicantumkan sebagai "perlu dicek manusia"; reviewer tidak menjalankan ulang test. Verify: automated test atas teks hasil render.
- AC-4: When reviewer dirender, then ada aturan: perubahan pada tujuan, scope, atau AC `requirements.md` dalam commit setelah commit yang menetapkan `Status: APPROVED` adalah temuan yang memblokir; "Proposed Spec Changes" dari `verify-report.md` selalu diangkat ke manusia; pelanggaran ADR dilaporkan dengan nama ADR. Verify: automated test atas teks hasil render.
- AC-5: When reviewer dirender, then frontmatter `tools:` sama persis dengan nilai yang dicatat T1 (tabel literal di test), kerangka verdict identik byte-for-byte dengan hasil sebelum perubahan, dan teks menyatakan reviewer tidak mengedit kode, test, atau spec. Verify: automated test dengan golden reviewer yang disimpan sebelum perubahan.
- AC-6: When reviewer dirender, then semua section selain yang dicatat T1 sebagai berubah (termasuk `Input`) identik byte-for-byte dengan golden sebelum perubahan, dan tidak ada header section baru. Verify: automated test.
- AC-7: When golden reviewer lama (`test/fixtures/pre-sdd03b2/`) di-baseline di repo sementara lalu `curate sync` dijalankan (dry-run dan write, kedua fixture), then section yang berubah ditulis dengan teks baru, daftar app di `Input` pada monorepo utuh, agen lain tidak berubah, dan reviewer yang dikustomisasi pengguna tidak ditimpa. Verify: automated test.
- AC-8: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then entri yang berubah hanya `caf-reviewer.md` (ditambah entri lain hanya jika T1 membuktikan menyalin teks yang sama, dicatat di `verify-report.md`). Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-9: When `npm test` dijalankan, then semua test lulus, 15 golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`.
- AC-10: When CLAUDE.md dan README dibaca, then reviewer didokumentasikan sebagai spec-aware dan tidak ada klaim yang bertentangan. Verify: manual: baca bagian terkait.