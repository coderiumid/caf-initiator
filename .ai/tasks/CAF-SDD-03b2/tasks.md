# CAF-SDD-03b2 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-03b2`, dari main terbaru. Working tree bersih. SDD-03b1 dan CAF-FIX-01 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Ubah hanya teks agen reviewer pada section yang sudah ada. Tidak ada header baru, `Input` tidak berubah, kerangka verdict dan `tools:` tidak berubah.
- Test lama hanya boleh berubah bila mengunci teks reviewer pada section yang berubah; daftarkan tiap perubahan. Selain itu: STOP `NEEDS_HUMAN`.
- Snapshot hanya diregenerasi di T6 dengan aturan AC-8. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, Q-2): Audit baca-saja. Catat di `verify-report.md`: (a) semua section template reviewer dan isinya ringkas; (b) `tools:` reviewer saat ini; (c) kerangka verdict, token dan bentuk baris yang dibaca orchestrator, serta jalur keluaran review hari ini; (d) section yang akan memuat pemeriksaan baru (tanpa header baru); (e) daftar test yang mengunci teks reviewer dan mana yang boleh berubah; (f) entri snapshot yang memuat teks reviewer atau salinannya.
- [ ] T2 (AC-5, AC-6, AC-7): Sebelum mengubah `src/`, simpan render reviewer saat ini (kedua fixture) ke `test/fixtures/pre-sdd03b2/reviewer.<fixture>.json` (skrip sekali pakai di scratchpad, tidak di-commit). Commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-7): Tulis test yang gagal terlebih dulu: token teks (AC-1 sampai AC-4), tabel literal tools dan kerangka verdict identik (AC-5), section lain identik dan tanpa header baru (AC-6), sync dari golden lama termasuk daftar app dan reviewer terkustomisasi (AC-7).
- [ ] T4 (AC-1 sampai AC-6): Ubah teks reviewer pada section hasil T1(d). Tulis dalam bahasa Inggris, gaya template lain, ringkas.
- [ ] T5 (AC-7, AC-9): `npm test` penuh; periksa test lama yang berubah sesuai T1(e).
- [ ] T6 (AC-8): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1(f); catat tiap entri yang berubah.
- [ ] T7 (AC-10): Perbarui CLAUDE.md dan README.
- [ ] T8: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC `command` dilaporkan sebagai `command`). Catatan: hasil T1(a sampai f), test lama yang diubah beserta alasan, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- CLAUDE.md dan README (T7).

## Di luar tugas ini
`/caf-review`, `/caf-fix-review`, `/caf-plan`, pemetaan skill baru ke reviewer, perubahan orchestrator atau jalur pengiriman review, rename atau penghapusan agen, kind `qa`.