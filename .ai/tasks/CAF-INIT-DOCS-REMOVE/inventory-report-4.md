# Inventory report 4 — golden-examples step (Task 17, read-only)

Baseline: HEAD `3ccd721` (amendment 4 added on top of `0393cc1`; `b83013d` untouched). `npm test`: 1044 tests, 1044 pass, 0 skipped.
Nothing in `src/` or `test/` was changed. Experiments ran on copies of `test/fixtures/mono-pnpm` (with two candidate files added) and `test/fixtures/single-nuxt` in the scratchpad, calling `goldenExamples()` with `prompts.inject`.

## 1. How it works today

`goldenExamples({ dir, app, dryRun, mode })` — `src/commands/golden-examples.js`.

1. `detectStack`. App choice: `--app <path>` if given (the value is a **repo path**, e.g. `apps/api`, matched against `a.path`; an unknown path is accepted as `{name: path, path}` with no error). Otherwise `pickApp`: one app, used silently; several apps, a single-select `prompts` list (no "none" entry; Esc/cancel returns null and the step stops with `no app selected — stopping`, exit code unchanged).
2. Per app it scans `<app path>` for 7 pattern categories (`PATTERN_CATEGORIES`), scores candidates (top 3 per category) and shows **one multiselect per category that has candidates** (default: nothing ticked).
3. Writes **only `RULES.md`** (reference-based: a table of real repo paths, never copies). No other file is written. `RULES.md` is written only when at least one file was selected, or when the gap prompt below was accepted.
4. Gap prompt: if the app's folder already has content but no `RULES.md`, asks `Generate the missing RULES.md now?` (default yes).
5. Returns `{ written, skipped }` (RULES.md paths). The chain only counts them in its summary.

**Layout (already per app):**
- MONOREPO: `.caf/knowledge/golden-examples/<app.path>/RULES.md` (e.g. `.../apps/api/RULES.md`).
- SINGLE_REPO (`app.path === '.'`): `.caf/knowledge/golden-examples/RULES.md`, no subfolder (README line 555, CAF.md line 57).
- `RULES.md` is therefore **already per app**, header `(<app.name>)`. Multi-app needs no layout change, no moved or extra file.

**Existing file:** `writeIfAbsent`; an existing `RULES.md` is skipped whole. Consequence for AC-29/idempotency: re-running for an app that already has `RULES.md` and picking new files writes nothing and does **not** merge them. Today this is silent on the picker side (it still asks all category questions, then reports `skipped`). Not a regression, but the multi-app design must decide what to print for it (see section 4, point 6).

**Chain wiring** (`scaffold.js`): `TARGETS['golden-examples'].run` calls `goldenExamples({dir, dryRun, mode})` — no `app`, so the picker always runs. `ctx` carries no app state between steps; nothing downstream receives a "selected app". `runScaffoldTarget('golden-examples')` passes `app` (the `--app` string). The target and the chain share one function, so one implementation serves both (AC-31).

**Non-interactive path today:** only `--app <path>` (single). It still prompts for each category multiselect and for the gap confirm. There is no fully prompt-free route. `--app` is one global commander option (`--app <app-path>`, single value, not repeatable) shared by `golden-examples`, `adr`, `task-completion` (and passed to `agents`). `task-completion` already errors on an unknown path; `adr` and `golden-examples` do not.

**Prompts used:** `select` (app), `confirm` (gap RULES.md), `multiselect` per category (`instructions: false`), plus the chain's `Continue to step "Golden Examples Selector"?` confirm.

## 2. Measured behaviour

| Case | Result |
|---|---|
| mono-pnpm, app `apps/api`, 1 file picked | `.caf/knowledge/golden-examples/apps/api/RULES.md` only; 4 `TODO` in it (1 table "Reason" cell + 3 prose sections) |
| then app `apps/web`, nothing picked | `no files selected`, `no RULES.md written`, nothing created, exit 0 |
| single-nuxt, 1 file picked | `.caf/knowledge/golden-examples/RULES.md` only |

Counts of `TODO`: every `RULES.md` carries the same fixed 4. A second app with a selection would add a second such file.

## 3. Readers of the golden-examples result

Looked for anything that reads `.caf/knowledge/golden-examples` and assumes a single app.

| Reader | What it does | Assumes one app? |
|---|---|---|
| `commands/audit.js:91-107` | loops over `stack.apps`; flags a non-empty folder with no `RULES.md` | No, already per app |
| `commands/complete-drafts.js:29` (`listDraftFiles`) | glob `golden-examples/**/RULES.md` | No, handles any number |
| `commands/check-drafts.js:218-225` | per `RULES.md`, checks each listed path exists | No |
| `templates/complete-drafts-command.js:195` | text: `golden-examples/**/RULES.md` | No |
| `templates/claude-md.js:89`, `agents-md.js:41` | text only, point at the folder | No |
| `agents`, `skills`, `task-completion`, `workflow`, `curate sync/baseline`, `export` | do not read it | n/a |

**No reader needs to change.** Stop-point 3 does not trigger.

## 4. Findings and design recommendation

1. **Layout/`RULES.md` stop-point (1):** does not trigger. `RULES.md` is already per app; multi-app means "loop the existing single-app body over N apps". No file added or moved.
2. **Per-app TODO files stop-point (2):** **triggers, partly — decision needed.** A multi-app run writes one `RULES.md` per selected app, each with the same 4 `TODO`. That is exactly what a user running the step N times gets today, not a new kind of file, but AC-32 as worded ("no new TODO file per app compared with choosing one app") cannot hold literally: choosing two apps yields two files with TODO versus one. Options:
   - **A (recommended):** read AC-32 as "no new *kind* of TODO file". Per-app `RULES.md` stays (it is the layout the spec and `audit` already require); no extra file (no `README`, no manifest, no summary file) is added. Amend AC-32's Verify to count TODO files **per selected app** (N apps → N files, each identical to the single-app one) and to assert no file other than `RULES.md` appears.
   - B: write `RULES.md` only for apps that got at least one selected file (already true; an app picked but with nothing chosen writes nothing). This is in A already.
   - C: shrink the shell (fewer TODO sections in `RULES.md`). That changes golden-example content, which is out of scope in the amendment.
3. **Frozen snapshot / golden / sha256 stop-point (4):** does not trigger. No test imports or runs `goldenExamples`, `findCandidates`, `scoreCandidates` or `buildRulesMd`. The fixtures that contain the string `golden-examples` (`snapshots/mono-pnpm.json`, `pre-sdd03*/…`, `pre-sdd03g/scaffold.*`) hold **other** generated files (CLAUDE.md, AGENTS.md, `/caf-complete-drafts`) whose text mentions the folder; none holds `RULES.md` or the step's output. No bare-chain test runs the step (`scaffold-skills-chain.test.js` stubs the others). `complete-drafts` text is unchanged by this work. So no golden, snapshot or sha256 needs to change; any test I add is new.
4. **Slug for `--app <slug>` — decision needed.** Amendment says `--app <slug>`, but the existing `--app` takes a repo **path** (`apps/api`) and is shared with `adr`/`task-completion`/`agents`. Existing slug derivation is `agentSlug('implementation', app)` = path minus `apps/`/`packages/` prefix, lower-cased, non-alphanumerics to `-` (`apps/api` → `api`). Two apps can share a slug (`apps/web` and `packages/web` → `web`). Recommendation: accept **both** the app path and the slug (match path first, then slug); an ambiguous slug is an error listing the paths; unknown → error, exit 1, nothing written. That keeps `--app apps/api` working as today.
5. **`--app` repeatable.** Commander's `--app <app-path>` is single-valued and global. Making it repeatable (`collect`) changes the option for `adr`/`task-completion`/`agents` too (they would receive an array). Recommendation: make the option variadic-by-repeat in `index.js`, and have the three other targets take the last/only value as now (`app` as an array of length 1 → first element), so their behaviour is unchanged; or add `--all-apps` only for golden-examples. Needs your call on whether touching those three call sites (a one-line normalization in `runScaffoldTarget`) is acceptable.
6. **Idempotency / "apps without golden example".** Define "has a golden example" = `RULES.md` exists (the file this step writes) and is non-empty-table? Simplest and accurate: `RULES.md` exists. Rerun for an app whose `RULES.md` exists is skipped whole (existing `writeIfAbsent`), consistent with AC-29, but the new picker should say so up front (`App i/N: api — RULES.md already exists, skipped`) instead of asking all category questions and then discarding the answers. This is a small UX improvement the multi-app loop needs anyway; flagging it so it is not a surprise. The gap case (folder has content, no `RULES.md`) keeps its confirm.
7. **Enter with nothing selected (AC-27).** The chain's own confirm is separate; in the new picker `multiselect` returns `[]` on Enter. Print the "apps without golden example" hint and return `{written:[], skipped:[]}`, same as the Agents step. Esc/cancel: same as Enter (today cancel stops the step).
8. **Single repo unchanged (AC-25).** Single app → skip the app picker (as `pickApp` does) and go straight to the existing flow; output of the experiment above is the baseline for the `diff -r`.
9. **Non-interactive limit (AC-28).** `--app`/`--all-apps` only remove the *app* prompt. The per-category file multiselects (and the gap confirm) still prompt, because choosing golden files is a human decision (`AGENTS.md` constraint, `complete-drafts` text). AC-28's "run without prompt" cannot be met literally unless the non-interactive mode picks files automatically (e.g. the top-scored candidate), which would be a change to *how examples are chosen* — out of scope per the amendment and against "never invent human-owned content". **Decision needed**, options:
   - **A (recommended):** `--app`/`--all-apps` remove only the app picker; category multiselects still run per app; AC-28 is amended to "no app prompt; unknown slug errors". Existing `--app <path>` already works this way.
   - B: with `--app`/`--all-apps`, also skip the file prompts and write `RULES.md` with the empty reference table (`TODO: no reference files recorded yet`). Fully prompt-free, but creates TODO-only shells, which contradicts the goal of reducing TODO shells (stop-point 2 again).
   - C: auto-pick the top candidate per category. Rejected: changes selection logic and invents human-owned content.
10. **Progress marker and skip per app.** `App i/N: <slug>` printed before each app; "skip" = pressing Enter on all of that app's category lists writes nothing for it (no separate skip prompt needed). If you want an explicit per-app skip confirm, say so; it adds N prompts.
11. **Dry-run.** Works the same way through `writeIfAbsent(..., {dryRun})`; the loop must keep it.
12. **Pre-existing, noted only:** the summary line after the step prints the absolute `RULES.md` path under `generated RULES.md in .caf/knowledge/golden-examples/ ...`; `--app` with an unknown path is silently accepted by `golden-examples` and `adr` (writes nothing, no error). The latter is fixed for golden-examples by finding 4.

## 5. Stop-points of Task 17

| # | Stop-point | Result |
|---|---|---|
| 1 | `RULES.md` per repo but multi-app needs per app (or reverse) | No. Already per app. |
| 2 | Multi-app adds TODO files per app | **Yes, partly.** One `RULES.md` (4 TODO) per selected app, same as running the step N times; AC-32 as worded is unattainable. Recommendation A above. |
| 3 | A reader elsewhere assumes one app | No. See section 3. |
| 4 | Touches frozen snapshot, golden or sha256 | No. See finding 3. |

Additional decision points found (not listed stop-points): `--app` slug vs path (4), repeatable `--app` shared with other targets (5), AC-28 "no prompt" vs file prompts (9).

## 6. Files that would change in Task 18–20 (estimate, pending your decision)

| File | Change |
|---|---|
| `src/commands/golden-examples.js` | multi-app picker, loop with `App i/N`, `--app`/`--all-apps` resolution, final summary, up-front skip of apps that already have `RULES.md`. Per-app body extracted into a helper; single-app flow byte-identical in output |
| `src/commands/scaffold.js` | pass `allApps`/`apps` through the chain `run` and the target; normalize `app` for other targets |
| `src/index.js` | `--app` repeatable, `--all-apps`, help text |
| `test/golden-examples-multiapp.test.js` | **new** (AC-25–AC-32), uses `prompts.inject` on a temp copy of mono-pnpm plus candidate files, and single-nuxt for the unchanged case |
| `README.md` | the `Golden Examples` row (line 124), the `--app` row (line 148), the tree comment (line 85), the multi-app note |
| `CAF.md` | step text near lines 357–402 and 888 (golden examples per app, rerun to add apps) |
| `CLAUDE.md` | one short section for this amendment (the chain/Skills sections already name the step); no line becomes false except none found |

About 7 files: 3 `src`, 1 new test, 3 docs. **No existing test, golden, fixture, snapshot or sha256 file changes** (to be confirmed by `git diff --stat` in Task 19). Test count goes up by the new file only.

## 7. Decisions needed before Task 18

1. AC-32: accept reading A (per-app `RULES.md` stays, no new kind of file; Verify counts per selected app)?
2. `--app`: accept slug **and** path (ambiguous slug is an error)?
3. `--app` repeatable: ok to touch the three other targets' call sites by a one-line normalization, or restrict repeat to golden-examples only?
4. AC-28: option A (app prompt removed, file prompts stay) or B (prompt-free but TODO-only `RULES.md`)?
5. Skip per app: Enter on all category lists (default) or an explicit per-app confirm?

## Keputusan checkpoint (Ganjar)

1. **AC-32** dibaca "tidak ada jenis file TODO baru": memilih N app menghasilkan N file `RULES.md` identik dengan versi satu app, tanpa file lain.
2. **`--app`** menerima slug dan path. Slug ambigu (mis. `apps/web` dan `packages/web`) menjadi error yang menyebut kedua path. Nilai yang tidak dikenal menjadi error yang jelas, exit non-zero, tanpa menulis apa pun.
3. **`--app` boleh diulang dan `--all-apps`** hanya untuk `scaffold golden-examples`. Di target lain (`adr`, `task-completion`, `agents`) dan di rantai `scaffold` tanpa target, pengulangan `--app` atau `--all-apps` menghasilkan error yang jelas ("hanya untuk scaffold golden-examples"), bukan diam-diam memakai satu nilai. Tiga pemanggil lain tidak disentuh di luar yang dibutuhkan untuk error itu.
4. **AC-28 diamandemen:** `--app`/`--all-apps` hanya menghilangkan prompt pemilihan app; prompt kategori file tetap muncul. `RULES.md` tidak dibuat otomatis.
5. **Skip per app:** tanpa konfirmasi tambahan. Skip = perilaku hari ini bila semua kategori dijawab Enter. Jika Enter di semua kategori tetap menulis `RULES.md` ber-TODO, perilaku itu dipertahankan dan dicatat di `verify-report.md`. Tidak didesain ulang.
6. **`RULES.md` sudah ada** untuk app itu: dilewati di awal dengan pesan "sudah ada, skip", tanpa menanyakan kategori. Berlaku juga di repo tunggal; AC-25 membandingkan file yang ditulis, bukan jumlah prompt.
7. **Ringkasan akhir** "app tanpa golden example" dihitung dari ada tidaknya `RULES.md` per app.

Persetujuan perubahan: 3 file di `src` (`golden-examples.js`, plus `index.js`/`scaffold.js` seperlunya untuk menolak `--app` berulang di tempat lain), 1 file test baru, 3 dokumen. Tidak ada test, fixture, golden, snapshot, atau sha256 lama yang boleh berubah; bila ada yang berubah, berhenti dan lapor.
