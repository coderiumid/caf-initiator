## Ticket: CAF-REORG-01
## Pola Kerja: PIV (Plan → Implement → Verify), retry max 3x per task verify

---

### PLAN

1. **Investigasi struktur `caf-initiator` saat ini** — jangan sentuh kode dulu.
   Inventarisir semua titik di repo yang generate atau mereferensikan:
   - Root scaffold (`.ai/` dan subfoldernya: `tasks/`, `discovery/`, `audits/`, `workflows/`)
   - Template generator agent (kemungkinan `agent-md.js` atau setara)
   - Template generator command
   - Logic golden-examples (cek apakah saat ini benar-benar copy file fisik)
   - File-file yang menyimpan daftar/roster nama agent (`read-agent-roster.js`,
     `runner-targets.js` — verifikasi dulu apakah nama file ini akurat atau cuma dugaan awal)
   - `KNOWN_KINDS` atau daftar sejenis yang enumerasi jenis agent
   - Konsumen `.caf-sync-state.json` — pastikan path lama vs baru tidak bikin state jadi
     salah baca setelah rename

   **Output**: daftar file + baris kode yang perlu diubah, dikelompokkan per-AC dari
   `requirements.md`.

2. **Checkpoint kecil**: laporkan hasil investigasi ke Ganjar sebelum lanjut implement.
   Kalau ada file/struktur yang ternyata berbeda dari asumsi di `requirements.md` (misal
   nama file generator berbeda dari dugaan), stop dan konfirmasi dulu — jangan menebak.

---

### IMPLEMENT

3. **Update scaffold folder root** — ganti target generate dari `.ai/` ke `.caf/`, tambah
   subfolder baru: `.caf/knowledge/decisions/`, `.caf/knowledge/golden-examples/`,
   `.caf/discovery/`, `.caf/audits/{DATE}/pending/`, `.caf/tasks/`, `.caf/workflows/`.

4. **Update generator agent definition** — output filename `caf-<nama>.md` untuk 10 agent.
   Cek isi template: kalau ada referensi nama agent di dalam body (misal judul, cross-link
   antar agent file), pastikan ikut konsisten pakai `caf-` juga.

5. **Update generator command** — output filename `caf-<nama>.md` untuk 10 command, tetap
   di folder `.claude/commands/` (bukan `.claude/skills/`).

6. **Update generator golden-examples** — ganti dari copy-file jadi generate `RULES.md`
   berisi: path relatif ke file asli (hasil deteksi repo), nama pattern, kolom alasan
   berisi literal `TODO` (bukan teks yang di-generate AI).

7. **Update roster/lookup nama agent** — sinkronkan file yang ditemukan di Langkah 1
   (roster, target runner, `KNOWN_KINDS`) ke pola `caf-<nama>`. Kalau ada kode di luar
   `caf-initiator` yang ikut ter-exposed dalam pencarian ini (misal shared package),
   TANDAI saja, jangan diubah — itu di luar scope checkpoint ini.

8. **Tambah generator `.caf/knowledge/INDEX.md`** — logic baru: scan `docs/` project
   (hasil deteksi struktur repo), buat daftar link + status (✓ ada / belum ada) untuk
   dokumen reference standar (PRD, ERD, api-contract, testing-strategy, dst — sesuaikan
   dengan yang benar-benar terdeteksi, jangan hardcode daftar yang belum tentu relevan
   ke semua project).

9. **Update `CAF.md` sumber**:
   - Ganti semua `.ai/` → `.caf/` (struktur folder, Layer 3, Layer 4, diagram pipeline,
     Lampiran A kalau relevan)
   - Update tabel 8 agent → tulis nama file sebagai `caf-<nama>.md`
   - Update daftar command Layer 5 (kalau CAF.md menyebutkannya) → prefix `caf-`
   - Update Layer 1 golden-examples: jelaskan pola reference-based + trade-off lookup
     tambahan
   - Tambah penjelasan singkat `.caf/knowledge/INDEX.md` sebagai jembatan ke `docs/`
   - Tambah catatan pembeda `.caf/discovery/{slug}/prd.md` vs `docs/product/prd.md`

---

### VERIFY

10. **Dry-run `caf-initiator` di direktori test kosong** — BUKAN di `umkm-pos` (reset
    `umkm-pos` itu checkpoint terpisah). Jalankan generator end-to-end, cek:
    - Struktur folder output cocok dengan AC1–AC3
    - Nama file agent & command cocok dengan AC4–AC5
    - `RULES.md` golden-examples ter-generate dengan path valid (AC6)
    - `INDEX.md` ter-generate dengan link yang benar-benar merujuk file yang ada

11. **Cross-check `CAF.md` vs output actual dry-run** — pastikan tidak ada drift antara
    dokumentasi dan kode (misal `CAF.md` bilang satu nama, generator menghasilkan nama lain).

12. **Render-and-verify** — jangan percaya klaim "sudah benar" tanpa eksekusi nyata. Buka
    file hasil generate satu-satu untuk item yang berisiko tinggi (AC5, AC6).

Kalau ada verify yang gagal: perbaiki, ulangi, maksimal 3x per item. Kalau masih gagal
setelah 3x → stop, laporkan `NEEDS_HUMAN` dengan detail kegagalan, jangan dipaksa lanjut.

---

### Eksplisit TIDAK termasuk checkpoint ini
- Reset `.caf/` di `umkm-pos`
- Propagasi ke `caf-orchestrator` / `caf-orchestrator-cms`
- Keputusan status `.caf/skills/`
- Migrasi command ke format Skills
- Reduce-steps `caf-initiator` (konsolidasi subcommand)
