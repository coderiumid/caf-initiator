# CAF-SDD-02b — caf-spec v3 dan bentuk bukti `command`
Status: APPROVED (disetujui Ganjar, 12 Okt 2026)
Source: chat (hasil uji dispatch planner di umkm-pos: tiket vitest-merchant dan http-test-harness)
Repo target: `caf-initiator`
Bergantung pada: CAF-SDD-02 sudah ter-merge ke main.

## 1. Outcome
Skill `caf-spec` yang di-generate memakai aturan v3: spec lebih ringkas, fakta dari kode tidak menyamar jadi pertanyaan, temuan yang bertentangan dengan ticket punya tempat (`Finding:`), dan AC boleh memakai `Verify: command:` yang bisa dijalankan validator. Format `verify-report` dan skill `caf-traceability` mengenali bukti `command`. Banner DRAFT tetap ada; pencabutannya tiket 02c setelah uji ulang lulus.

## 2. Scope
In:
- Isi `caf-spec` diganti dengan `caf-spec.source.v3.md` (dipakai apa adanya).
- Isi `caf-traceability` diganti dengan `caf-traceability.source.v2.md` (dipakai apa adanya).
- Format `verify-report` (`agent-handoff-md.js`): bentuk bukti kelima `command — <command> | <hasil teramati>`.
- Teks planner (`## Output`) disejajarkan dengan aturan v3 hanya pada: pertanyaan vs fakta dari kode, tag pertanyaan dipertahankan, bentuk `Verify:` termasuk `command:`.
- Regenerasi snapshot terbatas (AC-7).

Out:
- Pencabutan banner `caf-spec` dan pointer planner (02c).
- `validate-report`, kind `validator`, cara validator menjalankan `command:` (03b).
- Parsing `Verify:` oleh orchestrator (04).
- Perubahan lain pada planner di luar tiga butir di atas.
- `caf-design`, `caf-breakdown`, rename `caf-verify`.

## 3. Constraints and Assumptions
- Constraint: CLI tidak memanggil model; output deterministik; `writeIfAbsent`; placeholder guard tetap.
- Constraint: kedua skill tetap lahir DRAFT dengan banner 3 baris persis, panjang tidak lebih dari 90 baris, dan tanpa pointer `## Skills` selama DRAFT.
- Constraint: baris `Status:` di `verify-report` yang dibaca orchestrator tidak berubah bentuk.
- Constraint: frontmatter `tools:` semua agent tidak berubah; 15 golden `frozen-kinds` dan test 03a/03a2 tidak berubah.
- Constraint: perubahan teks template hanya di planner `## Output` dan format verify-report; teks di luar itu tidak boleh berubah satu byte pun.
- Assumption A1: branch `ai-agent/CAF-SDD-02b` dari main terbaru.
- Assumption A2: skill yang sudah ada di repo pengguna tidak ditimpa (`writeIfAbsent`); salinan v2 di umkm-pos diganti manual oleh Ganjar untuk uji ulang.
- Assumption A3: sintaks bentuk baru `Verify: command: <command> | expect: <exit code atau output>` sudah diputuskan, bukan pertanyaan.

## 4. Decisions Already Made
- Lima perbaikan v3 disetujui Ganjar: fakta ringkas tanpa nomor baris, fakta dari kode bukan pertanyaan, tag dipertahankan setelah dijawab, bagian `Finding:`, AC berisi perilaku bukan lokasi.
- Bentuk `Verify: command:` ditambahkan; perintah dibatasi pada yang ada di Verify Checklist repo.
- Banner tetap sampai uji ulang (vitest-merchant dan uji kontrak spec APPROVED) lulus.

## 5. Open Questions
- Q-1 [NON-BLOCKING] Apakah teks planner dan `agent-handoff.md` menyalin aturan yang sama (pertanyaan maksimal 5, bentuk Verify, bentuk bukti) di lebih dari satu tempat? T1 memetakan; bila ada, semuanya diselaraskan dan didaftar di `verify-report.md`. — Answer:

## 6. Acceptance Criteria
- AC-1: When `caf-init scaffold skills` dijalankan di repo uji kosong, then `.claude/skills/caf-spec/SKILL.md` identik byte-for-byte dengan `caf-spec.source.v3.md` (dikunci sha256 di test), berbanner DRAFT 3 baris, tidak lebih dari 90 baris. Verify: automated test.
- AC-2: When isi `caf-spec` hasil render dibaca, then memuat: `Finding:` di section 3, ketiga bentuk `Verify:` (`automated test`, `command:`, `manual:`), aturan "tanpa nomor baris", aturan fakta dari kode bukan pertanyaan, dan aturan mempertahankan tag asli setelah dijawab. Verify: automated test atas token-token tersebut.
- AC-3: When `scaffold skills` dijalankan ulang di repo yang sudah punya `caf-spec` versi lama, then file lama tidak berubah dan `--dry-run` melaporkan daftar yang sama dengan jalur write. Verify: automated test.
- AC-4: When skill `caf-traceability` hasil render dibaca, then identik byte-for-byte dengan `caf-traceability.source.v2.md` (sha256), memuat bentuk `command`, berbanner DRAFT, tidak lebih dari 90 baris, dan tidak ada pointer ke skill ini di agent mana pun. Verify: automated test.
- AC-5: When format `verify-report` hasil render dibaca, then terdapat lima bentuk bukti per AC (`automated-test`, `command`, `build-only`, `manual`, `none`), bagian "Proposed Spec Changes" tetap ada, dan regex `Status:` yang dikunci di SDD-02 tetap lulus. Verify: automated test.
- AC-6: When agent `planner` dirender (fixture `mono-pnpm` dan `single-nuxt`), then `## Output` menyatakan: hal yang bisa dijawab dengan membaca kode adalah fakta, bukan pertanyaan; maksimal 5 pertanyaan di file; tag asli dipertahankan setelah dijawab; `Verify:` boleh `command:`. Bagian lain agent planner (frontmatter, Input, Constraints, Working Pattern, Retry Logic) identik byte-for-byte dengan hasil SDD-02. Verify: automated test dengan golden planner SDD-02 yang disimpan sebelum perubahan.
- AC-7: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then entri yang berubah hanya `caf-planner.md` dan `agent-handoff.md` (ditambah entri lain hanya jika T1 membuktikan memuat salinan aturan yang sama, dicatat di `verify-report.md`); tidak ada entri lain yang berubah. Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-8: When file planner hasil SDD-02 (golden `test/fixtures/pre-sdd02b/`) di-baseline di repo sementara lalu `curate sync` dijalankan, then section `## Output` ditulis dengan teks baru, file agent lain tidak berubah, dan planner yang dikustomisasi pengguna tidak ditimpa. Verify: automated test.
- AC-9: When `npm test` dijalankan, then semua test lulus, 15 golden `frozen-kinds` tidak berubah, `git diff --stat` tidak menyentuh `test/fixtures/frozen-kinds/`, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat` tidak menyentuh folder golden.
- AC-10: When CLAUDE.md dibaca, then bagian skills menyebut `caf-spec` v3, bentuk `command`, dan bahwa banner dicabut di 02c; tidak ada klaim yang bertentangan. Verify: manual: baca bagian terkait.