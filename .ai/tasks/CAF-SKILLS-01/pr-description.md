## CAF-SKILLS-01 — Skills untuk CAF

### Ringkasan

`caf-init scaffold skills` menulis lima skill universal ke `.claude/skills/<nama>/SKILL.md`. Sesi
manual Claude Code memakainya lewat `description`; agent CAF memakainya lewat section opsional
`## Skills` yang berisi pointer `Read`.

### Apa yang berubah

- **Skill:** `caf-verify`, `caf-scope-discipline`, `caf-no-guess`, `caf-escalate`, `caf-piv`.
  `caf-verify` memakai ulang `buildVerifyChecklist` dan berstatus DRAFT bila ada slot tanpa script
  (ditulis sebagai baris `TODO`, bukan command tebakan). `caf-piv` khusus sesi manual dan tidak
  dipetakan ke kind mana pun.
- **Section `## Skills`:** opsional, TIDAK syncable, dirender sebelum `## Constraints`, kosong = `''`
  (snapshot MONOREPO tetap byte-identik). Dibuka dengan kalimat "MANDATORY FIRST STEP: …".
- **Pemetaan:** agent implementasi mendapat `caf-verify`, `caf-scope-discipline`, `caf-no-guess`,
  `caf-escalate`; QA mendapat `caf-verify`, `caf-no-guess`; Planner, Architect, Reviewer,
  Documentation mendapat `caf-scope-discipline`, `caf-no-guess`; Auditor, DevOps, PM, UX Designer
  tidak mendapat skill.
- **Pointer ke agent yang sudah ada:** preview + konfirmasi per file; hanya ke skill yang file-nya
  ada dan bukan DRAFT; ditulis hanya bila isi baru = isi lama + tepat satu blok. Agent yang sudah
  punya `## Skills` tidak diedit; agent CRLF dilewati; kind tak dikenal default "No"; `--force`
  hanya menimpa `SKILL.md`.
- **Banner DRAFT skill:** kalimat `DRAFT` + baris "Agents: this skill is NOT ready …".
- **`curate --check-drafts`:** FAIL untuk pointer ke file yang tidak ada; WARN untuk pointer ke
  skill DRAFT, baris TODO terbuka tanpa banner, dan banner yang terhapus sebagian; INFO hitungan
  TODO (hanya baris yang diawali `TODO`). Tetap read-only.
- **`/caf-complete-drafts`:** glob skill saat dijalankan, hanya mengerjakan skill DRAFT, dan
  menyebut kedua bagian banner saat menginstruksikan penghapusan.
- **`scaffold skills` explicit-only** (tidak masuk rantai `scaffold` bawaan). `scaffold agents`
  yang dijalankan sesudahnya menyertakan pointer di agent baru.
- **Dokumentasi:** README (termasuk baris `--force`, URL clone, lisensi MIT), CLAUDE.md, CAF.md.

### Yang sengaja TIDAK ada

Field `skills:` di frontmatter (tidak berlaku di mode `--agent`, terbukti lewat uji), tool `Skill`,
flag `--skill-dir`, tracking manifest untuk skill, export skill ke runner lain.

### Verifikasi

- `npm test`: **191 lulus, 0 gagal** (124 lama + 67 baru).
- `git diff --stat main...HEAD -- test/fixtures/snapshots/ package.json package-lock.json`: kosong
  (snapshot utuh, tanpa dependency baru).
- Uji fixture `single-nuxt` dan `mono-pnpm`, tanpa dan dengan manifest: dry-run tidak menulis apa
  pun dan menyebut file yang sama dengan run nyata; run kedua idempoten; `curate --audit-only` dan
  `--sync-only --dry-run` identik dengan sebelum fitur (mono bermanifest tetap 4+4 baris DRIFT,
  CONFLICT 0); `--check-drafts` 0 fail dan melaporkan `caf-verify` sebagai DRAFT.
- AC-9, dispatch nyata di umkm-pos (`claude` 2.1.292), **PASS dengan batasan**:
  - pembacaan skill: 0/12 dengan wording lama, **99/99** dengan wording tegas;
  - aturan skill diterapkan **41/42** (~98%);
  - gerbang DRAFT pada frontend: 6/9 dipatuhi dengan banner satu baris, **0 pelanggaran dari 10**
    dengan banner final (belum signifikan, p~0,15);
  - run konfirmasi dengan generator default (RUNS=5, `caf-planner` dan `caf-frontend`): skill
    dibaca 30/30; a+b 5/5 dan 5/5; c 5/5 dan 4/5; t 5/5 dan 5/5.

### Batas

- Kepatuhan agent pada skill bersifat probabilistik, bukan penegakan; sampel kecil; hanya 2 kind
  yang diuji.
- Agent yang sudah punya `## Skills` tidak pernah diedit, jadi pointer `caf-verify` (setelah
  bannernya dihapus) ditambahkan manual. Agent berwording lama tidak dimigrasi (fitur belum dirilis).

### Tiket lanjutan

1. Sampel gerbang DRAFT lebih besar (>=20 run per kind, termasuk qa dan backend).
2. `check-drafts` mode ketat: pointer ke skill DRAFT = FAIL (untuk CI).
3. Drift tracking untuk skill (manifest) dan cek script pada `caf-verify`.
4. Tambah baris pointer ke `## Skills` yang sudah ada (dengan asersi isi lama + satu baris).
5. Bug MONOREPO: `## Input` qa/reviewer DRIFT di sync (interim: jangan `curate --sync-only` tanpa
   `--dry-run` di umkm-pos).
6. Export skill ke runner lain, deteksi non-Node, uji preload di jalur subagent
   `/caf-run-pipeline`.

### Commit (13)

```
0215a6b feat(CAF-SKILLS-01 task 1): optional ## Skills section builder in agent template
c6cc653 feat(CAF-SKILLS-01 task 2): register Skills in TEMPLATE_SECTION_ORDER (placement only)
ca4017e feat(CAF-SKILLS-01 task 3): skill templates (caf-verify, caf-scope-discipline, caf-no-guess, caf-escalate, caf-piv)
7c537c4 feat(CAF-SKILLS-01 task 4): caf-init scaffold skills writes the universal skills
6a87573 feat(CAF-SKILLS-01 task 5): offer ## Skills pointers to existing agent definitions
ef24085 feat(CAF-SKILLS-01 task 6): scaffold agents points new agents at usable skills
80f0df0 feat(CAF-SKILLS-01 task 7): check-drafts covers skills and ## Skills pointers
0ea697d feat(CAF-SKILLS-01 task 8): /caf-complete-drafts handles skills
5ba0d23 docs(CAF-SKILLS-01 task 9): document scaffold skills in README, CLAUDE.md and CAF.md
3a72ff8 feat(CAF-SKILLS-01): make the ## Skills pointer a mandatory first step
5065fad feat(CAF-SKILLS-01): add an agent-facing line to the skill DRAFT banner
c2eeccb feat(CAF-SKILLS-01): banner removal instructions name both banner parts
533088d feat(CAF-SKILLS-01): check-drafts warns about a half-removed skill DRAFT banner
```
