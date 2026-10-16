# Ticket: CAF-BASELINE-ROLLOUT-01 — Migrasi `curate baseline` ke Project Existing

## Latar Belakang
`CAF-CURATE-DIFF-01` (fitur content-level diff untuk `curate`) sudah `SUCCESS`,
diimplementasi & diuji di `caf-initiator` sendiri. Task 8-nya (migrasi project
existing) sengaja dipisah jadi ticket ini — bukan bagian dari Definition of
Done fitur tersebut.

Dua project butuh migrasi: `coderium-web-v2` dan `umkm-pos`. Keduanya punya 10
file agent def (`.claude/agents/*.md`) yang sudah dipatch manual di CDR-38
follow-up (nambah instruksi `Status: SUCCESS` ke section `## Retry Logic`),
tapi belum ada manifest sama sekali — semua section bakal terbaca `UNTRACKED`
kalau `curate audit` dijalankan sekarang.

Analisis risiko sudah dilakukan di sesi verifikasi `CAF-CURATE-DIFF-01`
(lihat `verify-report.md` bagian klarifikasi `SYNCABLE_SECTIONS`): selama
urutan **baseline dulu, baru sync** diikuti, tidak ada risiko false
DRIFT/CONFLICT karena isi file saat ini sudah sesuai template terbaru.

## Apa yang Diminta
Jalankan `curate baseline` di kedua repo (`coderium-web-v2`, `umkm-pos`),
verifikasi hasilnya lewat `curate audit` (harus `IN_SYNC` semua, bukan
`UNTRACKED`), commit manifest yang dihasilkan.

**Ini BUKAN sesi coding** — `curate baseline` tidak pernah menulis isi file
(sudah dibuktikan di `CAF-CURATE-DIFF-01` Task 5 test: byte-for-byte
unchanged). Ini murni operasional: jalankan command, verifikasi hasil, commit.

## Acceptance Criteria
- [ ] `coderium-web-v2`: `curate baseline` dijalankan, manifest
      `.caf/.generate-manifest.json` tertulis
- [ ] `coderium-web-v2`: `curate audit` setelahnya melaporkan semua section
      yang di-baseline sebagai `IN_SYNC` (bukan `DRIFT`/`CONFLICT`)
- [ ] `coderium-web-v2`: isi 10 file `.claude/agents/*.md` TIDAK berubah sama
      sekali — dibuktikan `git diff` kosong untuk file-file itu, HANYA
      manifest yang baru (`git status` menunjukkan cuma file manifest baru)
- [ ] `umkm-pos`: 3 acceptance criteria yang sama seperti di atas, repo ini
- [ ] Manifest kedua repo di-commit terpisah dari perubahan lain apapun
- [ ] Kalau ternyata ADA section yang muncul sebagai `DRIFT`/`CONFLICT` (bukan
      `IN_SYNC`) setelah baseline — ini tanda analisis risiko sebelumnya
      keliru untuk kasus tertentu. STOP, jangan auto-sync begitu saja,
      laporkan ke user section mana dan kenapa

## Eksplisit Out of Scope
- Menjalankan `curate sync` setelah baseline — di luar scope ticket ini,
  murni membangun baseline dulu. Kalau audit menunjukkan ada yang perlu
  di-sync (harusnya tidak ada, sesuai analisis risiko), itu keputusan/ticket
  terpisah
- Perubahan apapun ke isi file agent def — `curate baseline` by design tidak
  pernah menulis isi file, kalau sesi eksekusi menemukan kebutuhan mengubah
  isi file untuk alasan apapun, itu di luar scope, STOP dan laporkan
- Perubahan ke `caf-initiator` sendiri — fitur sudah selesai, ticket ini
  murni rollout/operasional