# CAF-SDD-02e — Planner membaca apa yang ia klaim, tanpa menunda atau menebak
Status: APPROVED (Q-1 sampai Q-3 dijawab "ikut rekomendasi", 13 Okt 2026)
Source: chat (Uji 6 di umkm-pos, `http-test-harness` dan `diskon-kasir`, 13 Okt 2026)
Repo target: `caf-initiator`
Bergantung pada: 02c, 02d, 03d ter-merge (sudah).

## 1. Outcome
Planner menulis spec yang setiap faktanya berasal dari berkas yang benar-benar ia baca pada run itu. Hal yang bisa dibaca dibaca; hal yang butuh keputusan manusia menjadi pertanyaan; hal yang tidak diketahui tidak ditulis sebagai fakta dan tidak dioper ke implementer. Daftar, angka, dan istilah yang sama disebut sama di seluruh artefak, dan `tasks.md` selalu punya bagian coverage.

## 2. Scope
In:
- Planner `## Output` (dan `## Input` bila T1 menunjukkan perlu): aturan AC-1 sampai AC-9. Hanya dua section ini yang berubah; keduanya di-track `curate sync`.
- Test, golden pra-tiket, snapshot terbatas, README dan CLAUDE.md.

Out:
- Isi skill `caf-spec` dan `caf-no-guess` (hash `caf-spec` tetap), `tools:`, `## Skills`, `## Allowed Tools`, `## Constraints` planner.
- Agent selain planner, command, orchestrator, `curate audit`.
- Perubahan model, prompt dispatch, atau batas token.

## 3. Constraints and Assumptions
- Finding (Uji 6): pada dua tiket, catatan "belum dibaca" kembali dengan sinonim ("tidak dibaca", "belum dibandingkan", "belum diketahui"), dan pembacaan dioper ke `tasks.md` ("Baca dulu …" di tiga task). Frasa dan kata persis yang dilarang 02d tidak menutup bentuk-bentuk ini.
- Finding (Uji 6): AC tentang perilaku guard ditulis tanpa membaca berkas guard (sumber hanya `CLAUDE.md` yang dibaca otomatis); 15 ADR ter-Glob tanpa satu pun dibaca.
- Finding (Uji 6): sebuah `Finding:` berisi klaim "inferred dari kode, belum dijalankan"; AC memuat tebakan tanpa label ("admin mungkin lewat daftar semua izin") padahal berkas jawabannya sudah dibaca; daftar role berbeda antara Assumption, AC, dan task.
- Finding (Uji 6): `tasks.md` punya bagian coverage di satu run dan tidak di run lain; section 3 memuat path dan nama fungsi sementara aturan 02 melarang detail implementasi di spec; sebagian AC memuat lebih dari satu perilaku.
- Finding (Uji 6): yang sudah efektif sejak 02d: pesan akhir `Status:` polos, `tasks.md` tidak ditulis saat BLOCKING, tanpa placeholder `- -`, AC `automated test` menyebut berkas.
- Finding (skill): `caf-no-guess` butir 4 menyuruh menulis item terbuka sebagai baris `TODO:`.
- Constraint: teks planner di luar `## Output` (dan `## Input` bila diubah) tidak berubah satu byte pun; aturan 02c dan 02d tetap; hash `caf-spec` tetap `b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0`.
- Constraint: golden `frozen-kinds` dan test `todo` fallback `implementation` tidak berubah; bila sebuah golden memuat teks planner, T1 mencatatnya dan eksekutor STOP `NEEDS_HUMAN` sebelum `src/`.
- Constraint: `## Constraints` planner terkunci dan tidak diubah (catatan blocked pada ticket run tetap).
- Constraint: kata TODO tidak ditulis di aturan secara literal bila `curate --check-drafts` menghitungnya per agent (pola 02d: "a note … that says something was not read yet").
- Assumption A1: branch `ai-agent/CAF-SDD-02e` dari main terbaru.
- Assumption A2 (T1): aturan 02d untuk "tidak ada TODO belum dibaca" ada di `## Output`; aturan baru menggantikan atau memperluasnya tanpa kontradiksi.

## 4. Decisions Already Made
- Perilaku planner diatur di `## Output`/`## Input` agent supaya ikut `curate sync`.
- Aturan ditulis berdasarkan niat (baca yang diklaim; tidak menunda; tidak menebak), bukan daftar kata terlarang.
- Hasil tiket ini diuji ulang di umkm-pos (Uji 7) dengan dua tiket yang sama dan pemeriksa yang sama.
- Q-1: `caf-no-guess` tidak diubah; planner `## Output` memuat satu baris yang menyatakan aturan planner mengalahkan butir `TODO:` untuk artefak (jawaban Ganjar, 13 Okt 2026). Skill diperbaiki di 03f bila Uji 7 menunjukkan baris itu tidak cukup.
- Q-2: `## Coverage` wajib di akhir `tasks.md` yang berisi tugas.
- Q-3: path dan nama simbol boleh di Finding, Assumption, dan `Verify:`; tidak di Outcome, Scope, Decisions, dan kalimat `When … then`.

## 5. Open Questions
- Q-1 [BLOCKING] Pertentangan dengan `caf-no-guess` butir 4 (`TODO:`): (a) tiket ini hanya menambah satu baris di `## Output` yang menyatakan aturan planner mengalahkan butir itu untuk artefak, skill tidak diubah (rekomendasi: skill tidak ikut `curate sync`, rollout manual), atau (b) skill diubah juga di tiket ini? — Answer: (a) `caf-no-guess` tidak diubah; satu baris di planner `## Output` menyatakan aturan planner mengalahkan butir 4 untuk artefak (ikut rekomendasi).
- Q-2 [NON-BLOCKING] Bagian `## Coverage` di akhir `tasks.md` (daftar AC → task) wajib bila `tasks.md` berisi tugas (rekomendasi), atau opsional? — Answer: `## Coverage` wajib bila `tasks.md` berisi tugas (ikut rekomendasi).
- Q-3 [NON-BLOCKING] Path berkas dan nama simbol diperbolehkan di Finding, Assumption, dan baris `Verify:`, tetapi tidak di Outcome, Scope, Decisions, dan kalimat `When … then` AC (rekomendasi), atau dilarang di semua tempat kecuali `Verify:`? — Answer: Path dan nama simbol boleh di Finding, Assumption, dan `Verify:`; tidak di Outcome, Scope, Decisions, dan kalimat `When … then` (ikut rekomendasi).
## 6. Acceptance Criteria
- AC-1: When planner dirender (fixture `mono-pnpm` dan `single-nuxt`), then `## Output` menyatakan: setiap Finding dan setiap AC yang menyatakan perilaku berkas atau modul bersumber dari berkas yang di-Read pada run itu; ringkasan di `CLAUDE.md`, ADR, atau nama berkas hasil Glob adalah petunjuk, bukan sumber perilaku. Verify: automated test atas teks hasil render.
- AC-2: When planner dirender, then `## Output` menyatakan: fakta yang bisa dijawab `Read`/`Glob`/`Grep` dibaca sebelum artefak ditulis, dan tidak dioper ke implementer; task di `tasks.md` boleh menyuruh membaca berkas yang akan diubah, bukan untuk fakta yang dibutuhkan spec. Verify: automated test.
- AC-3: When planner dirender, then `## Output` menyatakan dengan niat (bukan daftar kata): artefak tidak memuat kalimat yang menyatakan sesuatu belum dibaca, dibandingkan, dicek, atau diketahui; yang butuh keputusan manusia menjadi pertanyaan, yang bisa dibaca dibaca. Verify: automated test.
- AC-4: When planner dirender, then `## Output` menyatakan: klaim yang tidak bersumber dari berkas yang dibaca atau dari tiket ditulis sebagai `Assumption A-n:` beserta dasarnya, tidak sebagai Finding atau fakta di AC; kata dugaan (mis. "mungkin", "sepertinya") hanya boleh di baris Assumption. Verify: automated test.
- AC-5: When planner dirender, then `## Output` menyatakan `Finding:` hanya memuat apa yang diamati dari berkas yang dibaca; kesimpulan atau prediksi ditulis sebagai Assumption. Verify: automated test.
- AC-6: When planner dirender, then `## Output` menyatakan: daftar, angka, dan istilah yang sama disebut sama di semua artefak, dan sebelum mengakhiri run planner membaca ulang berkas yang ia tulis untuk menyamakannya. Verify: automated test.
- AC-7: When planner dirender, then `## Output` menyatakan penempatan detail implementasi sesuai Q-3, dan satu AC menyatakan satu perilaku teramati (AC dengan beberapa perilaku dipecah). Verify: automated test.
- AC-8: When planner dirender, then `## Output` menyatakan `tasks.md` yang berisi tugas diakhiri `## Coverage` sesuai Q-2 dan setiap AC muncul di sana. Verify: automated test.
- AC-9: When planner dirender, then `## Output` menyatakan: bila `.caf/knowledge/decisions/` berisi ADR, ADR yang namanya berkaitan dengan subjek tiket dibaca dan dirujuk di Finding, dan hasil Glob yang didominasi `node_modules` atau direktori alat tersembunyi dipersempit. Verify: automated test.
- AC-10: When planner dirender, then `## Output` menyatakan aturan Q-1 (sesuai jawabannya) tentang `TODO:` di `caf-no-guess`. Verify: automated test.
- AC-11: When planner dirender, then bagian selain `## Output` (dan `## Input` bila diubah) identik byte-for-byte dengan golden sebelum tiket (`test/fixtures/pre-sdd02e/`), `tools:`, `## Skills`, `## Allowed Tools`, `## Constraints` tidak berubah, dan hash `caf-spec` tetap. Verify: automated test dengan golden.
- AC-12: When file planner hasil 02d di-baseline di repo sementara lalu `curate sync` dijalankan, then `## Output` (dan `## Input` bila berubah) ditulis dengan teks baru, planner yang dikustomisasi tidak ditimpa, dan file agent lain tidak berubah. Verify: automated test.
- AC-13: When `test/fixtures/snapshots/mono-pnpm.json` diregenerasi, then hanya entri `caf-planner.md` yang berubah (dicatat). Verify: manual: baca `git diff` snapshot dan cocokkan dengan daftar T1.
- AC-14: When `npm test` dijalankan, then semua test lulus, golden `frozen-kinds` tidak berubah, dan test `todo` fallback `implementation` tetap ada. Verify: command: `npm test` | expect: exit 0; lalu `git diff --stat -- test/fixtures/frozen-kinds/` | expect: kosong.
- AC-15: When README dan CLAUDE.md dibaca, then tertulis aturan baru planner (baca yang diklaim, tidak menunda, tidak menebak, coverage) dan catatan rollout (`curate sync` membawa `## Output`; `caf-no-guess` tidak berubah bila Q-1 jawaban a). Verify: manual: baca bagian terkait.