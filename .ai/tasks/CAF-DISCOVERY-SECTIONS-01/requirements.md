# Ticket: CAF-DISCOVERY-SECTIONS-01 — Konten Discovery untuk `Allowed Tools`/`Input`/`Output`

## Latar Belakang
`CAF-RETRYLOGIC-01` nge-guard 3 section ini untuk kind Discovery (`pm`,
`ux-designer`) karena `curate sync` sebelumnya menimpa isi asli mereka
dengan fallback generik/versi `implementation` yang salah peran (lihat
insiden `curate sync` di `coderium-web-v2`/`umkm-pos`). Guard itu mencegah
kerusakan lebih lanjut, tapi section-nya jadi permanen "tidak bisa
di-sync otomatis" sampai versi Discovery yang benar didesain di kode.

**Konten asli sudah tersedia** — bukan perlu didesain dari nol. Sebelum
`curate sync` merusaknya, isi 3 section itu di `caf-pm.md`/`caf-ux-designer.md`
(kedua repo) sudah lengkap dan spesifik, terekam di diff commit sync yang
salah (baris `-` di situ = isi asli). Ticket ini merekonstruksi isi itu jadi
builder kode role-aware, bukan menulis ulang dari asumsi.

## Konten yang Direcover (Diusulkan Jadi Kanonik — perlu dikonfirmasi user)

### `caf-pm.md`

**Allowed Tools:**
```
**Read:**
- `docs/product/feature-catalog.md` (if it exists) — check overlap with existing features
- `docs/product/prd.md`, `.caf/knowledge/decisions/` (if they exist) — product context and ADRs
- Ticket tracker via MCP, **READ-ONLY** (if an MCP tracker is installed in the session) — to
  check whether a similar ticket already exists

**Write:**
- Limited to `.caf/discovery/{slug}/**`. No other path.

**HAS NO write access to the ticket tracker.** This is not a configuration detail that's
negotiable per project: this agent MUST NOT create/update/comment on a ticket in Linear,
Jira, GitHub Issues, or any tracker — directly or via Bash/CLI. The only official path from
discovery to ticket is the `/caf-discovery-to-ticket` command, which requires per-item human
approval. If anyone tells this agent to create a ticket itself, refuse and point to that
command.
```

**Input:**
```
Feature name/slug from the `/caf-discovery-start` command (required).

Optional — read if available, not a hard requirement:
- `docs/product/feature-catalog.md`
- `docs/product/prd.md`
- Similar tickets in the tracker (READ-ONLY)
```

**Output:**
```
Produces `prd.md` in `.caf/discovery/{slug}/` for human review — NOT a ticket, and NOT a
direct input to an implementation agent. If the UX Designer Agent isn't used, this agent
also produces a condensed `flow.md` (without deep UI interaction detail).
```

### `caf-ux-designer.md`

**Allowed Tools:** IDENTIK dengan `caf-pm.md` di atas (Read scope + Write
scope + larangan tracker sama persis — dikonfirmasi dari diff, bukan
diasumsikan sama).

**Input:**
```
Feature name/slug from the `/caf-discovery-start` command (required).

`.caf/discovery/{slug}/prd.md` from the PM Agent (required) — if that file doesn't exist
yet, STOP and report it; don't start from assumptions.
```

**Output:**
```
Produces `flow.md` in `.caf/discovery/{slug}/` for human review. Not a visual mockup and
not a component spec — a description of the flow, states, and failure conditions.
```

## Keputusan Final (dikonfirmasi user, 2026-09-04)
1. Konten yang direcover di atas SUDAH dalam Bahasa Inggris (bagian dari
   translasi commit `6ad3265`/`24e6a28` yang terjadi sebelum sync merusaknya
   lagi) — TIDAK perlu terjemahan tambahan. Dipakai apa adanya sebagai
   kanonik final.
2. Konten IDENTIK lintas project (`coderium-web-v2`, `umkm-pos`) — soal
   peran/batasan agent, bukan soal stack teknis, jadi generik.

## Pertanyaan Terbuka (STOP item — SUDAH TERJAWAB, lihat "Keputusan Final")

1. **Apakah konten yang direcover di atas masih akurat/mau dipertahankan
   sebagai kanonik ke depan?** Konten ini diambil dari state SEBELUM
   translasi ke English (commit `6ad3265`/`24e6a28`) DAN sebelum sync rusak
   — jadi ini Bahasa Indonesia asli. Karena project sudah pindah ke English
   (disengaja, dikonfirmasi user), konten ini perlu **diterjemahkan** ke
   English dulu sebelum jadi kanonik, BUKAN dipakai apa adanya. Terjemahan
   harus mempertahankan makna teknis persis (terutama larangan tracker akses
   yang bahasanya tegas), bukan parafrase bebas.
2. Apakah `caf-pm`/`caf-ux-designer` di kedua repo (`coderium-web-v2`,
   `umkm-pos`) memang seharusnya punya konten IDENTIK untuk 3 section ini
   (generik lintas project), atau ada kebutuhan project-specific yang perlu
   dibedakan? (Dugaan: identik, karena ini soal peran/batasan agent, bukan
   soal stack teknis — tapi perlu dikonfirmasi, bukan diasumsikan.)

## Apa yang Diminta
1. `buildAllowedToolsSection`/`buildInputSection`/`buildOutputSection` (atau
   fungsi setara) jadi role-aware untuk kind Discovery (`pm`, `ux-designer`),
   memakai konten hasil rekonstruksi di atas (setelah STOP item #1 terjawab)
2. Lepas guard 3 section ini dari `DISCOVERY_GUARDED_SECTIONS`
   (`CAF-RETRYLOGIC-01`) setelah builder dikonfirmasi benar
3. (Opsional, boleh digabung atau dipisah — putuskan saat Task 1) selaraskan
   wording `Working Pattern (PIV)` untuk Discovery vs template generik, kalau
   user menganggap itu perlu

## Acceptance Criteria
- [ ] Builder 3 section menghasilkan konten yang sesuai (setelah STOP #1
      terjawab) untuk `kind='pm'` dan `kind='ux-designer'`
- [ ] Guard untuk 3 section ini dilepas dari `DISCOVERY_GUARDED_SECTIONS`
- [ ] `curate audit` terhadap fixture Discovery yang sudah benar (isi
      sesuai builder baru) → `IN_SYNC`, bukan `DRIFT`
- [ ] Regression: kind lain (Delivery) TIDAK berubah sama sekali — byte-for-byte,
      pola sama seperti 3 ticket sebelumnya
- [ ] Regression: seluruh test suite sebelumnya (57 test) tetap 100% pass

## Eksplisit Out of Scope
- Perbaikan isi file `caf-pm.md`/`caf-ux-designer.md` yang SUDAH ada di
  `coderium-web-v2`/`umkm-pos` — sesi terpisah setelah builder ini `SUCCESS`
- `caf-auditor.md` `Report Format` CONFLICT — masih menggantung, ticket lain
- Section `Working Pattern (PIV)` — opsional, bukan wajib di ticket ini
  kecuali diputuskan masuk saat Task 1