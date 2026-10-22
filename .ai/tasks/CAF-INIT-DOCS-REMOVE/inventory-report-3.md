# Inventory report 3 — `scaffold` chain and `scaffold skills` (Task 13, read-only)

Baseline: HEAD `12ad83f` (amendment 3 added on top of `b83013d`). `npm test`: 1037 tests, 1037 pass, 0 skipped.
Nothing in `src/` or `test/` was changed. Experiments ran on copies of `test/fixtures/single-nuxt` in the scratchpad.

## 1. How it works today

**Bare chain** (`src/commands/scaffold.js`): Setup, then `CHAIN_ORDER = golden-examples, adr, agents, task-completion, workflow, complete-drafts`.
Each step after Setup is preceded by one `Continue to step "<label>"?` confirm (default yes). `skills` is in `TARGETS` but not in `CHAIN_ORDER`.
The chain passes `{dir, dryRun, agentDir, overwrite, mode}` to a step through `ctx`; `skills` would receive exactly the arguments it already takes.

**`scaffold skills`** (`skillsTarget`, `src/commands/skills.js`):
1. `detectStack` (no prompt), builds 9 skill files (`SKILL_NAMES`).
2. Writes each to `.claude/skills/<name>/SKILL.md` through `writeIfAbsentGuarded`. An existing file is skipped (`--force` overwrites SKILL.md files only). A skill folder that differs only by the `caf-` prefix is a collision: not written, `process.exitCode = 1`.
3. Prints DRAFT warnings, a renamed-skill note, then `addSkillPointers`.
4. `addSkillPointers` reads `.claude/agents/*.md`. For each known-kind agent with no `## Skills` section and at least one usable (non-DRAFT) skill for its kind it shows a preview and asks **one confirm per agent** (`Add section "## Skills" to <file>?`, default yes). Unknown-kind files and files that already have `## Skills` are skipped without a prompt. It is the one place that rewrites an existing file, guarded by `isPureInsertion`.

The only prompts in the whole step are those per-agent pointer confirms. There is no app/agent picker.

## 2. Findings per question

**Chainable without extra input?** Yes. It needs no new design: the chain already prompts, and `skillsTarget` takes the same arguments. Prompt count is 0 to N, N = agents that need the section.
Measured (single-nuxt, 5 agents: planner, frontend, backend, validator, reviewer, then skills): 9 skills written, 5 pointer confirms, 5 agents got `## Skills`. Answering no to a confirm leaves that agent untouched and it is not asked again in the same run.

**Zero agents selected** (the picker's default: Enter selects none, and agents prints `no agents selected — done without generating`): the skills step does not fail. It writes the 9 skills, asks nothing, prints `no agent definitions ... yet`, returns normally. Exit code unchanged. A later `scaffold agents` then renders `## Skills` natively (`usableSkillPaths`).

**Skill already exists:** skipped by `writeIfAbsent`. Verified: appended a line to `caf-no-guess/SKILL.md`, re-ran, the line is still there. Running the skills step twice writes nothing the second time and asks no pointer confirm (agents already have the section).

**Position after Agents vs before.**
- After Agents (amendment default): works, but each agent gets the section by a rewrite of its file plus a confirm.
- Before Agents (not asked for, noted for the decision): agents render `## Skills` natively, zero confirms, no rewrite. The two orders produce byte-identical `.claude/skills/`, and agent files that differ by one blank line (insertion leaves an extra blank line before `## Constraints`/`## Working Pattern`). AC-18 compares only `.claude/skills`, so it holds either way.

**`--dry-run`:** `skillsTarget` supports it (previews, writes nothing, asks nothing). `--force` in the chain would now also overwrite SKILL.md files (the help text already says "agents and skills targets"); it never reaches an agent file.

**Exit code side effect:** a skill-folder name collision sets `process.exitCode = 1` but does not throw, so the chain summary would show a check mark and continue while the process exits 1. Same as the standalone target today; not a regression, noted for the verify step.

## 3. Impact on `complete-drafts` / `check-drafts` (stop-point 3: reported, not decided)

Correction to the amendment text: the DRAFT skills are not the four it lists.
- `caf-traceability`: DRAFT in every repo (banner, no TODO line).
- `caf-self-verify`: DRAFT **only** when no verify script is detected (single-nuxt: yes; with `lint/test/build` scripts: no banner).
- `caf-design` and `caf-breakdown`: no banner since CAF-CHORE-INIT-01 (not DRAFT). The other five skills have no banner.

Behavior change when skills enter the chain:
- `listDraftFiles` already globs `.claude/skills/*/SKILL.md`. Today skills appear in the inventory only if a user ran `scaffold skills` first. In the chain, skills run before `complete-drafts`, so the generated `/caf-complete-drafts` and its `drafts found: N` count now include the 9 skill files (measured on the check-drafts run: 14 files checked with skills present).
- `check-drafts` treats a skill as INFO only: `1 TODO(s) still open — DRAFT` for `caf-self-verify`. No WARN and no FAIL comes from a DRAFT skill. `FAIL` for skills happens only for an agent pointer at a missing or DRAFT skill, and `skills.js` never writes a pointer at a DRAFT skill.
- `/caf-complete-drafts` text already has a skills section ("work only on a skill that still starts with a DRAFT banner"; leave `## Skills` as is). No text change needed.
- Measured on the scratch repo: `curate --check-drafts` exit 0, 0 FAIL (the 5 WARN are the pre-existing "no baseline" ones, independent of skills). `curate --audit-only` exit 0; if the user declines a pointer confirm it adds 1 warning (`skill-pointer`), which does not change exit code or counts. The "5 required gaps" in my scratch repos come from not running the other steps, so AC-24 must be measured on a full chain in Task 15, not here.

So: a DRAFT skill will be listed as a draft by `complete-drafts` in the chain. That is a behavior change in a generated file (`caf-complete-drafts.md` content and the drafts count), but it is not a new warning or failure. Flagged as stop-point 3 for your decision.

## 4. Stop-points of Task 13

| # | Stop-point | Result |
|---|---|---|
| 1 | needs interactive input that cannot be chained | No. Only per-agent confirms the chain can carry. |
| 2 | fails or changes with zero agents | No. Writes skills, no prompt, no error. |
| 3 | DRAFT skill listed as a draft by `complete-drafts`/`check-drafts` | **Yes, partly**: listed in the inventory of the generated command (behavior change); INFO only in `check-drafts`. See section 3. |
| 4 | touches a frozen snapshot or sha256 file | No. `mono-snapshot.js` and `test/fixtures/snapshots` have no skills. The sha256 pins hold skill **text** (`sdd02*`, `sdd05*`, `sdd10`), which does not change. No `pre-sdd*` golden runs the bare chain: `runScaffold` has no test caller. |

## 5. Files that would change (Tasks 14 to 16)

Must change:
1. `src/commands/scaffold.js` — add `'skills'` to `CHAIN_ORDER` after `'agents'`; update the two comments and the `section(...)`/doc-comment chain text.
2. `src/index.js` — comment (lines 35-36) and the `scaffold` description string (chain order text).
3. `test/skills-scaffold.test.js:40-43` — currently asserts `!CHAIN_ORDER.includes('skills')`; must be flipped (an intentional edit, to be shown in `verify-report.md`).
4. New test file for AC-17 to AC-22 (chain order, help text, equivalence with `scaffold skills`, skip, idempotency).
5. `README.md` — Quick start steps 2-3, the chain table (add a Skills row after Agents), the "only with `scaffold skills`" tree comment (line 98), the `scaffold skills` section intro, and the "explicit-only" wording; other `scaffold skills` mentions (lines 193, 224, 227, 328, 578) are already "re-run"/"by hand" context and stay.
6. `CAF.md` — has no instruction to run `scaffold skills` (only line 480 names it as a recognition context). Probably no change; Task 16 will confirm.

Need your decision (not listed in the amendment):
7. `CLAUDE.md` — lines 61 (chain text) and 137-139 ("Explicit-only: it is in `TARGETS` but not in `CHAIN_ORDER`") become false. The amendment names README and `CAF.md` only. Recommend updating those two statements in the Task 16 commit.
8. Comments in `src/commands/skills.js` (`Explicit-only: not part of the bare scaffold chain`, line ~217) and the `skills` comment in `scaffold.js` TARGETS.

Not changed: skill text, `skill-md.js`, any golden/fixture/snapshot, `complete-drafts-command.js` (its text says "managed by `caf-init scaffold skills`", still true), `check-drafts.js`, `audit.js`.

Estimate: 5 to 6 existing files plus 1 new test file, about 7 files changed. No fixtures or goldens.

Pre-existing inaccuracy seen, out of scope (do not fix in this ticket): `README.md` line 165 says `scaffold skills` writes "seven universal skills"; `SKILL_NAMES` has 9.

## 6. Recommendation

1. **Order:** keep the amendment default, `skills` right after `agents`. It works and gives the same `.claude/skills/` as the separate command. Alternative (skills before agents) avoids all rewrites and confirms but contradicts the amendment text and changes nothing the ACs check; only take it if you want fewer prompts.
2. **Confirm behavior:** keep the existing pattern, one `Continue to step "CAF Skills Scaffolder"?` confirm (default yes), and keep the per-agent pointer confirms inside the step unchanged, so the step is identical to the standalone target (AC-19). No auto-yes, no new flag.
3. **Zero agents:** no special case; the step runs and writes the skills.
4. **Item 3 (DRAFT in `complete-drafts`):** accept as is (INFO only). No code needed, but the README should say the skills appear in the draft inventory.
5. Update `CLAUDE.md` lines 61 and 137-139 in Task 16 (needs your yes).

## Keputusan checkpoint

Diputuskan oleh Ganjar setelah laporan ini.

**Koreksi premis (amendment 3 menyebut empat skill DRAFT; yang benar):**
- Hanya `caf-traceability` yang selalu DRAFT.
- `caf-self-verify` DRAFT bila repo tanpa script verify.
- `caf-design` dan `caf-breakdown` tanpa banner sejak CAF-CHORE-INIT-01.

1. Skills tepat setelah Agents, satu konfirmasi skip (default yes). Konfirmasi pointer `## Skills` per agent tetap. Target `scaffold skills` tidak berubah perilakunya.
2. Skill di inventaris `/caf-complete-drafts`: diterima dengan syarat. Syarat dibuktikan sebelum mengubah apa pun:
   - `listDraftFiles` (`src/commands/complete-drafts.js`) sudah meng-glob `.claude/skills/*/SKILL.md` sejak commit `80f0df0` (CAF-SKILLS-01 task 7), tidak terkait rantai. Repo yang menjalankan `scaffold skills` lalu `scaffold complete-drafts` sudah mendaftarkan skill hari ini.
   - Teks `/caf-complete-drafts` (`src/templates/complete-drafts-command.js`, bagian `CAF skills`) hanya mengizinkan mengedit skill yang masih ber-banner `DRAFT`; skill tanpa banner "is finished: do not edit it"; tidak boleh mencabut banner, membuat skill, atau menambah pointer. Daftar draf di command bukan sumber skill (command me-glob ulang).
   - Backlog: `complete-drafts` sebaiknya hanya mendaftar yang benar-benar draf (dicatat di `verify-report.md`).
3. `CLAUDE.md` diperbarui di Task 16: hanya baris 61 dan 137-139, ditambah satu entri riwayat tiket bila formatnya ada.
4. `README.md:165` ("seven") diperbaiki bila barisnya ada di bagian yang diedit; dicatat di pesan commit.

Persetujuan perubahan: `src/commands/scaffold.js`, `src/index.js`, `README.md`, `CAF.md` (bila perlu), `CLAUDE.md` (butir 3), `test/skills-scaffold.test.js:42` (dibalik), satu file test baru (AC-17 sampai AC-21). Fixture, golden, snapshot beku atau file sha256 yang ikut berubah: berhenti dan lapor.
