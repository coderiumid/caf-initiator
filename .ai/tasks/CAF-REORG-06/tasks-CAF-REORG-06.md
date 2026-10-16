## Ticket: CAF-REORG-06
## Pola Kerja: PIV, retry max 3x per task verify

---

### PLAN — investigasi semua 4 AC dulu, jangan implement apapun

1. **AC1**: cek apakah `caf-initiator` generate `.gitignore` project atau cuma
   append-to-existing. Cari titik kode yang relevan.

2. **AC2**: konfirmasi lokasi persis `KNOWN_ROLES` (`read-agent-roster.js`) dan
   `ARTIFACT_BY_ROLE` (`agent-handoff-md.js`), dan artifact apa yang seharusnya jadi value
   buat `pm`/`ux-designer` (cross-check ke `CAF.md` Layer 3 discovery structure).

3. **AC3**: baca struktur `PATTERN_CATEGORIES` yang ada sekarang, rancang pendekatan
   suffix-based detection yang generic (bukan hardcode NestJS). Tuliskan rancangan
   singkat sebelum implement.

4. **AC4**: baca isi asli `reference-docs.js` — apa persis yang ditulis ke tiap file
   `docs/`. Bandingkan dengan fungsi `INDEX.md` yang udah ada. Simpulkan: redundant
   (hapus behavior nulis) atau ada value yang perlu dipindah (bukan dihapus)?

5. **STOP, laporkan hasil investigasi semua 4 AC** sebelum implement apapun. Terutama
   AC3 (rancangan pattern-matching) dan AC4 (kesimpulan redundant/ada-value) — ini dua
   yang butuh keputusan sebelum lanjut.

---

### IMPLEMENT (setelah PLAN dikonfirmasi per-AC — bisa mulai duluan buat AC yang gak
### ambigu sambil nunggu keputusan AC3/AC4 kalau perlu)

6. AC1: implement `.gitignore` pattern + addendum ke `umkm-pos`
7. AC2: tambah `pm`/`ux-designer` ke `KNOWN_ROLES` dan `ARTIFACT_BY_ROLE`
8. AC3: implement sesuai rancangan yang dikonfirmasi
9. AC4: implement sesuai keputusan yang dikonfirmasi

---

### VERIFY

10. AC1: scratch test — generate project baru, buat beberapa ticket dummy di
    `.caf/tasks/`, konfirmasi `git status` cuma nampilin `README.md` yang ke-track,
    subfolder ticket di-ignore
11. AC2: scratch test — jalankan `workflow()` untuk role `pm`/`ux-designer`, konfirmasi
    artifact yang benar ke-resolve, gak fallback salah
12. AC3: verifikasi ke `umkm-pos` nyata — golden-examples regenerate, konfirmasi
    kategori Controller/Repository yang sebelumnya kelewat sekarang kedeteksi
13. AC4: verifikasi sesuai keputusan — kalau dihapus, konfirmasi `docs/` gak lagi
    ketulisan pas generate baru; kalau dipindah, konfirmasi isinya ke-preserve di lokasi
    baru dan `INDEX.md` masih berfungsi normal
14. Regression check: `caf-init audit` di scratch hasil AC1-AC4, pastikan 0 gap wajib
    baru yang muncul dari perubahan ini

Retry max 3x per item verify gagal.

---

### Eksplisit TIDAK termasuk checkpoint ini
- UX redesign `caf-init`
- `caf-orchestrator-cms`
- Investigasi duplicate jobId
- Log cosmetic prefix `caf-orchestrator`