# CAF-FIX-01 — Tasks
Repo: `caf-initiator`. Baca `requirements.md` di folder ini dulu. Jangan menebak: bila pola kode tidak jelas, ikuti test existing dan catat di `verify-report.md`.

## Aturan umum
- Branch: `ai-agent/CAF-FIX-01`, dari main terbaru. Working tree bersih. SDD-03b1 harus sudah ada di main (cek `git log`); bila belum, STOP `NEEDS_HUMAN`.
- Berkas yang di-generate tidak boleh berubah satu byte pun (snapshot, 15 golden `frozen-kinds`, golden `pre-sdd02`, `pre-sdd02b`). Bila harus berubah, STOP `NEEDS_HUMAN`.
- Test dulu (merah), baru perbaikan. Perbaikan di sumber deteksi, bukan di pemakai.
- Bila sebuah AC mustahil atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti; jangan mengubah spec.
- Tidak ada push, PR, atau merge.

## Tasks
- [ ] T1 (Q-1, AC-4): Audit baca-saja. Catat di `verify-report.md`: (a) di mana `detectStack` membaca direktori atau menggabungkan hasil async dan kenapa urutannya bisa berubah; (b) urutan app yang tertanam di snapshot dan golden; (c) semua tempat lain di `src/` yang membaca direktori atau glob tanpa urutan pasti dan hasilnya memengaruhi berkas yang di-generate.
- [ ] T2 (AC-1): Tulis test merah: simulasikan listing direktori terbalik dan satu urutan acak tetap (mock/stub pembaca direktori), bandingkan dengan urutan normal.
- [ ] T3 (AC-2): Perbaiki di sumber sehingga urutan stabil sesuai keputusan Q-1. Test AC-1 menjadi hijau; tambah test pengulangan (minimal 50 kali) pada tiap fixture.
- [ ] T4 (AC-3): Jalankan `npm test` tiga kali berturut-turut; periksa `git diff --stat`.
- [ ] T5 (AC-5): Tambah invarian di CLAUDE.md.
- [ ] T6: Tulis `verify-report.md` (format Layer 3, bukti per AC dengan nama test atau file:baris; AC `command` dilaporkan sebagai `command`). Catatan: hasil T1(a sampai c), jawaban Q-1, daftar temuan lain, hal tak terduga.

## Docs Tasks
- CLAUDE.md (T5).

## Di luar tugas ini
Mengubah isi keluaran `detectStack` selain urutan, memperbaiki akar masalah lain hasil audit, menghapus pengurutan di `buildValidatorAgent`, perubahan template.