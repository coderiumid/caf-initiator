## `curate` audit/sync tidak mendeteksi drift konten dalam section yang sudah ada

**Ditemukan:** 2026-09-03, selama investigasi CDR-38 (status vocabulary mismatch
`PASS`/`DONE`/`OK` vs `SUCCESS` di `verify-report.md`).

**Masalah:**
`caf-initiator curate` (baik `--audit-only` maupun `--sync-only`) memvalidasi
kepatuhan Layer 1-4 di level **presence-check per section** — mengecek apakah
sebuah heading (mis. `## Retry Logic`) ada di file target, bukan apakah ISI di
bawah heading itu sesuai dengan versi kanonik di template. Akibatnya, begitu
sebuah section pernah ter-generate sekali, perbaikan konten section itu di
template `caf-initiator` (misal commit `66fa46b` — nambah instruksi `Status:
SUCCESS` yang sebelumnya tidak ada) **tidak pernah ter-propagate** ke file yang
sudah digenerate sebelumnya, bahkan lewat `curate sync` sekalipun.

**Bukti konkret (2 kasus independen):**
1. `coderium-web-v2` — `curate --audit-only` melaporkan `caf-frontend.md` dkk
   "already in sync" walau section `## Retry Logic`-nya masih versi lama (tidak
   ada instruksi `SUCCESS`). `curate --sync-only --dry-run` → `0 file(s) updated`.
2. `umkm-pos` — 3 file (`caf-frontend.md`, `caf-qa.md`, `caf-reviewer.md`)
   disentuh commit `a2544e2` ("update: caf agents") pada 2026-09-02 22:00 WIB —
   **setelah** fix template `66fa46b` landing (20:02 WIB) — tapi hasil sync-nya
   tetap tidak menambahkan instruksi `SUCCESS`. Ini membuktikan mekanisme sync
   yang dipakai (kemungkinan `curate`) memang skip section yang sudah eksis,
   terlepas dari apakah isinya sudah ketinggalan zaman.

**Dampak:**
- Perbaikan template tidak reliable ter-propagate ke project yang sudah
  digenerate — bertentangan dengan asumsi "Generator fixes don't auto-propagate,
  **tapi bisa di-sync manual pakai `curate`**". Realitanya, `curate` tidak
  menutup gap ini untuk perubahan konten dalam section existing.
- 20 file agent def (10 di `coderium-web-v2`, 10 di `umkm-pos`) harus dipatch
  manual sebagai workaround (lihat: sesi patch CDR-38 follow-up).
- Risiko berulang: setiap kali template diperbaiki ke depan (bukan cuma section
  baru, tapi perbaikan isi section lama), masalah yang sama akan terjadi lagi
  di semua project yang sudah digenerate sebelumnya, tanpa terdeteksi otomatis.

**Rekomendasi arah fix (belum didesain detail):**
`curate audit`/`sync` perlu content-level diff per section — bandingkan isi
section (bukan cuma heading presence) antara file target dan versi kanonik di
template, lalu laporkan/patch section yang isinya menyimpang. Kemungkinan
pendekatan: hash atau versi per section di template, dibandingkan dengan
marker/comment tersembunyi di file yang digenerate (mirip mekanisme
`SYNCABLE_SECTIONS` yang sudah ada untuk kasus lain) — supaya `curate` bisa
bedakan "section belum pernah ada" vs "section ada tapi kontennya beda dari
template" vs "section ada dan sengaja di-custom manual oleh user" (kasus
ketiga ini penting: sync tidak boleh overwrite customization yang disengaja).

**Status:** Belum dikerjakan. Dilaporkan sebagai gap terpisah dari fix CDR-38
(yang sudah selesai lewat manual patch). Butuh desain terpisah sebelum masuk
implementasi — minimal perlu diputuskan dulu bagaimana `curate` membedakan
"drift yang perlu di-sync" vs "customization yang disengaja user", supaya
tidak jadi destructive-overwrite tanpa keputusan eksplisit (konsisten dengan
prinsip "no auto-clear, no force-overwrite without explicit decision").