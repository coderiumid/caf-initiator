# Ticket: CAF-CURATE-DIFF-01 — Content-Level Diff untuk `curate`

## Latar Belakang
Lihat `open-items.md` — `curate audit`/`sync` saat ini cuma cek presence heading
section (mis. `## Retry Logic`), bukan isi di bawahnya. Akibatnya perbaikan
konten section yang sudah pernah ter-generate tidak pernah ter-propagate ke
project yang sudah pakai `caf-initiator` sebelumnya, bahkan lewat `curate sync`.
Dibuktikan 2 kasus independen di `coderium-web-v2` dan `umkm-pos` (CDR-38
follow-up, sudah di-workaround manual, bukan dibenerin di sumbernya).

## Apa yang Diminta
`curate audit` dan `curate sync` bisa membedakan 3 kondisi per section (bukan
cuma "ada"/"tidak ada"):
1. **In sync** — isi section sama dengan template kanonik → tidak perlu aksi
2. **Drift murni** (template berubah, file belum pernah disentuh user sejak
   digenerate) → aman di-sync otomatis
3. **Conflict** — file sudah diedit manual oleh user (customization yang
   disengaja) → JANGAN auto-overwrite, laporkan sebagai conflict yang perlu
   keputusan manual

Prinsip inti (non-negotiable, sesuai "no auto-clear, no force-overwrite without
explicit decision" yang sudah dipegang project ini): **kondisi #3 tidak boleh
pernah ke-overwrite otomatis**, sekalipun `curate sync` dijalankan tanpa flag
apapun. Kalau desain akhirnya nggak bisa menjamin ini dengan pasti, prioritas
keamanannya lebih tinggi dari kenyamanan — mending drift #2 juga diperlakukan
konservatif (dilaporkan, bukan auto-sync) daripada resiko nimpa customization.

## Acceptance Criteria
- [ ] `curate audit` melaporkan status per section (bukan cuma per file):
      in-sync / drift / conflict, dengan section mana persisnya
- [ ] `curate sync` otomatis memperbaiki section berstatus drift murni, TANPA
      pernah menyentuh section berstatus conflict
- [ ] Section berstatus conflict dilaporkan eksplisit ke user (section mana,
      file mana) dengan opsi manual (bukan auto-merge, bukan auto-skip diam-diam
      — user harus tau ada conflict yang butuh perhatian)
- [ ] Backward compatible: project yang sudah ada sebelum fitur ini (belum
      punya manifest/tracking) tidak rusak/salah-flag saat pertama kali jalanin
      `curate audit` versi baru — lihat STOP item #2
- [ ] Tidak mengubah behavior `curate` untuk kasus section belum pernah ada
      sama sekali (perilaku existing tetap: nambah section baru)

## Keputusan Final (dikonfirmasi user, 2026-09-03)
Rekomendasi draft di `design.md` diambil apa adanya sebagai keputusan final
untuk keempat STOP item:
1. **Lokasi manifest**: file terpisah `.caf/.generate-manifest.json`
2. **Strategi backfill**: Opsi (a) — semua section project existing di-flag
   `UNTRACKED`, user review manual dulu via `curate baseline`, bukan menebak
   dari timestamp git
3. **Granularitas hash**: per section penuh (bukan per-paragraf)
4. **UX conflict report**: print ke terminal ala `git status` (tidak perlu
   command `curate diff` file/patch terpisah — Task 6 di `tasks.md` jadi
   tidak perlu implementasi tambahan)

## Pertanyaan Terbuka (STOP items — SUDAH TERJAWAB, lihat "Keputusan Final" di atas)

1. **Lokasi & format manifest tracking.** Draft usulan (lihat `design.md`):
   file tersembunyi `.caf/.generate-manifest.json` per project, isinya hash
   per section per file pada saat digenerate/di-sync terakhir. Perlu dikonfirmasi:
   apakah lokasi ini oke, atau ada preferensi lain (mis. inline HTML comment
   marker per section di dalam file `.md`-nya sendiri, supaya tidak perlu file
   terpisah yang bisa hilang/tidak ke-commit)?

2. **Strategi backfill untuk project existing** (`coderium-web-v2`, `umkm-pos`,
   dan project lain yang sudah pakai `caf-initiator` sebelum fitur ini ada —
   mereka tidak punya manifest sama sekali). Opsi:
   - (a) Treat semua section di project existing sebagai "unknown state" —
     `curate audit` pertama kali WAJIB lapor semuanya sebagai "perlu audit
     manual dulu", user review satu-satu untuk nentuin baseline manifest,
     baru setelah itu tracking otomatis berjalan normal ke depannya
   - (b) Asumsikan isi section saat ini adalah "sesuai versi template pada
     saat file itu terakhir di-generate" (ambil dari git log timestamp file
     vs git log template), lalu hash itu jadi baseline — **berisiko salah**
     kalau ternyata file itu memang sudah pernah di-custom manual sebelum
     fitur tracking ini ada (kasus persis yang barusan ditemukan di
     `umkm-pos` commit `a2544e2`)
   - Rekomendasi sementara: (a), karena (b) bisa mengulang masalah yang sama
     dari sisi lain (asumsi keliru jadi baseline yang salah). Tapi ini
     keputusan user, bukan default otomatis.

3. **Granularitas hash** — per section penuh (`## Retry Logic` sampai heading
   berikutnya), atau per-paragraf di dalam section? Section penuh lebih simpel
   tapi kurang presisi (1 kalimat berubah = seluruh section keflag drift/
   conflict, padahal mungkin cuma sebagian kecil). Rekomendasi sementara:
   mulai dari section penuh (lebih sederhana, cukup untuk kasus CDR-38), buka
   kemungkinan granularitas lebih halus di iterasi berikutnya kalau ternyata
   section-nya besar dan sering false-positive conflict.

4. **UX saat conflict terdeteksi** — `curate audit` cukup print daftar
   conflict ke terminal, atau perlu generate file diff terpisah (`*.patch`)
   yang bisa direview manual? Yang mana lebih sesuai alur kerja Ganjar
   sehari-hari (mengingat pola "diff-first review before commit" yang selalu
   dipakai)?

## Eksplisit Out of Scope
- Auto-merge / auto-resolve conflict — tidak akan pernah jadi bagian dari
  fitur ini, sesuai prinsip no-force-overwrite
- Migrasi otomatis 20 file yang sudah dipatch manual di CDR-38 follow-up ke
  sistem manifest baru — itu langkah terpisah setelah fitur ini jadi, bukan
  bagian dari implementasi fitur ini sendiri
- Perubahan pada `caf-orchestrator` (parser `report-reader.ts` dst) — root
  cause CDR-38 sudah selesai di sisi vocabulary, ticket ini murni soal
  mekanisme `curate` di `caf-initiator`