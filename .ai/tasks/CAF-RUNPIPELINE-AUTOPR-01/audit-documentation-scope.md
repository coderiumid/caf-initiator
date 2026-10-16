# Audit Report — Whitelist Section 7.1 vs Documentation Agent Scope

Audit atas dugaan gap: whitelist scope commit di `/caf-run-pipeline` section 7.1 hanya
mencakup `appPaths` role implementasi, sementara Documentation Agent (stage 4, aktif di
pipeline yang sama) menulis ke luar direktori itu. Ini AUDIT — tidak ada kode diubah.

**Catatan lokasi**: repo target hasil-generate (mis. `umkm-pos`, `.claude/agents/caf-documentation.md`)
tidak ditemukan di filesystem (`find` dari `/` dan `~` nol hasil) — audit ini jalan sepenuhnya
dari **sumber template** di caf-initiator (`src/templates/agent-md.js`,
`src/commands/agents.js`, `src/templates/artifact-by-role.js`) dan `CAF.md`. Ini valid karena
target repo mewarisi isi generate apa adanya — file hasil generate adalah cerminan literal
template, tidak ada logic tambahan di sisi target repo.

---

## 1. Konfirmasi scope Documentation agent — apakah beneran nulis di luar whitelist

**Status: GAP NYATA (bukan false alarm) — tapi bentuknya beda dari yang diduga di brief.**

`## Scope` di `caf-documentation.md` hasil generate **bukan** daftar path eksplisit — dia
placeholder TODO, sama seperti role lain yang bukan implementasi:

```
scope: 'TODO: area kode/artifact yang boleh dibaca Documentation — tentukan manusia.',
```
(`src/commands/agents.js:181`)

Path nyata yang menunjukkan Documentation menulis ke luar `.caf/tasks/{TICKET-ID}/` ada di dua
tempat lain, keduanya literal string, bukan TODO:

- **Role** (`src/commands/agents.js:180`): `'Memperbarui dokumentasi (README, CHANGELOG, docs/) sesuai perubahan yang dibuat.'`
- **Tools rationale** (`src/templates/agent-md.js:199`): `'Read/Write/Edit terbatas ke dokumentasi (README, CHANGELOG, \`docs/\`). TIDAK menyentuh kode.'`
- **Artifact/Output contract** (`src/templates/artifact-by-role.js:10`): `documentation: 'update \`docs/\` (paralel, non-blocking)'`

`buildOutputSection()` (`src/templates/agent-md.js:283-297`) merender Output section dengan
template seragam lintas role: `` Menghasilkan ${artifact} di `.caf/tasks/{TICKET-ID}/` untuk
dibaca agent berikutnya. `` — untuk Documentation ini hasilnya kalimat yang isinya kontradiktif
("Menghasilkan update `docs/` ... di `.caf/tasks/{TICKET-ID}/`"), tapi makna operasional yang
jelas dari Role + Tools yang Diizinkan tetap: **agent ini menulis ke `README.md`,
`CHANGELOG.md`, dan `docs/` di root repo — path yang TIDAK PERNAH masuk `appPaths` (yang
hanya diisi dari role `frontend`/`backend`/`implementation`, lihat poin 3).**

Cross-check `CAF.md`:
- Baris 391 (tabel 8 Agent Spesialis): `| Documentation | Paralel | update \`docs/\` |` —
  konsisten dengan Role/Output di atas.
- Baris 292-295: `docs/` "project-owned, read-only bagi CAF — TIDAK PERNAH ditulis
  caf-initiator sendiri" — ini bukan kontradiksi, tapi soal subjek yang berbeda: pernyataan itu
  soal **caf-initiator (tool generator ini)** tidak menulis isi `docs/` saat generate Layer 1,
  bukan soal **Documentation Agent runtime** (persona yang di-generate, dijalankan lewat
  `/caf-run-pipeline`) yang memang didesain menulis ke `docs/` setelah pipeline jalan. Dua
  fase berbeda, tidak saling menyangkal.

**Kesimpulan poin 1**: gap ini nyata. Documentation Agent, sesuai kontrak yang tertulis di
template-nya sendiri (Role, Tools yang Diizinkan, Output/artifact contract), menulis ke
`README.md`, `CHANGELOG.md`, `docs/` — tiga path yang tidak ada di whitelist 7.1 manapun.
**Bukan false alarm.**

---

## 2. Statis atau bervariasi per-project?

**Status: STATIS.**

Ketiga sumber (`role`, `TOOLS_RATIONALE.documentation`, `ARTIFACT_BY_ROLE.documentation`) di
atas semuanya **string literal hardcoded**, bukan hasil interpolasi dari `stack`/`appPaths`.
Dikonfirmasi dengan grep `docs` di `src/steps/02-detect-stack.js` — nol match. Tidak ada field
apapun di hasil `detectStack()` yang menyimpan lokasi `docs/` per-project (beda dengan
`appPaths`, yang memang hasil deteksi/pilihan user per app).

Implikasi: `README.md`, `CHANGELOG.md`, `docs/` bisa langsung **di-hardcode** sebagai entry
tambahan whitelist 7.1 — tidak perlu data dinamis baru semacam `appPaths`. Satu catatan minor:
kalau target repo monorepo, `README.md`/`CHANGELOG.md` yang dimaksud kemungkinan root-level
(bukan per-app) — konsisten dengan Documentation dideklarasikan sebagai role whole-repo
(`app: null`, sama seperti Planner/QA/Reviewer), bukan role ber-scope app.

---

## 3. Cakupan whitelist saat ini di kode — konfirmasi hanya implementationCandidates

**Status: PASS (sesuai dugaan brief) — dikonfirmasi persis, tidak ada jalur documentation sama sekali.**

`src/commands/agents.js:360-369`:
```js
const implementationCandidates = selected.filter(
  (c) => c.kind === 'frontend' || c.kind === 'backend' || c.kind === 'implementation'
);
const implementationRoles = implementationCandidates.map((c) => agentSlug(c.kind, c.app));
const appPaths = Object.fromEntries(
  implementationCandidates.map((c) => [agentSlug(c.kind, c.app), c.app.path])
);
```
Filter eksplisit `kind === 'frontend' | 'backend' | 'implementation'` — `kind === 'documentation'`
tidak pernah masuk `implementationCandidates`, jadi tidak pernah masuk `implementationRoles`
maupun `appPaths`.

`src/templates/run-pipeline-command.js:177-182` (`commitScopeList`):
```js
function commitScopeList(implementationRoles, appPaths) {
  const appLines = implementationRoles
    .filter((role) => appPaths[role])
    .map((role) => `- \`${role}\`: \`${appPaths[role]}/\``);
  return [`- \`.caf/tasks/{TICKET-ID}/\` (artifact)`, ...appLines].join('\n');
}
```
Hanya dua sumber: `.caf/tasks/{TICKET-ID}/` (hardcode) dan `appPaths` per `implementationRoles`.
Tidak ada parameter/jalur untuk role lain (documentation, architect, qa, reviewer) di fungsi
ini maupun di caller (`buildRunPipelineMd`, dipanggil `agents.js:401-407` dengan
`implementationRoles`/`appPaths` — `hasDocumentation` cuma dipakai untuk toggle isi section 4
naratif, tidak pernah diteruskan ke `commitScopeList`).

**Kesimpulan poin 3**: dikonfirmasi eksplisit — hanya `frontend`/`backend`/`implementation`
yang masuk whitelist. Tidak ada jalur apapun untuk `documentation`.

---

## 4. Mismatch frasa larangan push/PR di Section 3 vs janji intro

**Status: DEVIASI — dikonfirmasi, dan lebih luas dari yang diduga brief.**

Intro (`run-pipeline-command.js:225-229`) menjanjikan:
> "...setiap prompt spawn di bawah WAJIB memuat larangan push/PR secara eksplisit (\"itu tugas
> main thread di section 7, bukan tugas kamu\")..."

Realitasnya, **hanya section 3** (implementasi) yang punya blok larangan literal, dan
kalimatnya **tidak memuat frasa "section 7"** (`run-pipeline-command.js:332-333`):

```
> Jangan `git push`, jangan buat PR, jangan ubah status ticket di tracker. Tulis kode dan
> `verify-report.md` saja, di branch yang sudah aktif.
```

Grep penuh kata "push"/"PR" di file (`run-pipeline-command.js`) mengonfirmasi:
- **Section 4 (Documentation)** — `documentationSection()` (baris 112-126): tidak ada satupun
  larangan push/PR eksplisit dikirim ke prompt spawn.
- **Section 5 (QA)** dan **Section 6 (Reviewer)** — keduanya dirender lewat `gateSection()`
  (baris 136-169), yang juga tidak punya larangan push/PR di templatenya sama sekali.

Jadi ada dua lapis deviasi:
1. Section 3 punya larangan, tapi kalimatnya **beda** dari yang dijanjikan intro (tidak
   menyebut "section 7").
2. Section 4, 5, 6 **tidak punya larangan sama sekali** — padahal Documentation, QA, dan
   Reviewer semuanya di-generate dengan `Bash` di tool allowlist-nya
   (`TOOLS_BY_KIND.documentation = ['Read','Write','Edit']` — tidak ada Bash, jadi Documentation
   secara teknis **tidak bisa** `git push`/`gh pr create` walau tanpa larangan prosa; tapi
   `TOOLS_BY_KIND.qa = ['Read','Write','Bash']` dan `TOOLS_BY_KIND.reviewer = ['Read','Write','Bash']`
   **punya** Bash — sama seperti implementation agents, yang berarti QA dan Reviewer *secara
   teknis bisa* push/PR sendiri tanpa larangan prosa apapun yang menahannya).

**Kesimpulan poin 4**: perlu sinkronisasi di 3 titik minimal:
- Perbaiki kalimat larangan section 3 supaya memuat frasa yang dijanjikan intro (atau ubah
  janji intro-nya supaya cocok dengan kalimat aktual — dua arah sama-sama valid, keputusan
  bukan bagian audit ini).
- Tambahkan larangan serupa ke prompt spawn QA dan Reviewer (`gateSection()`) — keduanya punya
  Bash, risiko sama dengan implementation agents, saat ini nol mitigasi prosa.
- Documentation (section 4) risikonya lebih rendah (tidak ada Bash), tapi tetap tidak konsisten
  dengan janji intro "setiap prompt spawn WAJIB" — kalau intro tidak diubah untuk mengecualikan
  Documentation, section 4 tetap perlu larangan yang sama demi konsistensi tekstual, walau
  redundan secara teknis.

---

## 5. QA dan Reviewer — konfirmasi negatif, tidak ada risiko serupa Documentation

**Status: PASS — dikonfirmasi tidak ada risiko scope serupa Documentation.**

`ARTIFACT_BY_ROLE` (`src/templates/artifact-by-role.js:8-9`):
```js
qa: '`qa-report.md`',
reviewer: '`review-notes.md`',
```
`buildOutputSection()` merender keduanya sebagai `Menghasilkan \`qa-report.md\` di
\`.caf/tasks/{TICKET-ID}/\` untuk dibaca agent berikutnya.` — tidak seperti Documentation, tidak
ada string tambahan yang menunjuk ke path di luar `.caf/tasks/{TICKET-ID}/`. `role` QA/Reviewer
(`src/commands/agents.js:163-164, 171-172`) juga cuma bicara "memverifikasi"/"meninjau", tidak
menyebut path tulis apapun di luar itu.

Satu catatan yang bukan bug tapi relevan ke poin 4: QA dan Reviewer **punya** `Bash` di tool
allowlist (beda dari Documentation yang tidak) — jadi walau scope tulisnya aman
(`.caf/tasks/{TICKET-ID}/` saja), risiko push/PR liar tetap ada dari sisi *tooling*, bukan
*scope file*. Ini sudah dicatat sebagai bagian dari gap poin 4, tidak diulang sebagai temuan
terpisah di sini.

**Kesimpulan poin 5**: dikonfirmasi — gap scope-tulis memang eksklusif ke Documentation. QA dan
Reviewer tidak punya risiko serupa.

---

## Rekomendasi

**Perlu fix, scope-nya KECIL — whitelist statis, bukan data dinamis baru.**

1. **Poin 1 & 2**: Tambahkan entry statis ke `commitScopeList()`
   (`src/templates/run-pipeline-command.js:177-182`) untuk `README.md`, `CHANGELOG.md`, `docs/`
   — HANYA kalau `hasDocumentation` true (fungsi saat ini tidak menerima parameter itu; perlu
   diteruskan dari `buildRunPipelineMd`, yang sudah menerima `hasDocumentation` tapi belum
   memakainya untuk ini — lihat `run-pipeline-command.js:196-201`). Tidak perlu field baru
   semacam `appPaths` karena path-nya statis dan tidak tergantung stack/monorepo — dikonfirmasi
   poin 2.
2. **Poin 4**: Selaraskan kalimat larangan push/PR:
   - Section 3: tambahkan frasa "section 7" ke blok larangan literal (atau revisi intro).
   - Section 5 (QA) dan Section 6 (Reviewer): tambahkan blok larangan yang sama ke
     `gateSection()` — prioritas lebih tinggi dari Documentation karena keduanya punya Bash.
   - Section 4 (Documentation): tambahkan juga demi konsistensi teks, walau risiko teknisnya
     rendah (tidak ada Bash di tool allowlist-nya).
3. Poin 3 dan 5 tidak perlu perubahan — sudah sesuai desain.

Tidak ada kode yang diubah di audit ini. Keputusan fix (dan urutan prioritasnya) menunggu
review manual.
