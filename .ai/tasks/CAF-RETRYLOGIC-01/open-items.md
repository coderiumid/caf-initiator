## `## Work Pattern (PIV)` vs `## Working Pattern (PIV)` — header mismatch, bukan soal kind-awareness

**Ditemukan:** 2026-09-04, selama investigasi Task 1 `CAF-RETRYLOGIC-01`.

**Masalah:**
File Discovery yang sudah ter-generate (`caf-pm.md`, `caf-ux-designer.md`) memakai
heading `## Work Pattern (PIV)`, sementara template kanonik (`SYNCABLE_SECTIONS`,
section builder di `agent-md.js`) memakai `## Working Pattern (PIV)`. Beda satu kata
("Work" vs "Working") — kemungkinan besar inkonsistensi penamaan/typo lama, BUKAN
section yang sengaja beda isi antara Discovery dan Delivery seperti 3 temuan lain
(`Allowed Tools`/`Input`/`Output`).

**Dampak saat ini:**
Karena section ini di-guard (`DISCOVERY_GUARDED_SECTIONS`, `CAF-RETRYLOGIC-01`) untuk
kind Discovery, `curate sync` tidak akan menyentuhnya — jadi TIDAK ada risiko overwrite
aktif sekarang. Tapi selama mismatch ini belum diperbaiki, `curate audit` kemungkinan
akan terus melaporkan section ini sebagai "missing" (bukan `DRIFT`) di file Discovery,
karena secara heading string dia memang tidak match — bukan karena isinya beda.

**Rekomendasi:**
Perlu diputuskan yang mana yang kanonik: rename heading di 2 file existing menjadi
`## Working Pattern (PIV)` (ikut template), atau sebaliknya kalau ternyata "Work
Pattern" itu penamaan yang disengaja untuk agent Discovery. Ini keputusan konten
kecil, bisa digabung ke `CAF-DISCOVERY-SECTIONS-01` (yang sudah menangani 3 section
Discovery lain) sebagai 1 sub-item tambahan, ATAU dikerjakan terpisah lebih dulu
karena scope-nya jauh lebih kecil (rename heading, bukan desain ulang konten).

**Status:** Belum dikerjakan. Ditemukan tapi sengaja tidak diperluas ke
`CAF-RETRYLOGIC-01` (di luar scope ticket itu), dan belum eksplisit tercatat sebagai
sub-item di `CAF-DISCOVERY-SECTIONS-01` sampai entry ini dibuat.

**Update 2026-09-04 — heading mismatch sudah diperbaiki** (di luar sesi ini,
sebelum `CAF-DISCOVERY-SECTIONS-01` mulai): `discoveryAgentMd()` sekarang
memancarkan heading kanonik `## Working Pattern (PIV)`, jadi section ini
kembali trackable (UNTRACKED-until-baselined, bukan permanen "missing").
**Wording-nya sendiri** (isi 3 baris PLAN/IMPLEMENT/VERIFY, yang untuk Discovery
menyebut dokumen bukan kode) tetap beda dari `buildWorkingPatternSection()`
generik — ini pertanyaan konten, bukan lagi bug heading. Sengaja DIPISAH dari
`CAF-DISCOVERY-SECTIONS-01` per konfirmasi user 2026-09-04 (opsional, bukan
bagian DoD ticket itu) — jadi tetap terbuka sebagai item tersendiri, ticket lain
kalau mau diselaraskan.

---

## `devops` tidak terdaftar di `KNOWN_KINDS` — `detectKind()` salah baca sebagai `implementation`

**Ditemukan:** 2026-09-04, selama investigasi Task 1 `CAF-RETRYLOGIC-01`.

**Masalah:**
`devops` ada di `TOOLS_BY_KIND` dan `TOOLS_RATIONALE` (`agent-md.js`) — artinya agent
ini secara desain dianggap punya kebutuhan tools sendiri yang berbeda dari kind lain.
Tapi `devops` TIDAK ada di `KNOWN_KINDS` (`agent-sections.js`), yang dipakai
`detectKind()` untuk mengenali jenis agent dari nama file. Akibatnya file
`devops.md` (atau `caf-devops.md`) terbaca sebagai kind `implementation` (fallback
generik), bukan `devops`.

**Dampak potensial:**
Sama pola dengan masalah `Retry Logic` yang baru diperbaiki — kalau
`SYNCABLE_SECTIONS` mana pun punya konten yang seharusnya beda untuk `devops`
(kemungkinan besar `Allowed Tools`, mengingat `devops` sudah punya entry sendiri di
`TOOLS_BY_KIND`), maka `curate sync` berpotensi menimpa section itu dengan konten
`implementation` generik — persis mekanisme insiden `CAF-RETRYLOGIC-01`, cuma untuk
kind yang berbeda.

**Status:** Diinvestigasi 2026-09-04 (sesi terpisah, read-only, sesuai batas prompt
eksekusi "Header Mismatch + Investigasi devops" — B1 di-skip karena sesi ini tidak
punya akses ke `coderium-web-v2`/`umkm-pos`/`caf-orchestrator`, hanya jalan di
`caf-initiator`). **Kesimpulan: risiko nyata, bukan cuma technically-salah.**

Script pembanding (`buildX('devops')` vs `buildX('implementation')` untuk tiap
builder di `SYNCABLE_SECTIONS`, dipaksa manual bukan lewat `detectKind()`):

```
Allowed Tools          devops !== implementation   <- BEDA SIGNIFIKAN, lihat di bawah
Input                  devops !== implementation   <- beda, severity lebih rendah
Output                 devops !== implementation   <- beda, severity lebih rendah
Working Pattern (PIV)  devops === implementation   (aman, kedua kind konstan)
Retry Logic            devops === implementation   (aman, keduanya Delivery)
What to Look For       null untuk keduanya          (aman, auditor-only)
Report Format          null untuk keduanya          (aman, auditor-only)
```

- **`Allowed Tools` — risiko paling berat, pola identik dengan temuan
  `Allowed Tools` di `CAF-RETRYLOGIC-01`.** `devops` sudah didesain sengaja
  restriktif: `TOOLS_BY_KIND.devops = ['Read', 'Bash']` (TIDAK ada Write/Edit),
  dengan rationale eksplisit menyebut kehati-hatian soal akses kredensial
  deployment. Tapi `detectKind('caf-devops.md')` mengembalikan `'implementation'`
  (bukan `'devops'`, karena `devops` tidak ada di `KNOWN_KINDS` DAN tidak ada di
  `CAF_PREFIXED_KINDS`), dan `implementation` punya `['Read', 'Write', 'Edit',
  'Bash']`. Kalau file `caf-devops.md` yang di-generate benar (Read+Bash saja)
  di-baseline lalu di-`curate sync`, section `Allowed Tools`-nya akan cocok
  `DRIFT` terhadap template `implementation` yang salah kind, dan tertimpa
  jadi Read+Write+Edit+Bash — **memberi akses tulis kode ke agent yang
  sengaja dibuat read-only**, persis mekanisme insiden `CAF-RETRYLOGIC-01`.
- **`Input`/`Output` — beda, tapi severity lebih rendah.** `devops` tidak
  punya cabang di `buildInputSection`/`buildOutputSection`, jadi jatuh ke
  fallback TODO generik yang aman (`'TODO: which artifact is received/produced
  ...'`). Kesalahan deteksi sebagai `implementation` justru mengganti fallback
  aman ini dengan konten Planner-artifact yang sungguhan
  (`requirements.md`/`tasks.md`/`design.md`) — salah kontrak, bukan lubang
  keamanan, tapi tetap representasi yang salah untuk agent yang belum
  didefinisikan CAF.md Layer 3-nya.
- `Working Pattern (PIV)`/`Retry Logic` aman karena isinya sama-sama Delivery
  generik untuk kedua kind — tidak ada perbedaan yang bisa hilang.

**Rekomendasi:** Ticket terpisah berikutnya, pola sama seperti
`CAF-RETRYLOGIC-01`/`CAF-DISCOVERY-SECTIONS-01` — investigasi Task 1 dulu
(termasuk B1 yang di-skip di sini: cek apakah ada `caf-devops.md` yang sudah
ter-generate di project produksi, karena itu menentukan apakah ini insiden aktif
atau risiko laten) sebelum implementasi. Minimal fix yang kemungkinan diperlukan:
tambahkan `'devops'` ke `KNOWN_KINDS` (dan putuskan apakah juga masuk
`CAF_PREFIXED_KINDS` — TODO lain yang belum diputuskan, lihat komentar di
`agent-md.js:14-18`) supaya `detectKind()` mengenalinya dengan benar. TIDAK
diimplementasikan di sesi ini sesuai batasan prompt (read-only investigasi).

**Update 2026-09-04 — DIPERBAIKI di `CAF-DEVOPS-KIND-01`.** `devops` ditambahkan
ke `KNOWN_KINDS`; `detectKind()` juga diubah untuk strip prefix `caf-` berdasarkan
`KNOWN_KINDS` (bukan `CAF_PREFIXED_KINDS`) supaya `caf-devops.md` ikut terdeteksi
walau `devops` tetap sengaja tidak masuk `CAF_PREFIXED_KINDS` (agentSlug() masih
menghasilkan nama file tak-berprefix `devops.md`). Investigasi Task 1 tiket itu
menemukan `buildToolsSection('devops')` sudah kind-aware dan benar (Read+Bash) —
jadi TIDAK perlu entry guard tambahan di `DISCOVERY_GUARDED_SECTIONS`-style list,
cukup fix `KNOWN_KINDS` saja. `Input`/`Output` tetap jatuh ke fallback TODO
generik yang aman, diputuskan untuk tidak di-guard (tidak ada konten sungguhan
yang bisa hilang). Ticket itu juga menyembunyikan `devops` dari menu interaktif
`caf-init scaffold agents` (definisi candidate tetap ada, hanya disaring dari
pilihan) sebagai lapisan defense-in-depth kedua. Lihat
`.ai/tasks/CAF-DEVOPS-KIND-01/requirements.md` dan `verify-report.md`.