# Tasks: CAF-BASELINE-ROLLOUT-01

> Tidak ada STOP item baru — keputusan desain sudah selesai di
> `CAF-CURATE-DIFF-01`. Ticket ini murni eksekusi + verifikasi per repo,
> dikerjakan berurutan, checkpoint di antara tiap repo (bukan digabung jadi
> satu commit besar lintas 2 repo).

## Task 1 — `coderium-web-v2`: Baseline
- [ ] Baseline check: `git status` bersih sebelum mulai
- [ ] Jalankan `curate baseline` (pakai flag `--dry-run` dulu kalau tersedia,
      lihat outputnya sebelum commit beneran — sesuai pola checkpoint yang
      dipakai di ticket-ticket sebelumnya)
- [ ] Jalankan `curate audit` — tampilkan output lengkap, konfirmasi semua
      section berstatus `IN_SYNC`
- [ ] `git diff` — konfirmasi HANYA file manifest baru yang muncul, TIDAK ADA
      perubahan di 10 file `.claude/agents/*.md`
- [ ] **Checkpoint wajib**: tampilkan hasil ke user, tunggu konfirmasi
      sebelum commit

## Task 2 — `coderium-web-v2`: Commit
- [ ] Setelah dikonfirmasi user: commit manifest saja
      (`git add .caf/.generate-manifest.json && git commit -m "chore: baseline agent definitions for content-level drift tracking (CAF-BASELINE-ROLLOUT-01)"`)

## Task 3 — `umkm-pos`: Baseline
- [ ] Ulangi Task 1 persis, di repo `umkm-pos`
- [ ] Perhatian khusus: 3 file (`caf-frontend.md`, `caf-qa.md`,
      `caf-reviewer.md`) yang riwayatnya sempat disentuh commit `a2544e2`
      SETELAH fix template landing tapi tetap nggak ke-patch waktu itu (lihat
      audit CDR-38 sebelumnya) — pastikan isinya SEKARANG memang sudah benar
      (sudah dipatch manual belakangan) sebelum di-baseline. Kalau ternyata
      ada yang KELEWAT belum dipatch, STOP, jangan baseline section yang
      salah sebagai "benar" — laporkan ke user dulu.
- [ ] **Checkpoint wajib**: sama seperti Task 1

## Task 4 — `umkm-pos`: Commit
- [ ] Sama seperti Task 2, repo ini

## Task 5 — Verifikasi Akhir Lintas-Repo
- [ ] Ringkasan: kedua repo sudah punya manifest, `curate audit` bersih
      (`IN_SYNC` semua) di keduanya
- [ ] Konfirmasi eksplisit: tidak ada satupun isi file `.claude/agents/*.md`
      yang berubah di kedua repo sepanjang sesi ini (`git log -p` untuk
      commit Task 2 & 4, pastikan cuma manifest yang muncul di diff)

## Definition of Done
- Task 1-5 selesai, kedua repo commit manifest terpisah
- Tidak ada satupun `DRIFT`/`CONFLICT` ter-flag setelah baseline (kalau ada,
  ticket ini otomatis jadi `NEEDS_HUMAN`, bukan `SUCCESS`, sesuai acceptance
  criteria di `requirements.md`)
- Isi 10+10 file agent def terbukti byte-for-byte tidak berubah