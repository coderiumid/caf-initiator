# CAF-FIX-01 — Urutan app dari `detectStack` harus deterministik
Status: APPROVED (disetujui Ganjar, 12 Okt 2026)
Source: chat (temuan tak terduga #1 di verify-report CAF-SDD-03b1)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-03b1 sudah ter-merge ke main.

## 1. Outcome
`detectStack` mengembalikan daftar app dengan urutan yang sama di setiap pemanggilan pada direktori yang sama, tidak bergantung pada urutan listing direktori sistem berkas. Berkas yang di-generate tidak berubah antar run dan tidak ada DRIFT palsu akibat urutan.

## 2. Scope
In:
- Menemukan sumber ketidakstabilan urutan di deteksi stack dan memperbaikinya di sumbernya.
- Test yang membuktikan determinisme, termasuk di bawah urutan listing direktori yang dibalik atau diacak.
- Audit baca-saja atas tempat lain yang membaca direktori atau glob tanpa urutan pasti dan hasilnya memengaruhi berkas yang di-generate.
- Catatan invarian di CLAUDE.md.

Out:
- Mengubah isi atau format keluaran `detectStack` selain urutan.
- Memperbaiki tempat lain hasil audit yang akarnya berbeda (dilaporkan sebagai temuan).
- Menghapus pengurutan di `buildValidatorAgent` (tetap sebagai pengaman).
- Perubahan template apa pun.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: semua berkas yang di-generate untuk fixture yang ada tetap byte-identik: `test/fixtures/snapshots/mono-pnpm.json`, 15 golden `frozen-kinds`, golden `pre-sdd02` dan `pre-sdd02b`. Urutan stabil yang dipilih harus sama dengan urutan yang tertanam di berkas-berkas itu; bila urutan di berkas-berkas itu saling bertentangan, STOP `NEEDS_HUMAN`.
- Constraint: tidak ada perubahan test lama selain yang terbukti bergantung pada urutan acak.
- Assumption A1: branch `ai-agent/CAF-FIX-01` dari main terbaru.
- Assumption A2: sumber ketidakstabilan adalah urutan listing direktori atau hasil async yang digabung tanpa urutan. T1 membuktikan atau membantahnya.
- Finding: tiket 03b1 menemukan dua pemanggilan `detectStack` pada direktori yang sama bisa mengembalikan urutan app berbeda dan membuat render validator goyah sekali.

## 4. Decisions Already Made
- Perbaikan di sumber deteksi, bukan menambal di tiap pemakai.
- Urutan yang dipilih mengikuti apa yang sudah tertanam di snapshot dan golden (bukan urutan yang kita anggap lebih rapi).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Urutan stabil apa yang cocok dengan snapshot dan golden (mis. urutan path, urutan deklarasi workspace)? T1 membaca berkas-berkas itu dan memutuskan; bila tidak ada urutan tunggal yang cocok, STOP `NEEDS_HUMAN`. — Answer:

## 6. Acceptance Criteria
- AC-1: When `detectStack` dipanggil pada fixture dengan urutan listing direktori disimulasikan terbalik (dan satu urutan acak tetap), then sebelum perbaikan hasilnya berbeda dari urutan normal (test gagal terlebih dulu). Verify: automated test (merah sebelum perbaikan).
- AC-2: When `detectStack` dipanggil berulang (minimal 50 kali) pada tiap fixture monorepo dan single, serta di bawah urutan listing terbalik dan acak, then hasilnya identik di semua pemanggilan dan sama dengan urutan yang tertanam di snapshot. Verify: automated test.
- AC-3: When `npm test` dijalankan sebanyak tiga kali berturut-turut, then hasilnya sama dan semua lulus, tanpa perubahan pada snapshot dan golden. Verify: command: `npm test` | expect: exit 0 pada ketiga run; `git diff --stat` tidak menyentuh `test/fixtures/`.
- AC-4: When audit selesai, then `verify-report.md` mendaftar semua tempat lain yang membaca direktori atau glob tanpa urutan pasti dan memengaruhi berkas yang di-generate, dengan status masing-masing (aman, diperbaiki, temuan). Verify: manual: baca daftar di `verify-report.md`.
- AC-5: When CLAUDE.md dibaca, then ada invarian bahwa keluaran deteksi stack berurutan deterministik dan tidak boleh bergantung pada urutan listing sistem berkas. Verify: manual: baca bagian terkait.