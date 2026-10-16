# Verify Report — CAF-SDD-03b1

Ticket: CAF-SDD-03b1 — Kind `validator` dan format `validate-report` (tersembunyi)
Status: NEEDS_HUMAN
Tanggal: 2026-10-12
Branch: `ai-agent/CAF-SDD-03b1` (dari `main` c92ea57 = `origin/main`; SDD-03a, 03a2, 02, 02b ada di main: PR #16, #17, #18, #19)
Commit: tidak ada. Pengerjaan berhenti di akhir T1, sebelum `src/` atau `test/` disentuh.

## Ringkasan

T1 (audit baca-saja) menemukan bahwa spec tidak bisa dipenuhi tanpa mengubah test lama yang
dilarang diubah. Dua pertentangan bersifat mutlak (tidak ada rancangan yang lolos), tiga lagi
memaksa pilihan rancangan yang menyimpang dari tasks.md. Sesuai aturan tiket ("bila AC mustahil
atau bertentangan, STOP `NEEDS_HUMAN` dengan bukti"), T2 sampai T7 tidak dikerjakan.

Yang perlu diputuskan Ganjar ada di bagian "Keputusan yang dibutuhkan".

## Attempt Log

1. Persiapan: `git log` memuat merge 03a (f654b32), 03a2 (cd8ed1f), 02 (8877e55), 02b (c92ea57).
   Working tree bersih, `main` = `origin/main`. Branch dibuat. `requirements.md` dan `tasks.md`
   sudah ada di `.ai/tasks/CAF-SDD-03b1/`, dibaca habis, juga verify-report 03a2, 02, 02b.
2. Baseline `npm test`: 337 test, 336 lulus, 0 gagal, 1 todo.
3. T1: membaca `agent-md.js`, `agent-sections.js`, `agents.js`, `skill-md.js`, dan semua test yang
   mengiterasi `KNOWN_KINDS` atau mendaftar kind/skill secara literal.
4. Pembuktian: salinan repo (`git archive HEAD`) di scratchpad diberi patch minimal kind
   `validator` (6 baris), lalu `node --test` dijalankan di salinan itu. Repo ini tidak diubah;
   salinan sudah dihapus. Hasil di tabel pertentangan.
5. STOP.

## Pertentangan (bukti)

Patch percobaan: `validator` di `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, `TOOLS_BY_KIND`
(Read, Write, Bash), `HIDDEN_CANDIDATE_KINDS`, `SKILLS_BY_KIND`
(`caf-verify`, `caf-no-guess`, `caf-traceability`), dan Retry Logic sendiri ("hanya melapor").
Varian A: tanpa kandidat di `buildCandidates()`. Hasil: 10 test lama gagal.
Varian B: dengan kandidat tersembunyi di `buildCandidates()`. Hasil: 14 test lama gagal.

| # | Yang diminta spec | Test lama yang gagal | Bisa dihindari? |
|---|---|---|---|
| K1 | AC-7: `validator` memuat `caf-traceability` | `test/sdd02-planner-spec.test.js:371-373` "AC-8: caf-traceability maps to planner, frontend and backend, and to nothing else" (test SDD-02). Ia menyaring `[...KNOWN_KINDS, 'implementation']` dan menuntut tepat `['backend','frontend','planner']` | Tidak. AC-1 + AC-7 bersama-sama pasti menggagalkannya |
| K2 | §4 "Retry bukan urusan validator; ia hanya melapor", AC-4 (tidak mengedit kode maupun `verify-report.md`), constraint "satu-satunya berkas yang ditulis adalah `validate-report.md`" | `test/retry-logic-role-aware.test.js:76-84` dan `:86-102` (file yang diubah di 03a2). `DELIVERY_KINDS` (`:50-55`) = `KNOWN_KINDS` minus Discovery minus `qa`/`reviewer`, dan tiap kind di situ wajib merender teks "write `verify-report.md` with `Status: SUCCESS` ... fix, retry up to 3x" byte demi byte | Tidak. Begitu `validator` masuk `KNOWN_KINDS` (AC-1), Retry Logic-nya wajib menyuruh menulis `verify-report.md` dan memperbaiki kode, kebalikan dari spec |
| K3 | AC-1 dan AC-7 | Test di luar daftar yang boleh diubah: `test/skills-templates.test.js:69-79` "mapping (D7): exact table" (gagal dari AC-1 saja: kunci `validator` tidak ada di tabel literal); `test/skills-section.test.js:99-101` (daftar literal kind yang punya skill); `test/skills-pointer.test.js` 5 test (hitungan pointer 8 menjadi 9, mis. `:210`, `:221`, `:330`); `test/kind-guard.test.js:86` `assert.equal(EXPECTED_KINDS.length, 12)` dan nama test "all 12 kinds" | Tidak, kecuali `kind-guard:86` yang bisa dianggap bagian dari "daftar literal" |
| K4 | T3: tambah `validator` ke tabel literal `tools` di test 03a; AC-3: tersembunyi lewat `HIDDEN_CANDIDATE_KINDS` | Tabel itu dirender lewat `renderAgents()` (`test/helpers/frozen-kinds.js:55-61`), yaitu dari `buildCandidates()`. Kandidat di sana membuat: `test/repo-context.test.js` snapshot `mono-pnpm.json` gagal (helper `mono-snapshot.js:51-55` merender kandidat tersembunyi juga; `devops.md` sudah ada di snapshot), `test/devops-menu-hidden.test.js:24` (`candidates.length - 1`), dan `test/sdd02-planner-spec.test.js:148-170` ("validator: Output not covered") | Ya, bila `validator` TIDAK dimasukkan ke `buildCandidates()`. Akibatnya baris `validator` tidak bisa ditambahkan ke tabel `tools` di test 03a; tabel literalnya harus di test baru, dan entri `HIDDEN_CANDIDATE_KINDS` hanya menjadi penjaga (tidak menyaring apa pun) |
| K5 | T4/AC-8: `Input` validator dengan daftar app di monorepo, pola 03a2 | `test/false-drift.test.js:240-248` (03a2): untuk tiap kind selain `qa`/`reviewer`, `templateForExistingSection('Input', kind, body)` wajib sama dengan `buildInputSection(kind)` walau body memuat daftar app | Ya, bila `Input` validator kind-only (tanpa daftar app). AC-8 lalu terpenuhi secara trivial, bukan lewat `parseInputAppNames` |

Snapshot `mono-pnpm.json`: hanya berubah di varian B. Varian A tidak menyentuhnya.

## Keputusan yang dibutuhkan

1. **K1.** Izinkan mengubah satu asersi test SDD-02 (daftar kind yang dipetakan ke
   `caf-traceability` menjadi 4), atau cabut `caf-traceability` dari AC-7 untuk tiket ini.
2. **K2.** Izinkan menambah `'validator'` ke `CONTRACT_KINDS` di
   `test/retry-logic-role-aware.test.js:48` (satu kata; perlakuan yang sama dengan `qa`/`reviewer`),
   atau terima bahwa Retry Logic validator berisi teks generik (bertentangan dengan §4, tidak
   disarankan).
3. **K3.** Izinkan pembaruan daftar/hitungan literal di `skills-templates`, `skills-section`,
   `skills-pointer`, dan angka `12` di `kind-guard`. Di SDD-02 pembaruan sejenis diterima.
4. **K4.** Pilih: (a) `validator` tidak masuk `buildCandidates()` (snapshot aman, tabel `tools`
   validator di test baru), atau (b) masuk sebagai kandidat tersembunyi (snapshot `mono-pnpm.json`
   bertambah satu entri `caf-validator.md`, dua test lama lain ikut berubah). Usul: (a).
5. **K5.** Setujui `Input` validator tanpa daftar app. Alternatifnya mengubah test 03a2.

Usul saya: setujui 1 sampai 3 sebagai perubahan test sempit (total 6 file test, semuanya daftar
atau hitungan literal), 4(a), dan 5. Dengan itu T2 sampai T7 bisa dikerjakan tanpa mengubah
builder `qa`, 15 golden, atau snapshot.

## Acceptance Criteria

- AC-1: none — belum dikerjakan (STOP di T1)
- AC-2: none — belum dikerjakan; lihat K4 untuk letak tabel literal
- AC-3: none — belum dikerjakan; lihat K4
- AC-4: none — belum dikerjakan; bertentangan dengan test lama (K2)
- AC-5: none — belum dikerjakan
- AC-6: none — belum dikerjakan
- AC-7: none — belum dikerjakan; bertentangan dengan test SDD-02 (K1)
- AC-8: none — belum dikerjakan; lihat K5
- AC-9: command — `npm test` | exit 0 pada `main` tanpa perubahan (`# tests 337, # pass 336, # fail 0, # todo 1`); `git diff --stat` | keluaran kosong
- AC-10: command — `npm test` | exit 0 (baseline, sama dengan AC-9); todo fallback `implementation` ada di `test/kind-guard.test.js:115-117`
- AC-11: none — belum dikerjakan

## Quality Gate

- `npm test` (baseline, tanpa perubahan): exit 0. 337 test, 336 lulus, 0 gagal, 1 todo.
- Lint, typecheck, build: tidak ada di `package.json`.
- `src/`, `test/`, golden, snapshot: tidak tersentuh. `git status` bersih.

## Proposed Spec Changes

- §3 Constraint "test lain dari 03a/03a2/02/02b tidak berubah": tambahkan pengecualian untuk
  `sdd02-planner-spec.test.js` (asersi pemetaan `caf-traceability`) dan
  `retry-logic-role-aware.test.js` (`CONTRACT_KINDS`). Alasan: K1, K2.
- tasks.md aturan umum "satu-satunya perubahan test lama": tambahkan daftar/hitungan literal di
  `skills-templates`, `skills-section`, `skills-pointer`. Alasan: K3.
- T3 "perbarui dua daftar literal di test 03a": tabel `tools` tidak bisa memuat `validator`
  selama ia bukan kandidat `buildCandidates()`. Alasan: K4.
- AC-8 "(termasuk `Input` dengan daftar app di monorepo)": ubah menjadi "`Input` validator
  kind-only", atau izinkan perubahan test 03a2. Alasan: K5.
- AC-5: regex `qa-report` membaca nilai selain `PASS`/`FAIL` sebagai `FAIL`. `Status: NEEDS_HUMAN`
  cocok bentuknya tetapi terbaca `FAIL` oleh parser hari ini. Perlu dinyatakan sebagai perilaku
  yang diterima sampai SDD-04.

## Catatan

### Hasil T1

**(a) Mekanisme tersembunyi (jawaban Q-1).** `HIDDEN_CANDIDATE_KINDS` (`src/commands/agents.js:41`,
isi hari ini `['devops']`) dipakai di satu tempat saja: menyaring pilihan multiselect "Pick the
agents to generate" (`agents.js:415-417`). Definisi kandidat tetap ada di `buildCandidates()`
(`agents.js:210-216`). Tidak ada jalur eksplisit untuk memilih kind tersembunyi: tidak ada flag
`--agent <kind>` di CLI. Kandidat tersembunyi tetap dirender oleh helper test
(`mono-snapshot.js`, `frozen-kinds.js`), sehingga `devops.md` ada di snapshot. Jadi builder
validator hanya terjangkau dari test, sesuai dugaan Q-1. Catatan nama berkas: `devops` tidak ada
di `CAF_PREFIXED_KINDS` sehingga ditulis `devops.md`; `validator` harus masuk daftar itu agar
menjadi `caf-validator.md`.

**(b) Section template `qa` dan usulan nasibnya (jawaban Q-2).** Belum diimplementasikan.

| Section `qa` | Isi hari ini | Usul di validator |
|---|---|---|
| frontmatter | `name: caf-qa`, `tools: [Read, Write, Bash]`, `model: sonnet` | dibawa, nama `caf-validator` |
| Role | teks kandidat: "Verifies the implementation meets the ticket's acceptance criteria." | diubah: validasi per AC terhadap spec |
| Scope | TODO (diputuskan manual) | dibawa |
| Allowed Tools (ter-track) | daftar tools + alasan "Bash to run tests/build, Write for `qa-report.md`. Does NOT change code." | diubah: `validate-report.md`, perintah yang boleh, larangan mengedit |
| Input (ter-track) | `verify-report.md` dari implementation agent, dengan daftar app di monorepo | diubah: `requirements.md`, `tasks.md`, `verify-report.md`; tanpa daftar app (K5) |
| Output (ter-track) | satu baris, `qa-report.md` | diubah: `validate-report.md` |
| Skills | pointer bila skill ada dan bukan DRAFT | dibawa (pemetaan lihat e) |
| Working Pattern (PIV) (ter-track) | teks generik | dibawa apa adanya (dikunci test 03a2 `:188`) |
| Verify Checklist | dua baris TODO, karena `qa` bukan agent satu-app (`agent-md.js:49-54`) | dibawa; lihat (c) |
| Retry Logic (ter-track) | `Status: PASS`/`FAIL`, tidak memperbaiki kode, tidak retry | diubah: hanya melapor, `validate-report.md` (K2) |
| Report Format (ter-track) | skeleton `qa-report.md` + aturan `Status` | diubah: format `validate-report.md`, aturan status dan bukti per AC |

Tidak ada section yang dibuang. Tidak ada `## Constraints` di `qa`; validator juga tidak boleh
punya section antara `Skills` dan `Working Pattern (PIV)` kecuali pola yang ada.

**(c) Cara `qa` menjalankan Verify Checklist dan mencatat gap.** `qa` adalah kandidat tanpa app
(`agents.js:174-181`), jadi `## Verify Checklist`-nya bukan daftar perintah, melainkan dua TODO
("not a single app", "determine the relevant verification manually"). Perintah nyata ada di
Verify Checklist agent implementasi dan di skill `caf-verify`. Gap tidak punya bagian sendiri:
dicatat di `### Findings` dan `### Notes` pada `qa-report.md`, dan aturan "an unverified criterion
is a FAIL" (`agent-md.js:381-383`). Hal tak terduga: A4 mengandaikan `qa` menjalankan gerbang
repo dari checklist-nya sendiri; itu tidak benar hari ini. Bagian "gap gerbang verifikasi" di
AC-5 adalah hal baru, bukan bawaan `qa`.

**(d) Regex `Status:` untuk `qa-report`.** `test/qa-report-format.test.js:33`:
`/^.*Status:\s*(.+)$/m`, salinan `readQaReport()` di caf-orchestrator. Ter-anchor baris, peka
huruf besar pada `PASS`/`FAIL`, selain itu jatuh ke `FAIL`.

**(e) Pemetaan skill `qa`.** `['caf-verify', 'caf-no-guess']` (`src/templates/skill-md.js:39`).

**(f) Tempat lain yang menghitung atau mendaftar kind.**
- `src/`: `KNOWN_KINDS` (`agent-sections.js:131`), `CAF_PREFIXED_KINDS` (`agent-md.js:21`),
  `TOOLS_BY_KIND`/`TOOLS_RATIONALE` (`agent-md.js:231-266`), `ARTIFACT_BY_ROLE`
  (`artifact-by-role.js`), `SKILLS_BY_KIND` (`skill-md.js:34-44`), `HIDDEN_CANDIDATE_KINDS`,
  `APP_LIST_INPUT_KINDS` (`agent-sections.js:73`), `KNOWN_ROLES` (`read-agent-roster.js:13-27`),
  `DUMMY_ROSTER` (`canonical-sections.js:11-21`), `PREVIEW_COMMANDS` (`agents.js:43-48`).
- Test literal: `kind-guard` (dua daftar + angka 12), `helpers/frozen-kinds.js` (`FROZEN`),
  `skills-templates:69-79`, `skills-section:101`, `retry-logic-role-aware:48,188`,
  `sdd02-planner-spec:160-169, 371-373`.
- Test yang mengiterasi `KNOWN_KINDS`: `false-drift:246`, `retry-logic-role-aware:51`,
  `skills-pointer:39`, `skills-section:14`, `single-repo-scaffold:323`, `sdd02b-spec-v3:238`,
  `devops-kind-detection:66`.
- Docs: `CLAUDE.md:147` dan `:161` sudah menyebut `validate-report` dan "the validator"
  (CAF-SDD-03b, 04). `README.md:335` mendaftar nama agent yang dipanggil orchestrator. `CAF.md`
  hanya mengenal `qa-report.md`.

### Test lama yang diubah

Tidak ada.

### Hal tak terduga

1. Lima pertentangan di atas (K1 sampai K5).
2. `qa` tidak punya gerbang verifikasi repo yang nyata (lihat c).
3. `Status: NEEDS_HUMAN` terbaca `FAIL` oleh regex `qa-report` (lihat Proposed Spec Changes).
4. `.ai/` di-gitignore: laporan ini dan file tiket tidak ikut commit.
5. Branch `ai-agent/CAF-SDD-03b1` ada tetapi tanpa commit, sama dengan `main`.

## git diff --stat (main..HEAD)

```
(kosong)
```

Status: NEEDS_HUMAN
Test: 337 total, 336 lulus, 0 gagal, 1 todo (fallback `implementation`), baseline tanpa perubahan
Commit: tidak ada

---

# Lanjutan revisi 2

Bagian di atas adalah hasil T1 dan STOP pertama, dibiarkan apa adanya. Bagian ini menggantikan
status akhirnya.

Tanggal: 2026-10-12
Spec: `requirements.md` dan `tasks.md` revisi 2 (K1 sampai K5 dijawab), dibaca ulang sampai habis.
Commit: `08d2d91` (lokal; tidak di-push, tidak ada PR, tidak di-merge).

## Ringkasan

- Kind `validator` lengkap dalam satu commit: `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, tools
  (Read, Write, Bash), `ARTIFACT_BY_ROLE`, lima section ter-track dengan cabang sendiri, pemetaan
  skill, dan format `validate-report.md`.
- Tersembunyi sesuai K4(a): bukan entri `buildCandidates()`. Satu-satunya jalan merendernya
  adalah `buildValidatorAgent(dir, stack, { skills })` di `src/commands/agents.js:252`, yang hari
  ini hanya dipanggil dari test. Snapshot `mono-pnpm.json` dan 15 golden tidak tersentuh.
- `## Verify Checklist` validator dibangun dari `collectVerifyApps` (turunan yang sama dengan agent
  implementasi dan skill `caf-verify`). Output implementer tidak berubah, jadi syarat STOP T4b
  tidak terpicu.
- Builder `qa`, teks template kind lain, test 03a2 `false-drift`: tidak berubah.

## Attempt Log

1. T2: `test/sdd03b1-validator.test.js` ditulis lebih dulu. Merah: seluruh file gagal
   (`agents.js does not provide an export named 'buildValidatorAgent'`).
2. T3, T4, T4b: implementasi. Test baru: 29 dari 35 lulus. Enam gagal: 4 karena kesalahan di
   test saya sendiri (regex `/validator/` mengenai nama direktori sementara, diperbaiki dengan
   `path.basename`), 2 karena kalimat alasan tools ("No Edit: does NOT" vs yang diuji
   "Does NOT change"); teks template yang disesuaikan, bukan test.
3. Suite penuh: tepat 10 test lama gagal, sama dengan daftar varian A di T1 (K1, K2, K3). Tidak
   ada kegagalan di snapshot, golden, atau `false-drift`.
4. Daftar dan hitungan literal di enam file test yang diizinkan diperbarui. Hijau.
5. T6 docs. Satu test baru sempat gagal sesekali (1 dari 3 kali jalan): urutan app dari
   `detectStack` tidak stabil antar pemanggilan. Diperbaiki di `buildValidatorAgent` (app diurut
   menurut path) dan diberi test. Lihat "Hal tak terduga".
6. T5: `npm test` tiga kali berturut-turut, hasil sama. Commit.

## Acceptance Criteria

Semua test di `test/sdd03b1-validator.test.js`; "(2 fixture)" = `mono-pnpm` dan `single-nuxt`.

- AC-1: automated-test — ::"AC-1: caf-validator.md is detected as validator, and the 12 earlier kinds are all still known". Juga test/kind-guard.test.js::"AC-1: detectKind returns the kind itself for caf-<kind>.md of every known kind" dan ::"AC-5: all 13 kinds are still in KNOWN_KINDS". Kode: `src/utils/agent-sections.js:135`
- AC-2: automated-test — ::"AC-2: frontmatter tools of the validator match the literal table: Read, Write, Bash, no Edit". Kode: `src/templates/agent-md.js:252`
- AC-3: automated-test — ::"AC-3: validator is not a scaffold candidate in any mode", ::"AC-3: the frozen MONOREPO render has no caf-validator.md", ::"AC-3: scaffold agents on mono-pnpm writes no caf-validator.md", ::"AC-3: scaffold agents on single-nuxt writes no caf-validator.md", dan yang sama dengan `(--role frontend)` dan `(--role backend)`. Snapshot: test/repo-context.test.js "regression: MONOREPO detection + every rendered file is byte-identical to the pre-change snapshot" lulus tanpa diubah; `git diff --stat main..HEAD -- test/fixtures` kosong
- AC-4: automated-test — ::"AC-4: validator on <fixture> — sections, and what it reads", ::"AC-4: validator on <fixture> — runs the repo gate, judges every AC with three statuses and five evidence kinds", ::"AC-4: validator on <fixture> — the commands it may run, and what it never edits" (2 fixture). Kode: `src/templates/agent-md.js:734` (`VALIDATOR_WORKFLOW`), `:195` (Input), `:269` (alasan tools), `:564` (Retry Logic)
- AC-5: automated-test — ::"AC-5: validator on <fixture> — validate-report.md skeleton: Status, Unverified, per-AC table, gate gaps" dan ::"AC-5: validator on <fixture> — a filled-in report reads the way qa-report.md is read today" (2 fixture; regex disalin dari `test/qa-report-format.test.js:33`). Kode: `src/templates/agent-md.js:416`
- AC-6: automated-test — ::"AC-6: validator on <fixture> — PASS needs evidence it ran itself; manual and build-only are UNVERIFIED", ::"… a test that imports no production code is not evidence", ::"… an AC with no evidence line is UNVERIFIED \"no evidence reported\", not FAIL", ::"… run and contradicted is FAIL with the observed output" (2 fixture)
- AC-7: automated-test — ::"AC-7: validator maps to the skills of qa plus caf-traceability" dan ::"AC-7: validator on <fixture> — no pointer at caf-traceability while it is a DRAFT; the others follow the usual rule" (2 fixture; `scaffold skills` sungguhan di salinan fixture). Kode: `src/templates/skill-md.js:42`
- AC-8: automated-test — ::"AC-8: validator on <fixture> — after baseline every tracked section is IN_SYNC and curate sync changes no byte" (2 fixture; audit `{ IN_SYNC: 6 }`, dry-run lalu write, file dan manifest byte-identik) dan ::"AC-8: the Input of the validator is kind-only: no app list, the same text in both fixtures"
- AC-9: command — `npm test` | exit 0 (`# tests 373, # pass 372, # fail 0, # todo 1`); `git diff --stat main..HEAD -- test/fixtures/frozen-kinds test/fixtures/snapshots` | keluaran kosong; `git diff --stat main..HEAD -- test/false-drift.test.js test/frozen-kinds.test.js test/helpers` | keluaran kosong
- AC-10: command — `npm test` | exit 0, tiga kali berturut-turut dengan hasil sama; todo fallback `implementation` masih ada di `test/kind-guard.test.js:116-118`
- AC-11: automated-test — ::"AC-11: validator on mono-pnpm — its Verify Checklist is the frontend and backend checklists, per app", ::"AC-11: validator on single-nuxt — its Verify Checklist is the implementer checklist, byte for byte", ::"AC-11: the validator checklist is not the two-line placeholder qa has". Output implementer utuh: golden `implementer.single-nuxt.json` dan snapshot (frontend, backend) lulus tanpa diubah. Kode: `src/commands/agents.js:252-266`
- AC-12: manual — dibaca: `README.md:146` (catatan di daftar agent) dan `README.md:328-367` (bagian "The validator kind (hidden)": tidak ditawarkan, tools, perintah yang boleh, tabel tiga status, skeleton `validate-report.md`, arti `Status`). `CLAUDE.md:298` sampai akhir (bagian baru) dan `CLAUDE.md:167-168` (pemetaan `caf-traceability` kini menyebut `validator`). Klaim lama "planner, frontend and backend only" sudah diganti; tidak ditemukan klaim lain yang bertentangan

Yang TIDAK dibuktikan: tidak ada dispatch agent sungguhan. Semua bukti AC-4 sampai AC-6 adalah
teks template, bukan perilaku validator. Apakah model benar-benar memberi `UNVERIFIED` alih-alih
`PASS` belum diuji.

## Quality Gate

- `npm test`: exit 0. 373 test (337 lama + 36 baru), 372 lulus, 0 gagal, 1 todo.
- Lint, typecheck, build: tidak ada di `package.json`.
- 15 golden `frozen-kinds` dan `snapshots/mono-pnpm.json`: tidak tersentuh.
- `curate sync`, `scaffold agents`, `scaffold skills` hanya dijalankan pada salinan fixture di
  direktori sementara.

## Proposed Spec Changes

-

## Catatan

### Jawaban Q-1

Tidak berubah dari T1: `HIDDEN_CANDIDATE_KINDS` hanya menyaring pilihan multiselect, dan tidak ada
jalur eksplisit untuk memilih kind tersembunyi. Dengan K4(a) validator bahkan bukan kandidat, jadi
`HIDDEN_CANDIDATE_KINDS` tidak diubah (tetap `['devops']`). Builder terjangkau dari test saja,
lewat `buildValidatorAgent`.

### Jawaban Q-2: nasib tiap section `qa` di validator (yang dibangun)

| Section | Nasib | Isi di validator |
|---|---|---|
| frontmatter | dibawa | `name: caf-validator`, `tools: [Read, Write, Bash]`, `model: sonnet` |
| Role | diubah | validasi tiap AC spec dan melaporkan bukti yang bisa dikonfirmasi |
| Scope | dibawa | TODO, diputuskan manual |
| Allowed Tools | diubah | Bash hanya untuk Verify Checklist dan git baca-saja; Write hanya `validate-report.md`; tanpa Edit |
| Input | diubah | `requirements.md`, `tasks.md`, `verify-report.md`; kind-only, tanpa daftar app (K5) |
| Output | diubah | baris kontrak `validate-report.md` + alur: Read, gerbang repo, penilaian per AC, perintah yang boleh, larangan |
| Skills | dibawa | skill `qa` + `caf-traceability` (tanpa pointer selama DRAFT) |
| Working Pattern (PIV) | dibawa apa adanya | teks generik |
| Verify Checklist | diubah | perintah nyata dari `collectVerifyApps`, per app di monorepo; `qa` tetap dua baris TODO |
| Retry Logic | diubah | tidak retry, tidak memperbaiki; `NEEDS_HUMAN` bila input hilang |
| Report Format | diubah | skeleton `validate-report.md` dan aturan `Status` / `Unverified` |

Tidak ada section yang dibuang.

### Test lama yang diubah (enam file, hanya daftar dan hitungan kind)

| File | Perubahan | Alasan |
|---|---|---|
| `test/kind-guard.test.js` | `EXPECTED_KINDS` + `'validator'`; `length, 12` menjadi `13`; nama test "all 12 kinds" menjadi "all 13 kinds" | K3. Tabel `EXPECTED_TOOLS` tidak disentuh (K4a: tabel validator di test baru) |
| `test/retry-logic-role-aware.test.js` | `CONTRACT_KINDS` + `'validator'` | K2 |
| `test/sdd02-planner-spec.test.js` | daftar kind `caf-traceability` + `'validator'`; nama test menyebut validator | K1 |
| `test/skills-templates.test.js` | satu baris di tabel pemetaan: `validator: [...]` | K3 |
| `test/skills-section.test.js` | daftar kind yang punya skill + `'validator'` | K3 |
| `test/skills-pointer.test.js` | tiga hitungan pointer 8 menjadi 9; satu filter nama file + `'caf-validator.md'` | K3 |

Dua hal yang melampaui "angka dan daftar" secara harfiah, keduanya di file yang diizinkan:
- Dua nama test diubah agar tidak berbohong tentang isinya (bukan asersi).
- `skills-pointer.test.js:295`: filter `f !== 'caf-qa.md'` ditambah `&& f !== 'caf-validator.md'`.
  Itu daftar file yang tidak ditanya karena tidak punya skill yang bisa dipakai di skenario itu;
  validator masuk kelompok yang sama dengan `qa`. Tidak terlihat di T1 karena tertutup kegagalan
  hitungan.

### Hal tak terduga

1. **Urutan app dari `detectStack` tidak stabil.** Dua pemanggilan pada direktori yang sama bisa
   mengembalikan `apps/api, apps/web` atau sebaliknya. Checklist validator mencakup semua app, jadi
   file hasil render sempat berbeda antar pemanggilan. `buildValidatorAgent` kini mengurutkan app
   menurut path (sama dengan yang dilakukan `buildVerifySkill`), dengan test "deterministic: …".
   Akar masalahnya di deteksi, di luar tiket ini; helper snapshot sudah menyiasatinya dengan
   `sortedApps`.
2. **Validator mencakup semua app yang terdeteksi**, bukan hanya app yang ditugaskan ke
   frontend/backend. Penugasan itu dipilih lewat prompt dan tidak disimpan di mana pun, jadi tidak
   bisa dibaca saat merender. Di fixture keduanya sama (dua app). Di monorepo dengan app ketiga,
   checklist validator akan lebih luas dari gabungan frontend dan backend. Perlu diputuskan di
   tiket penyambungan.
3. **`ARTIFACT_BY_ROLE` mendapat entri `validator`** (`artifact-by-role.js:10`), supaya baris
   kontrak Output berasal dari sumber yang sama dengan kind lain. Tidak mengubah `agent-handoff.md`:
   roster hanya membaca kind yang file agent-nya ada.
4. **Lima jenis bukti kini ada di tiga tempat** (format verify-report, skill `caf-traceability`,
   alur validator). Tidak ada test yang membandingkan ketiganya; dicatat di CLAUDE.md.
5. **`Status: NEEDS_HUMAN` terbaca bukan-lulus** oleh regex `qa-report` hari ini. Dikunci di test
   AC-5 sebagai perilaku fail-safe; kebijakan akhirnya milik SDD-04.
6. **Teks validator menyebut "the Reviewer" dan "the next agent"**, padahal belum ada agent yang
   membaca `validate-report.md`. Mengikuti gaya `qa`; benar setelah disambungkan.
7. Working Pattern generik berbunyi "don't touch code yet / execute per the plan". Kurang pas untuk
   agent yang tidak menulis kode, tetapi section itu dikunci ke teks generik untuk semua kind
   non-Discovery (test 03a2), sama seperti `qa`.
8. `.ai/` di-gitignore: laporan ini dan file tiket tidak ikut commit.

## git diff --stat (main..HEAD)

```
 CLAUDE.md                           |  41 +++-
 README.md                           |  42 ++++
 src/commands/agents.js              |  31 ++-
 src/templates/agent-md.js           | 161 ++++++++++++-
 src/templates/artifact-by-role.js   |   1 +
 src/templates/skill-md.js           |   5 +-
 src/utils/agent-sections.js         |   6 +-
 test/kind-guard.test.js             |   5 +-
 test/retry-logic-role-aware.test.js |   2 +-
 test/sdd02-planner-spec.test.js     |   4 +-
 test/sdd03b1-validator.test.js      | 458 ++++++++++++++++++++++++++++++++++++
 test/skills-pointer.test.js         |  11 +-
 test/skills-section.test.js         |   2 +-
 test/skills-templates.test.js       |   1 +
 14 files changed, 751 insertions(+), 19 deletions(-)
```

Status: SUCCESS
Test: 373 total, 372 lulus, 0 gagal, 1 todo (fallback `implementation`)
Commit: 08d2d91
