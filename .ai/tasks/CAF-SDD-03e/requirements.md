# CAF-SDD-03e — Validator menjalankan perintah dari spec, Working Pattern khusus validator dan reviewer
Status: APPROVED (revisi 2 setelah NEEDS_HUMAN di T1; Q-1 sampai Q-3 "ikut rekomendasi" 14 Okt 2026; Q-4 gugur; Q-5 diputuskan konsultan mengikuti opsi (a), Ganjar boleh membatalkan)
Source: chat (laporan audit caf-initiator pasca-02c, 13 Okt 2026; backlog "perintah buatan tiket sendiri jadi UNVERIFIED")
Repo target: `caf-initiator`
Bergantung pada: 02c, 02d, 02e, 03d ter-merge (02e menunggu konfirmasi merge; tiket ini tidak menyentuh planner).

## 1. Outcome
Validator menjalankan perintah yang tertulis di baris `Verify: command:` sebuah spec berstatus `APPROVED`, dalam batas bentuk perintah yang aman, lalu membandingkan hasilnya dengan `expect:`. Perintah di luar batas, atau dari spec yang belum `APPROVED`, tidak dijalankan dan AC-nya dilaporkan `UNVERIFIED` dengan alasan, bukan `FAIL`. Validator dan reviewer memakai `## Working Pattern` yang sesuai pekerjaannya, bukan siklus Plan-Implement-Verify generik.

## 2. Scope
In:
- Template validator: aturan eksekusi perintah dari spec (status yang diizinkan, batas bentuk perintah, perilaku saat ditolak, perbandingan dengan `expect:`) di `## Allowed Tools`, tempat batas Bash dinyatakan; `## Output` validator hanya disesuaikan agar konsisten (batas Bash dan larangan menulis berkas selain `validate-report.md` tetap).
- Validator mencatat usulan perubahan spec sebagai baris berawalan `Proposed Spec Changes:` di bawah `### Notes` pada `validate-report.md` (Q-5); izin tulis validator tetap hanya `validate-report.md`.
- Template validator dan reviewer: `## Working Pattern` diganti teks khusus peran.
- Test, golden pra-tiket, snapshot terbatas, README dan CLAUDE.md.

Out:
- `tools:` (frontmatter), `## Skills`, `## Input`, `## Retry Logic`, `## Role`, `## Scope`, `## Verify Checklist` validator dan reviewer.
- Agent selain validator dan reviewer; `## Working Pattern` kind lain tidak berubah.
- Penegakan keras (hook atau allowlist di runner); tiket ini hanya mengatur teks agent.
- Menampilkan kind validator ke pengguna (tetap tersembunyi sampai 03c2), command, orchestrator, planner, `curate audit`.

## 3. Constraints and Assumptions
- Finding (audit): validator dan reviewer memakai lima jenis bukti (`automated-test`, `command`, `build-only`, `manual`, `none`), dan menghitung `manual`/`build-only`/`none` bukan lulus.
- Finding (audit): perintah yang dibuat tiket sendiri (muncul di `Verify: command:`, bukan daftar perintah tetap hasil deteksi repo) hari ini berakhir `UNVERIFIED` di validator.
- Finding (audit): `## Working Pattern` bernilai konstan lintas kind (siklus PIV generik), termasuk di validator dan reviewer, dan di-track `curate sync`.
- Finding (progres 02d): kind validator termasuk daftar tersembunyi (`HIDDEN_CANDIDATE_KINDS`) dan tidak muncul di scaffold biasa.
- Constraint: teks di luar section yang diubah tidak berubah satu byte pun; `tools:`, `## Skills` validator dan reviewer tidak berubah.
- Constraint: kosakata (lima jenis bukti, `UNVERIFIED`, `Verify:`, `expect:`, `## Proposed Spec Changes`) disalin dari teks validator, reviewer, dan agent-handoff yang sudah ada; tanpa istilah baru.
- Constraint: kata TODO tidak ditulis literal di aturan (check-drafts menghitungnya per agent).
- Constraint: CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1: branch `ai-agent/CAF-SDD-03e` dari main terbaru.
- Finding (T1): batas Bash validator dinyatakan di `## Allowed Tools` dan di `## Output` (bagian "What the Validator never does"); builder `## Working Pattern` dipanggil tanpa kind sehingga isinya sama untuk semua kind.
- Finding (T1): `## Proposed Spec Changes` hanya bagian dari `verify-report.md`; validator hari ini hanya boleh menulis `validate-report.md`, yang punya bagian `### Notes`.
- Finding (T1): validator dan reviewer tidak punya golden `frozen-kinds`; di snapshot `mono-pnpm` hanya entri `caf-reviewer.md` yang berubah; empat test lama mengunci teks yang berubah dan perlu diperbarui.

## 4. Decisions Already Made
- Spec `APPROVED` adalah kontrak; validator tidak pernah mengedit spec, usulan ditulis di `## Proposed Spec Changes` (SDD-summary, 12 Okt).
- `manual`, `build-only`, `none` tidak dihitung lulus.
- Tiket ini mengatur teks agent; penegakan keras ada di tiket lain.
- Q-1: perintah dari `Verify: command:` dijalankan hanya bila `requirements.md` berstatus `APPROVED` (jawaban Ganjar, 14 Okt 2026).
- Q-2: bentuk perintah diterima: satu perintah, atau rantai `&&` dari perintah-perintah. Ditolak: `;`, `|`, redirect (`>`, `>>`, `<`), `$()`, backtick, `sudo`, `rm`, `curl`, `wget`, `git push`.
- Q-3: `## Working Pattern` validator dan reviewer diganti, bukan dihapus; kind lain tidak berubah.
- Q-4 gugur: tidak ada golden `frozen-kinds` untuk validator atau reviewer (hasil T1).
- Q-5: usulan perubahan spec dari validator ditulis sebagai baris `Proposed Spec Changes:` di bawah `### Notes` `validate-report.md`; izin tulis validator tidak melebar ke `verify-report.md`.

## 5. Open Questions
- Q-1 [BLOCKING] Spec berstatus apa yang mengizinkan validator menjalankan perintah `Verify: command:`: (a) hanya `APPROVED` (rekomendasi: gerbang manusia sudah lewat), atau (b) juga `DRAFT`? — Answer: (a) hanya `APPROVED` (ikut rekomendasi).
- Q-2 [BLOCKING] Bentuk perintah yang boleh dijalankan: (a) satu perintah atau rantai `&&`, dengan `;`, `|`, redirect, `$()`, backtick, `sudo`, `rm`, `curl`, `wget`, `git push` ditolak (rekomendasi), atau (b) hanya satu perintah tunggal? — Answer: (a) (ikut rekomendasi).
- Q-3 [NON-BLOCKING] `## Working Pattern` validator dan reviewer: (a) diganti teks khusus peran (rekomendasi), atau (b) dihapus? — Answer: (a) diganti (ikut rekomendasi).
- Q-4 [NON-BLOCKING] Golden `frozen-kinds` yang mengunci `## Working Pattern`. — Answer: gugur, golden itu tidak ada (T1).
- Q-5 [BLOCKING] Di mana validator menulis usulan perubahan spec: (a) baris `Proposed Spec Changes:` di bawah `### Notes` `validate-report.md` (rekomendasi: izin tulis tetap satu berkas, dan `Notes:` sudah dibaca orchestrator), (b) validator boleh menambah ke `verify-report.md`, atau (c) usulan dibuang dari tiket? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When validator dirender, then teks agent menyatakan perintah dari baris `Verify: command:` dijalankan hanya bila `requirements.md` berstatus `APPROVED`. Verify: automated test atas teks hasil render.
- AC-2: When validator dirender, then teks agent menyatakan bentuk perintah yang diterima adalah satu perintah atau rantai `&&`. Verify: automated test.
- AC-3: When validator dirender, then teks agent menyebut daftar yang ditolak sesuai Q-2 (`;`, `|`, redirect, `$()`, backtick, `sudo`, `rm`, `curl`, `wget`, `git push`). Verify: automated test.
- AC-4: When perintah ditolak oleh batas bentuk atau spec belum `APPROVED`, then teks agent menyuruh perintah tidak dijalankan dan AC dilaporkan `UNVERIFIED` dengan alasan, bukan `FAIL`. Verify: automated test.
- AC-5: When perintah dijalankan, then teks agent menyuruh hasilnya dibandingkan dengan `expect:` dan AC dilaporkan lulus hanya bila cocok. Verify: automated test.
- AC-6: When perintah dijalankan dan hasilnya tidak cocok dengan `expect:`, then teks agent menyuruh AC dilaporkan `FAIL` beserta keluaran perintah. Verify: automated test.
- AC-7: When validator dirender, then teks agent melarang validator mengedit `requirements.md` dan `tasks.md` dan menyuruh usulan ditulis sebagai baris `Proposed Spec Changes:` di bawah `### Notes` pada `validate-report.md` (Q-5). Verify: automated test.
- AC-7b: When validator dirender, then izin tulis validator tetap hanya `validate-report.md` (tidak menyebut `verify-report.md` sebagai berkas yang boleh ditulis). Verify: automated test.
- AC-8: When validator dirender, then `## Working Pattern` tidak memuat teks siklus PIV generik yang dicatat T1 dan memuat langkah khusus validator: baca spec, jalankan perintah sesuai AC-1 sampai AC-4, tulis bukti per AC. Verify: automated test.
- AC-9: When reviewer dirender, then `## Working Pattern` tidak memuat teks siklus PIV generik yang dicatat T1 dan memuat langkah khusus reviewer: baca spec dan laporan, bandingkan AC dengan perubahan, tulis verdict. Verify: automated test.
- AC-10: When agent kind selain validator dan reviewer dirender, then `## Working Pattern` identik byte-for-byte dengan sebelum tiket. Verify: automated test dengan golden pra-tiket (`test/fixtures/pre-sdd03e/`).
- AC-11: When validator dan reviewer dirender, then bagian selain section yang diubah, `tools:`, dan `## Skills` identik byte-for-byte dengan golden pra-tiket. Verify: automated test dengan golden.
- AC-12: When scaffold agents dijalankan pada fixture biasa, then kind validator tetap tidak ikut ter-scaffold. Verify: automated test.
- AC-13: When file validator dan reviewer hasil sebelum tiket di-baseline di repo sementara lalu `curate sync` dijalankan, then section yang berubah ditulis dengan teks baru, agent yang dikustomisasi tidak ditimpa, dan file lain tidak berubah. Verify: automated test.
- AC-14: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri `caf-reviewer.md` yang berbeda (hasil T1), dicatat. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-15: When `npm test` dijalankan, then semua test lulus, dan `git diff --stat -- test/fixtures/frozen-kinds/` kosong. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
- AC-16: When README dan CLAUDE.md dibaca, then tertulis aturan eksekusi perintah validator (status, bentuk, penolakan), `## Working Pattern` khusus peran, dan langkah rollout repo lama (`curate sync` membawa section yang berubah; `tools:` manual). Verify: manual: baca bagian terkait.
