# Verify Report: Header Mismatch Fix + `devops` Investigation

Status: SUCCESS

## Bagian A — Fix Header Mismatch `## Work Pattern (PIV)` vs `## Working Pattern (PIV)`

**Status: SUCCESS.**

### A1/A2 — Konfirmasi

```
grep -rn "Work Pattern (PIV)" src/     → src/templates/discovery-commands.js:250 (satu-satunya)
grep -rn "Working Pattern (PIV)" src/  → agent-md.js (builder + TEMPLATE_SECTION_ORDER),
                                          agent-sections.js (SYNCABLE_SECTIONS, guard list)
```

Kanonik = `## Working Pattern (PIV)` (dipakai `agent-md.js` builder Delivery dan
`SYNCABLE_SECTIONS`). `discovery-commands.js:250` adalah satu-satunya sumber
heading yang salah (`## Work Pattern (PIV)`) — tidak ada tempat lain.

Tidak ditemukan alasan desain untuk "Work Pattern" dibedakan sengaja untuk
Discovery — kesimpulan: inkonsistensi penamaan, bukan keputusan disengaja.
Lanjut sesuai default A3 tanpa STOP.

### A3/A4 — Fix Diterapkan

- `src/templates/discovery-commands.js:250` — heading diubah jadi
  `## Working Pattern (PIV)`.
- `src/utils/agent-sections.js` — `Working Pattern (PIV)` dikeluarkan dari
  `DISCOVERY_GUARDED_SECTIONS` (sebelumnya di-guard justru karena mismatch
  ini menyebabkan `curate` melakukan *insert* section duplikat, bukan
  overwrite/compare). Komentar di file diperbarui untuk menjelaskan histori
  ini dan konsekuensi barunya.
- Tidak ada referensi string lama lain yang perlu diupdate — dikonfirmasi via
  grep sebelum dan sesudah perubahan.

### Konsekuensi yang Ditemukan Saat Testing (dilaporkan, bukan disembunyikan)

Setelah unguard, `Working Pattern (PIV)` sekarang benar-benar dibandingkan.
Isi body-nya TETAP berbeda dari `buildWorkingPatternSection()` (versi
Discovery bicara soal dokumen: "first determine what's still unknown...",
bukan soal kode). Ini bukan lagi soal heading — ini konten. Konsekuensinya:
begitu file Discovery di-baseline, `curate sync` akan menormalkan wording
section ini ke teks generik Cluster 2. Ini WORDING change, bukan lubang
keamanan (tidak menghapus kontrak apa pun seperti kasus `Allowed Tools` di
`CAF-RETRYLOGIC-01`) — jadi tidak di-re-guard, dan dicatat sebagai item
opsional di `CAF-DISCOVERY-SECTIONS-01`.

### A5 — Test

Ditambahkan ke `test/retry-logic-role-aware.test.js`:

1. `curate sync leaves a correctly-generated Discovery agent unchanged on
   every guarded/role-aware section` (test 27, diperbarui) — membuktikan
   `Retry Logic`/`Verify Checklist`/`Role`/`Scope`/`Reference` tidak berubah,
   dan `Working Pattern (PIV)` MEMANG masuk `result.drifted` (efek yang
   diharapkan, bukan bug).
2. `Working Pattern (PIV) content still differs from the generic template —
   tracked, not guarded, and drift-syncs to the generic wording` — baru,
   membuktikan sync benar-benar menormalkan wording-nya (bukan no-op) dan
   hasilnya sama persis `SYNCABLE_SECTIONS['Working Pattern (PIV)']('pm')`.
3. `curate audit: a freshly-renamed Discovery fixture with no prior baseline
   reads Working Pattern (PIV) as UNTRACKED, not IN_SYNC` — baru, persis
   sesuai permintaan A5: `baselineHash: null` → `SECTION_STATUS.UNTRACKED`,
   BUKAN `IN_SYNC` otomatis.
4. `Discovery-guarded sections are held back for Discovery kinds only`
   (diperbarui) — guard list sekarang `['Allowed Tools', 'Input', 'Output']`
   (3, bukan 4); `Working Pattern (PIV)` dipindah ke daftar section yang
   "explicitly NOT guarded" bersama `Retry Logic`.

**Hasil test lengkap: 48 pass, 0 fail** (46 dari `CAF-RETRYLOGIC-01` + 2 baru
di sesi ini — 2 test lama sempat FAIL setelah unguard sampai diupdate untuk
mencerminkan perilaku baru yang benar; keduanya diperbaiki, bukan di-skip).

```
# tests 48
# pass 48
# fail 0
```

### Konfirmasi File Produksi Belum Tersentuh

```
git status --short | grep -v "^??"
 M CLAUDE.md
 M README.md
 M src/templates/agent-md.js
 M src/templates/discovery-commands.js
 M src/utils/agent-sections.js
```

Hanya file `caf-initiator` (template/util/dokumentasi/test). Tidak ada
perubahan di `coderium-web-v2`/`umkm-pos`. `discoveryAgentMd()` yang diubah
hanya memengaruhi apa yang di-generate KE DEPAN — file
`caf-pm.md`/`caf-ux-designer.md` yang sudah ada di 2 repo produksi masih
pakai heading lama dan perlu di-rename manual di sesi terpisah.

## Bagian B — Investigasi `devops` (Read-Only)

**Kesimpulan: risiko nyata, bukan sekadar technically-salah.**

### B1 — Skip (Sesuai Fallback)

Sesi ini hanya berjalan di dalam `caf-initiator`, tidak punya akses ke
`coderium-web-v2`/`umkm-pos`/`caf-orchestrator`. Sesuai instruksi prompt,
langkah dilewati dan investigasi dilanjutkan dari sisi `caf-initiator` saja.
Ini artinya belum diketahui apakah ada `caf-devops.md` yang SUDAH ter-generate
di project produksi — dicatat sebagai bagian dari rekomendasi tindak lanjut.

### B2 — Perbandingan `devops` vs `implementation`

Script throwaway memaksa `kind='devops'` vs `kind='implementation'` langsung
ke tiap builder `SYNCABLE_SECTIONS` (bukan lewat `detectKind()`, sesuai
instruksi):

```
Allowed Tools          devops !== implementation   <- BEDA SIGNIFIKAN
Input                  devops !== implementation   <- beda, severity rendah
Output                 devops !== implementation   <- beda, severity rendah
Working Pattern (PIV)  devops === implementation   (aman)
Retry Logic            devops === implementation   (aman)
What to Look For       null untuk keduanya          (aman)
Report Format          null untuk keduanya          (aman)
```

`detectKind('caf-devops.md')` dan `detectKind('devops.md')` sama-sama
mengembalikan `'implementation'` — dikonfirmasi langsung, bukan dugaan.
`devops` tidak ada di `KNOWN_KINDS` maupun `CAF_PREFIXED_KINDS`.

**`Allowed Tools` — risiko paling berat, pola identik `CAF-RETRYLOGIC-01`.**
`TOOLS_BY_KIND.devops = ['Read', 'Bash']` (sengaja tanpa Write/Edit, ada TODO
eksplisit soal kehati-hatian akses kredensial deployment). `implementation`
= `['Read', 'Write', 'Edit', 'Bash']`. Kalau `caf-devops.md` yang benar
(Read+Bash) di-baseline lalu di-`curate sync`, section ini akan `DRIFT`
terhadap template `implementation` (salah kind) dan tertimpa jadi
Read+Write+Edit+Bash — **memberi akses tulis kode ke agent yang sengaja
dibuat read-only**.

`Input`/`Output` berbeda juga, tapi severity lebih rendah: `devops` tidak
punya cabang di builder-nya jadi jatuh ke fallback TODO generik yang aman;
salah deteksi sebagai `implementation` menggantinya dengan konten
Planner-artifact sungguhan (`requirements.md`/`tasks.md`/`design.md`) — salah
kontrak, bukan lubang keamanan.

### B3 — Update `open-items.md`, Tidak Ada Fix

Entry "`devops` tidak terdaftar di `KNOWN_KINDS`" di
`.ai/tasks/CAF-RETRYLOGIC-01/open-items.md` diperbarui (bukan entry baru)
dengan hasil investigasi lengkap di atas, kesimpulan "risiko nyata", dan
rekomendasi ticket terpisah berikutnya (pola sama seperti
`CAF-RETRYLOGIC-01`/`CAF-DISCOVERY-SECTIONS-01`: investigasi Task 1 dulu,
termasuk menjalankan B1 yang di-skip di sini begitu ada akses ke repo
produksi, sebelum implementasi).

**Tidak ada fix diimplementasikan untuk `devops`** di sesi ini — dikonfirmasi
`git status` hanya menunjukkan 5 file dari Bagian A, tidak ada perubahan
terkait `devops`.

## Ringkasan File yang Berubah

| File | Bagian |
|---|---|
| `src/templates/discovery-commands.js` | A — heading fix |
| `src/utils/agent-sections.js` | A — unguard + komentar |
| `test/retry-logic-role-aware.test.js` | A — 2 test diupdate, 2 test baru |
| `.ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md` | A — update status Working Pattern (PIV) |
| `.ai/tasks/CAF-RETRYLOGIC-01/open-items.md` | B — update entry devops (investigasi, tanpa fix) |

Tidak ada perubahan di `coderium-web-v2`/`umkm-pos` di kedua bagian.
