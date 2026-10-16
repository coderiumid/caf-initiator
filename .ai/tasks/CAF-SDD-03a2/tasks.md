# CAF-SDD-03a2 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-SDD-03a2`, dibuat dari `ai-agent/CAF-SDD-03a` (commit a679ede). Pastikan working tree bersih.
- Output file yang di-generate tidak boleh berubah. 15 golden `test/fixtures/frozen-kinds/` dan `mono-pnpm.json` tidak boleh disentuh; bila harus berubah, STOP `NEEDS_HUMAN`.
- Boleh mengubah `utils/agent-sections.js`, `utils/generate-manifest.js` (kompatibel mundur), `commands/agents-sync.js`, `utils/package-scripts.js`, dan `buildWorkingPatternSection` di `templates/agent-md.js` hanya sebatas menerima kind tanpa mengubah teks keluarannya. Jangan mengubah teks template lain.
- Test dulu (merah), baru perbaikan.
- `curate sync` di test hanya pada salinan fixture di direktori sementara.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.

## Tasks
- [ ] T1: Baca `utils/agent-sections.js` (SYNCABLE_SECTIONS, pemanggilan `buildWorkingPatternSection()` tanpa kind), `commands/agents-sync.js`, `utils/generate-manifest.js`, `agent-md.js:103-108` dan `:189` (appNames), test `agents-sync-drift.test.js` dan test frozen-kinds dari 03a. Catat di `verify-report.md` rencana perbaikan dan format manifest saat ini.
- [ ] T2 (AC-1 sampai AC-4): Tulis test baru yang gagal terlebih dulu: pm/ux Working Pattern (dua fixture), Input qa dan reviewer di mono-pnpm (IN_SYNC, daftar app utuh), perubahan template terkendali (AC-3), manifest format lama (AC-4). Reviewer ikut diuji walau tidak di-freeze.
- [ ] T3 (AC-1): Perbaiki komparator `Working Pattern (PIV)` untuk pm dan ux-designer agar memakai teks yang sudah dirender hari ini (kind-aware). Output builder harus identik byte-for-byte dengan golden.
- [ ] T4 (AC-2, AC-3, AC-4): Implementasikan pemulihan `appNames` sesuai Q-1 (usulan: simpan di manifest + fallback parse dari file; tanpa konteks yang pasti, jangan DRIFT). Pastikan manifest format lama tetap terbaca dan tidak ada penulisan yang menghapus daftar app.
- [ ] T5 (AC-5): Hapus tabel pengecualian dan 5 test `todo` AC-2 dari `test/frozen-kinds.test.js` (milik CAF-SDD-03a), sehingga himpunan non-IN_SYNC diharapkan kosong. Pertahankan test `todo` fallback `implementation`.
- [ ] T6 (AC-6): Tambah deteksi `Watch` camelCase (segmen setelah huruf kecil) di `utils/package-scripts.js`, plus test kasus AC-6. Semua test AC-8 dari 03a tetap lulus.
- [ ] T7 (AC-7): Perbarui README (known issue sekitar :256-261) dan CLAUDE.md sesuai perilaku baru.
- [ ] T8 (AC-5): `npm test` penuh dan `git diff --stat`. Golden dan snapshot tidak tersentuh.
- [ ] T9: Tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris). Di Catatan: mekanisme `appNames` yang dipilih dan alasannya, kompatibilitas manifest, usulan jawaban Q-1 dan Q-2, hal tak terduga.

## Docs Tasks
- Hanya README dan CLAUDE.md (T7).

## Di luar tugas ini
Fallback `implementation` kind tak dikenal, kind `validator`, template reviewer baru, `/caf-plan`, penghapusan atau rename agent/command, SINGLE_REPO, regenerasi snapshot.