# Verify Report: CAF-RETRYLOGIC-01

Status: SUCCESS

## Ringkasan

`## Retry Logic` sekarang role-aware. Agent Discovery (`pm`, `ux-designer`) mendapat retry
logic Open-Questions; semua kind lain tidak berubah sama sekali. Selain itu, empat section
lain yang investigasi Task 1 temukan punya cacat yang sama di-guard supaya `curate sync`
tidak lagi bisa merusak file Discovery, dengan follow-up ticket tertulis untuk
menyelesaikannya.

Scope diperluas dari ticket asli atas persetujuan eksplisit user (Opsi 2 + elemen follow-up
dari Opsi 1) setelah checkpoint Task 1 melaporkan bahwa perbaikan `Retry Logic` saja
meninggalkan lubang aktif di `Allowed Tools`/`Input`/`Output`/`Working Pattern (PIV)`.

## Task 1 — Daftar `kind` dan kategorisasinya

Sumber: `KNOWN_KINDS` (`src/utils/agent-sections.js`) — nilai yang bisa dikembalikan
`detectKind()`; plus `implementation` (fallback untuk stem yang tidak dikenal) dan `devops`.

| `kind` | Di-generate oleh | Kategori |
|---|---|---|
| `planner` | `buildAgentMd` | Delivery |
| `architect` | `buildAgentMd` | Delivery |
| `frontend` | `buildAgentMd` | Delivery |
| `backend` | `buildAgentMd` | Delivery |
| `qa` | `buildAgentMd` | Delivery |
| `reviewer` | `buildAgentMd` | Delivery |
| `documentation` | `buildAgentMd` | Delivery |
| `auditor` | `buildAgentMd` | Delivery |
| `implementation` | `buildAgentMd` (fallback) | Delivery |
| `pm` | `discoveryAgentMd` (`discovery-commands.js`) | **Discovery** |
| `ux-designer` | `discoveryAgentMd` | **Discovery** |

Kategorisasinya memang biner seperti dugaan ticket — `DISCOVERY_KINDS = ['pm', 'ux-designer']`,
sisanya Delivery. Tidak ada kategori ketiga.

Dua temuan tambahan dari investigasi:

1. **`devops` tidak ada di `KNOWN_KINDS`.** Ada di `TOOLS_BY_KIND` dan `TOOLS_RATIONALE`
   (`agent-md.js`) tapi tidak di `KNOWN_KINDS`, jadi `detectKind()` tidak pernah
   mengembalikannya — file `devops.md` terbaca sebagai `implementation`. Dicatat sebagai
   out-of-scope di follow-up ticket, tidak disentuh di sini.
2. **Root cause bukan di `buildAgentMd`.** File `caf-pm.md`/`caf-ux-designer.md` tidak pernah
   lewat `buildAgentMd`; Retry Logic hasil generate-nya sudah benar sejak awal. Kerusakannya
   murni dari jalur `curate`: `SYNCABLE_SECTIONS['Retry Logic']` (`agent-sections.js:46`)
   adalah `() => buildRetryLogicSection()` — arity 0, mengabaikan `kind`. `curate baseline`
   merekam isi file yang benar sebagai baseline → `current === baseline`, template = versi
   Delivery → status `DRIFT` → `curate sync` menulis. Persis jalur insiden.

### Temuan yang memperluas scope (dilaporkan di checkpoint, disetujui user)

Probe `buildPmAgentMd({})` terhadap seluruh `SYNCABLE_SECTIONS` dengan `kind='pm'`:

| Section | Ada di file? | Cocok dengan template? | Akibat kalau `curate sync` jalan |
|---|---|---|---|
| `Allowed Tools` | ya | TIDAK | overwrite → **larangan menulis ke ticket tracker terhapus** |
| `Input` | ya | TIDAK | overwrite → jadi `TODO: which artifact is received…` |
| `Output` | ya | TIDAK | overwrite → jadi `TODO: which artifact is produced…` |
| `Retry Logic` | ya | TIDAK | overwrite → versi Delivery (bug yang di-ticket-kan) |
| `Working Pattern (PIV)` | TIDAK (file pakai `## Work Pattern (PIV)`) | — | **insert** section kedua yang duplikat |
| `What to Look For` | — | n/a (`null`) | dilewati, benar |
| `Report Format` | — | n/a (`null`) | dilewati, benar |

## Perubahan

| File | Perubahan |
|---|---|
| `src/templates/discovery-commands.js` | Konstanta `DISCOVERY_RETRY_LOGIC` di-export; `discoveryAgentMd()` memakainya (sebelumnya teks inline) — satu sumber kebenaran supaya template dan file hasil generate tidak bisa berbeda |
| `src/templates/agent-md.js` | `DISCOVERY_KINDS` di-export; `buildRetryLogicSection(kind)` bercabang ke `DISCOVERY_RETRY_LOGIC`; call-site `buildAgentMd` jadi `buildRetryLogicSection(kind)` |
| `src/utils/agent-sections.js` | `SYNCABLE_SECTIONS['Retry Logic']` meneruskan `kind`; `DISCOVERY_GUARDED_SECTIONS` + `guardDiscovery()` memaksa 4 builder lain mengembalikan `null` untuk kind Discovery |
| `test/retry-logic-role-aware.test.js` | Baru — 8 test |
| `.ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md` | Baru — follow-up ticket untuk 4 section yang di-guard |
| `README.md` | Tabel section tracking: `Retry Logic` ditandai role-aware, ditambah catatan section yang di-guard |
| `CLAUDE.md` | Aturan: builder di `SYNCABLE_SECTIONS` wajib menjawab benar untuk kind Discovery, atau masuk daftar guard |

Tidak ada perubahan di `coderium-web-v2`/`umkm-pos` — sesuai batasan scope.

## Bukti tidak ada regresi (byte-for-byte)

Bukan sekadar "test pass". Golden fixture diambil dari working tree **sebelum** perubahan
(`/tmp/caf-golden/pre-fix.txt`: output `buildRetryLogicSection()` + `buildAgentMd()` lengkap
untuk 13 kind), lalu dibandingkan per-kind setelah perubahan:

```
IDENTICAL  kind=planner          IDENTICAL  kind=auditor
IDENTICAL  kind=architect        IDENTICAL  kind=implementation
IDENTICAL  kind=frontend         IDENTICAL  kind=devops
IDENTICAL  kind=backend          IDENTICAL  kind=undefined
IDENTICAL  kind=qa               CHANGED    kind=pm            <- diharapkan
IDENTICAL  kind=reviewer         CHANGED    kind=ux-designer   <- diharapkan
IDENTICAL  kind=documentation

PASS: every Delivery kind byte-identical; only pm/ux-designer changed
```

Perbandingan itu dikunci permanen sebagai dua test, memakai literal string hasil salinan
pre-fix (`DELIVERY_RETRY_LOGIC_PRE_FIX`) sebagai oracle — sengaja TIDAK di-generate ulang
dari builder, supaya test tidak bisa ikut bergeser kalau template berubah:

- `no regression: every Delivery kind renders the pre-fix Retry Logic byte-for-byte`
  → `assert.equal(buildRetryLogicSection(kind), DELIVERY_RETRY_LOGIC_PRE_FIX)` untuk 13 kind
- `no regression: a full Delivery agent file is byte-identical to the pre-fix render`
  → `assert.equal(bodyOf(md, 'Retry Logic'), DELIVERY_RETRY_LOGIC_PRE_FIX)` atas hasil
  `buildAgentMd()` penuh — membuktikan perubahan call-site inert untuk kind Delivery

## Bukti `curate audit` terhadap fixture Discovery yang benar → `IN_SYNC`

- `curate audit: a correctly-generated Discovery agent reads IN_SYNC, not DRIFT` —
  fixture `buildPmAgentMd({})` dan `buildUxDesignerAgentMd({})`, baseline diambil dari isi
  file itu sendiri (jalur `curate baseline` yang membuat insiden jadi destruktif:
  `current === baseline`, jadi mismatch template apa pun pasti muncul sebagai `DRIFT`).
  `assert.equal(status, SECTION_STATUS.IN_SYNC)`.
- `curate sync leaves a correctly-generated Discovery agent byte-for-byte unchanged` —
  `agentsSync()` sungguhan atas `caf-pm.md` di direktori temp:
  `assert.equal(fs.readFileSync(...), content)`, `result.drifted` kosong,
  `result.needsAttention` kosong.
- `regression guard: sync would have rewritten the Discovery file under the old generic
  template` — fixture yang sama tapi Retry Logic dipaksa ke teks Delivery (kondisi 2 repo
  produksi sekarang). Terbaca `DRIFT` dan diperbaiki ke versi Discovery. Ini yang
  membuktikan test `IN_SYNC` di atas adalah perbandingan sungguhan, bukan section yang
  diam-diam dilewati.
- `the generated Discovery agent files carry exactly the template Retry Logic` — mengunci
  `discoveryAgentMd()` dan `buildRetryLogicSection(kind)` pada string yang sama.
- `Discovery-guarded sections are held back for Discovery kinds only` — 4 section guarded
  `null` untuk kind Discovery, tetap hidup untuk `frontend`; `Retry Logic` sengaja tidak
  di-guard.

## Verify Checklist

- [x] `node --test test/*.test.js` — **46 pass, 0 fail** (38 test lama + 8 test baru)
- [x] 38 test lama 100% pass, tidak ada satu pun yang perlu di-update
- [x] Kind Delivery byte-for-byte identik dengan sebelum fix
- [x] Fixture Discovery yang benar → `IN_SYNC`, `curate sync` tidak menulis apa pun
- [x] README + CLAUDE.md diperbarui
- [x] Follow-up ticket tertulis, direferensikan dari komentar kode di `agent-sections.js`

## Catatan untuk sesi berikutnya

1. Perbaikan isi `caf-pm.md`/`caf-ux-designer.md` di `coderium-web-v2`/`umkm-pos` — sekarang
   sudah bisa dijalankan karena template Retry Logic-nya sudah benar. Untuk 4 section lain,
   file di repo itu perlu diperbaiki manual: `curate` tidak akan menyentuhnya (guarded).
2. `CAF-DISCOVERY-SECTIONS-01` — mulai dari `Allowed Tools`, risiko keamanan tertinggi.
