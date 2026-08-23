# CAF — Coderium Agent Framework
### Panduan Universal (dapat dijalankan di project apa saja)

> **Cara pakai dokumen ini:** taruh file ini di root repo sebagai `CAF.md`, lalu jalankan prompt:
> `"Pelajari CAF.md dan eksekusi"` ke AI coding agent (Claude Code, dsb).
> AI akan membaca **Bagian 0** terlebih dahulu, melakukan deteksi terhadap repo, lalu membangun
> Layer 1–5 sesuai kondisi project — bukan mengikuti stack contoh yang mungkin tertulis di sini.

---

## Bagian 0 — Instruksi Eksekusi untuk AI

**Jangan langsung membuat file.** Ikuti urutan berikut:

### Langkah 1 — Audit Kondisi Repo Saat Ini
Cek apakah sudah ada konfigurasi AI coding agent lain di repo ini:
```
.claude/        ← Claude Code
.kiro/          ← Kiro
.opencode/      ← OpenCode
openspec/       ← OpenSpec
.cursor/        ← Cursor
```
- **Kalau kosong** → lanjut ke Langkah 2, mulai dari nol.
- **Kalau ada satu atau lebih** → JANGAN langsung menimpa. Laporkan ke user dulu file/folder
  apa saja yang ditemukan, lalu tanyakan: konsolidasi (pilih satu sumber kebenaran, migrasikan
  isi yang relevan) atau biarkan coexist. Jangan mengambil keputusan ini sendiri.

### Langkah 2 — Deteksi Struktur & Stack Project
Baca file-file berikut untuk mengisi placeholder di seluruh dokumen ini:
- `package.json` (root) → cek `workspaces`, cek monorepo tool (`turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`)
- Untuk tiap app/package terdeteksi → baca `package.json`-nya → identifikasi framework (Vue/React/Next/Nest/Express/Django/dst), package manager (pnpm/npm/yarn/bun)
- Cek `prisma/schema.prisma`, `.env.example`, atau ORM config lain → identifikasi database
- Cek `README.md` untuk konteks bisnis/domain project

Isi tabel placeholder di **Lampiran A** berdasarkan hasil deteksi ini sebelum lanjut.

**Cek juga dokumen opsional Layer 1 berikut** (dokumen ini berasal dari ranah Product/Design,
bukan dibuat oleh CAF — CAF hanya membaca kalau ada):
```
docs/product/prd.md              ← PRD produk-level
docs/architecture/system-overview.md
docs/api-contract.md             ← atau OpenAPI/GraphQL schema
docs/schema/erd.md
docs/testing-strategy.md
```
- **Kalau ada** → catat sebagai referensi, akan dibaca agent terkait (lihat Layer 2).
- **Kalau tidak ada** → jangan buat wajib dan jangan menganggap ini gap yang harus ditutup.
  Tanyakan ke user apakah mau dibuatkan file placeholder kosong (dengan DRAFT banner) atau
  di-skip sepenuhnya. Ketiadaan dokumen ini **tidak boleh** menghentikan atau memblokir
  pipeline — CAF tetap berjalan dari deskripsi ticket seperti biasa.

### Langkah 3 — Deteksi Ticket Tracker
Cek indikasi tracker yang dipakai:
- `.linear/`, mention "linear" di README/CI config → **Linear**
- `.jira/`, `atlassian.yml`, mention "jira"/"atlassian" → **Jira**
- Tidak ada indikasi apapun → **tanyakan ke user** (jangan asumsi). Opsi: Linear / Jira / GitHub Issues.

Gunakan hasil ini untuk memilih varian **Layer 5** yang sesuai (lihat bagian bercabang di bawah).

> **Catatan konteks:** langkah-langkah di Bagian 0 ini menyiapkan Klaster 2 (Delivery) —
> lihat bagian "Struktur 4 Klaster" untuk konteks penuh kalau project kamu juga berencana
> membangun Klaster 1 (Discovery) atau Klaster 4 (Audit). Klaster 2 tetap bisa berjalan mandiri
> tanpa klaster lain.

### Langkah 4 — Eksekusi Bertahap
Jalankan **Fase 1 → Fase 4** sesuai urutan di bagian "Urutan Implementasi" di bawah.
Setelah tiap fase selesai, **berhenti dan laporkan** ke user sebelum lanjut ke fase berikutnya —
jangan menjalankan Fase 3 (otomasi VPS/webhook) tanpa konfirmasi eksplisit, karena fase ini
melibatkan kredensial dan infrastruktur live.

### Langkah 5 — Jangan Duplikasi Isi
Kalau project sudah punya sebagian dari Layer 1 (misal sudah ada `CLAUDE.md`), **update/lengkapi**,
jangan timpa total. Prinsip CAF: dokumen hidup yang berevolusi, bukan template sekali-tempel.

---

## Apa itu CAF

CAF adalah framework untuk menjadikan AI sebagai anggota tim engineering yang bisa mengerjakan
ticket dari awal sampai Pull Request secara otomatis. AI tidak hanya membantu menulis kode — ia
merencanakan, mengimplementasikan, memverifikasi, dan melaporkan hasilnya, mengikuti aturan dan
konvensi yang sudah ditetapkan tim.

CAF bukan produk jadi yang di-install sekali selesai. Ini adalah **struktur yang dibangun
bertahap** di dalam repo project kamu, dan makin baik seiring dengan iterasi.

CAF tidak terikat pada stack, tracker, atau AI runner tertentu — dokumen ini generik dan
menyesuaikan diri lewat proses deteksi di Bagian 0.

---

## Struktur 4 Klaster

CAF beroperasi dalam 4 klaster, dikelompokkan berdasarkan **level akses**, bukan org-chart:

| Klaster | Nama | Akses | Status |
|---|---|---|---|
| 1 | Discovery | Dokumen saja, tanpa tracker-write | Desain matang, eksekusi manual per-kasus |
| 2 | Delivery | Repo + tracker + GitHub (kredensial penuh) | **Aktif — ini yang dijelaskan di Bagian 0 s.d. Layer 1-5 di bawah** |
| 3 | Release | Infra + kredensial deployment | Ditunda — lihat catatan di bawah |
| 4 | Audit | Read-only ke production, tracker-write lewat approval-gate | Desain matang, eksekusi manual per-kasus |

**Dokumen ini (Bagian 0 s.d. Layer 1-5) adalah spesifikasi lengkap Klaster 2.** Klaster 1, 3,
dan 4 dijelaskan ringkas di bawah — kedalaman levelnya belum setara Klaster 2 karena belum
diverifikasi end-to-end di kondisi produksi berulang.

**Verifikasi command yang melibatkan penilaian substansi (bukan cuma exist-check/string
match) wajib diuji dengan dispatch nyata** — jalankan command sungguhan di Claude Code,
bukan cuma baca kode generator atau simulasi manual ikuti isi instruksi. Kontrak prompt yang
konsisten secara tertulis tidak menjamin LLM patuh saat run sungguhan, terutama untuk aturan
yang menuntut penilaian (bukan aturan mekanis). Fixture dengan kasus campur (positif dan
negatif dalam satu run) lebih meyakinkan daripada fixture yang diuji terpisah satu-satu.

### Klaster 1 — Discovery
Agent: Product Manager, UX Designer (opsional, hanya kalau ticket menyentuh permukaan user).
Akses dokumen saja — PM Agent **tidak** punya write langsung ke tracker; ticket dibuat lewat
approval-gate terpisah (pola sama seperti Klaster 4), supaya tidak ada AI yang bisa
menciptakan kerja untuk tim tanpa review manusia.

Artifact: `.caf/discovery/{{slug}}/` → `prd.md` (problem, target user, success metric, scope,
out-of-scope, dependency), `flow.md`, `handoff.md` (mapping slug ke ticket ID setelah dibuat).

**Isolasi branch:** `discovery-start` membuat branch `discovery/{{slug}}` sebelum menulis
apapun — pola sama seperti `ai-agent/{{TICKET-ID}}` di Klaster 2, cuma beda prefix karena
belum ada ticket ID di tahap discovery. Artifact discovery (`prd.md`, `flow.md`) tetap draft
sampai di-review manusia lewat PR terpisah; tidak langsung masuk `main`. Kalau branch
`discovery/{{slug}}` sudah ada (discovery pernah dimulai sebelumnya), command checkout ke
situ dan melanjutkan, bukan membuat branch baru.

**Breakdown ticket bukan 1:1 dengan slug.** Approval-gate (`discovery-to-ticket`) membaca
`## Scope` di `prd.md` dan `## Alur Utama` di `flow.md`, lalu mengusulkan pemecahan ticket
berdasarkan itu — bisa 1 ticket untuk fitur kecil, bisa beberapa ticket dengan dependency
chain untuk fitur yang scope-nya natural terpisah (mis. infrastruktur vs logic bisnis vs
client). Tiap usulan ticket ditampilkan satu per satu untuk konfirmasi (`ya`/`edit`/`skip`)
— tidak ada batch-approve. Urutan dependency antar ticket (kalau ada) dicatat di
`handoff.md`.

**Pertanyaan terbuka yang belum terjawab saat discovery selesai tidak menghalangi ticket
dibuat** — tapi wajib ikut tercatat di deskripsi ticket yang relevan (bukan cuma di
`prd.md`/`flow.md`), supaya tidak hilang begitu ticket masuk antrean implementasi Klaster 2.
Ini keputusan sadar: discovery tidak wajib 100% lengkap sebelum lanjut, tapi ketidaklengkapan
harus transparan, bukan tersembunyi di balik ticket yang terlihat siap kerja.

**Format `handoff.md`:** tabel ticket yang benar-benar dibuat (ID, judul, URL, catatan
apa-adanya/diedit), daftar usulan yang di-skip, dan section terpisah untuk pertanyaan
terbuka yang ikut terbawa ke ticket tertentu (bukan pertanyaan generik, tapi ditandai
ticket mana yang relevan). File ini satu-satunya yang ditulis command
`discovery-to-ticket` di folder discovery — `prd.md`/`flow.md` tetap read-only baginya.

**Usulan yang di-skip dibiarkan menggantung di `handoff.md` — tidak ada auto-archive.**
Kalau sebagian usulan ticket ditolak/di-skip saat approval-gate, catatannya tetap di situ
selamanya sebagai riwayat; tidak ada proses otomatis yang menghapus, memindahkan, atau
mengarsipkannya. Sama berlaku untuk temuan Auditor di Klaster 4 (lihat di bawah) yang tidak
lanjut jadi ticket.

PM Agent membaca `docs/product/feature-catalog.md` (read-only, lihat Layer 1) untuk tahu
kapabilitas existing sebelum mengusulkan sesuatu yang baru — bukan baca kode langsung.

### Klaster 3 — Release *(ditunda)*
Agent: Quality Assurance (staging), DevOps. **Belum dijalankan** — menunggu project punya
infrastruktur staging nyata untuk diuji. Kalau project kamu langsung deploy ke `main` tanpa
staging, skip klaster ini sepenuhnya; jangan buat staging environment cuma demi mengisi
klaster ini.

### Klaster 4 — Audit
Agent: Auditor, jalan independen mengecek production yang sudah live — beda dari QA staging
Klaster 3 yang jadi gate sebelum rilis. Cakupan: bug fungsional + tech debt/performance,
**exclude security scanning mendalam** (di luar tanggung jawab Auditor CAF).

Artifact: `.caf/audits/{{DATE}}/`, laporan pakai severity Critical/Moderate/Minor. Temuan
menjadi ticket bug lewat approval-gate yang sama seperti Klaster 1 → masuk ke Klaster 2
sebagai ticket biasa. Temuan yang tidak lanjut jadi ticket tetap tercatat di laporan
`.caf/audits/{{DATE}}/audit-report*.md` — tidak ada auto-archive, sama seperti usulan
discovery yang di-skip (lihat Klaster 1).

**Exclude security scanning tetap berlaku, dengan satu pengecualian penting.** Auditor CAF
tidak mencari pola security secara aktif (injeksi, secret hardcoded, bypass auth, dst — itu
tetap di luar scope, domain security review terpisah). Tapi kalau Auditor **menemukan**
exposure data sensitif/kredensial (password/password_hash, token, secret, PII) sebagai efek
samping saat scan bug fungsional/tech debt/performance biasa — apapun kategori aslinya —
temuan itu **tidak** masuk `## Temuan Prioritas`/`## Temuan Non-Prioritas` dan **tidak**
pernah diusulkan jadi ticket lewat `discovery-to-ticket`/`audit-to-ticket`. Temuan itu
masuk `## Catatan` (subsection Sensitive Data Exposure), dengan deskripsi yang actionable
(lokasi, jenis data) tapi tanpa mengutip nilai/payload nyata yang ter-expose. Rute
penanganan lanjutan adalah keputusan manusia di luar tracker biasa.

Alasan pengecualian ini: batas "exclude security scanning" awalnya cuma menutup kasus
Auditor *mencari* pola security. Tidak menutup kasus *menemukan tanpa sengaja* — dan
levelnya sama seriusnya (kadang lebih konkret berbahaya) dibanding pola yang memang dicari
aktif. Konsistensi menuntut keduanya diperlakukan sama: dilaporkan, tapi tidak otomatis
jadi ticket publik.

**Skema severity: `Critical`/`Moderate`/`Minor`** (bukan 4 level) — `Critical` dan
`Moderate` masuk `## Temuan Prioritas`, `Minor` masuk `## Temuan Non-Prioritas`. Kategori
temuan: `BUG`, `PERFORMANCE`, `TECH_DEBT`, `COVERAGE` — `SECURITY` sengaja tidak ada sebagai
kategori (lihat exclude di atas).

**Label tracker tidak selalu granular per kategori.** Kalau workspace/project tracker tidak
punya label terpisah untuk performance/tech-debt/test-coverage, kategori-kategori itu boleh
kolaps jadi satu label umum (mis. "Improvement") dan dibedakan lewat priority saja. Ini
keterbatasan tracker, bukan kegagalan Auditor — kalau granularitas per-kategori penting,
buat label baru di tracker dulu sebelum audit jalan, bukan dipaksakan dari sisi command.

Cadence: manual trigger untuk sekarang. Terjadwal mingguan adalah target masa depan, bukan
default saat ini — jangan setup cron/scheduler untuk ini kecuali diminta eksplisit.

### Routing: Kapan Ticket Lewat Klaster 1 Dulu

| Kondisi | Rute |
|---|---|
| Fitur/modul baru yang berdampak ke user atau bisnis | **Wajib lewat Klaster 1 dulu** |
| Enhancement, bug fix, atau perubahan infra teknis internal murni | **Skip, langsung ke Klaster 2** |

Kriteria penentu: **apakah kelayakan fitur ini sudah pernah divalidasi**, bukan besar-kecilnya
ukuran kerja. Ticket kecil yang belum pernah divalidasi kelayakannya tetap wajib lewat
Klaster 1; ticket besar yang sudah jelas kelayakannya (mis. refactor besar tapi murni teknis)
boleh langsung Klaster 2.

Bug fix rutin biasanya dibuat manual oleh tim QA manusia — bukan bagian dari alur agent
manapun, tidak perlu lewat klaster manapun.

---

## Pola Kerja: PIV (Plan → Implement → Verify)

Semua agent di CAF mengikuti satu pola kerja yang sama:

```
PLAN       → buat rencana tertulis, jangan sentuh kode dulu
IMPLEMENT  → eksekusi sesuai rencana
VERIFY     → cek sendiri sebelum mengaku selesai (lint, typecheck, test)
              kalau gagal → perbaiki dan coba lagi (max 3x)
              kalau masih gagal → stop, eskalasi ke manusia
```

Ini mencegah dua masalah paling umum di AI coding: langsung coding tanpa arah, dan mengaku
selesai tanpa verifikasi.

---

## Pipeline Lengkap

```
Ticket masuk ({{TRACKER}}/GitHub Issues)
  ↓
Planner Agent      — baca ticket, buat rencana (jangan sentuh kode)
  ↓
Architect Agent    — tentukan pendekatan teknis (opsional, untuk task kompleks)
  ↓
{{APP_1}}/{{APP_2}} Agent — implementasi + self-verify (retry max 3x)
  ↓
Documentation Agent — update docs (paralel, tidak blocking)
  ↓
QA Agent           — test mendalam, cek edge case
  ↓
Reviewer Agent     — review kualitatif (pendekatan, technical debt, keamanan)
  ↓
Open PR + Mention Developer
  ↓
[fase berikutnya] AI PR Reviewer — merespons komentar reviewer manusia
```

**Catatan penting:** Review manusia tetap wajib sebelum merge. Tidak ada auto-merge dalam
kondisi apapun.

---

## 5 Layer yang Harus Dibangun

### Layer 1 — Project Knowledge Base
> Fondasi agar AI benar-benar memahami project kamu

**File yang dibutuhkan** (sesuaikan jumlah `{{APP_N}}/CLAUDE.md` dengan jumlah app terdeteksi):

```
CLAUDE.md                       ← instruksi utama untuk Claude Code (<150 baris)
AGENTS.md                       ← instruksi untuk semua AI coding agent (cross-tool)
{{APP_1}}/CLAUDE.md             ← konvensi spesifik {{APP_1}} (mis. frontend)
{{APP_2}}/CLAUDE.md             ← konvensi spesifik {{APP_2}} (mis. backend)

.caf/knowledge/                 ← CAF-generated, ditulis caf-initiator — beda dari docs/ di bawah
  INDEX.md                       ← jembatan status (✓/✗) ke dokumen docs/ di bawah, lihat catatan
  decisions/                    ← ADR: kenapa keputusan teknis diambil
    adr-001-*.md
  golden-examples/               ← REFERENSI ke kode nyata, bukan salinan (lihat Prinsip di bawah)
    {{APP_2}}/
      RULES.md                    ← path ke file asli + nama pattern + alasan do/don't
    {{APP_1}}/
      RULES.md                    ← path ke file asli + nama pattern + alasan do/don't

docs/                            ← project-owned, read-only bagi CAF — TIDAK PERNAH ditulis
                                     caf-initiator sendiri (satu pengecualian: command opsional
                                     `caf-init docs` boleh scaffold placeholder KOSONG
                                     atas permintaan eksplisit user, isinya tetap manusia yang tulis)
  product/
    prd.md                       ← opsional, referensi produk-level (lihat catatan di bawah)
    feature-catalog.md           ← katalog kapabilitas existing, disinkronkan dari kode
                                     (lihat command feature-catalog-sync), dibaca PM Agent
                                     di Klaster 1 sebelum mengusulkan fitur baru
    features/
      {{feature-name}}.md         ← opsional, Feature Spec — dibuat manusia untuk fitur besar/
                                     ambigu sebelum ticket dipecah, ditautkan manual dari ticket
  architecture/
    system-overview.md           ← opsional, gambaran arsitektur level tinggi
  schema/
    erd.md                        ← opsional, relasi data terdokumentasi (pelengkap schema asli)
  api-contract.md                ← opsional/kondisional, wajib kalau FE+BE terpisah dalam satu repo
  testing-strategy.md            ← opsional, konvensi & coverage target (beda dari qa-report per-ticket)
```

**Prinsip:**
- `CLAUDE.md` isi **behavior saja**, bukan penjelasan umum yang AI sudah tahu
- `golden-examples` **reference-based, bukan copy.** `RULES.md` di
  `.caf/knowledge/golden-examples/{{app}}/` menunjuk ke **path file asli di codebase** (hasil
  deteksi Langkah 2) — bukan menyalin isinya. `RULES.md` isinya: path file, nama pattern, dan
  **kenapa** file ini contoh baik (bagian mana wajib ditiru/do, bagian mana kebetulan ada tapi
  tidak boleh ditiru/don't). Trade-off sadar: satu lookup tambahan (baca `RULES.md` dulu, baru
  buka file aslinya) — tapi contoh tetap "hidup", ikut berubah bareng codebase, tidak pernah
  jadi snapshot beku yang diam-diam melenceng dari kode nyata. Tanpa `RULES.md`, golden-example
  jadi ambigu — AI harus menebak sendiri mana yang pola dan mana yang kebetulan.
- ADR menjawab **"kenapa"**, bukan cuma "apa aturannya"
- Iteratif: tiap kali agent salah konvensi, update knowledge base-nya (lihat pola: convention
  yang muncul organik saat testing → didokumentasikan setelahnya, bukan diprediksi di awal)
- `docs/product/prd.md`, `docs/architecture/system-overview.md`, `docs/api-contract.md`,
  `docs/schema/erd.md`, `docs/testing-strategy.md` **bersifat opsional dan read-only** bagi
  CAF — ini dokumen referensi yang boleh berasal dari tim lain (Product/Design), dibaca agent
  kalau tersedia (lihat Layer 2), tapi **tidak pernah jadi syarat wajib** sebelum pipeline
  jalan. Kalau tidak ada, agent tetap bekerja dari deskripsi ticket seperti biasa.
  `.caf/knowledge/INDEX.md` menautkan ke dokumen-dokumen ini dengan status ✓ ada/✗ belum ada,
  supaya agent tahu apa yang tersedia tanpa harus probe filesystem sendiri.

> **`.caf/discovery/{{slug}}/prd.md` bukan `docs/product/prd.md`.** Yang pertama artifact
> per-fitur, draft, ditulis PM Agent selama Klaster 1 (lihat struktur Klaster 1 di atas) — belum
> tentu final, belum tentu relevan lintas fitur. Yang kedua PRD produk-level, project-owned,
> dipakai berulang lintas ticket, dan read-only bagi CAF seperti dokumen Layer 1 lainnya. Jangan
> tertukar keduanya saat generate atau membaca artifact.

> **Beda dengan dokumen Layer 1 lain:** `feature-catalog.md` bukan murni read-only seperti
> `prd.md` — isinya disinkronkan berkala dari kode lewat command generate (lihat
> `caf-initiator`), dengan aturan idempotency ketat: entri baru di-append, entri draft
> di-refresh, entri yang sudah ditulis manusia tidak pernah ditimpa otomatis, entri yang
> hilang dari kode ditandai stale bukan dihapus. Command ini tetap tidak boleh mengubah
> file kode apapun — arahnya satu jalur, dari kode ke katalog, bukan sebaliknya.

---

### Layer 2 — Agent Definitions
> Tiap agent punya peran, scope, dan kontrak yang jelas

Simpan di `.claude/agents/` (untuk Claude Code) atau folder equivalen untuk tool lain
(`.kiro/agents/`, `.opencode/agents/`, dst — sesuaikan dengan AI runner yang dipilih project).

**Struktur tiap file agent:**
```markdown
## Role
[satu kalimat: apa peran agent ini]

## Scope
[area kode mana yang boleh diakses/diubah]

## Tools yang Diizinkan
[read-only atau write, MCP mana yang boleh diakses]

## Input
[artifact apa yang diterima dari agent sebelumnya]

## Output
[artifact apa yang dihasilkan untuk agent berikutnya]

## Pola Kerja (PIV)
[instruksi eksplisit: plan dulu, baru implement, baru verify]

## Verify Checklist
[perintah konkret yang harus dijalankan sebelum selesai — isi dari deteksi script di package.json]

## Retry Logic
[kalau verify gagal: perbaiki dan coba lagi max N kali]
```

**8 Agent Spesialis (sesuaikan nama {{APP_1}}/{{APP_2}} dengan hasil deteksi):**

| Agent | Fase | Output Artifact |
|---|---|---|
| Planner | Plan | `requirements.md`, `tasks.md` |
| Architect | Plan (opsional) | `design.md` |
| {{APP_1}} (mis. Frontend) | Implement + Verify | kode + `verify-report.md` |
| {{APP_2}} (mis. Backend) | Implement + Verify | kode + `verify-report.md` |
| QA | Verify mendalam | `qa-report.md` |
| Reviewer | Review kualitatif | `review-notes.md` |
| Documentation | Paralel | update `docs/` |
| DevOps | Post-merge (next phase) | deployment |

**Model Routing (hemat token):**
- Model kecil/murah → task sederhana (rename, format, lookup)
- Model standar → implementasi standar, debugging, review
- Model paling mampu → arsitektur kompleks, keputusan besar

> Catatan implementasi nyata: sebelum menugaskan agent ke ticket kompleks yang melibatkan
> lebih dari satu app, jalankan Planner Agent dulu secara terpisah — celah kontrak antar layer
> (mis. parameter query yang belum ada di DTO backend) baru sering ketahuan di tahap ini, dan
> itu tanda pipeline bekerja dengan benar, bukan tanda ticket-nya tidak lengkap.

**Input opsional untuk Planner & Architect Agent:**
Selain deskripsi ticket dari tracker, Planner Agent boleh membaca dokumen referensi Layer 1
kalau tersedia, dengan urutan prioritas: `docs/product/features/{{feature-name}}.md` (Feature
Spec, kalau ticket ditautkan ke salah satu) → `docs/product/prd.md` → deskripsi ticket saja.
Untuk task yang melibatkan lebih dari satu app, Architect Agent juga boleh membaca
`docs/architecture/system-overview.md`, `docs/api-contract.md`, dan `docs/schema/erd.md` kalau
ada, sebagai konteks tambahan sebelum menulis `design.md`.

Ini **bukan gate wajib** — kalau salah satu atau semua dokumen ini tidak ada, Planner/Architect
tetap jalan seperti biasa dari deskripsi ticket saja. CAF tidak pernah menghentikan pipeline
hanya karena dokumen referensi ini belum dibuat; itu di luar kendali dan tanggung jawab CAF.

---

### Layer 3 — Artifact Handoff
> Agent tidak saling "ngobrol" — mereka saling lempar file

Setiap ticket punya folder sendiri. Agent membaca output agent sebelumnya dari folder ini,
bukan dari memori atau chat. Nama folder mengikuti key ticket dari tracker yang dipakai
(`ENG-123` untuk Linear/Jira, atau nomor issue untuk GitHub Issues) — konsisten dengan nama
branch `ai-agent/{{TICKET-ID}}`.

```
.caf/tasks/{{TICKET-ID}}/
  requirements.md    ← Planner Agent: apa yang diminta, acceptance criteria
  design.md          ← Architect Agent: pendekatan teknis (kalau perlu)
  tasks.md           ← Planner Agent: breakdown task konkret
  verify-report.md   ← {{APP_1}}/{{APP_2}} Agent: hasil implement + verify
  qa-report.md       ← QA Agent: hasil test mendalam
  review-notes.md    ← Reviewer Agent: hasil review kualitatif
```

**Beda sifat dengan dokumen Layer 1:** file di `.caf/tasks/{{TICKET-ID}}/` di atas adalah artifact
yang **di-generate agent**, khusus untuk satu ticket, dan jadi arsip setelah ticket selesai.
Dokumen Layer 1 (`docs/product/prd.md`, `docs/product/features/*.md`,
`docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md`) sifatnya
kebalikannya: **input read-only**, dipakai berulang lintas ticket, dan tidak pernah ditulis atau
diubah oleh agent — hanya dibaca. Jangan tertukar antara dua jenis ini saat generate artifact baru.

**Format `verify-report.md`:**
```markdown
## Ticket: {{TICKET-ID}}
## Status: SUCCESS / NEEDS_HUMAN

## Attempt Log
- Attempt 1: FAIL — [error]
- Attempt 2: PASS

## Acceptance Criteria
- [x] kriteria 1 — terpenuhi di File.ext baris N
- [x] kriteria 2 — terpenuhi di service.ext

## Quality Gate
- Lint: PASS
- Typecheck: PASS
- Test: PASS / SKIP (alasan)

## Catatan
[deviasi dari plan, kalau ada]
```

---

### Layer 4 — Quality Gates
> Checkpoint yang benar-benar dieksekusi, bukan cuma instruksi teks

**Minimal yang harus ada** (isi command sesuai script yang benar-benar ada di `package.json`
hasil deteksi — jangan asumsikan nama script tanpa verifikasi):
```bash
# Non-monorepo:
{{PKG_MANAGER}} typecheck   # wajib pass
{{PKG_MANAGER}} lint        # wajib pass
{{PKG_MANAGER}} test        # wajib pass (kalau ada test relevan)
{{PKG_MANAGER}} build       # wajib pass sebelum PR dibuka

# Monorepo (WAJIB di-scope ke workspace yang relevan, JANGAN jalankan di root):
{{PKG_MANAGER}} --filter {{APP_N}} typecheck   # syntax scoping beda per package manager,
{{PKG_MANAGER}} --filter {{APP_N}} lint        # lihat dokumentasi pm masing-masing
{{PKG_MANAGER}} --filter {{APP_N}} test
{{PKG_MANAGER}} --filter {{APP_N}} build

# PENTING: verifikasi dulu script ini benar-benar ada sebagai entry terpisah di
# package.json — kadang typecheck "nempel" di script build (mis. `tsc -p . && build`),
# bukan entry sendiri. Kalau begitu, catat sebagai gap dan jalankan manual, jangan
# asumsikan ada. Script yang tidak ada = laporkan sebagai gap infrastruktur, jangan
# buat quality gate palsu.
```

**Kenapa scoping-nya wajib, bukan sekadar rapi:** di monorepo, script root biasanya
delegasi ke task runner (`turbo lint`, `nx run-many`) yang fan-out ke SEMUA workspace.
Quality gate tanpa scope karena itu bukan cuma lambat — ia mengeksekusi perubahan di luar
scope ticket. Kasus nyata: agent yang mengerjakan ticket frontend menjalankan `pnpm lint`
di root, `eslint --fix` ikut jalan di `apps/api`, dan file backend yang tidak ada
hubungannya dengan ticket ikut ter-reformat dan masuk diff. Efek sama berlaku untuk
`build` (build seluruh monorepo untuk satu app) dan `test`. Sebaliknya, kalau script hanya
ada di app dan tidak ada di root, command tanpa scope justru gagal — agent menghabiskan
retry dan berhenti dengan status butuh-manusia yang palsu.

**Prinsip umum — fallback yang tidak pasti harus mengaku, bukan menebak.** Ini berlaku
lebih luas dari sekadar command lint/typecheck di atas: kapan pun sebuah command yang
dieksekusi OTOMATIS oleh agent bergantung pada nilai yang kadang gagal terdeteksi (package
manager, nama workspace, versi tool, dst), instruksi agent harus eksplisit bilang "TODO,
verifikasi manual" kalau nilainya tidak pasti — BUKAN diam-diam pakai nilai tebakan yang
kelihatan masuk akal (mis. asumsikan `npm` kalau package manager tidak terdeteksi).

Alasannya konkret, bukan kehati-hatian abstrak: command yang salah tapi terlihat valid
menghasilkan kegagalan yang salah arah — retry habis karena command itu sendiri yang keliru
(bukan karena kode ticket-nya salah), berakhir status `NEEDS_HUMAN` yang sebenarnya keliru
diagnosis (developer disuruh cek kode, padahal masalahnya di command verify-nya). Fallback
`TODO` yang jujur justru lebih cepat ketahuan dan diperbaiki dibanding command yang "hampir
benar".

**Kasus khusus yang lebih berbahaya dari NEEDS_HUMAN palsu: command yang tidak pernah
selesai (watcher/daemon).** Kalau deteksi script verifikasi salah pilih (mis. `test:watch`
alih-alih `test`, karena pencocokan nama cuma pakai pattern-match longgar dan `test:watch`
kebetulan terdeklarasi lebih dulu di `package.json`), agent bisa menjalankan command yang
tidak pernah exit — bukan gagal, tapi macet total tanpa pernah sampai ke status apapun.
Kalau mekanisme deteksi command otomatis bergantung pada pencocokan nama, **utamakan
exact-match nama script duluan, baru fallback ke pattern match** kalau tidak ada exact-match
— jangan sebaliknya.

**Buat file `.caf/workflows/task-completion.md`** berisi:
- Definition of Done yang eksplisit
- Commands yang harus dijalankan
- Documentation update rules (endpoint baru → update api-contract.md, dst)
- PR checklist sebelum branch dianggap siap

**Tambahan yang direkomendasikan:**
- Custom lint rule untuk aturan kritis yang tidak boleh dilanggar (spesifik ke domain project,
  mis. query tanpa `tenant_id` scope, business logic di controller)
- Git hook sebagai backstop terakhir
- Cek keberadaan artifact build lama yang ter-commit (`.js`/`.d.ts` hasil compile) — ini bisa
  membuat lint gate jadi tidak reliable karena error pada file yang seharusnya tidak diedit AI

**Kalau `verify-report.md` status `NEEDS_HUMAN`:**
- Pipeline berhenti
- Komentar otomatis ke ticket berisi ringkasan error
- Status ticket diubah ke "Blocked" atau "Needs Review"
- Developer yang di-mention untuk handle manual

---

### Layer 5 — Orchestration
> Mesin yang menjalankan pipeline secara otomatis. **Pilih satu varian sesuai hasil Langkah 3.**

**Komponen infrastruktur (sama untuk semua tracker):**
```
VPS kecil (~$5-6/bulan)
  └── Webhook Receiver (Express, ~150 baris)
        └── Spawn AI runner per-agent (on-demand, bukan nyala terus)
              └── Akses MCP: {{TRACKER}} MCP + GitHub MCP / gh CLI
```

#### Varian A — Linear
```
Linear event (status ticket berubah ke "Ready for AI")
  → POST /webhook/linear
  → verifikasi signature
  → parse ticket ID + deskripsi
  → git checkout -b ai-agent/{{TICKET-ID}}
  → spawn: agent planner
  → spawn: agent {{APP_1}} (baca .caf/tasks/{{TICKET-ID}}/)
  → baca verify-report.md
      SUCCESS  → komentar ke Linear, branch siap review
      NEEDS_HUMAN → komentar error ke Linear, stop pipeline
```
Yang perlu disiapkan: Linear API token, GitHub token, Anthropic API key, Linear webhook secret.

#### Varian B — Jira
```
Jira event (status berubah ke "In Progress" / status custom "Ready for AI")
  → POST /webhook/jira
  → verifikasi signature (header x-hub-signature, shared secret)
  → parse issue key, summary, description, assignee
  → git checkout -b ai-agent/{{TICKET-ID}}
  → spawn: agent planner
  → spawn: agent {{APP_1}} (baca .caf/tasks/{{TICKET-ID}}/)
  → baca verify-report.md
      SUCCESS  → post komentar ke Jira, branch siap review
      NEEDS_HUMAN → post komentar error, ubah status ke "Blocked", stop pipeline
```
Yang perlu disiapkan: Jira API token + email, Jira base URL, Jira project key, Jira webhook
secret, GitHub token, Anthropic API key.

Perbedaan teknis penting: payload Jira lebih verbose (`issue.key`, `issue.fields.summary`,
`issue.fields.status.name`); status transition pakai ID numerik (fetch dulu
`GET /rest/api/3/issue/{key}/transitions`); komentar diposting via
`POST /rest/api/3/issue/{key}/comment` dengan format ADF atau plain text.

#### Varian C — GitHub Issues (fallback tanpa tracker eksternal)
```
GitHub Issue event (label "ready-for-ai" ditambahkan)
  → GitHub webhook / GitHub Actions trigger
  → parse issue number + body
  → git checkout -b ai-agent/issue-{{NUMBER}}
  → spawn: agent planner → spawn: agent {{APP_1}}
  → baca verify-report.md
      SUCCESS  → komentar ke issue, branch siap review
      NEEDS_HUMAN → komentar error, label "blocked", stop pipeline
```
Yang perlu disiapkan: GitHub token dengan scope Actions + Issues, Anthropic API key.

---

## Struktur Folder Lengkap yang Direkomendasikan

```
project-root/
├── CLAUDE.md                        ← Layer 1, <150 baris
├── AGENTS.md                        ← Layer 1, cross-tool compatible
│
├── .claude/
│   ├── agents/
│   │   ├── caf-planner.md           ← Layer 2
│   │   ├── caf-architect.md         ← Layer 2
│   │   ├── {{app_1}}.md             ← Layer 2 — TIDAK prefixed, lihat catatan di bawah
│   │   ├── {{app_2}}.md             ← Layer 2 — TIDAK prefixed, lihat catatan di bawah
│   │   ├── caf-qa.md                ← Layer 2
│   │   ├── caf-reviewer.md          ← Layer 2
│   │   └── caf-documentation.md     ← Layer 2
│   └── commands/
│       ├── caf-plan-ticket.md       ← Layer 2, companion Planner
│       ├── caf-design-ticket.md     ← Layer 2, companion Architect
│       ├── caf-qa-check.md          ← Layer 2, companion QA
│       ├── caf-review-ticket.md     ← Layer 2, companion Reviewer
│       └── ...                      ← audit-scan, discovery-start, run-pipeline, dst — semua caf-*
│
├── .caf/
│   ├── knowledge/                   ← Layer 1, CAF-generated (beda dari docs/ di bawah)
│   │   ├── INDEX.md                 ← status ✓/✗ dokumen docs/ di bawah
│   │   ├── decisions/               ← ADR
│   │   └── golden-examples/         ← referensi kode (path ke file asli, bukan copy)
│   │       ├── {{app_2}}/
│   │       │   └── RULES.md         ← path + pattern + do/don't
│   │       └── {{app_1}}/
│   │           └── RULES.md         ← path + pattern + do/don't
│   ├── workflows/
│   │   ├── task-completion.md       ← Layer 4
│   │   ├── piv-workflow.md          ← Layer 4, SOP PIV + retry
│   │   └── agent-handoff.md         ← Layer 3, format artifact
│   ├── tasks/
│   │   ├── README.md                ← jelasin struktur untuk agent
│   │   └── {{TICKET-ID}}/           ← dibuat runtime per ticket, tidak di-scaffold di generate-time
│   ├── discovery/                   ← dibuat runtime per fitur (Klaster 1), tidak di-scaffold
│   │   └── {{slug}}/
│   └── audits/                      ← dibuat runtime per tanggal (Klaster 4), tidak di-scaffold
│       └── {{DATE}}/
│
├── docs/                             ← project-owned, read-only bagi CAF (lihat Layer 1)
│   ├── product/
│   │   ├── prd.md                    ← opsional
│   │   └── features/
│   │       └── {{feature-name}}.md   ← Feature Spec, opsional
│   ├── architecture/
│   │   └── system-overview.md        ← opsional
│   ├── schema/
│   │   └── erd.md                    ← opsional
│   ├── api-contract.md               ← opsional/kondisional (FE+BE terpisah dalam satu repo)
│   ├── testing-strategy.md           ← opsional
│   └── ...                           ← sesuaikan domain project
│
└── {{apps_dir}}/ / {{packages_dir}}/ ← kode project seperti biasa
```

**Transisi selesai (CAF-REORG-07):** `{{app_1}}.md`/`{{app_2}}.md` (agent implementasi, mis.
`frontend`/`backend`) sekarang dapat prefix `caf-` sama seperti 8 agent lain di atas —
`caf-frontend.md`/`caf-backend.md`. Orchestrator otomatis (Layer 5) sudah full cutover ke nama
prefixed sejak Checkpoint 4B, jadi generator dan orchestrator sudah konsisten untuk project baru.

**`.caf/tasks/{{TICKET-ID}}/`, `.caf/discovery/{{slug}}/`, dan `.caf/audits/{{DATE}}/` tidak
di-scaffold kosong saat generate-time** — struktur di atas menunjukkan bentuknya setelah
dipakai, bukan hasil langsung generator. Ketiganya dibuat agent secara runtime, per
ticket/fitur/tanggal masing-masing, saat pipeline benar-benar jalan.

---

## Urutan Implementasi yang Disarankan

### Fase 1 — Fondasi (mulai di sini)
1. **(Opsional)** Cek apakah `docs/product/prd.md`, `docs/product/features/*.md`, atau
   `docs/schema/erd.md` sudah ada (biasanya dari tim Product/Design). Kalau ada, jadikan
   referensi untuk langkah 5 (ADR). Kalau tidak ada, **skip** — jangan buat ini jadi
   prasyarat, lanjut langsung ke langkah 2
2. Buat `CLAUDE.md` root yang ringkas (<150 baris) + `CLAUDE.md` per-app
3. Buat `AGENTS.md` dengan aturan konkret (bukan abstrak), lengkap dengan contoh benar/salah
4. Pilih 2-3 file existing paling rapi → tulis `RULES.md` di
   `.caf/knowledge/golden-examples/{{app}}/` yang menunjuk ke path file aslinya (bukan copy),
   berisi kenapa file ini jadi contoh baik + do/don't-nya
5. Tulis 2 ADR paling kritis untuk project kamu → `.caf/knowledge/decisions/` (pakai PRD/Feature
   Spec dari langkah 1 sebagai konteks "kenapa", kalau tersedia)
6. Buat `.caf/workflows/task-completion.md` berisi Definition of Done + PR checklist
   — **verifikasi dulu semua script yang direferensikan benar-benar ada**, jangan asumsi

### Fase 2 — Agent & Artifact
7. Buat `caf-planner.md` + agent implementasi yang paling relevan dulu
8. Buat `.caf/workflows/piv-workflow.md` + `agent-handoff.md`
9. Test manual: jalankan agent planner untuk 1-2 ticket nyata, tanpa trigger otomatis
   — mulai dari ticket single-agent sederhana, baru naik ke ticket multi-agent
10. Evaluasi: seberapa akurat plan, seberapa bersih kode, berapa token terpakai

### Fase 3 — Otomasi (perlu konfirmasi eksplisit dari user sebelum mulai)
11. Setup VPS + webhook receiver
12. Connect MCP tracker (Linear/Jira) sesuai Varian yang dipilih
13. Aktifkan trigger otomatis dari webhook
14. Tambah agent berikutnya (QA, Reviewer) satu per satu setelah Planner + agent implementasi stabil

### Fase 4 — Hardening
15. Tambah custom lint rule untuk aturan kritis
16. Tambah `gh pr create` otomatis di akhir pipeline
17. Evaluasi swap/bandingkan AI runner (kalau relevan)
18. AI PR Reviewer + DevOps Agent

---

## Yang Tidak Perlu Dilakukan

- Jangan install framework agent lain — ambil konsepnya saja jika perlu
- Jangan buat semua agent sekaligus — mulai dari Planner + 1 agent implementasi
- Jangan auto-merge — review manusia tetap wajib di semua fase
- Jangan taruh semua aturan di satu file raksasa — pisah per-scope, per-layer
- Jangan anggap `CLAUDE.md` selesai ditulis sekali — ini dokumen hidup yang diupdate tiap kali
  agent salah konvensi
- Jangan jalankan Fase 3 tanpa konfirmasi eksplisit dari user — ini menyentuh kredensial dan
  infrastruktur live
- Jangan jadikan `docs/product/prd.md`, Feature Spec, atau dokumen referensi Layer 1 lain
  sebagai syarat wajib sebelum pipeline jalan — CAF adalah framework implementasi (mulai dari
  ticket masuk), bukan framework product management. Dokumen itu boleh dibaca kalau ada, tapi
  ketiadaannya tidak boleh memblokir atau menghentikan agent manapun

---

## Referensi Teknologi (generik, isi kolom kanan sesuai deteksi/preferensi project)

| Kebutuhan | Pilihan Umum | Isi Project Ini |
|---|---|---|
| Ticket tracker | Linear / Jira / GitHub Issues | `{{TRACKER}}` |
| AI runner | Claude Code (default), OpenCode, dst | `{{AI_RUNNER}}` |
| MCP | Tracker MCP + GitHub MCP | `{{MCP_LIST}}` |
| PR & branch | `gh` CLI (fase awal), MCP (fase mature) | — |
| Webhook receiver | Node.js + Express | — |
| Queue | `p-queue` (mencegah race condition) | — |
| Runner infra | VPS kecil (Hetzner CX22 / DigitalOcean Droplet) | — |
| Artifact storage | File Markdown di branch git | — |

---

## Lampiran A — Placeholder Reference

Diisi AI di Langkah 2–3 sebelum generate file apapun.

| Placeholder | Diisi dari | Contoh |
|---|---|---|
| `{{APP_1}}`, `{{APP_2}}` | Nama folder app hasil deteksi | `web`, `api` |
| `{{PKG_MANAGER}}` | `packageManager` di `package.json` root | `pnpm`, `npm`, `yarn` |
| `{{apps_dir}}` / `{{packages_dir}}` | Struktur monorepo terdeteksi | `apps/`, `packages/` |
| `{{TRACKER}}` | Hasil deteksi/konfirmasi Langkah 3 | `Linear`, `Jira`, `GitHub Issues` |
| `{{AI_RUNNER}}` | Folder config AI terdeteksi, atau tanya user | `Claude Code` |
| `{{TICKET-ID}}` | Format key tracker yang dipilih | `ENG-123`, `#42` |

> Jika salah satu placeholder tidak bisa dipastikan dari deteksi otomatis, **tanyakan ke user**
> alih-alih menebak. Placeholder yang salah isi akan menyebar ke seluruh Layer 1–5.