# Design: CAF-CURATE-DIFF-01 — Content-Level Diff untuk `curate`

> Status: DRAFT — mengandung 4 STOP item (lihat `requirements.md`) yang butuh
> keputusan user sebelum implementasi. Jangan mulai coding sebelum terjawab.

## Pendekatan Teknis — 3-Way Comparison

Inti mekanismenya adalah 3-way comparison per section, mirip prinsip di balik
`git merge`/lockfile drift detection, tapi disederhanakan untuk kasus ini:
bandingkan **hash section saat generate/sync terakhir** (baseline) terhadap
**hash section di file target sekarang** dan **hash section di template
sekarang**.

```
baseline = hash section saat terakhir di-generate/sync (dari manifest)
current  = hash section di file target SEKARANG
template = hash section di template SEKARANG

current == baseline  DAN  template == baseline   → IN SYNC (tidak ada aksi)
current == baseline  DAN  template != baseline   → DRIFT MURNI (aman auto-sync)
current != baseline  DAN  template == baseline   → USER CUSTOMIZATION (jangan disentuh)
current != baseline  DAN  template != baseline   → CONFLICT (keduanya berubah, lapor manual)
```

Ini yang secara matematis menjamin section #3 (customization) tidak pernah
ke-overwrite otomatis — karena syarat auto-sync HARUS `current == baseline`
(file belum disentuh user sejak generate/sync terakhir).

## Komponen

### 1. Manifest Tracking (tergantung jawaban STOP item #1)
Kandidat A (rekomendasi): `.caf/.generate-manifest.json` per project:
```json
{
  "version": 1,
  "files": {
    ".claude/agents/caf-frontend.md": {
      "sections": {
        "## Retry Logic": {
          "hash": "sha256:...",
          "templateVersion": "caf-initiator@1.4.2",
          "lastSyncedAt": "2026-09-03T13:02:00Z"
        }
      }
    }
  }
}
```
Ditulis/diupdate setiap kali `curate sync` berhasil menulis suatu section
(baik section baru maupun section yang di-drift-sync).

Kandidat B: HTML comment marker inline per section di dalam file `.md`-nya
sendiri (mis. `<!-- caf:section-hash:sha256:... -->` tepat di bawah heading).
Kelebihan: nggak ada file terpisah yang bisa lupa di-commit/ke-gitignore.
Kekurangan: nampil "aneh" di file yang dibaca manusia/agent (noise visual),
dan berpotensi ikut kebaca sebagai instruksi kalau agent yang salah parsing.

**Perlu keputusan user (STOP #1)** — draft ini condong ke Kandidat A karena
lebih bersih, tapi risikonya manifest nggak ke-commit/ke-sync dengan file
aslinya kalau user nggak commit dua-duanya sekaligus.

### 2. Backfill untuk Project Existing (tergantung jawaban STOP item #2)
Kerangka Opsi (a) yang direkomendasikan di `requirements.md`:
- `curate audit` versi baru, saat dijalankan pertama kali di project yang
  belum punya manifest sama sekali → untuk SETIAP section yang ada,
  status-nya bukan salah satu dari 4 kondisi di atas, tapi status kelima
  khusus: **UNTRACKED** — "section ada, tapi belum pernah di-baseline,
  perlu direview manual dulu sebelum tracking otomatis aktif"
- User review satu-satu (mirip proses manual patch CDR-38 kemarin — cek
  apakah isi section itu sudah sesuai template terbaru atau belum), lalu
  jalankan `curate baseline` (command baru, terpisah dari `sync`) yang
  menerima kondisi section-section itu APA ADANYA sebagai baseline pertama
  kali — TANPA mengubah isi file, cuma menulis manifest berdasarkan hash
  konten yang sudah ada sekarang
- Setelah baseline pertama tertulis, tracking otomatis berjalan normal untuk
  perubahan template berikutnya

### 3. Hash Section (tergantung jawaban STOP item #3)
Default: hash SHA-256 dari isi section penuh (dari baris setelah heading
sampai sebelum heading level sama/lebih tinggi berikutnya), dengan normalisasi
whitespace minimal (trim trailing whitespace per baris, normalize line ending)
supaya reformat kosmetik (mis. ganti CRLF/LF) nggak salah keflag sebagai
perubahan konten.

### 4. Command Baru/Berubah
- `curate audit` — sekarang report per section, bukan per file. Output
  mencakup ringkasan jumlah section per status (in-sync/drift/customization/
  conflict/untracked)
- `curate sync` — HANYA menulis section berstatus DRIFT MURNI. Section
  CONFLICT dan CUSTOMIZATION tidak disentuh, tapi tetap dilaporkan di akhir
  run supaya user sadar ada yang butuh perhatian manual (bukan silent-skip)
- `curate baseline` — command baru, khusus proses backfill (lihat komponen 2)

### Format Laporan Conflict (tergantung jawaban STOP item #4)
Minimal (default kalau belum ada preferensi lain dari user): print ke
terminal, format mirip `git status` — daftar file+section dengan status
CONFLICT, plus instruksi manual command untuk lihat diff 2 arah:
```bash
curate diff <file> <section>   # tampilkan: baseline vs current vs template
```

## Testing Strategy
- Unit test: fungsi hash section — konsisten untuk isi sama, beda untuk isi
  beda, tahan terhadap normalisasi whitespace kosmetik
- Unit test: 4 kombinasi kondisi (in-sync/drift/customization/conflict) —
  masing-masing menghasilkan status yang benar dari kombinasi
  baseline/current/template yang diberikan
- Integration test real-file: reproduksi persis skenario CDR-38 (section lama
  tanpa `SUCCESS`, template diperbarui) → pastikan terdeteksi sebagai DRIFT,
  `curate sync` berhasil update tanpa diminta manual
- Integration test: simulasikan file yang sudah di-custom user (ubah section
  setelah baseline, TANPA update template) → pastikan terdeteksi sebagai
  CUSTOMIZATION, `curate sync` TIDAK menyentuhnya sama sekali
- Regression test backfill: project tanpa manifest sama sekali → `curate
  audit` tidak crash, melaporkan semua section sebagai UNTRACKED (bukan
  salah diklaim in-sync atau drift)