# CAF-SDD: progres dan backlog (per 16 Okt 2026, pagi)

Konteks: adopsi Spec-Driven Development di CAF mengikuti CAF-SDD-SUMMARY.md. Eksekusi per tiket: requirements.md dan tasks.md ditulis konsultan, Claude Code mengeksekusi di `caf-initiator` (atau `caf-orchestrator`), Ganjar mereview, push, dan merge.

## Tiket di caf-initiator
| Tiket | Isi | Status |
|---|---|---|
| SDD-01 | skill `caf-spec` (lahir DRAFT) | selesai, di main |
| 03a | jaring pengaman kind lama, fix `package-scripts` | selesai, di main |
| 03a2 | akar false DRIFT di `curate sync`, camelCase watch | selesai, di main |
| 02 | planner baru, format verify-report, skill `caf-traceability` (DRAFT) | selesai, di main |
| 02b | `caf-spec` v3, bukti `command`, `caf-traceability` v2 | selesai, di main (c92ea57) |
| 03b1 | kind `validator` tersembunyi + `validate-report` | selesai, di main |
| FIX-01 | urutan app `detectStack` deterministik | selesai, di main |
| 03b2 | reviewer spec-aware | selesai, di main |
| 03b3 | `/caf-plan` (tersembunyi), `/caf-review` dan `/caf-fix-review` spec-aware | selesai, di main |
| 03c1 | berhenti men-scaffold 5 agent dan 8 command yang dibuang; `implementer` tetap sampai 03c3 | selesai, di main (8b30ec8) |
| 02c | banner `caf-spec` dicabut (77 baris, sha256 b8ba383c…98d0), pointer planner, planner dapat Glob/Grep, dua aturan `## Output` | selesai, di main (43ac420) |
| 03d | frontend, backend, implementer spec-aware (`## Output`) | selesai, di main |
| 02d | planner lebih tegas, `curate audit` memberi peringatan `tools:` ≠ template / pointer skill hilang | selesai, di main |
| 02e | planner membaca apa yang ia klaim, tanpa menunda atau menebak; `Assumption A-n:`; `## Coverage` wajib | selesai, di main; teruji di umkm-pos (Uji 7) |
| 03e | validator menjalankan perintah `Verify: command:` dari spec APPROVED; usulan spec validator = baris `Proposed Spec Changes:` di `### Notes` `validate-report.md`; `## Working Pattern` khusus validator dan reviewer | selesai, di main (695 test) |
| 03f | teks usang: token Verdict di `piv-workflow.md`, TODO konfirmasi role absen, kalimat retry dua tingkat, deskripsi `/caf-run-pipeline`, gap opsional `caf-feature-catalog-sync` di `curate audit`, "all four" → lima jenis bukti, pengecualian planner untuk tiket refactor/config, README/CLAUDE.md/CAF.md | selesai, di main (720 test, merge 15 Okt) |
| 03c2 | `validator` menggantikan `qa` di roster default (mono-pnpm, single-nuxt), `validator` dan `/caf-plan` tidak lagi tersembunyi; scaffold di repo yang punya `caf-qa.md` menambah `caf-validator.md` + catatan; `/caf-run-pipeline` gate per roster + `## Spec Status Check`; `/caf-plan` berhenti di `NEEDS_CLARIFICATION`/`NEEDS_HUMAN`; reviewer dan planner `## Input` (reviewer menerima `validate-report.md` dan `qa-report.md`); rujukan usang discovery/`/caf-review-ticket`/"PM Agent" dibuang dari hasil scaffold | selesai, di main (756 test) |
| 03c3 | SINGLE_REPO default `caf-frontend` + `caf-backend`; `implementer` di `SUPERSEDED_CANDIDATE_KINDS` (kind tetap); catatan scaffold bila `caf-implementer.md` ada; `--role implementer` kini ditolak; builder 8 command tersembunyi + `audit-commands.js`, `discovery-to-ticket.js`, `feature-catalog.js` dibuang | selesai, di main (776 test; mono-pnpm dan `frozen-kinds` tidak berubah) |
| 03c2b | planner ticket run menulis `Status: NEEDS_CLARIFICATION` tanpa `tasks.md` bila ada pertanyaan BLOCKING tanpa Answer (bukan `NEEDS_HUMAN`); `## Output` dan `## Constraints` planner diselaraskan, rujukan Discovery dibuang; peringatan `planner-constraints` di `curate audit`; `.caf/discovery/` dibuang dari `INDEX.md`; test `readAgentRoster` dikunci; `architecture-signatures.js` dibuang | selesai, di main (801 test, f1f273a) |
| 03c2c | rename `/caf-run-pipeline` → `/caf-run`; routing repo tunggal mengikuti `## Frontend Tasks`/`## Backend Tasks`; `caf-plan-ticket.md` disembunyikan | selesai, di main (839 test) |
| 03c2d | skill `caf-verify` → `caf-self-verify`; peringatan `skill-renamed` | selesai, di main (858 test, 9efc5d6) |
| 03g | fallback `detectKind` ke `implementation` dicabut (hanya nama berkas = slug app terdeteksi); berkas tak dikenal dilewati di sync/baseline, peringatan `unknown-kind` di `curate audit`, WARN di `check-drafts`, tidak ditawari `## Skills`; `--mode` diteruskan ke sync/baseline | dieksekusi 15-16 Okt (880 test, SUCCESS, 4 commit lokal di `ai-agent/CAF-SDD-03g`); status merge menunggu konfirmasi Ganjar. Setelah merge, initiator siap rilis dari sisi kode |

## Tiket di caf-orchestrator
| Tiket | Isi | Status |
|---|---|---|
| SDD-04a | gate memilih `caf-validator`/`caf-qa` dari keberadaan agent; baca `validate-report.md`/`qa-report.md`; `verify-report.md` dari `Status:` ter-anchor; `Notes:`/`Catatan:`; dokumentasi dilewati bila agent tak ada; `task-router` mengabaikan `## Coverage` | selesai, di main |
| SDD-04b | parser AC (`ac-summary.ts`, kolom per posisi, pipa dalam backtick tetap satu sel); semua AC UNVERIFIED + `Status: PASS` → `NEEDS_HUMAN`; AC tak dilaporkan = UNVERIFIED; ringkasan deterministik di atas body PR normal dan Draft PR gate validasi/reviewer; gate `validate` (`qa` terbaca); prompt fix-review melarang edit spec (usulan di `fix-review-log.md`) | selesai, di main (602 test) |
| SDD-04c | Clarify via ticket (marka `❓ CAF-CLARIFY`, draf di-push ke branch, pemicu ulang melanjutkan di branch); gerbang spec berlabel `spec-approval` (Draft PR berisi spec saja); `/caf-approve-spec`; keduanya tanpa jatah retry; port baru `ILinearClient.listComments`, `IVcsClient.listTicketComments`; trigger GitHub pada branch yang sudah ada kini resume (seperti Linear) | selesai, di main (681 test). Payload Linear/GitHub hanya teruji fixture |
| SDD-04d | ringkasan AC dan Q-1 hanya bila gate `caf-validator`; `DRAFT` + BLOCKING tanpa Answer → Clarify (apa pun labelnya); run lanjutan sukses menandai PR Ready for review (`IVcsClient.markPullRequestReadyForReview`, tidak pernah melempar); command ditolak tidak menyentuh baris dashboard (`recordPipelineStarted` ditunda untuk resume); 32 test baru; CLAUDE.md dan README | dieksekusi 16 Okt (713 test, SUCCESS; commit f3a10b6 source, 60913eb test, 99322b3 docs); merge Ganjar 16 Okt. Mutasi GraphQL Ready belum teruji di GitHub sungguhan; `.ai/tasks/CAF-SDD-04d/` perlu di-commit (di orchestrator `.ai/tasks/` di-track) |

## Penilaian usulan spec 04b dan 04c (15 Okt)
Diterima sebagai keputusan (cukup didokumentasikan):
- 04b: Q-1 berlaku juga di Draft PR gate reviewer; gate yang di-skip Planner tidak mendapat ringkasan dan tidak kena Q-1; nilai `Proposed Spec Changes:` `none`/`n/a`/`-`/`tidak ada` tidak ditampilkan; AC ganda di tabel = status terburuk; Q-1 dicek juga setelah retry; Draft PR gate implementasi tanpa ringkasan; bila semua baris gagal di-parse, `Status: PASS` jatuh ke Q-1 (aman).
- 04c: pemicu ulang saat menunggu approval → komentar, tidak ada run, tanpa retry; label gerbang dibaca saat trigger ready datang; marka `❓ CAF-CLARIFY` (bila komentar itu dihapus, semua komentar manusia ikut terbaca); ticket dengan branch lama tanpa state → komentar "nothing to resume" (hapus branch untuk mulai ulang).
Dikerjakan di SDD-04d (selesai): ringkasan/Q-1 hanya untuk validator; DRAFT + BLOCKING tanpa Answer langsung Clarify; PR spec/gate ditandai Ready for review saat sukses; command yang ditolak tidak mengubah baris dashboard; test khusus untuk ringkasan di Draft PR gate reviewer.

## Penilaian laporan 03f (15 Okt)
- Diterima. AC-7: tiga baris "all four" tersisa (`agents.js:764`, `ticket-preview-commands.js:30`, `test/skills-scaffold.test.js:104`) dicatat bukan tentang jenis bukti, sesuai klausa "dicatat satu per satu".
- Dua test lama diubah (`sdd02e-planner-read` memfilter satu aturan planner baru; `sdd03e-validator-commands` memakai `expectedDrift` + bandingkan dengan render segar). Sah, tetapi kunci test 02e/03e atas planner kini lebih longgar; tidak perlu tindakan.
- A5 meleset bentuk (blok inline di samping `OPTIONAL_DOCS`, bukan entri daftar); tidak mempengaruhi AC.
- Sisa "max 3x" di `/caf-run-pipeline`, `AGENTS.md`, dan `## Retry Logic` sengaja tidak disentuh (di luar scope). `## Retry Logic` per agent memang retry verify 3x (benar); yang perlu diperiksa adalah kalimat tingkat pipeline di `/caf-run-pipeline` dan `AGENTS.md` → masuk T1 03c2.
- Rollout: `## Output` planner baru sampai ke repo lama lewat `curate sync` sebagai DRIFT biasa; `piv-workflow.md` dan `/caf-run-pipeline` tidak punya sync (hapus lalu scaffold ulang).

## Penilaian laporan 03c2 (15 Okt)
- Diterima. AC-1..AC-12 otomatis lulus; AC-13 (7 entri snapshot = prediksi T1), AC-14 manual.
- Spec meleset bentuk, bukan isi (A1, A2, A3, A7): tidak ada satu mekanisme penyembunyi (validator tersembunyi karena bukan entri `buildCandidates()`, `/caf-plan` karena tak di-import); roster berasal dari dua builder (`buildCandidates()`, `buildSingleRepoCandidates()`); gate QA di-hard-code di `run-pipeline-command.js` (kini ada opsi gate, default `qa` = teks lama); reviewer tidak punya `## Proposed Spec Changes` di `review-notes.md` (usulan disalin ke `### For Developer`).
- `qa` tetap kandidat tetapi disaring lewat `SUPERSEDED_CANDIDATE_KINDS` (bukan `HIDDEN_CANDIDATE_KINDS`, yang tetap lima kind): golden `frozen-kinds` merender semua kandidat dan satu test 03c1 mengunci lima kind.
- P-1: `/caf-complete-drafts` tidak bisa identik (ia mendaftar agent yang ada: `caf-qa.md` → `caf-validator.md`). Salahku di AC-5: klaim "identik" atas berkas yang belum dibaca.
- P-2: `src/utils/read-agent-roster.js` diubah di luar daftar berkas (sah): tanpa itu `piv-workflow.md` repo baru menulis "QA — NOT present" dan `caf-validator.md` terdaftar sebagai agent kustom.
- P-4: planner `## Constraints` menunjuk fallback Discovery yang kini dihapus dari `## Input` → rujukan menggantung; dibereskan di 03c2b.
- Perubahan test lama (sdd03b1, sdd03e, sdd03c1, sdd03b3, sdd03f, sdd02-planner-spec, sdd02c, sdd02d, sdd02e, sdd03b2, false-drift, helper) dicatat dan sah; `sdd02-planner-spec` kehilangan 5 literal yang hidup di fallback Discovery (dicek hilang satu per satu).
- AC-11 (follow-up baca-saja): 35 baris `git grep` di `src` diklasifikasi, tidak ada yang teks usang (c). (a) kode mati/disaring `HIDDEN_COMMAND_FILES` (`agents.js`, `discovery-commands.js`, `discovery-to-ticket.js`, komentar `run-pipeline-command.js:5`, `ticket-preview-commands.js:3`) → dibersihkan di 03c3. (b) sah untuk repo lama yang punya `caf-pm.md`/`caf-ux-designer.md` (`agent-md.js:112`, `discovery-commands.js:226, 281, 305-306, 321, 355-371`) → dibiarkan.
- Sisa di hasil scaffold baru: `.caf/discovery/` di `INDEX.md` (folder tak lagi ditulis scaffold) → masuk 03c2b. `.gitignore` `.caf/discovery/` dan `.caf/audits/` sengaja dipertahankan.
- `readAgentRoster` benar pada tiga kasus (hanya `caf-qa`: QA `[x]`; hanya `caf-validator`: Validator `[x]`, tanpa "QA NOT present"; keduanya: keduanya `[x]`; `custom: []`). Tetapi kasus hanya-`caf-qa` dan keduanya tidak dikunci test (hanya diperiksa manual) → tambah test di 03c2b.

## Penilaian laporan 03c3 (15 Okt malam)
- Diterima. A1–A5 benar; teks `--role frontend` menyatakan "Whole repository — … no per-app split" tanpa klaim satu-satunya agent (A2). Teks turunan (run-pipeline, complete-drafts, piv-workflow, agent-handoff, `readAgentRoster`) sudah mengikuti roster; tidak ada template yang berubah.
- Usulan 1 (`--role implementer` ditolak): diterima sebagai keputusan; skrip yang memakai nilai itu harus pindah ke `frontend`/`backend`; repo lama dengan `caf-implementer.md` tetap terbaca `curate`.
- Usulan 2 (penting): di repo tunggal, langkah 4 `/caf-run-pipeline` selalu bertanya ke pengguna karena dua agent seluruh-repo cocok untuk semua tugas. Orchestrator tidak terdampak (task-router memakai bagian Frontend/Backend `tasks.md`). Perbaikan masuk 03c2b: routing command mengikuti bagian tugas di `tasks.md`, sama dengan orchestrator. Wajib selesai sebelum rilis npm (dikerjakan di 03c2c).
- Usulan 3: `src/utils/architecture-signatures.js` kini tidak terpakai → dibuang di 03c2b.

## Cek orchestrator untuk 03c2b (15 Okt malam, dibaca dari repo `coderiumid/caf-orchestrator` main, CLAUDE.md dan kode)
- Orchestrator tidak pernah memanggil `/caf-run-pipeline`, `/caf-plan-ticket`, atau skill `caf-verify`: ia menjalankan agent lewat `claude --agent <nama>` (`caf-planner`, `caf-frontend`, `caf-backend`, `caf-validator`/`caf-qa`, `caf-reviewer`, `caf-documentation`). Command yang dikenalnya hanya webhook PR: `/caf-review`, `/caf-fix-review`, `/caf-retry-pipeline`, `/caf-approve-spec`. Rename command dan skill aman dari sisi orchestrator.
- Jalur Clarify 04c tidak butuh `tasks.md` (`stopForSpecIfNeeded` dipanggil sebelum `readTasks`).
- **Cacat integrasi ditemukan:** planner di ticket run menulis `Status: NEEDS_HUMAN` + catatan blocked (aturan 02d, pra-04c). Orchestrator hanya berhenti pada `NEEDS_CLARIFICATION`; `NEEDS_HUMAN` lanjut, lalu routing melempar "No Frontend Tasks or Backend Tasks section" dan BullMQ mencoba ulang. Jadi Clarify tidak akan pernah terpicu oleh planner sungguhan. Diperbaiki di 03c2b (merged). **Smoke test jalur Clarify di umkm-pos butuh planner umkm-pos diperbarui** (`curate sync` untuk `## Output`; `## Constraints` diubah manual).
- Rollout: deploy orchestrator (04c) lebih dulu; planner baru di bawah orchestrator lama gagal (tak ada `tasks.md`).

## Temuan penting pasca-merge
- (Diselesaikan di 04d) Repo campuran (planner baru menulis `AC-n`, gate masih `caf-qa` yang `qa-report.md`-nya tanpa tabel per AC) — kasus umkm-pos: semua AC terbaca "tidak dilaporkan" → semua UNVERIFIED → Q-1 menghentikan setiap run dengan `NEEDS_HUMAN`. Kini ringkasan dan Q-1 hanya berlaku bila gate `caf-validator`.
- Linear: komentar orchestrator ditulis dengan API key milik manusia, jadi tidak dikenali sebagai bot; pengumpulan jawaban Clarify bergantung pada marka. Komentar status orchestrator lain yang muncul setelah marka bisa ikut terbaca sebagai "jawaban" — cek di smoke test.
- (Diselesaikan di 04d untuk `/caf-approve-spec` dan resume yang ditolak) Penolakan command mereset baris dashboard ticket ke `NEEDS_HUMAN` dan menaikkan `attempt`, termasuk ticket yang sudah SUCCESS. Penyebab: `recordPipelineStarted` dipanggil untuk setiap job sebelum keputusan tolak.

## Penilaian laporan 03c2b (15 Okt malam)
- Diterima. A4 meleset hanya dalam bentuk: `makeOldRepo` merender dengan builder terbaru sehingga laporan `curate` yang direkam berisi 0 peringatan; kasus +1 diuji dengan menyuntikkan `## Constraints` lama. Peringatan `planner-constraints` bekerja (warn saja, bukan gap).
- 9 berkas test lama diperbarui; hanya entri snapshot `caf-planner.md` yang berubah; helper baru `test/helpers/swap-constraints.js`.
- Rollout: deploy orchestrator (04c) dulu, lalu sync planner umkm-pos (`curate sync` untuk `## Output`, edit manual untuk `## Constraints`), baru smoke test Clarify.

## Penilaian laporan 03c2c (15 Okt malam)
- Diterima: SUCCESS, 839 test lulus, 1 todo (fallback implementation, tetap), 5 commit lokal di `ai-agent/CAF-SDD-03c2c`. 03c2b sudah di main (f1f273a).
- A2 benar: builder `/caf-run` sudah menerima `implementationRoles` dan `appPaths`, roster dua agent seluruh-repo dikenali tanpa flag baru. A3 meleset sebagian: helper `mono-snapshot.js` menulis nama berkas hardcode (satu baris ikut diubah).
- Routing repo tunggal hanya untuk caf-frontend + caf-backend ber-scope `['.']`; monorepo, `--scope`, `--role` tetap pencocokan scope. Repo lama: `caf-run.md` ditulis di samping `caf-run-pipeline.md` + satu catatan.
- `caf-plan-ticket.md` = entri ke-9 `HIDDEN_COMMAND_FILES`. Snapshot hanya `mono-pnpm.json` (satu entri). 8 berkas test lama diubah lewat helper `test/helpers/since-03c2c.js`.
- Sisa kosmetik (backlog): nama builder `buildRunPipelineMd` dan `run-pipeline-command.js` belum diganti. `.ai/` di-gitignore sehingga verify-report tidak ikut commit.
- Pelajaran: hash spec berbeda karena newline akhir (kelima kalinya); langkah tambah-newline di prompt terbukti perlu.

## Penilaian laporan 03c2d (15 Okt malam)
- Diterima: SUCCESS, 858 test, 1 todo (fallback), 4 commit lokal di `ai-agent/CAF-SDD-03c2d`. T1 tanpa kontradiksi; snapshot dan `frozen-kinds` tidak berubah (regenerasi dilewati, sesuai A4).
- Nama lama hanya tersisa di konstanta `RENAMED_SKILLS` (`skill-md.js`); peringatan `skill-renamed` menggantikan `skill-pointer` untuk path yang sama; catatan Q-1 dan baris "not listed there" di `skills.js`. 6 test lama diganti mekanis; test sdd03d membaca golden lewat penggantian nama.
- Kesalahan spec (konsultan): AC-1 menyebut "enam skill lain identik byte-for-byte" padahal scope memasukkan teks `caf-piv` yang menyebut skill itu. Claude Code menangani dengan benar (golden dengan nama diganti; skill yang tidak menyebut nama diperiksa byte-for-byte).

## Penilaian laporan 03g (16 Okt dini hari)
- Diterima: SUCCESS, 880 test, 0 todo (test `todo` AC-7 kini test biasa), 4 commit lokal di `ai-agent/CAF-SDD-03g`. Snapshot dan `frozen-kinds` tidak berubah. T1 bersih: tidak ada `detectKind` di `export` atau `readAgentRoster`.
- `detectKind(filename, appSlugs)` mengembalikan kind dikenal, `implementation` hanya bila nama = slug app terdeteksi (`implementationSlugs(apps)` dari `agentSlug`), selain itu `null`. `curate sync`/`baseline` melewati berkas `null` (byte-identik, tanpa baseline) dan melaporkannya; `audit` memberi satu peringatan `unknown-kind` (bukan gap); `--check-drafts` satu WARN (bukan FAIL); `scaffold skills` tidak menawarkan `## Skills`.
- `unknownKind` muncul di hasil command hanya bila tidak kosong (kalau selalu ada, laporan repo lama yang terekam berubah). Pembaca hasil `agentsSync`/`curateBaseline` harus memperlakukannya opsional.
- `agentsSync` dan `curateBaseline` kini menerima `repoMode`; `--mode` tidak disimpan, jadi tanpa `--mode` yang sama slug app bisa berbeda dan agent per-aplikasi muncul sebagai `unknown-kind` (aman: tidak ditimpa, hanya dilaporkan). Bila muncul di umkm-pos, periksa `--mode` dulu.
- Empat test lama diubah karena bergantung pada fallback (`devops-kind-detection`, `sdd03d-implementation-spec` AC-6, `sdd02d-planner-audit` AC-10, `skills-pointer` H10 yang ditulis ulang). Satu paragraf `curate` ditambahkan ke `CAF.md` setelah tabel agent Layer 2.

## Penilaian laporan 04d (16 Okt pagi)
- Diterima: SUCCESS, 713 test (681 + 32 baru), tidak ada temuan T1 yang bertentangan dengan AC. Kasus AC-1, 5, 6, 8, 10, 13, 14 gagal di kode lama dan lulus di kode baru. Asersi lama dan golden tidak berubah; satu-satunya edit test lama: method baru ditambah ke mock `vcsClient` di 6 berkas.
- `markPullRequestReadyForReview` (GET PR → `draft`, `node_id`; bila draft, mutasi GraphQL) tidak pernah melempar: kegagalan dicatat dan disebut di komentar ticket, PR tetap Draft. Belum teruji di GitHub sungguhan; keberhasilan token (A-2) dibuktikan di smoke test.
- URL GraphQL hanya benar untuk github.com; host lain mendapat `<apiUrl>/graphql` (salah untuk GHES). Spec melarang menebak, jadi dibiarkan; masuk backlog.
- Job lanjutan yang melempar sebelum agent pertama (mis. clone gagal) tetap menandai baris `ERROR`: error nyata, bukan command ditolak; BullMQ mengulang. Diterima.
- Satu run `pnpm test` menunjukkan 1 kegagalan yang tidak tercatat; 19 run berikutnya bersih. Tak terjelaskan; jalankan ulang di mesin Ganjar sebelum percaya.
- Koreksi: di orchestrator `.ai/tasks/` di-track git (65 berkas, termasuk 04a-04c), berbeda dari initiator yang meng-ignore-nya. Folder `CAF-SDD-04d` perlu di-commit terpisah. Trailer commit hanya `Co-Authored-By` (atribusi sesi).
- AC-17 (dokumentasi) manual; dicek Ganjar.

## Tiket berikutnya
| Tiket | Isi |
|---|---|
| smoke test | setelah deploy orchestrator (main, termasuk 04c dan 04d) dan sync planner umkm-pos: (1) jalur Clarify (ticket kecil dengan pertanyaan BLOCKING); (2) jalur gerbang + `/caf-approve-spec`, lalu cek PR menjadi Ready (menguji A-2); (3) `/caf-approve-spec` pada ticket yang sudah SUCCESS, baris dashboard tidak berubah; (4) komentar status orchestrator tidak ikut terbaca sebagai jawaban Clarify; (5) payload label/komentar Linear dan GitHub |
| 02f (hanya bila perlu) | sisa kelemahan planner dari Uji 7 |

Rincian tiket yang sudah selesai (hash spec dan keputusan Q-n):
- 03c2c: requirements d3ee4cb1…d799f, tasks e290ea8b…3a87. Q-1 keputusan konsultan (repo lama: `caf-run.md` ditulis di sebelah `caf-run-pipeline.md` + satu catatan), boleh Ganjar ubah.
- 03c2d: requirements 11848dae…c970, tasks b51011ae…4d75. Q-1: repo lama dengan folder `caf-verify` mendapat `caf-self-verify` di sampingnya + satu catatan. Q-2: peringatan `skill-renamed`, warn saja.
- 03g: requirements 244e3421…0c6e, tasks f007cb57…9d6b. Q-1 keputusan Ganjar; Q-2 dan Q-3 keputusan konsultan.
- 04d: requirements (APPROVED) 52c94019…39c1f, tasks b8364bdd…d434.

## Temuan uji dispatch planner di umkm-pos
- Uji 1, 4: diperbaiki 02c. Uji 5: format v3 + Glob/Grep jelas lebih baik dari kontrol.
- Uji 6 (setelah 03d + 02d): efektif untuk `Status:` polos, `tasks.md` tidak ditulis saat BLOCKING, AC `automated test` menyebut berkas. Tidak efektif: penundaan pembacaan dengan sinonim, tebakan tanpa label, `## Coverage` tidak konsisten. Ditangani 02e.
- Uji 7 (setelah 02e): pola besar tertutup ("Baca dulu" 0, Coverage lengkap, Assumption dengan dasar, kata dugaan di artefak 0). Sisa orde kedua: Finding dari Grep saja, AC multi-perilaku (diskon 8/29, http 3/13), path di section terlarang, Finding berisi kesimpulan, urutan task melanggar ketergantungan, kata dugaan di pesan akhir, baca ulang tidak dijalankan, sebagian Assumption tanpa dasar, ADR tidak semua dibaca. Temuan isi: diskon — manager tanpa `transaction.create`; http — T-1 sebelum T-2. Kesimpulan: berhenti memperketat planner, andalkan review manusia.

## Keputusan terbaru
- 02d: himpunan status akhir planner `DRAFT | NEEDS_CLARIFICATION | APPROVED | NEEDS_HUMAN`; ticket run tetap menulis catatan blocked di `tasks.md`.
- 02e: `## Coverage` wajib; path dan nama simbol boleh di Finding/Assumption/`Verify:` saja.
- 03e: perintah `Verify: command:` hanya untuk spec `APPROVED`; satu perintah atau rantai `&&`; ditolak `;`, `|`, redirect, `$()`, backtick, `sudo`, `rm`, `curl`, `wget`, `git push` → UNVERIFIED; usulan spec validator di `### Notes`.
- 03f: pengecualian planner sempit (keputusan konsultan): pada tiket refactor/config kalimat `When … then` boleh menyebut path atau simbol yang menjadi subjek tiket; `caf-spec` tidak berubah. Posisi SDD di CAF.md: spec-first menuju spec-anchored, bukan spec-as-source.
- 03c2: repo yang sudah punya `caf-qa.md` yang di-scaffold ulang mendapat `caf-validator.md` di sampingnya dan catatan (orchestrator beralih ke validator); `caf-qa` tidak pernah dihapus. Tiket dipecah: rename dan pencabutan `/caf-plan-ticket` ke 03c2b setelah cek orchestrator.
- 03g: agent per-aplikasi buatan CAF (`<slug>.md`) dikenali lewat kecocokan nama berkas dengan slug app terdeteksi; sisanya dilewati dan dilaporkan.
- 04a: laporan gate tidak ada = gagal gate biasa; heading `## Status:` lama diterima.
- 04b: gate lulus bila tak ada `FAIL`, kecuali semua AC UNVERIFIED → `NEEDS_HUMAN`; AC tak dilaporkan = UNVERIFIED; ringkasan deterministik; gate `validate`; routing `caf-implementer` tidak dikerjakan (pakai `--role`); usulan spec fix-review di `fix-review-log.md`.
- 04c: label `spec-approval` configurable; Draft PR berisi spec saja; `/caf-approve-spec` hanya mengubah baris `Status:`; `NEEDS_CLARIFICATION` selalu berhenti; draf di-push ke branch saat Clarify; approval dan Clarify tanpa jatah retry.
- 04d: ringkasan/Q-1 hanya gate `caf-validator`; `DRAFT` + BLOCKING tanpa Answer → Clarify di atas gerbang label; `APPROVED` dengan BLOCKING tanpa Answer tetap lanjut (tidak diubah); run lanjutan sukses menandai PR Ready (tidak pernah melempar); resume yang ditolak tidak menyentuh baris dashboard.
- Rollout umkm-pos: `curate sync` 4 section DRIFT (02d), lalu `## Output` planner (02e), lalu `## Output` planner 03f.

## Urutan berikutnya
1. Ganjar: konfirmasi 03g ter-merge; commit `.ai/tasks/CAF-SDD-04d/` di orchestrator. Dump `## Input` dan `## Retry Logic` dari `caf-qa.md` dan `caf-reviewer.md` di umkm-pos untuk memutuskan CONFLICT; jangan `curate --sync-only` tanpa `--dry-run` di sana.
2. Deploy orchestrator (main, termasuk 04c dan 04d) ke VPS.
3. Sync planner umkm-pos (`curate sync` untuk `## Output`, edit manual `## Constraints`), lalu smoke test (lihat Tiket berikutnya).
4. Uji ujung-ke-ujung di umkm-pos dengan validator terpasang; cabut banner `caf-traceability`; cek `scripts/release.sh` vs workflow `npm-publish.yml` (risiko publish dua kali) dan README initiator yang basi; rilis npm `caf-init`.

## Backlog (belum dijadwalkan)
- Setelah rilis: skill `caf-design` (planner menulis `design.md` untuk tiket kompleks, menggantikan `caf-architect`) dan `caf-breakdown` (planner mengusulkan sub-ticket dari fitur besar, approval manusia per item, menggantikan nilai discovery-to-ticket); keduanya belum dirancang. `/caf-plan` dan `/caf-run` menerima deskripsi bebas; rancang bersama `caf-breakdown`.
- Orchestrator: URL GraphQL untuk GitHub Enterprise Server (`<host>/api/graphql`); dokumentasikan keterbatasannya di README bila ada klien GHES.
- Orchestrator: satu kegagalan test tak terjelaskan di run 04d; tangkap nama test bila muncul lagi.
- 02f bila perlu (lihat Uji 7).
- Aturan bahasa artefak planner; tugas QA/Reviewer/Documentation yang tidak melayani AC di `tasks.md`.
- Kepemilikan baris `verify-report.md` per app di monorepo bila dispatch menunjukkan konflik.
- `caf-traceability` masih DRAFT; `caf-self-verify` ikut DRAFT di mono-pnpm (apps/web tanpa typecheck).
- `caf-spec` v4: samakan `Tidak ada` vs `-`; pengecualian tiket refactor.
- Agent implementasi belum tahu `## Coverage`.
- Rollout `## Skills` dan `tools:` tetap manual; terdeteksi `curate audit`.
- Penegakan keras batas perintah validator (hook atau allowlist runner).
- Validator sebaiknya meng-escape pipa di sel tabel; pipa telanjang di luar backtick masih memecah sel.
- Komentar fix-review yang mengutip baris berawalan `## ` bisa terpotong oleh `readFixReviewLog`.
- Verdict reviewer: frasa "rules out an approving verdict" mungkin perlu dipertegas.
- Cakupan checklist validator di monorepo: batasi pada app yang ditandai di `tasks.md`.
- Salinan `CAF.md` di dokumen Project ini perlu disegarkan dari versi repo (03f dan 03g sudah mengubahnya).
- Planner di ticket run yang menolak mengubah spec `APPROVED` menulis `Status: NEEDS_HUMAN` di `verify-report.md`; orchestrator lanjut implementasi (karena `NEEDS_HUMAN` bukan Clarify) dan agent implementasi bisa menimpa `verify-report.md`. Belum terlihat di dispatch nyata; putuskan setelah ada contoh.
- Reviewer menyalin usulan spec ke `### For Developer` di `review-notes.md` (bukan `## Proposed Spec Changes`); pertimbangkan satu tempat yang sama dengan validator/fix-review dan pastikan `readFixReviewLog` dan prompt fix-review membacanya.
- `agent-handoff.md` ikut berubah di snapshot 03c2 (daftar agent); tidak ter-sync, hapus lalu scaffold ulang di repo lama.
- Kosmetik: rename builder `buildRunPipelineMd` dan `run-pipeline-command.js`.

## Catatan rollout repo lama
- `agent-handoff.md` tanpa sync (`writeIfAbsent`): hapus lalu `caf-init scaffold workflow`. Sama untuk `piv-workflow.md` dan `/caf-run-pipeline` (teks 03f).
- Skill yang sudah ada tidak ditimpa: ganti manual (hapus folder skill lalu `scaffold skills`).
- Command tidak ter-track `curate`: hapus lalu scaffold ulang (atau `--force`).
- `curate sync` hanya menulis section yang di-track (`## Input`, `## Output`, `## Allowed Tools`, `## Working Pattern`, dst); `## Skills` dan `tools:` manual.
- Jangan `curate --sync-only` tanpa `--dry-run` pada repo lama. Di umkm-pos ada CONFLICT di `caf-qa.md` dan `caf-reviewer.md` (`## Input`, `## Retry Logic`); reviewer kini juga DRIFT di `## Working Pattern`.
- Berkas agent yang tidak dikenali (bukan kind CAF, bukan slug app terdeteksi) kini dilewati dan dilaporkan sebagai `unknown-kind` (03g). Bila muncul di repo yang sebelumnya bersih, periksa `--mode` sebelum menyimpulkan ada berkas yang salah.
- Jangan publish rilis baru `caf-init` ke npm sebelum orchestrator ter-deploy (main dengan 04c dan 04d) dan smoke test lulus.
- Orchestrator: repo tanpa `requirements.md`/baris `Status:` tidak terkena Clarify atau gerbang; repo tanpa baris `AC-n` atau tanpa `caf-validator.md` tidak terkena ringkasan AC dan Q-1 (sejak 04d).
- Repo tunggal lama dengan `caf-implementer.md`: scaffold ulang menambah `caf-frontend.md` + `caf-backend.md` (implementer tidak dihapus); `--role implementer` tidak lagi diterima.
- Ticket yang branch `ai-agent/<KEY>`-nya masih ada tetapi tanpa state: hapus branch untuk memulai ulang dari nol.

## Pelajaran proses
- (04d) Konvensi `.ai/` berbeda per repo: initiator meng-ignore, orchestrator men-track (65 berkas). Prompt eksekusi tidak boleh menyamakannya; periksa `git ls-files .ai` di repo target.
- (04d) Membaca kode sebelum menulis spec menemukan penyebab sebenarnya (F-4: `recordPipelineStarted` untuk semua job), bukan hanya gejala yang dilaporkan. Tulis Finding dari kode, bukan dari ingatan.
- (03c2d) Klaim "identik byte-for-byte" di AC harus dicek terhadap Scope In: berkas yang menyebut nama yang diganti tidak identik. Tulis "identik setelah penggantian nama".
- Tiket yang mengubah teks yang dikunci test: audit mencari teks itu di semua berkas test (03e: T1 melewatkan dua dari enam; 03f: dua test lama tetap perlu diubah, tercatat).
- Spec yang mengubah template sebuah kind memeriksa semua golden `frozen-kinds` yang memuat section itu (03d).
- Constraint spec tidak boleh bertentangan dengan jawaban Open Questions (02e, 04a). Sebelum APPROVED, baca Constraints terhadap Decisions dan AC.
- Jangan menulis "identik byte-for-byte" untuk berkas yang belum dibaca: command yang mendaftar agent berubah mengikuti roster (03c2 P-1); tulis "identik kecuali daftar agent" atau minta T1 membuktikan dulu.
- Klaim tentang berkas, section, atau port yang belum dilihat ditulis sebagai Assumption dengan dasar dan diverifikasi T1 (03e, 04c). Asumsi yang meleset hanya bentuknya dan tidak mengubah AC boleh diteruskan dan dilaporkan (03f A5).
- Kode yang membaca keluaran agent divalidasi dengan merender template agent sungguhan (04b: menangkap cacat pipa).
- Constraint "repo lama tidak berubah" harus mempertimbangkan repo campuran (sebagian agent baru, sebagian lama), bukan hanya repo yang seluruhnya lama (04b → temuan umkm-pos → 04d).
- Aturan perilaku model ditulis berdasarkan niat, bukan daftar kata (02d → 02e).
- Spec ditulis dengan `caf-spec` v3: fakta ringkas, tanpa nomor baris, pertanyaan hanya untuk keputusan manusia.
- Perubahan template pada section yang sudah ada saja, supaya `curate sync` bisa menuliskannya.
- Eksekutor STOP bila temuan T1 bertentangan dengan AC, sebelum menyentuh `src/`.
- Berkas lewat chat bisa kehilangan newline penutup; verifikasi hash, coba tambah satu newline (03e, 04a, 04b, 04c, 03f, 03g, 04d).
- Uji dispatch: bandingkan tahap yang sama; satu run bukan statistik; jangan mengubah `Status:` antar sesi tanpa mencatatnya.
- Titik kembali menurun pada penguatan planner: berhenti memperketat, andalkan review manusia.
- Audit baca-saja pasca-merge menemukan lubang yang tidak terlihat per tiket; ulangi setelah tiap gelombang.
- Fitur yang bergantung pada payload tracker nyata (04c) atau API eksternal (04d: mutasi GraphQL) teruji fixture saja; smoke test live sebelum dianggap selesai.
- AC harus menguji perilaku (misalnya routing), bukan hanya nama; fixture repo lama dirender dengan builder terbaru, jadi kasus lama diuji dengan menyuntikkan teks lama.