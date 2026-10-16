# Verify Report — CAF-SDD-03d

Status: SUCCESS

Branch `ai-agent/CAF-SDD-03d`, 5 commit lokal di atas main (43ac420). Tidak ada push, PR, merge
atau publish. `curate sync` hanya dijalankan test pada salinan fixture di direktori sementara.

## Checklist
- [x] syarat mulai (run 2): `Status: APPROVED` revisi 2, K-1 terjawab, branch benar, tree bersih
- [x] `npm test` sebelum mulai: 529 total, 528 lulus, 0 gagal, 1 todo
- [x] `npm test` akhir: 590 total, 589 lulus, 0 gagal, 1 todo, exit 0
- [x] lint / typecheck / build: tidak ada di `package.json` (hanya `npm test`)
- [x] T1 sampai T9

## Acceptance Criteria
- AC-1: automated-test — test/sdd03d-implementation-spec.test.js::AC-1: <case> — reads requirements.md, tasks.md and verify-report.md (if present) before changing code (5 case)
- AC-2: automated-test — test/sdd03d-implementation-spec.test.js::AC-2: <case> — every AC is a contract, the ACs in scope are implemented, an AC that cannot be met is reported (5 case)
- AC-3: automated-test — test/sdd03d-implementation-spec.test.js::AC-3: <case> — never writes requirements.md or tasks.md, proposals go to "## Proposed Spec Changes" (5 case)
- AC-4: automated-test — test/sdd03d-implementation-spec.test.js::AC-4: the evidence lines are the five of the verify-report format, and the kinds are the validator's; juga AC-4: <case> — five evidence kinds, ... (5 case)
- AC-5: automated-test — test/sdd03d-implementation-spec.test.js::AC-5: <case> — stops with Status: NEEDS_HUMAN on NEEDS_CLARIFICATION, an unanswered BLOCKING question, or an unclear spec; DRAFT and APPROVED go on (5 case)
- AC-6: automated-test — test/sdd03d-implementation-spec.test.js::AC-6: <case> — only "## Output" differs from the golden; juga AC-6: <case> — "## Skills" is unchanged, AC-6: the three kinds share one text, AC-6: the `implementation` fallback and every other kind keep the Output they had
- AC-7: automated-test — test/sdd03d-implementation-spec.test.js::AC-7: <repo> — the old Output is synced to the new text (dry-run, then write), no other section or file changes; juga varian CONFLICT, CUSTOMIZATION, UNTRACKED (4 repo) dan AC-7: mono-pnpm — only one of the two agents customized
- AC-8: manual — `git diff main -- test/fixtures/snapshots/mono-pnpm.json` dibaca: 2 baris berubah, `.claude/agents/caf-frontend.md` dan `.claude/agents/caf-backend.md`, cocok dengan daftar T1; skrip regenerasi menolak menulis bila ada entri lain. Perlu dicek ulang manusia.
- AC-9: command — `npm test` | exit 0 (590 total, 589 lulus, 0 gagal, 1 todo); `git diff --stat main -- test/fixtures/frozen-kinds/` | hanya `implementer.single-nuxt.json`, 1 baris masuk dan 1 keluar, keduanya baris `"Output"`; test todo `AC-7: an unknown kind (caf-foo.md) ...` di test/kind-guard.test.js masih ada
- AC-10: manual — README bagian "The spec-aware implementation agents" dan CLAUDE.md paragraf "The implementation agents are spec-aware since CAF-SDD-03d"; perlu dibaca manusia

`<case>`: frontend.mono-pnpm, backend.mono-pnpm, implementer.single-nuxt, frontend.single-nuxt,
backend.single-nuxt (dua terakhir = `--role`).

## Commit
- a655372 Record the pre-SDD-03d implementation agent renders as a golden
- 4fe9223 Add failing tests for the spec-aware implementation agents
- ccf83cc Make the frontend, backend and implementer agents spec-aware
- b21792f Regenerate the MONOREPO snapshot for the spec-aware implementation agents
- 2d51f60 Document the spec-aware implementation agents and their rollout

## git diff --stat main
15 berkas, 714 baris masuk, 10 keluar. `src/`: hanya `src/templates/agent-md.js` (+77).
Baru: `test/sdd03d-implementation-spec.test.js`, `test/helpers/implementation-agents.js`,
6 berkas `test/fixtures/pre-sdd03d/`. Diubah: `CLAUDE.md`, `README.md`,
`test/discovery-sections.test.js`, `test/sdd02-planner-spec.test.js`,
`test/fixtures/frozen-kinds/implementer.single-nuxt.json`, `test/fixtures/snapshots/mono-pnpm.json`.

## Test lama yang diubah
- `test/discovery-sections.test.js` (regression Allowed Tools/Input/Output): mengunci
  `buildOutputSection('frontend')` sama persis dengan satu baris. Sekarang memeriksa baris pertama,
  dan ditambah satu assert bahwa `implementation` tetap satu baris itu.
- `test/sdd02-planner-spec.test.js` ("only the planner changed on <fixture>"): tabel `OUTPUT`
  mengunci satu baris untuk frontend, backend, implementer. Tiga entri itu dipindah ke cek baris
  pertama, pola yang sama dengan reviewer sejak 03b2.
- `test/frozen-kinds.test.js`: tidak diubah. Golden implementer diedit (K-1), hanya `sections.Output`.
- `test/false-drift.test.js`: diperiksa, tidak diubah. Repo legacy-manifest hanya memuat qa dan
  reviewer, jadi tetap tepat satu `DRIFT`.

## Entri snapshot yang berubah
- `mono-pnpm.json`: `.claude/agents/caf-frontend.md` — hanya isi `## Output`.
- `mono-pnpm.json`: `.claude/agents/caf-backend.md` — hanya isi `## Output`.
- Tidak ada entri implementer (MONOREPO). Urutan kunci dan format berkas sama.

## Hal tak terduga
- Tidak ada langkah yang diblokir classifier izin.
- Golden pra-tiket mencakup 5 case, bukan 3: dua agent `--role frontend|backend` di SINGLE_REPO
  ikut direkam karena memakai kind yang sama.
- Komentar di `VALIDATOR_WORKFLOW`/`REVIEWER_SPEC_WORKFLOW` masih berkata "all four"; tidak
  disentuh (di luar scope). CLAUDE.md sudah berkata lima tempat.

## Proposed Spec Changes
-

## Hasil T1

### Di mana `## Output` dibangun (A2)
Satu builder: `buildOutputSection(kind)` di `src/templates/agent-md.js`. Frontend, backend dan
implementer jatuh ke cabang akhir `return contract` (satu baris, artefak dari `ARTIFACT_BY_ROLE`).
Planner, validator dan reviewer sudah punya cabang `contract + workflow`. A2 benar: satu builder.

Catatan: kind fallback `implementation` memakai artefak `frontend` di builder yang sama. Cabang
baru harus memeriksa `frontend`/`backend`/`implementer` secara eksplisit supaya `implementation`
tidak ikut berubah.

### `curate sync` melacak `## Output` (A3)
Ya. `SYNCABLE_SECTIONS.Output = (kind) => buildOutputSection(kind)` di
`src/utils/agent-sections.js`, berlaku untuk semua kind. Ketiga kind bukan `APP_LIST_INPUT_KINDS`,
jadi `templateForExistingSection` mengembalikan teks kind-only. A3 benar.

### Kosakata yang harus disalin
- Lima jenis bukti: `automated-test`, `command`, `build-only`, `manual`, `none`
  (`VALIDATOR_WORKFLOW` langkah 3; `REVIEWER_SPEC_WORKFLOW` langkah 3; `agent-handoff-md.js`).
- Format baris AC (`agent-handoff-md.js`, `## Riwayat: berhenti pertama di T1 (sudah dijawab K-1, requirements revisi 2)
Temuan T1 bertentangan dengan AC-9 dan satu Constraint.

- `test/fixtures/frozen-kinds/implementer.single-nuxt.json` mengunci `sections.Output` milik
  `caf-implementer` sebagai satu baris:
  `Produces code + \`verify-report.md\` in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`
- `test/frozen-kinds.test.js` ("AC-3: implementer on single-nuxt renders exactly the golden tools +
  tracked sections") membandingkan `goldenOf()` dengan `deepEqual`. `goldenOf()` memuat semua
  section ter-track, `Output` termasuk (`trackedSections` di `test/helpers/frozen-kinds.js`).
- AC-1 sampai AC-5 dan Q-3 mewajibkan `## Output` implementer berubah sekarang.
- Constraint bagian 3 ("15 golden `frozen-kinds` tidak berubah (golden implementer termasuk)") dan
  AC-9 ("15 golden `frozen-kinds` tidak berubah, `git diff --stat` tidak menyentuh
  `test/fixtures/frozen-kinds/`") melarang golden itu berubah.

Keduanya tidak bisa dipenuhi bersamaan: begitu `## Output` implementer berubah, test golden itu
merah, dan satu-satunya cara menghijaukannya adalah mengedit golden. Pesan test itu sendiri
menyebut perubahan seperti ini butuh edit golden yang disengaja.

## Notes
Keputusan untuk manusia:
1. Aturan 1 memuat kalimat "A `verify-report.md` that is there is the starting point; never write
   over one you have not read in this run" (disalin dari aturan planner 02c). Di MONOREPO frontend
   dan backend menulis berkas yang sama; teks tidak mengatur baris AC milik agent lain. Perlu
   aturan eksplisit, atau cukup?
2. Aturan 5 menambah "Never report one of them as `automated-test` or `command`" dan "such an AC
   needs a human check" (frasa reviewer). Tidak ada istilah baru, tetapi kalimatnya baru. Setuju?
3. Teks tidak mengatur `Status:` akhir saat ada AC berbukti `manual`/`build-only`/`none`: Retry
   Logic tetap menentukan (Verify lulus → status lulus). Mau diatur di tiket lain?
4. `.ai/` di-gitignore, jadi laporan ini dan centang `tasks.md` tidak masuk commit.
