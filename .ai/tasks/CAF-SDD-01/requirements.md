# CAF-SDD-01 — Skill `caf-spec` di caf-initiator
Status: DRAFT
Sumber: chat (keputusan SDD 12 Okt 2026, CAF-SDD-SUMMARY.md bagian 7 dan 12)
Repo target: `caf-initiator`

## 1. Hasil Akhir
`caf-init scaffold skills` ikut menulis skill baru `caf-spec` (format `requirements.md` untuk SDD) ke `.claude/skills/caf-spec/SKILL.md`, berbanner DRAFT, sehingga Ganjar bisa mengujinya manual di umkm-pos lewat chat. Belum ada perubahan perilaku agent, command, atau output yang sudah ada.

## 2. Scope
Masuk:
- Template skill `caf-spec` (isi dari `caf-spec.source.md` di folder ini, dipakai apa adanya) dan penulisannya lewat `scaffold skills`.
- Pemetaan kind ke skill: `planner` ditambah `caf-spec`.
- Test untuk poin di atas.

Tidak masuk:
- Template `caf-planner` baru (Specify/Clarify/Plan/Tasks), `verify-report`, `validate-report`. Menunggu uji manual `caf-spec` lulus.
- Skill `caf-traceability`, `caf-design`, `caf-breakdown`, dan rename `caf-verify` ke `caf-self-verify`.
- Rename atau penghapusan agent dan command (rename `qa` ke `validator`, pembuangan 8 command, migrasi kind lama).
- Perubahan `caf-orchestrator`, `caf-website`, `CAF.md`.
- Menyembunyikan skill dari menu `/` (nama field frontmatter belum dicek).
- Menghapus banner DRAFT; itu dilakukan Ganjar setelah uji manual.

## 3. Constraint dan Asumsi
- Constraint: CLI tidak memanggil model; output deterministik. `writeIfAbsent` tidak menimpa file yang ada. Jalur dry-run dan write memakai helper yang sama. Placeholder guard `{{...}}` tetap berlaku.
- Constraint: snapshot `test/fixtures/snapshots/mono-pnpm.json` tidak boleh di-regenerate agar test lulus. Bila snapshot ternyata harus berubah, berhenti dengan `NEEDS_HUMAN`.
- Constraint: generator tidak pernah menulis pointer `## Skills` ke skill yang masih berbanner DRAFT (temuan CAF-SKILLS-01). Karena `caf-spec` lahir DRAFT, pointernya belum muncul di agent mana pun.
- Asumsi A1: skill baru mengikuti pola penulisan skill `caf-*` yang sudah ada di generator (lokasi file, builder `build*()`, daftar skill). Claude Code mencari polanya di kode, tidak membuat struktur baru.
- Asumsi A2: `caf-spec` hanya dipetakan ke kind `planner` untuk sekarang.
- Asumsi A3: nilai `Status:` di template (`DRAFT | NEEDS_CLARIFICATION | APPROVED`) belum dikunci untuk dibaca orchestrator; itu keputusan tiket orchestrator nanti.

## 4. Keputusan yang Sudah Diambil
- Skill hidup di `.claude/skills/`, bukan `.caf/knowledge/` (catatan CAF-SKILLS-01).
- Skill baru lahir DRAFT dan ditulis dengan banner 3 baris yang sudah terbukti (0 pelanggaran dari 10 run), persis seperti di `caf-spec.source.md`.
- Skill harus pendek karena tiap skill adalah satu `Read` wajib per run.
- Uji perilaku skill wajib lewat dispatch nyata dan dilakukan manual oleh Ganjar; bukan bagian tiket ini.
- Nama skill dan nama command tidak boleh sama persis (`caf-spec` aman; command-nya `/caf-plan`).

## 5. Pertanyaan Terbuka
- Q-1 [NON-BLOCKING] Setelah banner DRAFT dihapus, planner akan membaca `caf-spec`, `caf-scope-discipline`, `caf-no-guess` (3 Read). Apakah `caf-design` dan `caf-breakdown` kelak dibaca bersyarat, atau planner cukup 3 skill itu dulu? Asumsi sementara: 3 skill dulu, ditentukan di tiket planner. — Jawaban:
- Q-2 [NON-BLOCKING] Apakah `scaffold skills` menulis skill DRAFT secara default atau hanya dengan target eksplisit? Asumsi sementara: ikut default, sama seperti skill lain. Bila ternyata skill DRAFT lain menyalahi pola ini, ikuti pola yang ada dan catat di `verify-report.md`. — Jawaban:

## 6. Acceptance Criteria
- AC-1: Ketika `caf-init scaffold skills` dijalankan di repo uji yang belum punya skill tersebut, maka `.claude/skills/caf-spec/SKILL.md` ditulis dengan frontmatter `name: caf-spec` dan `description`, serta banner DRAFT 3 baris persis seperti di `caf-spec.source.md`. Verifikasi: tes otomatis di `test/` yang membaca file hasil.
- AC-2: Ketika file `caf-spec/SKILL.md` sudah ada, maka isinya tidak berubah setelah `scaffold skills` dijalankan ulang. Verifikasi: tes otomatis membandingkan isi sebelum dan sesudah.
- AC-3: Ketika `scaffold skills --dry-run` dijalankan, maka tidak ada file ditulis dan daftar yang dilaporkan sama dengan jalur write. Verifikasi: tes otomatis.
- AC-4: Ketika agent kind `planner` dirender, maka pemetaan kind ke skill memuat `caf-spec`, tetapi `## Skills` agent tidak berisi pointer ke `caf-spec` selama banner DRAFT ada. Verifikasi: tes otomatis atas pemetaan dan atas output agent.
- AC-5: Ketika `curate --check-drafts` dijalankan pada repo uji setelah AC-1, maka tidak ada FAIL baru akibat `caf-spec` (tanpa placeholder tersisa, banner dikenali). Verifikasi: tes otomatis atau eksekusi perintah di fixture, hasil dicatat di `verify-report.md`.
- AC-6: Ketika isi template skill dihitung, maka panjang `SKILL.md` tidak lebih dari 90 baris. Verifikasi: tes otomatis.
- AC-7: Ketika `npm test` dijalankan, maka seluruh test lama lulus dan snapshot `mono-pnpm.json` tidak diubah. Verifikasi: `npm test`; `git diff --stat` tidak menyentuh folder `test/fixtures/snapshots/`.