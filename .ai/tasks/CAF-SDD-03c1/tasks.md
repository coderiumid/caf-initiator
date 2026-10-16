# CAF-SDD-03c1 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- LANJUTAN revisi 2: branch `ai-agent/CAF-SDD-03c1` sudah berisi golden (a384929) dan commit WIP (a2e803d, suite merah). Lanjutkan dari a2e803d, jangan reset. Setelah suite hijau dan semua AC terbukti, gabungkan commit WIP dan perbaikan menjadi satu commit bersih di atas a384929 (`git reset --soft a384929` lalu commit), lokal saja.
- Bila T1 menemukan sesuatu yang bertentangan dengan sebuah AC, STOP `NEEDS_HUMAN` saat itu juga, sebelum menyentuh `src/`.
- Branch: `ai-agent/CAF-SDD-03c1`, dari main terbaru. Working tree bersih. SDD-03b3 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Hanya berhenti menulis. Builder, `KNOWN_KINDS`, 15 golden `frozen-kinds`, dan seluruh teks template tidak boleh berubah satu byte pun. Jangan menghapus atau mengubah berkas di repo pengguna.
- `architect`, `qa`, dan `implementer` tetap ditulis (keputusan D1b). `/caf-plan` dan `validator` tetap tersembunyi.
- Test lama hanya boleh berubah bila mengunci kandidat scaffold, himpunan berkas default, atau hitungan yang mencantumkan kind atau command yang dibuang; daftarkan tiap perubahan. Selain itu: STOP `NEEDS_HUMAN`.
- Snapshot hanya diregenerasi di T7 dengan aturan AC-7. Entri tak terduga berubah: STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru implementasi. `curate` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, Q-2, AC-6): Audit baca-saja. Catat di `verify-report.md`: (a) semua titik masuk yang menulis agent dan command (menu, non-interaktif, mode, `init` penuh) dan mekanisme tersembunyi untuk agent dan command; (b) apakah scaffold default menulis folder atau templat discovery atau audit; (c) himpunan berkas default saat ini per fixture dan mode; (d) test yang mengunci kandidat, himpunan berkas default, atau hitungan; (e) seluruh teks hasil scaffold default yang menyebut agent atau command yang dibuang sebagai ada; (f) entri snapshot yang terkait kind atau command yang dibuang.
- [ ] T2 (AC-1, AC-2): Sebelum mengubah `src/`, simpan daftar path berkas default (agent, command, folder terkait) per fixture dan mode ke `test/fixtures/pre-sdd03c1/` (skrip sekali pakai di scratchpad, tidak di-commit). Commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-5): Tulis test yang gagal terlebih dulu: himpunan agent dan command default (AC-1, AC-2), folder discovery atau audit (AC-3), repo lama tetap IN_SYNC tanpa penghapusan (AC-4), `KNOWN_KINDS`, `detectKind`, `HIDDEN_CANDIDATE_KINDS` (AC-5).
- [ ] T4 (AC-1, AC-2, AC-3, AC-5): Keluarkan `implementer` dari `HIDDEN_CANDIDATE_KINDS` (sisakan lima kind); perbarui test baru dan golden daftar path yang mengasumsikan enam. Lalu pastikan lima kind disembunyikan dan hentikan delapan command memakai mekanisme hasil T1(a); hentikan scaffold folder discovery atau audit bila T1(b) menunjukkan ada.
- [ ] T4b (AC-10): Koreksi pesan CLI yang menjadi tidak benar (hasil audit D3), seminimal mungkin; jangan mengubah bantuan `--role` dan `--scope`. Daftarkan tiap pesan di `verify-report.md`.
- [ ] T5 (AC-4, AC-8): `npm test` penuh; periksa test lama yang berubah sesuai T1(d).
- [ ] T6 (AC-6): Lengkapi daftar temuan teks yang menyebut agent atau command yang dibuang di `verify-report.md`; jangan mengubah teksnya.
- [ ] T7 (AC-7): Ubah helper snapshot agar mengikuti scaffold nyata (tidak merender kandidat tersembunyi), lakukan uji kering, lalu regenerasi snapshot setelah test lain hijau. Diff harus persis: entri kind tersembunyi dihapus, serta `piv-workflow.md`, `agent-handoff.md`, `caf-run-pipeline.md` berubah hanya lewat cabang kondisional yang sudah ada. Catat tiap entri dan kutipan perubahan di `verify-report.md`; selisih lain: STOP.
- [ ] T8 (AC-9): Perbarui README dan CLAUDE.md.
- [ ] T9: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC `command` dilaporkan sebagai `command`). Catatan: hasil T1(a sampai f), test lama yang diubah beserta alasan, entri snapshot yang berubah, hal tak terduga.

## Docs Tasks
- README dan CLAUDE.md (T8).

## Di luar tugas ini
Menghapus kind atau builder, rename, penyambungan `validator` atau `/caf-plan`, `SINGLE_REPO`, kode mati, koreksi teks "3x", fallback `implementation`, perbaikan teks yang menyebut agent atau command yang dibuang, perubahan orchestrator, `architect` dan `qa`.