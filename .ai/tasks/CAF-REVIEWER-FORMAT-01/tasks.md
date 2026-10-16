# Tasks: CAF-REVIEWER-FORMAT-01

## Task 1 — Investigasi
- [ ] Baca `buildReportFormatSection`/logic Auditor-only di `agent-md.js` —
      pahami pola existing sebelum menambah kind baru
- [ ] Baca `report-reader.ts` — konfirmasi PERSIS regex yang dipakai untuk
      pipeline pra-PR (`ReviewerVerdict`, baris ~54-71) supaya konten baru
      match 100%, bukan cuma "mirip"
- [ ] Baca `buildInitialReviewPrompt()` (`run-pr-review.use-case.ts`) —
      salin PERSIS wording Verdict-nya untuk dipakai di section baru (bukan
      ditulis ulang dari ingatan)
- [ ] Analisis risiko 2-sumber-kebenaran (runtime prompt vs static section)
      — laporkan temuan dan rekomendasi sebelum lanjut Task 2. Kalau
      rekomendasinya "perlu single-source" (pola sama seperti
      `DISCOVERY_ALLOWED_TOOLS`/`DISCOVERY_FOCUS` di
      `CAF-DISCOVERY-SECTIONS-01`), catat itu sebagai perluasan scope yang
      perlu dikonfirmasi user dulu — jangan langsung dikerjakan

## Task 2 — Implementasi
- [ ] `buildReportFormatSection(kind)` — tambah cabang `kind === 'reviewer'`
      di samping `kind === 'auditor'` yang sudah ada
- [ ] Konten: format `review-notes.md` (Ticket, Agent, Verdict, Security
      Audit, Qualitative Review, Verdict Rationale, For Developer — cek
      field lengkap dari `run-pr-review.use-case.ts` prompt), baris Verdict
      match regex persis
- [ ] Kind `auditor` dan kind lain — TIDAK disentuh

## Task 3 — Test
- [ ] Byte-for-byte: kind `auditor` tidak berubah (pola oracle-string-terkunci
      seperti ticket-ticket sebelumnya)
- [ ] Fixture `caf-reviewer.md` tanpa section ini → status "missing"
- [ ] `curate sync` terhadap fixture itu → section ter-insert benar, section
      lain (`Role`/`Scope`/dst) tidak terganggu
- [ ] Test tambahan: konten yang di-generate benar-benar match regex
      `report-reader.ts` — assert langsung terhadap regex yang sama (import
      dari `caf-orchestrator` kalau memungkinkan, atau copy regex persis
      dengan komentar yang jelas menyebut sumbernya kalau tidak bisa
      cross-repo import)
- [ ] Regression: seluruh test suite lama tetap pass

## Task 4 — Dokumentasi
- [ ] README `caf-initiator` — update tabel section tracking, `Report
      Format` sekarang bukan cuma "Auditor-only" tapi juga berlaku untuk
      `reviewer`
- [ ] `open-items.md` — catat observasi Task 1 (silent-default lenient
      parser) sebagai item terpisah kalau belum ada

## Definition of Done
- `caf-reviewer.md` untuk kind `reviewer` sekarang generate section
  `Report Format` dengan Verdict format yang match parser
  `caf-orchestrator` persis
- Kind `auditor`/lainnya byte-for-byte tidak berubah
- Semua test pass
- Tidak ada perubahan ke `coderium-web-v2`/`umkm-pos`/`caf-orchestrator` di
  ticket ini