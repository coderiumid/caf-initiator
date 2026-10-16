# CAF-SDD-03c2d — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`, dan main sudah memuat 03c2c (command `/caf-run`, `caf-plan-ticket.md` di `HIDDEN_COMMAND_FILES`). Bila salah satu tidak terpenuhi, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03c2d` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Yang boleh berubah: nama skill `caf-verify` menjadi `caf-self-verify` di `src/templates/skill-md.js` (daftar nama, tabel kind, peta pembangun, teks skill, teks `caf-piv`), catatan dan baris "not listed there" di `src/commands/skills.js`, peringatan `skill-renamed` di `rolloutWarnings` (`src/commands/audit.js`), komentar kode yang menyebut nama lama. Selebihnya tidak berubah satu byte pun. Isi skill selain nama, isi agent, `tools:`, `## Input`, `## Output`, `## Retry Logic`, banner DRAFT, golden `frozen-kinds` tidak boleh berubah.
- Kosakata disalin dari teks yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` dan `scaffold` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T8. Entri yang berubah di luar daftar T1: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk A1 sampai A4), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Golden lama (`pre-sdd03b3`, `pre-sdd03c1`, `pre-sdd03c2`, `pre-sdd03c3`, `pre-sdd03d`, `pre-sdd03f`, `pre-sdd03c2b`, `pre-sdd03c2c`) tidak diregenerasi. Test lama yang menyebut nama skill atau memakai golden yang memuat pointer lama boleh diperbarui (helper tukar nama, pola `test/helpers/since-03c2c.js`); catat tiap perubahan beserta alasan di `verify-report.md`. Cari `caf-verify` di semua berkas test, helper, dan fixture, bukan hanya yang namanya jelas terkait.
- README.md, CLAUDE.md, CAF.md: ubah hanya rujukan nama skill di bagian perilaku saat ini dan bagian yang disebut AC-10; catatan sejarah tiket tidak ditulis ulang; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A4, AC-8, AC-9): Audit baca-saja, catat di `verify-report.md`: semua tempat `caf-verify` muncul di `src/`, `test/` (helper dan fixture), README.md, CLAUDE.md, CAF.md, teks yang dicetak `skills()` dan `agents()`; apakah hasil scaffold default tanpa `scaffold skills` menyebut nama itu; apakah fixture repo lama (`curate-old-repo.*`) memuat folder skill atau pointer; berkas golden `pre-sdd03d` yang memuat pointer lama dan test yang memakainya; bagaimana `check-drafts` dan `complete-drafts` mengenali skill (path atau nama); isi `caf-piv` dan teks lain yang menyebut skill itu; entri snapshot yang diperkirakan berubah.
- [ ] T2 (AC-1, AC-2, AC-6, AC-7): Simpan ke `test/fixtures/pre-sdd03c2d/`: seluruh berkas hasil `scaffold skills` tiap fixture; agent tiap kind (frontend, backend, implementer, qa, validator) yang di-scaffold setelah skill; temuan `check-drafts` dan laporan `curate audit` untuk repo bertemplate lama dengan folder `caf-verify`; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-8): Tulis test merah untuk tiap AC otomatis, termasuk empat cabang AC-5 dan kasus agent berpointer lama dengan `caf-self-verify` DRAFT.
- [ ] T4 (AC-1, AC-2, AC-8): Ganti nama skill di `skill-md.js` dan komentar kode.
- [ ] T5 (AC-3, AC-4): Catatan Q-1 dan baris "not listed there" di `skills.js`.
- [ ] T6 (AC-5, AC-6): Peringatan `skill-renamed` di `rolloutWarnings`; pastikan tidak ganda dengan `skill-pointer` dan tidak mengubah exit code.
- [ ] T7 (AC-7): Pastikan `check-drafts` dan `complete-drafts` tetap membaca folder `caf-verify` lama; perbarui test lama lewat helper tukar nama.
- [ ] T8 (AC-9): Regenerasi snapshot hanya bila T1 menunjukkan perlu; bandingkan `git diff` dengan daftar T1.
- [ ] T9 (AC-11): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T10 (AC-10): Perbarui README.md, CLAUDE.md, CAF.md.
- [ ] T11: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, baris `git grep` yang dibiarkan beserta alasan, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md, CAF.md (T10).

## Di luar tugas ini
Penghapusan folder `caf-verify` di repo lama dan pengeditan `## Skills` oleh `curate`/`scaffold skills`; skill lain; nama fungsi builder; `caf-design`, `caf-breakdown`, `caf-spec` v4, pencabutan banner `caf-traceability`; tiket fallback kind tak dikenal; command; orchestrator.

## Coverage
- AC-1 → T2, T3, T4
- AC-2 → T2, T3, T4
- AC-3 → T3, T5
- AC-4 → T3, T5
- AC-5 → T3, T6
- AC-6 → T2, T3, T6
- AC-7 → T1, T2, T3, T7
- AC-8 → T1, T3, T4
- AC-9 → T1, T8
- AC-10 → T10
- AC-11 → T9
