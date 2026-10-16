# CAF-SDD-02c — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`. Bila masih DRAFT, STOP `NEEDS_HUMAN`.
- Branch: `ai-agent/CAF-SDD-02c`, dari main terbaru. Working tree bersih. 02b dan 03c1 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Isi skill `caf-spec` diambil apa adanya dari `caf-spec.source.v3-final.md` di folder ini. Jangan diparafrase.
- Teks template yang boleh berubah hanya planner `## Output` (dua aturan baru), `## Skills` planner (pointer lewat generator), `## Allowed Tools` planner (daftar dan rationale `Glob`/`Grep`), dan frontmatter `tools:` planner. Selebihnya tidak boleh berubah satu byte pun.
- Hash `caf-spec` dikunci sebagai konstanta di test (jangan membaca `.ai/`, itu di-gitignore). Frasa rationale `Glob`/`Grep` di `## Allowed Tools`: tulis mengikuti gaya rationale agent lain, baca-saja, lalu kutip di `verify-report.md`.
- Test yang mengunci hal yang memang berubah (isi/hash `caf-spec` berbanner, tabel `tools:` planner, teks planner, golden `pre-sdd02b`) boleh diperbarui; setiap perubahan test lama dicatat di `verify-report.md` dengan alasan. Test lain tidak diubah.
- Snapshot hanya diregenerasi di T6 dengan aturan AC-7. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi. `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila temuan T1 bertentangan dengan sebuah AC, STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna; bila ada WIP, squash di akhir.

## Tasks
- [x] T1 (A3, A4, AC-2, AC-6, AC-7) SELESAI (hasil di verify-report; K-1 dan K-2 dijawab di requirements revisi 2): Audit baca-saja, catat di `verify-report.md`: (a) bagaimana generator memutuskan pointer `## Skills` (aturan banner) dan kind mana saja yang memetakan `caf-spec`; (b) isi `## Skills` dan `## Output` planner sekarang beserta frontmatter; (c) apakah `curate sync` menulis perubahan frontmatter `tools:` atau hanya section; (d) daftar test yang mengunci isi/hash `caf-spec` berbanner, `tools:` planner, teks planner, golden `pre-sdd02b`; (e) entri snapshot yang terdampak.
- [x] T2 (AC-5): Sebelum mengubah `src/`, simpan render planner (kedua fixture) ke `test/fixtures/pre-sdd02c/planner.<fixture>.json` (skrip sekali pakai di scratchpad, tidak di-commit). Commit golden itu lebih dulu.
- [x] T3 (AC-1 sampai AC-6): Tulis test yang gagal terlebih dulu (lanjutan dari T1 yang sudah selesai; branch sudah ada dan kosong): sha256 dan 77 baris `caf-spec` serta banner `caf-traceability` tetap (AC-1), tiga pointer dan `curate --check-drafts` (AC-2), tabel literal `tools:` (AC-3), dua aturan `## Output` (AC-4), identik dengan golden T2 di luar `## Skills`/`## Output`/`## Allowed Tools` (AC-5), sync dari golden `pre-sdd02b` menulis `## Output` dan `## Allowed Tools` saja (AC-6).
- [x] T4 (AC-1, AC-2): Ganti isi builder `caf-spec` dengan `caf-spec.source.v3-final.md` (tanpa banner) dan pastikan pointer planner muncul lewat aturan generator, bukan hardcode. Perbarui test lama yang mengunci hash/isi berbanner; catat tiap perubahan.
- [x] T5 (AC-3, AC-4): Tambah `Glob` dan `Grep` ke peta tools planner (frontmatter dan `## Allowed Tools` ikut, urutan mengikuti konvensi agent lain) dan tambah dua aturan di planner `## Output`. Perbarui tabel literal `tools:` di test; catat.
- [x] T6 (AC-7): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1(e); catat tiap entri yang berubah.
- [x] T7 (AC-8): `npm test` penuh; test 03a/03a2/SDD-02/02b/03b/03c1 lulus tanpa diubah (kecuali yang dicatat di T4/T5); golden `frozen-kinds` tak tersentuh.
- [x] T8 (AC-9): Perbarui README dan CLAUDE.md bagian skills, planner, dan rollout repo lama.
- [x] T9: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC dengan `Verify: command:` dilaporkan sebagai `command`). Catatan: hasil T1, test lama yang diubah beserta alasan, entri snapshot yang berubah, batasan sync frontmatter, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T8).

## Di luar tugas ini
Banner `caf-traceability`, perubahan isi `caf-spec`, aturan bahasa artefak planner, himpunan perintah validator, `caf-design`, `caf-breakdown`, orchestrator (SDD-04), 03c2, 03c3.