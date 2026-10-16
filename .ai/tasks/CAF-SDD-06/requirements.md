# CAF-SDD-06 — Konsistensi teks setelah `caf-design` dan `caf-breakdown`

Status: APPROVED
Repo: caf-initiator (main 2d3adab, setelah merge PR #39 yang memuat 05a dan 05b)

## Outcomes
- Kontrak artefak Planner dan tabel roster `agent-handoff.md` menyebut `design.md` dan `breakdown.md`, bukan hanya `requirements.md` dan `tasks.md`.
- Planner tidak diwajibkan menomori AC pada `requirements.md` garis besar (permintaan yang dipecah oleh `caf-breakdown`).
- Tidak ada perubahan perilaku lain, tidak ada skill baru, tidak ada perubahan orchestrator.

## Scope
In:
- `src/templates/artifact-by-role.js` (nilai `planner`), yang dipakai kalimat kontrak di `## Output` Planner (`buildOutputSection`, `agent-md.js`) dan baris roster `agent-handoff.md` (`agent-handoff-md.js`).
- Satu baris baru di `### 1. Specify` pada `PLANNER_SPEC_WORKFLOW` (`agent-md.js`).
- Test baru, golden `pre-sdd06`, penyesuaian test lama yang menahan teks yang sama, `CLAUDE.md`.

Out:
- Pencabutan banner `caf-design`/`caf-breakdown`, penyembunyian `architect`: menunggu dispatch test nyata.
- Item backlog lain (penegasan agent, kosmetik, `caf-spec` v4).
- Orchestrator.

## Findings (dari kode, main 2d3adab)
- F-1: `ARTIFACT_BY_ROLE.planner` bernilai `` `requirements.md`, `tasks.md` ``. Nilai itu masuk ke dua tempat: kalimat pembuka `## Output` Planner ("Produces <artefak> in `.caf/tasks/{TICKET-ID}/` for the next agent to read.") dan baris Planner di tabel roster `agent-handoff.md`.
- F-2: Tidak ada golden `frozen-kinds` untuk `planner` (daftar golden: architect, auditor, devops, documentation, implementer, pm, qa, ux-designer). Golden yang memuat Planner adalah `pre-sdd02*`, `pre-sdd03*`, `pre-sdd05a`, `pre-sdd05b` dan `mono-pnpm.json`.
- F-3: `## Output` Planner sudah menyebut `design.md` (langkah Plan, 05a) dan `breakdown.md` (langkah Specify, 05b), tetapi kalimat kontraknya tidak.
- F-4: `### 1. Specify` berisi "Number every acceptance criterion `AC-1:`, `AC-2:`, ..." tanpa pengecualian, sementara dua butir 05b menyuruh menulis `requirements.md` garis besar untuk permintaan yang dipecah (tanpa AC).
- F-5: `agent-handoff.md` ditulis lewat `writeIfAbsent` dan tidak punya sync; repo lama menerima perubahan hanya dengan menghapus berkas lalu `scaffold workflow`.
- F-6: Orchestrator membaca seluruh `verify-report.md` untuk `\bSUCCESS\b`; kerangka `agent-handoff.md` tidak boleh memuat kata itu di luar baris `Status:` (dijaga `test/sdd02-planner-spec.test.js`).

## Assumptions
- A-1: Tidak ada kode yang mem-parse kalimat kontrak Planner atau baris roster; hanya test golden yang menahan teksnya. Dasar: grep `ARTIFACT_BY_ROLE` hanya menemukan dua pembaca (`agent-md.js`, `agent-handoff-md.js`). T1 memverifikasi dan mendaftar test yang menahan kedua teks.
- A-2: Menambah kata ke kalimat kontrak Planner tetap menjaga aturan lama bahwa teks Planner mempertahankan "setiap artefak, path, dan token stop yang sudah ada" (hanya penambahan). Dasar: aturan CAF-SDD-02/02d. T1 memeriksa test yang menahannya.
- A-3: Satu baris utuh yang ditambahkan di dalam langkah Specify tidak mengubah jumlah heading `###` dan tidak memengaruhi `parseSections`. Dasar: pola 02c-02e dan 05a/05b.

## Decisions already made
- D-1: Item yang masuk 06 hanya "konsistensi 05a/05b" (Ganjar, 16 Okt).
- D-2: Kalimat kontrak Planner dan baris roster memakai satu nilai `ARTIFACT_BY_ROLE.planner` (satu sumber), tidak ada teks kedua (keputusan tiket ini).
- D-3: Pengecualian AC ditulis sebagai satu baris baru, bukan dengan mengubah baris "Number every acceptance criterion" yang ditahan test (keputusan tiket ini).

## Constraints
- Nilai baru `ARTIFACT_BY_ROLE.planner` (verbatim): `` `requirements.md`, `tasks.md` (and `design.md` or `breakdown.md` when the request needs one) ``. Nilai role lain tidak berubah.
- Baris baru Specify (verbatim, T2 memuatnya persis), ditaruh tepat setelah baris "An AC that holds more than one behavior is split into one AC per behavior.":
  `- A `requirements.md` written as an outline for a split request has no acceptance criteria: write `Tidak ada` under that section.`
- Tidak ada heading baru, tidak ada kata `TODO`, tidak ada nilai status/verdict baru. Semua bagian lain Planner (`## Input`, `## Constraints`, `## Allowed Tools`, frontmatter, sisa `## Output`) byte-identik dengan render di main 2d3adab (`test/fixtures/pre-sdd06/`, direkam sebelum perubahan, tidak boleh di-regenerate).
- `agent-handoff.md` berubah hanya pada baris Planner di tabel roster. Kerangka lain, termasuk format `verify-report.md`, identik dengan golden dan tidak memuat `SUCCESS` baru.
- `curate sync` tetap hanya menulis `DRIFT`. Tidak ada jalur tulis baru.
- `mono-pnpm.json` hanya boleh berubah pada entri `caf-planner.md` dan `agent-handoff.md`; dicatat di `verify-report.md`; bukan preseden.
- Tidak ada panggilan model dan tidak ada dependency baru.

## Open questions
Tidak ada.

## Acceptance criteria
- AC-1: When a planner is rendered, then the first sentence of its `## Output` reads "Produces `requirements.md`, `tasks.md` (and `design.md` or `breakdown.md` when the request needs one) in `.caf/tasks/{TICKET-ID}/` for the next agent to read.", and every other role's contract sentence is unchanged.
  Verify: automated test — `test/sdd06-artifact-contract.test.js` (render planner pada mono-pnpm dan single-nuxt; perbandingan kalimat kontrak role lain dengan golden).
- AC-2: When `agent-handoff.md` is rendered, then the Planner row of the roster table shows the same artifact text as AC-1, every other row is unchanged, and the rest of the file is identical to the golden.
  Verify: automated test — perbandingan dengan golden `pre-sdd06/` setelah mengganti satu baris; asersi kata `SUCCESS` tidak bertambah di luar baris `Status:`.
- AC-3: When a planner is rendered, then `### 1. Specify` contains the line of Constraints verbatim, directly after the line "An AC that holds more than one behavior is split into one AC per behavior.", with no new `###` heading and no `TODO` word, and `check-drafts` counts the same open `TODO` lines for the planner as before.
  Verify: automated test — baris ditahan verbatim; heading dihitung; hitungan `check-drafts`.
- AC-4: When a planner is rendered, then every line outside the AC-1 sentence and the AC-3 line is byte-identical to `test/fixtures/pre-sdd06/` on both fixtures.
  Verify: automated test — perbandingan dengan golden.
- AC-5: When any kind other than `planner` is rendered (all `frozen-kinds`, `reviewer`, `validator`, `frontend`, `backend`), then it is unchanged.
  Verify: automated test — `frozen-kinds` dan test render kind lain tetap lulus tanpa perubahan asersi.
- AC-6: When `curate sync` runs on a repo whose planner was generated before this ticket (baseline recorded), then `## Output` is `DRIFT` and rewritten with the new sentence and line, and the file differs only inside `## Output`; a planner whose `## Output` was edited by hand is `CONFLICT` and the file is unchanged byte for byte.
  Verify: automated test — `makeOldRepo` dengan Planner dari golden `pre-sdd06`; CONFLICT dengan asersi byte-demi-byte.
- AC-7: When the verification gate runs, then `npm test` passes, `pre-sdd06` and every older golden are unchanged, and `mono-pnpm.json` differs only in the entries `caf-planner.md` and `agent-handoff.md`.
  Verify: command: `npm test` | expect: exit 0
- AC-8: When `CLAUDE.md` is read, then it has a section for CAF-SDD-06 stating: what changed in the contract sentence and the roster row (one source, `ARTIFACT_BY_ROLE.planner`); the new Specify line and why it is separate from the numbering line; that `agent-handoff.md` has no sync (old repos delete the file and run `scaffold workflow`) while `## Output` reaches them through `curate sync`; and that `pre-sdd06/` is never regenerated.
  Verify: manual — baca section; tiap butir di atas ada.