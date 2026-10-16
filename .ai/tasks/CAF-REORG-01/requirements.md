## Ticket: CAF-REORG-01 (internal, pra-tracker — belum ada di Linear/Jira)
## Status: DONE — PLAN, IMPLEMENT, VERIFY selesai. 0 gap wajib di audit akhir. Siap commit.

## Latar Belakang

Hasil brainstorming 13 Agustus 2026 (lihat "Rangkuman Diskusi: Reorganisasi Folder & Naming
Convention CAF") menghasilkan 6 keputusan final terkait struktur folder, naming convention,
dan pola golden-examples. Checkpoint ini mengeksekusi **2 dari 5 langkah** di urutan yang
disarankan:

1. ✅ Update `caf-initiator` (template & command generator)
2. ✅ Update `CAF.md` sumber (dokumentasi spesifikasi)
3. ⏳ Reset `.caf/` di `umkm-pos` — checkpoint terpisah
4. ⏳ Propagasi ke `caf-orchestrator` / `caf-orchestrator-cms` — checkpoint terpisah
5. ⏳ Dry-run 1 ticket nyata end-to-end — checkpoint terpisah

`umkm-pos` akan direset total nanti (bukan migrasi bertahap), jadi checkpoint ini murni
menyiapkan generator dan dokumentasi supaya reset di checkpoint 3 menghasilkan struktur yang
benar sejak awal.

## Scope

**In scope:**
- Update logic generator di `caf-initiator` supaya output-nya mengikuti 6 keputusan final
- Update `CAF.md` supaya jadi single source of truth yang konsisten dengan output generator

**Eksplisit di luar scope checkpoint ini:**
- Reset folder `.caf/` di `umkm-pos` (checkpoint 3)
- Propagasi nama agent `caf-*` ke `caf-orchestrator` / `caf-orchestrator-cms` (checkpoint 4)
- Keputusan status resmi `.caf/skills/` — masih topik terbuka, tidak diputuskan
- Migrasi slash commands ke format Skills (`.claude/commands/` → `.claude/skills/`) — topik terpisah
- Reduce-steps `caf-initiator` (7 subcommand + `full` → `scaffold`/`curate`/`docs`) — topik terpisah
- Perubahan apapun pada `caf-orchestrator`, `caf-orchestrator-cms`, atau `umkm-pos` langsung

## Acceptance Criteria

### AC1 — Rename `.ai/` → `.caf/`
- [ ] Seluruh referensi `.ai/` di kode generator `caf-initiator` diganti `.caf/`
- [ ] Seluruh referensi `.ai/` di teks `CAF.md` diganti `.caf/` (termasuk struktur folder,
      Layer 3, Layer 4, diagram pipeline)

### AC2 — `docs/` tetap terpisah, tambah `INDEX.md` [REVISI setelah PLAN]
- [ ] `adr.js` dan `golden-examples.js` diubah supaya output-nya pindah ke
      `.caf/knowledge/decisions/` dan `.caf/knowledge/golden-examples/` (bukan lagi
      `docs/decisions/` / `docs/golden-examples/`) — lihat juga AC6
- [ ] `audit.js` (gap-check path literal ke golden-examples RULES.md) ikut diupdate
      mengikuti lokasi baru
- [ ] **`reference-docs.js` TIDAK diubah di checkpoint ini** — perilaku menulis placeholder
      ke `docs/product/`, `docs/architecture/`, `docs/schema/`, dst dipertahankan apa
      adanya. Ini pre-existing behavior yang secara teknis berlawanan dengan prinsip
      "CAF tidak pernah menulis ke `docs/`", tapi mengubahnya adalah keputusan desain
      tersendiri (lihat backlog di bawah), bukan bagian dari 6 keputusan reorganisasi ini
- [ ] Ada logic baru untuk generate `.caf/knowledge/INDEX.md` berisi link + status
      (✓ ada / belum ada) ke dokumen reference project (`docs/product/prd.md`,
      `docs/schema/erd.md`, dst — daftar disesuaikan hasil deteksi repo)
- [ ] `CAF.md` menjelaskan perbedaan `.caf/discovery/{slug}/prd.md` (CAF-generated) vs
      `docs/product/prd.md` (project-owned)

> **Backlog terpisah (dicatat, bukan bagian checkpoint ini):** apakah scaffolding
> placeholder oleh `reference-docs.js` ke `docs/` konsisten dengan prinsip "CAF tidak
> pernah menulis ke docs/"? Perlu didiskusikan sebagai keputusan desain sendiri, bukan
> diputuskan diam-diam sebagai efek samping rename folder.

### AC3 — Struktur `discovery/`, `audits/`, `tasks/` tetap terpisah [KOREKSI kalimat — audit CAF-REORG-01]
- [x] `tasks/` di-pre-create saat generate (`.caf/tasks/README.md`)
- [x] `discovery/` dan `audits/` **TIDAK** di-`ensureDir` saat generate — keduanya lazy,
      baru muncul fisik pas command `/caf-discovery-start` atau `/caf-audit-scan` jalan
      pertama kali. Ini SENGAJA (bukan bug), sesuai keputusan Checkpoint 1 awal, tapi
      kalimat asli AC3 di sini ("generator scaffold membuat folder independen") tidak
      akurat — sudah dikoreksi supaya tidak menyesatkan pembaca berikutnya
- [ ] `CAF.md` mendokumentasikan bahwa item yang tidak lanjut jadi ticket dibiarkan
      menggantung (tidak ada auto-archive)

### AC4 — Slash commands prefix `caf-`
- [ ] 10 command (`audit-scan`, `audit-to-ticket`, `design-ticket`, `discovery-start`,
      `discovery-to-ticket`, `feature-catalog-sync`, `plan-ticket`, `qa-check`,
      `review-ticket`, `run-pipeline`) di-generate dengan nama `caf-<nama>.md`
- [ ] Tetap di format lama `.claude/commands/` (TIDAK migrasi ke Skills format)

### AC5 — Agent definitions prefix `caf-` [REVISI setelah PLAN — konflik blocking ditemukan]
- [ ] 8 agent di-rename ke `caf-<nama>.md`: `planner`, `architect`, `qa`, `reviewer`,
      `documentation`, `auditor`, `pm`, `ux-designer`
- [ ] **`frontend` dan `backend` DIKECUALIKAN dari rename di checkpoint ini** — tetap
      `frontend.md`/`backend.md`. Alasan: `caf-orchestrator` hardcode kedua nama ini
      (`agents.js:46-48` — role convention `.claude/agents/frontend.md`/`backend.md`).
      Rename keduanya sekarang akan bikin `caf-orchestrator` gagal spawn, melanggar
      constraint checkpoint ini sendiri. Rename frontend/backend dipindah ke
      **Checkpoint 4 (propagasi)**, dieksekusi atomic bareng update kode spawn di
      `caf-orchestrator` dalam satu sesi — supaya tidak ada window breakage
- [ ] `devops` (candidate agent, status "next phase", TOOLS masih TODO) **TIDAK**
      di-prefix — tetap `devops.md` kalau/ketika filenya ada, karena belum jadi bagian
      resmi 6 keputusan dan belum lengkap
- [ ] `detectKind()` di `src/utils/agent-sections.js` diupdate supaya bisa match
      `caf-<nama>.md` terhadap `KNOWN_KINDS` — tanpa ini, sync-agents/audit section regen
      akan salah klasifikasi jadi `'implementation'` untuk semua agent yang sudah di-rename.
      Ini WAJIB berbarengan dengan rename, bukan opsional
- [ ] Semua tempat di `caf-initiator` yang mereferensikan nama agent untuk keperluan
      lookup/roster — termasuk `KNOWN_KINDS` (`agent-sections.js`), `KNOWN_ROLES`
      (`read-agent-roster.js`), `agentSlug()` (`templates/agent-md.js`), dan
      `buildCandidates`/filename write (`commands/agents.js`) — ikut update ke pola
      `caf-<nama>` untuk 8 agent di atas
- [ ] **Koreksi:** `runner-targets.js` BUKAN bagian dari scope AC5 — isinya status
      enforcement per AI-runner tool (OpenCode/Cline/Cursor/Kiro) untuk `export.js`,
      tidak terkait naming/roster agent. Jangan disentuh
- [ ] Konsistensi nama ini HANYA berlaku dalam scope `caf-initiator` — perubahan pada
      `caf-orchestrator` (kode spawn `claude --agent <nama>`) eksplisit di luar scope
      untuk 8 agent yang direname sekarang (mereka tidak disentuh `caf-orchestrator`,
      jadi aman), dan untuk frontend/backend ditunda ke Checkpoint 4 seperti di atas

> **Backlog terpisah (dicatat, bukan bagian checkpoint ini) — role `pm`/`ux-designer`
> belum lengkap terdaftar di beberapa tempat:**
> - `KNOWN_ROLES` di `read-agent-roster.js` cuma berisi 7 dari 11 kind (tidak ada
>   `auditor`/`pm`/`ux-designer`) — gap pre-existing
> - `ARTIFACT_BY_ROLE` juga tidak punya key `pm`/`ux-designer` (ditemukan saat VERIFY,
>   `caf-auditor.md` PASS tapi `pm`/`ux-designer` → `undefined`) — pre-existing, bukan
>   regresi dari checkpoint ini, dan saat ini *unreachable* di flow produksi karena
>   `KNOWN_ROLES` juga mengecualikan keduanya
> - Kedua gap ini akar masalahnya sama (role `pm`/`ux-designer` belum "lulus" jadi
>   first-class role di beberapa lookup table) — kalau salah satu diperbaiki nanti,
>   yang satunya WAJIB ikut diperbaiki bareng, supaya tidak jadi latent bug yang muncul
>   diam-diam saat `KNOWN_ROLES` dilengkapi tapi `ARTIFACT_BY_ROLE` kelupaan

### AC6 — Golden examples reference-based
- [ ] Generator TIDAK LAGI meng-copy file `.ts`/`.vue` ke `golden-examples/`
- [ ] Generator menghasilkan `golden-examples/{{app}}/RULES.md` berisi: path ke file asli +
      nama pattern + kolom alasan yang tetap TODO (tidak boleh auto-generated)
- [ ] `CAF.md` Layer 1 diupdate untuk menjelaskan pola reference-based ini, termasuk
      trade-off (1 lookup tambahan: baca RULES.md → baca file asli)

## Non-negotiable constraints (prinsip lama yang tetap berlaku)
- `writeIfAbsent` tidak boleh menimpa file yang sudah ada
- `SYNCABLE_SECTIONS` tetap menangani drift untuk project yang sudah pernah di-generate
- Field `Tools yang Diizinkan` dan `Scope` di agent definition tetap TODO — bukan auto-derivable
- Reasoning ADR dan alasan golden-example tetap TODO — tidak boleh auto-generated
- Perubahan `CAF.md` bersifat additive — jangan menghapus konten yang masih relevan tanpa alasan eksplisit
- Fallback yang tidak pasti harus mendeklarasikan diri (TODO eksplisit), bukan menebak