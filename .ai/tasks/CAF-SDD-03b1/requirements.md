# CAF-SDD-03b1 — Kind `validator` dan format `validate-report` (tersembunyi)
Status: APPROVED (revisi 2 setelah NEEDS_HUMAN di T1; keputusan K1 sampai K5 dijawab 12 Okt 2026)
Source: chat (CAF-SDD-SUMMARY.md bagian 3, 10; audit umkm-pos; hasil SDD-03a, 03a2, 02, 02b)
Repo target: `caf-initiator`
Bergantung pada: SDD-03a, 03a2, 02, 02b sudah ter-merge ke main.

## 1. Outcome
Initiator punya kind `validator` lengkap (builder, tools, skill mapping, format `validate-report.md`) yang memvalidasi hasil implementasi terhadap tiap AC di spec, dengan status per AC `PASS | FAIL | UNVERIFIED` dan jenis bukti yang jujur. Kind ini tersembunyi: tidak masuk daftar kandidat scaffold (`buildCandidates()`), tidak tersambung ke pipeline, dan hanya terjangkau dari test sampai tiket penyambungan (03c/04), jadi tidak ada perubahan perilaku bagi pengguna yang sudah ada.

## 2. Scope
In:
- Kind baru `validator` (file `caf-validator.md`) dan masuk ke `KNOWN_KINDS`.
- Template agen `validator`: gerbang verifikasi repo yang sudah dijalankan `qa` hari ini, ditambah validasi per AC dan `validate-report.md`.
- Pemetaan kind ke skill untuk `validator`.
- Penyembunyian dengan tidak memasukkan `validator` ke `buildCandidates()` (keputusan K4a).
- `## Verify Checklist` validator memakai pembangun checklist yang sama dengan agent implementasi, sehingga berisi perintah nyata (bukan TODO seperti `qa`).
- Test, termasuk uji curate sync tanpa DRIFT palsu untuk kind baru.

Out:
- Rename atau penghapusan `qa` (tetap ada, builder tetap beku, 03c).
- Template reviewer spec-aware (03b2) dan command `/caf-plan` (03b3).
- Orchestrator membaca `validate-report.md`, gerbang `validate`, parsing AC (SDD-04).
- Mencabut banner `caf-traceability` (menunggu uji dispatch nyata validator).
- Fallback `implementation` untuk kind tak dikenal.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: `qa` tetap di `KNOWN_KINDS`, builder dan 15 golden `frozen-kinds` tidak berubah; snapshot `mono-pnpm.json` tidak berubah (validator tersembunyi, jadi scaffold default tidak menulisnya). Bila snapshot harus berubah, STOP `NEEDS_HUMAN`.
- Constraint: test lama hanya boleh berubah pada daftar literal dan hitungan yang mencantumkan kind: `sdd02-planner-spec` (daftar kind pemetaan `caf-traceability`), `retry-logic-role-aware` (menambah `validator` ke `CONTRACT_KINDS`), `skills-templates`, `skills-section`, `skills-pointer`, dan `kind-guard` (daftar dan jumlah `KNOWN_KINDS`). Tidak ada perubahan asersi selain itu; tabel literal `tools` validator ditulis di test baru.
- Constraint: validator tidak punya tool `Edit` dan tidak boleh mengubah kode, test, spec, atau `verify-report.md`; satu-satunya berkas yang ditulisnya adalah `validate-report.md`.
- Constraint: validator tidak menjalankan perintah sembarang. Perintah yang boleh: yang ada di `## Verify Checklist` repo dan inspeksi git baca-saja (`git diff`, `git log`, `git status`, `git show`).
- Assumption A1: branch `ai-agent/CAF-SDD-03b1` dari main terbaru.
- Assumption A2: tools validator = Read, Write, Bash (sama dengan `qa`, tanpa Edit).
- Assumption A3: status keseluruhan `PASS` bila tidak ada AC `FAIL` dan semua gerbang lulus; jumlah dan daftar AC `UNVERIFIED` wajib tertulis di laporan. Kebijakan akhir pembacaan oleh orchestrator diputuskan di SDD-04.
- Finding: `## Verify Checklist` agent `qa` hari ini hanya dua baris TODO, jadi `qa` tidak punya gerbang nyata untuk diwarisi. Validator mengambil checklist dari pembangun yang sama dengan agent implementasi; tabel keputusan section hasil T1 menjadi dasar section lainnya.
- Finding: tiket sebelumnya menyebut `qa-report.md`; format yang dibaca orchestrator hari ini memakai `Status: PASS` ter-anchor. `validate-report.md` mempertahankan baris `Status:` yang sama bentuknya agar SDD-04 mudah.

## 4. Decisions Already Made
- Nama berkas `caf-validator.md` dan `validate-report.md`; `qa-report.md` tidak disentuh.
- Status per AC: `PASS` hanya untuk bukti `automated-test` atau `command` yang benar-benar dijalankan dan cocok; `FAIL` bila dijalankan dan bertentangan; `UNVERIFIED` untuk `manual`, `build-only`, bukti tanpa nama test, test yang tidak mengimpor kode produksi, perintah di luar daftar yang boleh, atau AC tanpa bukti.
- Jenis bukti: `automated-test`, `command`, `build-only`, `manual`, `none` (sama dengan `verify-report`).
- Validator tersembunyi sampai SDD-04.
- Retry bukan urusan validator; ia hanya melapor.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Bagaimana mekanisme tersembunyi bekerja hari ini (apa yang dilakukan `HIDDEN_CANDIDATE_KINDS`, apakah ada jalur memilih kind tersembunyi secara eksplisit)? T1 memetakan; bila tidak ada jalur eksplisit, builder cukup terjangkau dari test dan hal itu dicatat. — Answer:
- Q-2 [NON-BLOCKING] Section mana dari `qa` yang dibawa apa adanya, diubah, atau dibuang? T1 memetakan; bila ada section qa yang tidak jelas nasibnya, pertahankan dan catat. — Answer:

## 6. Acceptance Criteria
- AC-1: When `detectKind` dipanggil untuk `caf-validator.md`, then hasilnya `validator`, bukan `implementation`; dan `KNOWN_KINDS` memuat `validator` sekaligus semua 12 kind sebelumnya (termasuk `qa`). Verify: automated test.
- AC-2: When frontmatter agent `validator` dirender, then `tools:` sama persis dengan tabel literal di test baru: Read, Write, Bash (tanpa Edit). Verify: automated test.
- AC-3: When daftar kandidat scaffold (`buildCandidates()`) dan `caf-init scaffold agents` default dijalankan (kedua fixture, semua mode), then `validator` tidak muncul sebagai kandidat dan `caf-validator.md` tidak ditulis; `HIDDEN_CANDIDATE_KINDS` tetap subset dari `KNOWN_KINDS`; snapshot `mono-pnpm.json` tidak berubah. Verify: automated test; `git diff --stat` tidak menyentuh `test/fixtures/snapshots/`.
- AC-4: When agent `validator` dirender (fixture `mono-pnpm` dan `single-nuxt`), then isinya menyatakan: membaca `requirements.md`, `tasks.md`, `verify-report.md`; menjalankan gerbang verifikasi repo; menilai tiap AC dengan tiga status dan lima jenis bukti; perintah yang boleh dijalankan; dan tidak mengedit kode, test, spec, atau `verify-report.md`. Verify: automated test atas token-token tersebut.
- AC-5: When agent `validator` dirender, then format `validate-report.md` di dalamnya memuat baris `Status: PASS | FAIL | NEEDS_HUMAN` ter-anchor, baris jumlah AC `UNVERIFIED` beserta daftarnya, tabel per AC (kolom AC, Status, Jenis bukti, Bukti), dan bagian gap gerbang verifikasi; bentuk baris `Status:` cocok dengan regex yang dipakai untuk `qa-report` hari ini. Verify: automated test.
- AC-6: When aturan penilaian di agent `validator` dibaca, then: `manual` dan `build-only` menjadi `UNVERIFIED`; test tanpa impor kode produksi tidak dihitung sebagai bukti; AC tanpa baris di `verify-report.md` menjadi `UNVERIFIED` dengan alasan "no evidence reported" (bukan `FAIL`); AC yang dijalankan dan bertentangan menjadi `FAIL` dengan output teramati. Verify: automated test atas teks hasil render.
- AC-7: When pemetaan kind ke skill dibaca, then `validator` memuat `caf-traceability` dan skill yang dipetakan ke `qa` hari ini; `## Skills` agent validator tidak berisi pointer ke `caf-traceability` selama banner DRAFT ada; pointer ke skill non-DRAFT mengikuti aturan yang sudah ada. Verify: automated test.
- AC-8: When agent `validator` dirender, di-baseline, lalu `curate sync` dijalankan (dry-run dan write) pada salinan fixture `mono-pnpm` dan `single-nuxt`, then semua section ber-track berstatus `IN_SYNC` dan file byte-identik. Section `Input` validator berbasis kind saja, tanpa daftar app (keputusan K5). Verify: automated test.
- AC-9: When builder `qa` dan golden `frozen-kinds` diperiksa, then 15 golden tidak berubah, `qa` tetap dirender dan disinkronkan seperti sebelumnya, dan test 03a2 (false-drift) lulus tanpa diubah. Verify: command: `npm test` | expect: exit 0; `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/` maupun `test/fixtures/snapshots/`.
- AC-10: When `npm test` dijalankan, then semua test lulus dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0.
- AC-11: When agent `validator` dirender (kedua fixture), then `## Verify Checklist`-nya memuat perintah verifikasi nyata yang sama dengan checklist agent implementasi untuk fixture itu (gap ditulis sebagai baris TODO gap, bukan gerbang palsu), dan output agent implementasi tidak berubah (golden dan test lama utuh). Verify: automated test yang membandingkan perintah checklist validator dengan checklist implementer.
- AC-12: When CLAUDE.md dan README dibaca, then validator didokumentasikan sebagai kind tersembunyi (tidak masuk kandidat scaffold) sampai tiket penyambungan, format `validate-report.md` tercantum, dan tidak ada klaim yang bertentangan. Verify: manual: baca bagian terkait.