# CAF-SDD-03g — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Syarat mulai: `requirements.md` berstatus `Status: APPROVED`, dan main sudah memuat 03c2d (skill `caf-self-verify`, `RENAMED_SKILLS`). Bila salah satu tidak terpenuhi, STOP `NEEDS_HUMAN`.
- Branch `ai-agent/CAF-SDD-03g` dari main terbaru, working tree bersih. Tidak ada push, PR, atau merge. Commit lokal satu per tahap bermakna.
- Yang boleh berubah: pengenalan kind (`detectKind` dan pemanggilnya), perilaku untuk berkas tak dikenal di `audit.js`, `agents-sync.js`, `curate-baseline.js`, `check-drafts.js`, `skills.js`, penerusan `repoMode` dari `curate` ke `agentsSync` dan `curateBaseline`, komentar kode yang menyatakan sebaliknya. Template, teks agent, berkas yang ditulis scaffold, `KNOWN_KINDS`, golden `frozen-kinds`, dan snapshot tidak boleh berubah.
- Invariant `curate sync` (hanya menulis `DRIFT`) tetap; tambahkan test "berkas identik setelah sync" untuk setiap cabang baru.
- Kosakata disalin dari teks yang sudah ada. Kata TODO tidak ditulis literal di teks baru.
- Test dulu (merah), baru implementasi. `curate` dan `scaffold` di test hanya pada salinan fixture di direktori sementara. Repo monorepo dengan aplikasi di luar frontend/backend dibuat di direktori sementara (fixture `mono-pnpm` tidak punya).
- Bila temuan T1 bertentangan dengan sebuah AC (termasuk A1 sampai A4), STOP `NEEDS_HUMAN` sebelum menyentuh `src/`.
- Golden lama tidak diregenerasi. Test lama yang mengandalkan fallback `implementation` untuk nama sembarang boleh diperbarui (memakai nama slug aplikasi atau kind yang dikenal); catat tiap perubahan beserta alasan di `verify-report.md`. Cari pemakaian `detectKind`, `'implementation'`, dan nama berkas agent custom di semua berkas test dan helper.
- README.md, CLAUDE.md, CAF.md: ubah hanya bagian perilaku saat ini yang disebut AC-11; catatan sejarah tiket tidak ditulis ulang; bagian lain tidak diformat ulang.

## Tasks
- [ ] T1 (A1 sampai A4, AC-6): Audit baca-saja, catat di `verify-report.md`: semua pemanggil `detectKind` dan `isRecognizedKind` di `src/` (termasuk `export` dan `readAgentRoster`) dan apa yang masing-masing lakukan dengan `implementation`; di mana `agentSlug('implementation', app)` dipakai; apakah `agentsSync` dan `curateBaseline` bisa menerima `repoMode` dari CLI; isi repo lama `old-repo.js`; daftar berkas `listDraftFiles`; test yang memakai nama agent custom atau mengharapkan `implementation` untuk nama sembarang.
- [ ] T2 (AC-7, AC-10): Simpan ke `test/fixtures/pre-sdd03g/`: hasil scaffold default tiap fixture dan varian `--role` (pakai helper yang ada), temuan `check-drafts`, laporan `curate audit`, dan hasil `curate sync --dry-run` untuk repo dengan agent dikenal, agent per-aplikasi, dan berkas custom; commit golden itu lebih dulu.
- [ ] T3 (AC-1 sampai AC-9, AC-12): Tulis test merah untuk tiap AC otomatis; cabut `todo` dari test AC-7 di `kind-guard.test.js`.
- [ ] T4 (AC-1, AC-9): Pengenalan kind dengan slug agent per-aplikasi dari `detectStack`; teruskan `repoMode`.
- [ ] T5 (AC-2, AC-3, AC-4): `curate sync` dan `curate baseline` melewati berkas tak dikenal dan melaporkannya.
- [ ] T6 (AC-5, AC-6): Peringatan `unknown-kind` di `curate audit`.
- [ ] T7 (AC-7, AC-8): `check-drafts` dan `scaffold skills` untuk berkas tak dikenal.
- [ ] T8 (AC-10, AC-12): `npm test` penuh; pastikan hasil scaffold, snapshot, dan `frozen-kinds` tidak berubah.
- [ ] T9 (AC-11): Perbarui README.md, CLAUDE.md, CAF.md.
- [ ] T10: `git diff --stat`; tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file; AC ber-`command` dilaporkan sebagai `command`). Catat hasil T1, test lama yang diubah, hal tak terduga.

## Docs Tasks
- README.md, CLAUDE.md, CAF.md (T9).

## Di luar tugas ini
Teks agent dan template; kind baru; penawaran agent per-aplikasi; orchestrator; `export` dan `readAgentRoster` (hanya dicatat bila T1 menemukan fallback yang sama).

## Coverage
- AC-1 → T3, T4
- AC-2, AC-3, AC-4 → T2, T3, T5
- AC-5, AC-6 → T1, T2, T3, T6
- AC-7, AC-8 → T2, T3, T7
- AC-9 → T1, T3, T4
- AC-10 → T2, T8
- AC-11 → T9
- AC-12 → T3, T8
