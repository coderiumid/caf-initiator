# CAF-SDD-02b — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-02b`, dari main terbaru. Working tree bersih. SDD-02 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Isi skill diambil apa adanya dari `caf-spec.source.v3.md` dan `caf-traceability.source.v2.md` di folder ini. Jangan diparafrase.
- Banner DRAFT tidak dicabut. Tidak ada pointer baru.
- Teks template yang boleh berubah hanya planner `## Output` dan format verify-report. Selebihnya tidak boleh berubah satu byte pun.
- Snapshot hanya diregenerasi di T7 dengan aturan AC-7. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, AC-6, AC-7): Audit baca-saja. Petakan semua tempat yang menyalin aturan spec/verify (planner `## Output`, `agent-handoff-md.js`, skill, README, CLAUDE.md). Catat di `verify-report.md` daftar tempat dan entri snapshot yang terdampak.
- [ ] T2 (AC-6, AC-8): Sebelum mengubah `src/`, simpan render planner saat ini (kedua fixture) ke `test/fixtures/pre-sdd02b/planner.<fixture>.json` (skrip sekali pakai di scratchpad, tidak di-commit). Commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-6, AC-8): Tulis test yang gagal terlebih dulu: sha256 dan token `caf-spec` (AC-1, AC-2), skill lama tidak ditimpa dan dry-run (AC-3), `caf-traceability` v2 (AC-4), lima bentuk bukti dan regex `Status:` (AC-5), teks planner dan bagian lain identik dengan golden T2 (AC-6), sync dari golden lama (AC-8).
- [ ] T4 (AC-1, AC-2, AC-3): Ganti isi builder `caf-spec` dengan v3. Perbarui test lama yang mengunci hash atau isi v2 (`skills-spec.test.js`); setiap perubahan test lama dicatat di `verify-report.md`.
- [ ] T5 (AC-4): Ganti isi builder `caf-traceability` dengan v2; perbarui test hash-nya.
- [ ] T6 (AC-5, AC-6): Tambah bentuk bukti `command` di format verify-report (`agent-handoff-md.js`); sejajarkan teks planner `## Output` pada tiga butir di requirements; bagian lain tidak berubah.
- [ ] T7 (AC-7): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1; catat tiap entri yang berubah.
- [ ] T8 (AC-8, AC-9): `npm test` penuh; test 03a/03a2/SDD-02 lulus tanpa diubah (kecuali yang dicatat di T4/T5); golden `frozen-kinds` tak tersentuh.
- [ ] T9 (AC-10): Perbarui CLAUDE.md dan README bagian skills.
- [ ] T10: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC dengan `Verify: command:` dilaporkan sebagai `command`). Catatan: hasil T1, entri snapshot yang berubah, test lama yang diubah beserta alasan, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T9).

## Di luar tugas ini
Pencabutan banner dan pointer planner (02c), `validate-report`, kind `validator`, eksekusi `command:` oleh validator, parsing `Verify:` di orchestrator, `caf-design`, `caf-breakdown`, rename `caf-verify`, fallback `implementation`.