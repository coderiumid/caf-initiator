# CAF-SDD-03c3 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`, dan main sudah memuat 03c2 (`SUPERSEDED_CANDIDATE_KINDS` ada). Bila salah satu tidak terpenuhi, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03c3` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Yang boleh berubah: roster SINGLE_REPO dan `SUPERSEDED_CANDIDATE_KINDS`, catatan scaffold (AC-5), daftar agent di `/caf-run-pipeline`, `/caf-complete-drafts`, `piv-workflow.md`, `agent-handoff.md`, `readAgentRoster`, dan penghapusan kode mati dari daftar T1. Selebihnya tidak berubah satu byte pun. Kind `implementer` dan kind agent lama, golden `frozen-kinds`, isi skill, `tools:`, `## Skills`, `## Input`, `## Output`, `## Retry Logic` tidak boleh berubah.
- Kosakata disalin dari teks yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Snapshot hanya diregenerasi di T9. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk A2: teks `--role` yang menyatakan dirinya satu-satunya agent implementasi), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Kode hanya dibuang bila tercantum di daftar T1 dengan bukti pemanggilnya. Ragu: biarkan dan catat.
- Test lama yang mengunci hal yang memang berubah boleh diperbarui; catat tiap perubahan beserta alasan di `verify-report.md`. Cari teks yang berubah (`implementer`, `caf-implementer`, nama builder yang dibuang) di semua berkas test, bukan hanya test yang namanya jelas terkait.
- README.md dan CLAUDE.md: ubah hanya bagian yang disebut AC-13; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A5, AC-10, AC-12): Audit baca-saja, catat di `verify-report.md`: `buildSingleRepoCandidates()` dan cara `--role` memilih kind; teks frontend dan backend versi `--role` (kalimat tentang cakupan dan keberadaan agent lain); cabang `/caf-run-pipeline` yang menyebut agent implementasi; semua tempat yang mendaftar agent untuk SINGLE_REPO; perilaku `scaffold agents` pada repo yang punya `caf-implementer.md`; daftar kode mati (nama fungsi/berkas, semua pemanggilnya, target CLI dan `curate audit` yang menyentuhnya, test yang hanya mengujinya); test/fixture/golden yang mengunci `implementer` di roster; entri snapshot yang diperkirakan berubah.
- [ ] T2 (AC-1, AC-2, AC-6, AC-8, AC-9): Simpan ke `test/fixtures/pre-sdd03c3/`: daftar berkas dan isi scaffold single-nuxt default, `--role frontend`, `--role backend`, dan mono-pnpm; render `/caf-run-pipeline`, `/caf-complete-drafts`, `agent-handoff.md` dengan roster lama; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-11): Tulis test merah untuk tiap AC otomatis.
- [ ] T4 (AC-1, AC-3, AC-4): Roster SINGLE_REPO default frontend + backend; `implementer` ke `SUPERSEDED_CANDIDATE_KINDS`.
- [ ] T5 (AC-5): Perilaku scaffold di repo yang punya `caf-implementer.md` dan catatannya.
- [ ] T6 (AC-6, AC-7, AC-8): Daftar agent di `/caf-run-pipeline`, `/caf-complete-drafts`, `piv-workflow.md`, `agent-handoff.md`, `readAgentRoster`.
- [ ] T7 (AC-10): Buang kode mati dari daftar T1 beserta test yang hanya mengujinya.
- [ ] T8 (AC-2, AC-9): Pastikan `--role` dan mono-pnpm identik dengan golden.
- [ ] T9 (AC-11, AC-12): Uji scaffold lengkap single-nuxt + `curate --audit-only`; regenerasi snapshot setelah test lain hijau; bandingkan `git diff` dengan daftar T1.
- [ ] T10 (AC-14): `npm test` penuh; golden `frozen-kinds` tak tersentuh; test `todo` tetap ada.
- [ ] T11 (AC-13): Perbarui README.md dan CLAUDE.md.
- [ ] T12: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, daftar kode yang dibuang dan yang sengaja dibiarkan beserta alasan, test lama yang diubah atau dihapus, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md (T11).

## Di luar tugas ini
Kind `implementer` dan kind agent lama, `HIDDEN_COMMAND_FILES`, `HIDDEN_CANDIDATE_KINDS`, fallback kind tak dikenal, `architect`, isi 03c2b (rename, `/caf-plan-ticket`, planner `## Constraints`, `INDEX.md`), isi skill, `tools:`, `## Skills`, `## Input`, `## Output`, `## Retry Logic`, orchestrator.

## Coverage
- AC-1, AC-3, AC-4 → T3, T4
- AC-2, AC-9 → T2, T3, T8
- AC-5 → T3, T5
- AC-6, AC-8 → T2, T3, T6
- AC-7 → T3, T6
- AC-10 → T1, T3, T7
- AC-11 → T3, T9
- AC-12 → T1, T9
- AC-13 → T11
- AC-14 → T10
