# Tasks: CAF-DISCOVERY-SECTIONS-01

> STOP item sudah terjawab (lihat `requirements.md`). Konten kanonik sudah
> final. Langsung eksekusi, checkpoint di titik regresi seperti biasa.

## Task 1 — Investigasi Struktur Builder Existing
- [x] Baca `buildToolsSection`/`buildInputSection`/`buildOutputSection`
      (`agent-md.js`) — pahami pola percabangan `kind` yang sudah ada
      (`buildRetryLogicSection(kind)` dari `CAF-RETRYLOGIC-01` sebagai
      referensi pola)
- [x] Cek `discovery-commands.js` (`discoveryAgentMd()`) — apakah 3 section
      ini di-generate dari sana (bukan `buildAgentMd`), sama seperti
      `Retry Logic` sebelumnya ternyata sumbernya beda dari dugaan awal.
      **Jangan asumsikan sumbernya sama seperti Delivery — verifikasi dulu.**
- [x] Putuskan: apakah `Working Pattern (PIV)` wording alignment (item
      opsional) dikerjakan di ticket ini juga, atau dipisah — laporkan
      rekomendasi ke user sebelum lanjut kalau areanya tumpang tindih dengan
      Task 2-3

## Task 2 — Implementasi Builder Role-Aware
- [x] `Allowed Tools`, `Input`, `Output` — masing-masing bercabang untuk kind
      Discovery (`pm`, `ux-designer`), pakai konten kanonik dari
      `requirements.md` PERSIS (copy-paste, bukan ditulis ulang dari ingatan
      — supaya tidak ada drift kecil dari teks yang sudah dikonfirmasi)
- [x] `caf-pm`: Allowed Tools + Output berbeda dari `caf-ux-designer` (Input
      beda juga) — jangan asumsikan generik, sesuai teks yang sudah dikonfirmasi
      per-agent
- [x] Kind lain (Delivery, `auditor`, dst) — TIDAK BOLEH berubah sama sekali

## Task 3 — Lepas Guard
- [x] Update `DISCOVERY_GUARDED_SECTIONS` — hapus `Allowed Tools`/`Input`/
      `Output` dari daftar (builder sudah benar, tidak perlu diproteksi lagi)
- [x] `Retry Logic` tetap TIDAK di-guard (sudah benar sejak
      `CAF-RETRYLOGIC-01`) — pastikan tidak ada perubahan di situ
- [x] Update komentar di kode menjelaskan kenapa guard dilepas (builder
      sekarang role-aware, referensi ke ticket ini)

## Task 4 — Test
- [x] Byte-for-byte regression: seluruh kind Delivery + `auditor` tidak
      berubah sama sekali (pola sama seperti `CAF-RETRYLOGIC-01`/
      `CAF-DEVOPS-KIND-01` — pakai oracle string yang di-lock, bukan
      di-generate ulang dari builder)
- [x] Fixture `caf-pm.md`/`caf-ux-designer.md` dengan konten sesuai builder
      baru → `curate audit` = `IN_SYNC` untuk 3 section ini
- [x] Regression guard: fixture dengan konten LAMA (generic TODO fallback,
      kondisi sebelum fix) → `DRIFT`, dan `curate sync` MEMPERBAIKI ke versi
      Discovery yang benar (bukan Delivery) — pembuktian bahwa unguard ini
      aman, bukan cuma "tidak error"
- [x] Jalankan seluruh test suite sebelumnya (57 test) — 100% pass

## Task 5 — Dokumentasi
- [x] `open-items.md`/referensi ticket — tandai `CAF-DISCOVERY-SECTIONS-01`
      selesai (3 section wajib; catat status item opsional `Working Pattern`
      terpisah kalau tidak dikerjakan di sini)
- [x] README/CLAUDE.md — update tabel section tracking, `Allowed Tools`/
      `Input`/`Output` sekarang role-aware (bukan lagi guarded) untuk kind
      Discovery

## Definition of Done
- 3 section menghasilkan konten benar untuk `pm`/`ux-designer`, sesuai teks
  yang dikonfirmasi di `requirements.md`
- Guard dilepas, `curate sync` sekarang bisa memperbaiki file Discovery yang
  masih rusak (termasuk yang di 2 repo produksi, di sesi terpisah nanti)
- Kind lain byte-for-byte tidak berubah
- 57 test lama + test baru — 100% pass
- Tidak ada perubahan ke `coderium-web-v2`/`umkm-pos` di ticket ini