# CAF-SDD-02 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-02`, dibuat dari main terbaru. Pastikan working tree bersih dan SDD-01, 03a, 03a2 sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Isi `.claude/skills/caf-traceability/SKILL.md` diambil apa adanya dari `caf-traceability.source.md` di folder ini (jangan diparafrase).
- Jangan mengubah teks template kind lain selain planner dan sumber format verify-report. Output kind frozen (15 golden) tidak boleh berubah.
- Snapshot `mono-pnpm.json` hanya boleh diregenerasi pada T7 dengan aturan AC-9. Entri di luar daftar yang disetujui berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi.
- `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (AC-5, AC-9, Q-2, Q-3): Audit baca-saja. Catat di `verify-report.md`: (a) isi dan frontmatter `tools:` planner saat ini; (b) semua artefak yang ditulis planner, path-nya, dan token status berhentinya; (c) folder artefak yang dipakai generator (`.caf/tasks` atau lain; bila bukan `.caf/tasks`, STOP `NEEDS_HUMAN`); (d) di mana format `verify-report` hidup (Q-3) dan regex `Status:` yang dibaca orchestrator (dari CLAUDE.md/CAF.md di repo); (e) perilaku `curate sync` untuk section baru di file agent lama (Q-2); (f) file mana saja di snapshot yang memuat teks planner atau format verify-report.
- [ ] T2 (AC-10): Sebelum mengubah apa pun di `src/`, simpan render planner saat ini (kedua fixture) ke `test/fixtures/pre-sdd02/planner.<fixture>.json` memakai skrip sekali pakai di scratchpad (jangan di-commit skripnya). Commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-8, AC-10): Tulis test yang gagal terlebih dulu: teks planner (AC-1 sampai AC-4), tabel literal tools dan artefak (AC-5), format verify-report (AC-6), skill `caf-traceability` (AC-7), pemetaan dan pointer (AC-8), sync dari golden lama (AC-10).
- [ ] T4 (AC-7, AC-8): Tambah skill `caf-traceability` mengikuti pola `buildSpecSkill()` di `src/templates/skill-md.js`: builder, daftar `SKILL_NAMES`, pemetaan kind planner, frontend, backend. Lahir DRAFT; tidak ada pointer.
- [ ] T5 (AC-1 sampai AC-5): Tulis template `caf-planner` baru (teks dalam bahasa Inggris, sama seperti template lain): Specify, Clarify, Plan, Tasks, aturan spec APPROVED, aturan AC di tasks.md. Pertahankan artefak, path, token status, dan frontmatter dari T1. Referensikan format `requirements.md` ke skill `caf-spec` tanpa menyalin isinya.
- [ ] T6 (AC-6): Perbarui sumber format `verify-report` (Q-3): satu baris bukti per AC dan bagian "Usulan perubahan spec". Regex `Status:` tetap lulus.
- [ ] T7 (AC-9): Regenerasi snapshot `mono-pnpm.json` hanya setelah test lain hijau. Bandingkan `git diff` dengan daftar T1(f); catat tiap entri yang berubah di `verify-report.md`. Entri tak terduga: STOP `NEEDS_HUMAN`.
- [ ] T8 (AC-10, AC-11): `npm test` penuh. Pastikan test 03a/03a2 lulus tanpa diubah dan golden `frozen-kinds` tidak tersentuh.
- [ ] T9 (AC-13): Tambah satu paragraf di README tentang SDD (lihat AC-13). Jangan menulis klaim di luar yang sudah diputuskan.
- [ ] T10 (AC-12, KONDISIONAL): Kerjakan hanya bila `requirements.md` Q-1 berisi "lulus". Hapus banner DRAFT `caf-spec` dari builder, pastikan planner `## Skills` berisi 3 pointer imperatif, perbarui snapshot hanya pada entri pointer planner (aturan T7), test AC-12. Bila Q-1 kosong atau "belum": lewati dan tulis "T10 dilewati, tunggu uji manual" di `verify-report.md`.
- [ ] T11: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris). Di Catatan: hasil T1 (a sampai f), daftar entri snapshot yang berubah, perilaku sync untuk section baru (Q-2), jawaban Q-3, dan hal tak terduga.

## Docs Tasks
- Hanya README (T9). CLAUDE.md diperbarui bila invarian skill (DRAFT, pointer) atau pemetaan skill berubah.

## Di luar tugas ini
`caf-design`, `caf-breakdown`, rename `caf-verify`, `validate-report`, kind `validator`, template reviewer, `/caf-plan`, penghapusan agent/command, SINGLE_REPO, fallback `implementation`, perubahan orchestrator, penghapusan banner `caf-traceability`.