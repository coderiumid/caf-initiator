---
name: caf-spec
description: Format dan aturan menulis requirements.md (spec) untuk ticket CAF. Pakai saat fase Specify/Clarify, sebelum menulis rencana atau tasks.
---

> DRAFT: skill ini belum diuji dispatch nyata di umkm-pos.
> Hapus banner ini hanya setelah uji selesai.
> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.

# caf-spec — menulis requirements.md

Spec = kontrak antara manusia dan agent. Pendek, bisa diuji, tidak menebak.

## Ukuran
- Kedalaman sesuai ukuran ticket. Ticket kecil: setengah halaman. Jangan menambah section kosong; tulis `-` bila memang tidak ada.
- Spec menjawab APA dan KENAPA. Cara (file, fungsi, library) milik `design.md` dan `tasks.md`, bukan di sini.

## Template `.caf/tasks/<ID-atau-slug>/requirements.md`

```markdown
# <judul singkat>
Status: DRAFT | NEEDS_CLARIFICATION | APPROVED
Sumber: <ID ticket atau "chat">

## 1. Hasil Akhir
<1-3 kalimat: apa yang berbeda bagi user/bisnis setelah selesai>

## 2. Scope
Masuk:
- ...
Tidak masuk:
- ...

## 3. Constraint dan Asumsi
- Constraint: ...
- Asumsi: ... (tandai tiap asumsi; asumsi yang berisiko jadi pertanyaan terbuka)

## 4. Keputusan yang Sudah Diambil
- ... (tautkan ADR bila ada: .caf/knowledge/decisions/adr-NNN-*.md)

## 5. Pertanyaan Terbuka
- Q-1 [BLOCKING|NON-BLOCKING] <pertanyaan> — Jawaban: <kosong sampai dijawab>

## 6. Acceptance Criteria
- AC-1: Ketika <kondisi>, maka <hasil yang teramati>. Verifikasi: <tes otomatis | manual: langkah singkat>
- AC-2: ...
```

## Aturan Acceptance Criteria
- Penanda wajib persis `AC-<angka>:` di awal butir (dibaca regex; jangan ganti format).
- Satu perilaku per AC. Teramati dan bisa diuji; tanpa kata subjektif ("cepat", "rapi", "intuitif") kecuali diberi ambang terukur.
- Selalu tulis `Verifikasi:`. Bila tidak ada cara tes otomatis, tulis `manual:` dan langkahnya. Jangan dikosongkan; validator memakainya untuk menandai AC tanpa tes.
- Sertakan jalur gagal dan edge case yang relevan (input kosong, tidak berizin, error jaringan), bukan hanya jalur sukses.
- Ticket yang menyentuh UI: alur layar dan state masuk `flow.md`, AC tetap di sini.

## Aturan Pertanyaan Terbuka
- Cek dulu ticket, kode, ADR, dan `CLAUDE.md`. Jangan bertanya hal yang sudah terjawab di sana.
- Maksimal 5 pertanyaan, diurutkan dari yang paling menentukan. Satu pertanyaan = satu keputusan, dengan opsi dan rekomendasi bila ada.
- BLOCKING = jawabannya mengubah scope atau AC; kerja berhenti sampai dijawab. NON-BLOCKING = ada asumsi aman yang ditulis eksplisit di bagian 3.
- Chat: tanyakan langsung ke user. Ticket via orchestrator: tulis pertanyaan di komentar ticket lalu berhenti.
- Setelah dijawab: isi `Jawaban:`, pindahkan hasilnya ke bagian 4 (Keputusan) atau ubah AC. Jangan menghapus pertanyaannya.

## Spec Disetujui = Kontrak
- Setelah `Status: APPROVED`, jangan ubah tujuan, scope, maupun AC.
- Spec keliru atau mustahil dipenuhi: tulis usulan perubahan di `verify-report.md`; manusia yang memutuskan.

## Cek Sebelum Selesai
1. Enam section ada dan terisi (atau `-`).
2. Setiap AC bernomor unik berurutan dan punya `Verifikasi:`.
3. Tidak ada detail implementasi.
4. Tidak ada tebakan yang tidak ditandai sebagai asumsi atau pertanyaan.
5. AC saling bertentangan atau mustahil: `Status: NEEDS_CLARIFICATION`, jangan lanjut membuat tasks.