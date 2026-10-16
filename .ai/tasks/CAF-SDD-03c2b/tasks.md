# CAF-SDD-03c2b — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`, dan main sudah memuat 03c3. Bila salah satu tidak terpenuhi, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03c2b` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Teks template yang boleh berubah hanya: planner `## Output` dan `## Constraints`, `INDEX.md`, dan pemeriksaan planner di `rolloutWarnings` (`curate audit`). Selebihnya tidak berubah satu byte pun. Dari planner, `## Input`, `tools:`, `## Allowed Tools`, `## Skills`, `## Retry Logic`, `## Working Pattern (PIV)`, `## Verify Checklist` tidak boleh berubah. Isi skill dan golden `frozen-kinds` tidak boleh berubah.
- Aturan ditulis berdasarkan niat, dengan kosakata yang sudah ada; tanpa daftar kata terlarang. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T7. Entri selain `caf-planner.md` berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk A4: laporan fixture repo lama bertambah lebih dari satu peringatan atau berubah di tempat lain), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Test lama yang mengunci kalimat yang memang berubah (`sdd02d-planner-audit`, `sdd02e-planner-read`, `sdd02-planner-spec`, `sdd03c2-validator-default`, dan yang ditemukan T1) boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Cari kalimat yang berubah di semua berkas test, bukan hanya yang namanya jelas terkait.
- README.md dan CLAUDE.md: ubah hanya bagian yang disebut AC-11; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A4, AC-6, AC-10): Audit baca-saja, catat di `verify-report.md`: kalimat planner `## Output` dan `## Constraints` yang memuat catatan blocked, `NEEDS_HUMAN` untuk ticket run, "Fallback", "Discovery" (lokasi builder, bukan nomor baris); test yang mengunci kalimat itu; ada tidaknya golden `frozen-kinds` planner; builder dan kalimat `.caf/discovery/` di `INDEX.md`; bentuk entri `rolloutWarnings` dan tempat menambah pemeriksaan planner; isi `## Constraints` planner di fixture repo lama dan efeknya pada laporan `curate` yang direkam; semua pengimpor `architecture-signatures.js`; test `readAgentRoster` yang ada; entri snapshot yang diperkirakan berubah.
- [ ] T2 (AC-4, AC-5, AC-6): Simpan ke `test/fixtures/pre-sdd03c2b/`: render planner tiap fixture dan `INDEX.md`; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-8): Tulis test merah untuk tiap AC otomatis.
- [ ] T4 (AC-1 sampai AC-4): Ubah planner `## Output` dan `## Constraints`; perbarui komentar kode yang menyatakan sebaliknya.
- [ ] T5 (AC-5, AC-6): Pastikan `curate sync` menulis hanya `## Output`; tambah peringatan rollout `## Constraints` planner.
- [ ] T6 (AC-7, AC-8, AC-9): Ubah `INDEX.md`; kunci test `readAgentRoster`; buang `architecture-signatures.js`.
- [ ] T7 (AC-10): Regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T8 (AC-12): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T9 (AC-11): Perbarui README.md dan CLAUDE.md.
- [ ] T10: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md (T9).

## Di luar tugas ini
Rename `/caf-run-pipeline` dan `caf-verify`, pencabutan `/caf-plan-ticket`, routing langkah 4, kalimat retry tingkat pipeline (03c2c); penolakan perubahan spec `APPROVED`; `## Input` planner; agent lain; isi skill; orchestrator.

## Coverage
- AC-1, AC-2, AC-3, AC-4 → T2, T3, T4
- AC-5 → T2, T3, T5
- AC-6 → T1, T2, T3, T5
- AC-7, AC-8 → T3, T6
- AC-9 → T6
- AC-10 → T1, T7
- AC-11 → T9
- AC-12 → T8
