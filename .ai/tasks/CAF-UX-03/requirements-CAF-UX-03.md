## Ticket: CAF-UX-03 (internal, pra-tracker)
## Status: READY FOR PLAN

## Latar Belakang

Phase 3 (terakhir) dari UX redesign — gabungin 7 command (`setup`, `golden-examples`,
`adr`, `agents`, `task-completion`, `workflow`, `feature-catalog-sync`) jadi satu command
`scaffold`. Paling besar & paling berisiko dari 3 fase, karena ada logic baru (bukan cuma
rename kayak Phase 1, atau restrukturisasi sedang kayak Phase 2).

## Keputusan desain yang sudah diambil (bukan pertanyaan)

**A — `scaffold` bare TIDAK invoke `docs`.** Beda dari `full` lama yang include
`reference-docs` sebagai step 2. `docs` sekarang command terpisah (Phase 1), filosofinya
"opsional, gak pernah wajib" — `scaffold` gak lagi entangle sama itu.

**B — `feature-catalog-sync` cuma reachable via `scaffold feature-catalog-sync` eksplisit**,
gak pernah masuk default run-semua (`scaffold` bare). Alasan asli masih berlaku: output
butuh review manual sebelum usable.

**C — Hard dependency `workflow`→`agents` tetap keras.** `scaffold workflow` sendirian
tanpa `agents` roster ada → error jelas, BUKAN auto-trigger `agents` atau skip diam-diam.

## Scope

**In scope:**
- Command `scaffold` bare = urutan: Setup → Golden Examples → ADR → Agents →
  Task Completion → Workflow (per-step confirm, sama seperti `full` lama MINUS docs)
- `scaffold <target>` untuk jalanin satu bagian aja (`agents`, `golden-examples`, `adr`,
  `task-completion`, `workflow`, `feature-catalog-sync`) — behavior per-target sama persis
  kayak command individual yang lama
- Update semua referensi ke 7 nama command lama + `full` (README, CAF.md, error message
  hardcoded — grep-audit final wajib, sama seperti Phase 1 & 2)
- **Stretch-goal (boleh di-descope ke Phase 3b kalau PLAN nemu ini terlalu kompleks buat
  digabung sekarang):** pre-flight collision-scan — sebelum nanya apapun, scan semua
  target file lintas step; kalau satu step 100% bakal collision (semua file udah ada),
  skip prompt detail step itu, cukup laporan "sudah ada, dilewati"

**Eksplisit di luar scope:**
- `docs`, `curate`, `export` — sudah selesai/tetap terpisah, gak disentuh
- Redesign interactive-menu.js — kecuali emang perlu buat scaffold berfungsi, jangan
  expand ke bagian yang gak terkait

## Acceptance Criteria

### AC1 — `scaffold` bare (default run-semua)
- [ ] Urutan: Setup → Golden Examples → ADR → Agents → Task Completion → Workflow
- [ ] Per-step confirm (default yes), behavior identik `full` lama MINUS reference-docs
- [ ] Kalau Setup gagal (audit-stop/no-tracker) → chain berhenti total, sama seperti sekarang
- [ ] Kalau salah satu step lain error → chain berhenti, summary dicetak, sisa disaranin
      manual (behavior lama dipertahankan)

### AC2 — `scaffold <target>` (jalanin satu bagian)
- [ ] Tiap target (`agents`, `golden-examples`, `adr`, `task-completion`, `workflow`,
      `feature-catalog-sync`) bisa dipanggil sendiri, behavior identik command lama
- [ ] `scaffold workflow` tanpa `agents` roster → error jelas (dependency check tetap ada)
- [ ] `feature-catalog-sync` HANYA reachable lewat target eksplisit, TIDAK ada di
      `scaffold` bare

### AC3 — Referensi & command lama dihapus [DIPERLUAS setelah PLAN — real count jauh
### lebih besar dari perkiraan awal "3 pesan"]
- [ ] 7 deklarasi `program.command(...)` di `src/index.js` dihapus (`golden-examples`,
      `adr`, `agents`, `workflow`, `task-completion`, `feature-catalog-sync`, `full`) —
      `setup` gak ada CLI declaration sendiri, cuma internal call-site yang di-repoint
- [ ] `interactive-menu.js` — menu choices di-update rute ke `scaffold`/`scaffold <target>`
      (SEBATAS routing, bukan redesign menu lebih jauh — tetap sesuai scope)
- [ ] 4 hardcoded string command individual: `workflow.js:20`, `export.js:126`,
      `agents-sync.js:25` (3 yang diketahui dari awal), PLUS `agents.js:266` (baru ketemu)
- [ ] 6 string di `audit.js` (baris 80/83/87 `'caf-init full'`, 103
      `'caf-init golden-examples'`, 142 `'caf-init feature-catalog-sync'`, 223/237
      `'caf-init workflow'`, 233 `'caf-init task-completion'`) — ini render ke output
      `curate`, visibility tinggi, WAJIB gak kelewat
- [ ] 5 string di GENERATED TEMPLATE yang ditulis ke repo TARGET (bukan repo
      `caf-initiator` sendiri): `templates/audit-commands.js:279`,
      `templates/discovery-commands.js:52`, `templates/discovery-to-ticket.js:138`,
      `templates/run-pipeline-command.js:82`, `templates/feature-catalog.js:85` — ini
      paling kritis karena netap sebagai instruksi salah di project user kalau kelewat
- [ ] `README.md` — update usage block `full` + section header 6 command lain, SEKALIAN
      benerin gap pre-existing (belum ada section `task-completion`/`feature-catalog-sync`/
      `curate` sama sekali, meski itu udah ada sebelum ticket ini)
- [ ] `CAF.md` — dikonfirmasi TIDAK perlu perubahan (cuma prose konsep, gak ada referensi
      CLI command langsung)
- [ ] Grep-audit final ulang setelah semua di atas selesai, pastikan nol yang kelewat

## Stretch-goal DESCOPED ke Phase 3b (bukan bagian Phase 3 ini)
Pre-flight collision-scan TIDAK masuk Phase 3. Alasan dari PLAN: cuma 4/6 target
(Setup/Task Completion/Workflow/feature-catalog-sync) yang punya static path buat
di-precheck murah — 3 target (`golden-examples`/`adr`/`agents`, yang justru PALING sering
bikin annoying re-run) butuh refactor pemisahan "resolve selection" dari "write", bukan
sekadar wrapper. Partial implementation dianggap lebih membingungkan daripada none.

### AC4 — Verifikasi fungsional
- [ ] `scaffold` bare end-to-end di scratch repo kosong — hasil akhir identik generate
      dari `full` versi lama
- [ ] `scaffold agents` sendirian — identik `agents` versi lama
- [ ] `scaffold workflow` tanpa agents dulu — error yang benar muncul
- [ ] Kalau AC pre-flight collision-scan diimplementasi: scratch repo yang udah pernah
      di-`scaffold` sebelumnya, jalanin `scaffold` lagi — step yang 100% collision gak
      nanya prompt detail

## Non-negotiable constraints
- Behavior tiap sub-command individual TIDAK berubah, cuma cara aksesnya yang digabung
- Grep-audit final wajib
- Kalau stretch-goal (collision-scan) ternyata bikin scope meledak, STOP dan laporkan,
  jangan dipaksa masuk satu putaran — lebih baik split ke Phase 3b