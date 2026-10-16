# CAF-SDD-03c2d — skill `caf-verify` menjadi `caf-self-verify`; peringatan pointer skill yang sudah berganti nama
Status: APPROVED (Q-1 dan Q-2 diputuskan konsultan, Ganjar boleh membatalkan; keputusan lain berasal dari kesepakatan SDD 12 Okt 2026 dan sisa 03c2c di CAF-SDD-PROGRESS.md)
Source: chat (kesepakatan SDD: "`caf-verify` renamed `caf-self-verify`"; "Left for ..." di CLAUDE.md bagian 03c2/03c2b)
Repo target: `caf-initiator`
Bergantung pada: 03c2c ter-merge (menyentuh README.md, CLAUDE.md, CAF.md di bagian yang berdekatan).

## 1. Outcome
Repo baru hasil `caf-init` memakai skill `caf-self-verify` (isi sama dengan `caf-verify` yang lama), sehingga namanya membedakan verifikasi mandiri agent implementasi dari validasi terhadap spec oleh `caf-validator`. Repo lama tidak rusak: folder `caf-verify` dan pointer agent lama tetap berfungsi sampai pengguna memindahkannya, dan `curate audit` memberi tahu bila sebuah agent masih menunjuk nama lama padahal skill baru sudah aktif di repo itu.

## 2. Scope
In:
- Nama skill di `src/templates/skill-md.js`: `SKILL_NAMES`, `IMPLEMENTATION_SKILLS`, `SKILLS_BY_KIND` (`qa`, `validator`), peta pembangun di `buildSkillFiles`, nama dan teks skill yang menyebut dirinya, teks `caf-piv` yang menyebut skill itu.
- `scaffold skills` di repo yang sudah punya `.claude/skills/caf-verify/`: folder lama tidak disentuh, `caf-self-verify` ditulis di sampingnya, satu catatan dicetak (Q-1); baris "not listed there" untuk agent yang masih menunjuk nama lama menyebut penggantian nama.
- `curate audit`: peringatan rollout baru `skill-renamed` (Q-2).
- Test, golden pra-tiket, README.md, CLAUDE.md, CAF.md (hanya rujukan nama skill dan bagian perilaku saat ini).

Out:
- Nama fungsi dan berkas builder (`buildVerifySkill`, `buildVerifyChecklist`), nama kind, isi aturan skill selain namanya.
- Penghapusan folder `caf-verify` di repo lama; `curate sync` atau `scaffold skills` yang mengedit `## Skills` agent (tetap tidak pernah).
- Skill lain (`caf-scope-discipline`, `caf-no-guess`, `caf-escalate`, `caf-piv`, `caf-spec`, `caf-traceability`), banner DRAFT, `tools:` agent, `## Input`/`## Output`, golden `frozen-kinds`.
- Nama command, orchestrator (tidak merujuk skill; cek 15 Okt 2026).

## 3. Constraints and Assumptions
- Finding (cek orchestrator, 15 Okt 2026): orchestrator tidak memanggil atau menyebut skill `caf-verify`; ia menjalankan agent lewat `claude --agent <nama>`.
- Finding: teks agent hanya menyebut skill lewat jalur `.claude/skills/<nama>/SKILL.md` di bagian `## Skills` (pointer `Read`); `src/` menyebut nama `caf-verify` di `skill-md.js`, dan di komentar `skills.js` dan `agents.js`.
- Finding: skill tidak di-track `curate`, dan `curate`/`scaffold skills` tidak pernah mengedit bagian `## Skills` agent yang sudah ada (CAF-SDD-02d).
- Finding: `usableSkillPaths(dir, kind)` hanya memuat skill kind itu yang berkas-nya ada dan tanpa banner DRAFT; `rolloutWarnings` memakainya untuk peringatan `skill-pointer`; peringatan hanya `warn`, tidak mengubah exit code.
- Finding: `check-drafts` dan `complete-drafts` mengenali skill dari path (`.claude/skills/*/SKILL.md`), bukan dari nama; folder `caf-verify` lama tetap terbaca.
- Finding: `detectSkillDirCollision` hanya membandingkan `caf-x/` dengan `x/`; `caf-self-verify/` tidak bertabrakan dengan `caf-verify/`.
- Constraint: isi skill baru identik dengan skill lama hasil sebelum tiket kecuali nama (`name:` di frontmatter dan setiap penyebutan nama skill itu); banner DRAFT dan aturan TODO sama seperti sekarang.
- Constraint: `SKILLS_BY_KIND` tidak berubah selain nama, dan urutan skill per kind tidak berubah (`caf-self-verify` tetap pertama bagi kind implementasi dan `qa`/`validator`).
- Constraint: agent dan hasil scaffold yang tidak berpointer skill (default tanpa `scaffold skills`) tidak berubah satu byte pun; golden `frozen-kinds` dan entri snapshot lain tidak berubah.
- Constraint: tidak ada flag CLI baru; kosakata disalin dari teks yang sudah ada; kata TODO tidak ditulis literal di teks baru; CLI tidak memanggil model; output deterministik; placeholder guard tetap.
- Assumption A1 (T1): tidak ada berkas hasil scaffold default (tanpa `scaffold skills`) yang menyebut `caf-verify`; dasar: `git grep` konsultan atas `src/` hanya menemukan `skill-md.js`, `skills.js`, `agents.js` (komentar). T1 mencatat semua tempat nama itu muncul di `src/`, `test/` (termasuk helper dan fixture), dan dokumentasi.
- Assumption A2 (T1): fixture `curate-old-repo.*.json` (pra-sdd03c1) tidak memuat folder skill sehingga laporan `curate audit`-nya tidak berubah; dasar: tidak ada rujukan `skills` di sana. Mengingat pelajaran 03c2b (fixture repo lama dirender dengan builder terbaru), T1 memastikan fixture repo lama tidak berisi `caf-verify` atau `caf-self-verify`.
- Assumption A3 (T1): golden `pre-sdd03d` (agent frontend, backend, implementer dengan `## Skills`) memuat pointer `.claude/skills/caf-verify/SKILL.md` dan hanya itu yang berubah; test lama yang memakainya diperbarui lewat helper tukar nama, golden tidak diregenerasi.
- Assumption A4 (T1): entri snapshot `mono-pnpm.json` tidak berubah karena `scaffold skills` bukan bagian scaffold default dan agent default tidak berpointer. Bila ternyata ada yang berubah, daftar di `verify-report.md` dan AC-9 berlaku.
- Assumption A5: branch `ai-agent/CAF-SDD-03c2d` dari main terbaru yang sudah memuat 03c2c.

## 4. Decisions Already Made
- `caf-verify` menjadi `caf-self-verify`; `caf-scope-discipline`, `caf-no-guess`, `caf-escalate` tetap (kesepakatan SDD 12 Okt 2026).
- Perubahan skill tidak mencapai repo lama otomatis; `curate sync` tidak menulis `## Skills` dan `scaffold skills` tidak pernah mengedit agent yang sudah punya `## Skills` (CAF-SDD-02d).
- Peringatan rollout adalah `warn` saja, tidak pernah gap, tidak mengubah exit code (CAF-SDD-02d, 03c2b).
- Tahap pertama penghentian nama = berhenti menulis nama lama; berkas lama di repo tidak dihapus (CAF-SDD-03c1, 03c2c).
- Q-1: `scaffold skills` di repo yang punya `.claude/skills/caf-verify/` menulis `caf-self-verify` di sampingnya, tidak menyentuh folder lama, dan mencetak satu catatan (konsultan, 15 Okt 2026).
- Q-2: peringatan `skill-renamed` menggantikan `skill-pointer` untuk path yang sama, hanya bila agent menunjuk nama lama dan skill baru aktif di repo itu (konsultan, 15 Okt 2026).

## 5. Open Questions
- Q-1 [NON-BLOCKING] Repo yang sudah punya `.claude/skills/caf-verify/` dan menjalankan `scaffold skills` lagi: (a) `caf-self-verify` ditulis di sampingnya, folder lama tidak disentuh, satu catatan dicetak (rekomendasi: migrasi eksplisit, pola 03c2 dan 03c2c; agent baru yang di-scaffold bisa langsung menunjuk skill baru), atau (b) `caf-self-verify` tidak ditulis selama folder lama ada (agent baru tidak mendapat pointer verifikasi)? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).
- Q-2 [NON-BLOCKING] Agent lama menunjuk `caf-verify` sementara `caf-self-verify` aktif di repo yang sama: (a) satu peringatan `skill-renamed` yang menyebut pointer lama dan baru, tanpa peringatan `skill-pointer` ganda (rekomendasi), atau (b) tidak ada peringatan baru, hanya `skill-pointer` yang sudah ada (pesannya "tidak ada pointer", menyesatkan karena pointer lama masih ada)? — Answer: (a) (keputusan konsultan; Ganjar boleh membatalkan).

## 6. Acceptance Criteria
- AC-1: When `SKILL_NAMES`, `SKILLS_BY_KIND` dan `scaffold skills` (fixture `mono-pnpm` dan `single-nuxt`) diperiksa, then `caf-self-verify` ada dan `caf-verify` tidak, `.claude/skills/caf-self-verify/SKILL.md` ditulis dan `.claude/skills/caf-verify/` tidak, enam skill lain identik byte-for-byte dengan golden pra-tiket, urutan skill per kind tidak berubah, dan isi `caf-self-verify` sama dengan golden `caf-verify` setelah `caf-verify` diganti `caf-self-verify` (dan hanya itu). Verify: automated test dengan golden `test/fixtures/pre-sdd03c2d/`.
- AC-2: When agent di-scaffold setelah `scaffold skills` (fixture `single-nuxt` dan `mono-pnpm`, kind frontend, backend, implementer, qa, validator), then `## Skills` menunjuk `.claude/skills/caf-self-verify/SKILL.md` di tempat yang dulu `caf-verify`, urutan sama, dan hasilnya sama dengan golden pra-tiket setelah penggantian nama itu (dan hanya itu). Verify: automated test.
- AC-3: When `scaffold skills` dijalankan (juga `--dry-run` dan `--force`) di repo sementara yang sudah punya `.claude/skills/caf-verify/SKILL.md` (termasuk versi yang dikustomisasi), then berkas itu identik byte-for-byte, `caf-self-verify` ditulis (atau dilaporkan akan ditulis pada dry-run), dan satu catatan dicetak yang menyebut folder lama boleh dihapus setelah pointer agent dipindahkan dengan tangan; when repo tanpa folder lama, then catatan tidak dicetak, dan `caf-self-verify` tidak memicu tabrakan nama (exit code 0). Verify: automated test.
- AC-4: When `scaffold skills` dijalankan di repo yang agent-nya sudah punya `## Skills` dengan pointer `.claude/skills/caf-verify/SKILL.md` dan `caf-self-verify` aktif, then agent itu tidak diubah satu byte pun dan baris "not listed there" menyebut bahwa pointer lama diganti namanya menjadi `caf-self-verify`; when agent tanpa pointer lama, then barisnya sama seperti sebelum tiket. Verify: automated test.
- AC-5: When `curate audit` dijalankan di repo yang agent kind-nya punya skill (bukan `implementation`) menunjuk `.claude/skills/caf-verify/SKILL.md` di `## Skills` dan `caf-self-verify` aktif (berkas ada, tanpa DRAFT) tetapi belum ditunjuk, then tepat satu peringatan `skill-renamed` per agent menyebut pointer lama dan baru dan bahwa `curate sync` dan `scaffold skills` tidak mengedit `## Skills`, tidak ada peringatan `skill-pointer` untuk path itu, dan exit code tidak berubah; when `caf-self-verify` tidak ada, atau masih DRAFT, atau agent sudah menunjuknya, then tidak ada peringatan `skill-renamed`; when agent tanpa pointer apa pun dan `caf-self-verify` aktif, then peringatan `skill-pointer` yang sudah ada tetap (kini menyebut path baru). `curate`/`curate sync` tidak menulis apa pun ke agent itu. Verify: automated test.
- AC-6: When `curate audit` dijalankan pada fixture repo lama, then laporannya sama persis dengan yang direkam. Verify: automated test (`test/fixtures/pre-sdd03c1/curate-old-repo.*.json`), dan test yang membangun repo lama dengan folder `caf-verify` serta pointer lama menggunakan teks lama (bukan builder terbaru).
- AC-7: When `check-drafts` dan `complete-drafts` dijalankan di repo dengan `.claude/skills/caf-verify/SKILL.md` ber-DRAFT, then temuannya sama seperti sebelum tiket (folder lama tetap terbaca). Verify: automated test.
- AC-8: When semua berkas hasil scaffold default (tanpa dan dengan `scaffold skills`) serta teks yang dicetak `skills` dan `agents` diperiksa, then tidak ada yang menyebut `caf-verify` sebagai skill yang tersedia, kecuali catatan Q-1, baris AC-4, dan peringatan AC-5. Verify: automated test atas hasil render; lalu command: `git grep -n "caf-verify" -- src` | expect: kosong, atau hanya baris yang memang menyebut nama lama (konstanta nama lama, catatan Q-1, baris AC-4, peringatan AC-5, komentar sejarah) dicatat satu per satu di `verify-report.md`.
- AC-9: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then tidak ada entri yang berubah, dan golden `frozen-kinds` tidak berubah; bila ada yang berubah, dicatat per entri. Verify: manual: jalankan regenerasi, baca `git diff` snapshot dan `git diff --stat -- test/fixtures/frozen-kinds/`, cocokkan dengan hasil T1.
- AC-10: When README.md, CLAUDE.md, dan CAF.md dibaca, then bagian perilaku saat ini menyebut skill `caf-self-verify` (bukan `caf-verify`), pola migrasi Q-1, peringatan `skill-renamed`, dan pemetaan skill per kind yang sama; rujukan contoh tabrakan nama (`caf-verify/` vs `verify/`) diganti `caf-self-verify/` vs `self-verify/`; catatan sejarah tiket sebelumnya tidak ditulis ulang. Verify: manual: baca bagian terkait.
- AC-11: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
