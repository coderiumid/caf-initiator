# Amendment 3 — CAF-INIT-DOCS-REMOVE (scaffold sekaligus men-generate skills)

Status: keputusan manusia (Ganjar). Branch dan tiket tetap sama. Menambah Task 13–16 dan AC-17–AC-24.
Hal yang tidak diubah: aturan eksekusi di tasks.md, prinsip P1/P2 (Amendment 1), dan semua AC lama.
Berbeda dari amendment sebelumnya, ini perilaku baru, bukan penghapusan.

## Tujuan

Pengguna cukup menjalankan satu command, `caf-init scaffold`, dan skills ikut ter-generate. Tidak perlu lagi menjalankan `scaffold` lalu `scaffold skills`.

## Keputusan awal (default, dapat diubah di checkpoint)

- Langkah skills ditambahkan ke rantai `scaffold` tanpa target, **tepat setelah Agents** (skills memberi pointer `## Skills` ke agent, jadi agent harus ada lebih dulu) dan sebelum Task Completion.
- Langkah skills mengikuti pola langkah lain setelah Setup: ada konfirmasi skip sebelumnya.
- Target `scaffold skills` tetap ada dan perilakunya **identik** dengan sekarang (untuk repo yang sudah ter-scaffold dan untuk menjalankan ulang).
- Skills yang sudah ada tidak ditimpa (perilaku sekarang dipertahankan).

## Di luar scope

- Mengubah isi skill, mencabut banner DRAFT, atau mengaktifkan pointer di `## Skills`.
- Perubahan pada `export`, `curate`, atau `complete-drafts` selain yang dibutuhkan langkah baru agar tidak error.
- Migrasi proyek yang sudah ter-scaffold.
- Perubahan di `caf-orchestrator` (hanya dibaca bila perlu).

## Task 13 — Inventaris `scaffold skills` dan rantai scaffold (read-only)

- Telusuri implementasi `scaffold skills` dan rantai `scaffold` tanpa target: input yang diminta (prompt interaktif, pilihan agent/app, pointer `## Skills`), file yang ditulis, perilaku bila agent belum ada atau tidak dipilih, perilaku bila skill sudah ada.
- Catat apakah langkah skills bisa dijalankan dalam rantai tanpa input tambahan, dan apa yang terjadi bila dijalankan setelah Agents dengan nol agent terpilih.
- Catat dampak ke `complete-drafts` dan `check-drafts`: apakah skill ber-banner DRAFT (`caf-design`, `caf-breakdown`, `caf-traceability`, `caf-self-verify`) akan terdaftar sebagai draf yang perlu dilengkapi setelah langkah ini masuk rantai.
- Catat test, golden, fixture, snapshot, file sha256, teks help, README, dan `CAF.md` yang terdampak. Estimasi jumlah file yang berubah.
- Tulis `inventory-report-3.md` di folder tiket: temuan, rekomendasi urutan dan perilaku konfirmasi, dan daftar file yang akan berubah.

**CHECKPOINT WAJIB.** Commit laporan, lalu BERHENTI dan tampilkan ringkasannya. Jangan lanjut ke Task 14 sebelum manusia memutuskan.

**Titik berhenti di dalam Task 13 (laporkan, jangan menebak):**
- langkah skills butuh input interaktif yang tidak bisa dirantai tanpa perubahan desain;
- langkah skills gagal atau berubah perilaku bila tidak ada agent terpilih;
- skill DRAFT akan terdaftar sebagai draf oleh `complete-drafts`/`check-drafts` (perubahan perilaku);
- dampaknya menyentuh snapshot beku atau file sha256.

## Task 14 — Tambahkan langkah skills ke rantai (setelah checkpoint disetujui)

- Terapkan keputusan checkpoint: posisi langkah, konfirmasi skip, perilaku saat tidak ada agent.
- Target `scaffold skills` tidak berubah perilakunya.
- Perbarui teks help `scaffold` agar urutan rantai mencantumkan skills.
- Edit test dan golden hanya yang tercantum di laporan yang disetujui; larangan regenerate untuk meloloskan test tetap berlaku, perubahan harus disengaja dan diff dilampirkan di `verify-report.md`.

## Task 15 — Test dan verifikasi

- Tambahkan test untuk AC-17–AC-22 (rantai, kesetaraan dengan `scaffold skills`, skip, idempotensi).
- Jalankan `npm test` dan semua perintah Verify AC-17–AC-24, lalu ulang AC-2–AC-16 dan catat hasil asli.
- Uji manual: `scaffold` penuh di salinan fixture dengan satu agent dipilih; periksa `.claude/skills/`.

## Task 16 — Dokumentasi

- Perbarui README dan `CAF.md`: satu command untuk scaffold dan skills; sebut bahwa `scaffold skills` tetap ada untuk menjalankan ulang. Tanpa CHANGELOG.md.

## Acceptance criteria tambahan

- **AC-17.** Rantai `scaffold` tanpa target menyertakan langkah skills tepat setelah Agents, dan teks help mencantumkannya.
  Verify: command: `node <bin> scaffold --help` | expect: urutan rantai memuat skills setelah Agents.
- **AC-18.** Hasil `.claude/skills/` dari `scaffold` penuh identik byte per byte dengan hasil `scaffold` lalu `scaffold skills` secara terpisah (pada fixture dan pilihan yang sama).
  Verify: command: jalankan kedua cara di dua salinan fixture lalu `diff -r` kedua `.claude/skills` | expect: tidak ada perbedaan.
- **AC-19.** `scaffold skills` sebagai target tunggal berperilaku sama seperti sebelum perubahan.
  Verify: command: test yang ada untuk target skills dijalankan tanpa diubah | expect: lulus.
- **AC-20.** Bila langkah skills dilewati (skip), tidak ada skill yang ditulis dan rantai berlanjut ke langkah berikutnya.
  Verify: command: jalankan `scaffold` penuh dengan jawaban skip pada langkah skills | expect: tidak ada `.claude/skills/` baru dan exit code 0.
- **AC-21.** Menjalankan `scaffold` penuh dua kali tidak menimpa skill yang sudah ada.
  Verify: command: jalankan dua kali, ubah satu skill di antaranya, bandingkan | expect: skill yang diubah tetap utuh.
- **AC-22.** `npm test` lulus tanpa test dilewati. Test dan golden yang diedit hanya yang tercantum di laporan yang disetujui; tidak ada snapshot beku atau file sha256 yang berubah tanpa persetujuan eksplisit.
  Verify: command: `npm test` dan `git diff --stat <commit-sebelum-Task-14>..HEAD` | expect: lulus, daftar file sesuai persetujuan.
- **AC-23.** README dan `CAF.md` tidak lagi menyuruh pengguna menjalankan `scaffold skills` sebagai langkah wajib setelah `scaffold`.
  Verify: command: `grep -rn "scaffold skills" README.md CAF.md` | expect: hanya konteks "jalankan ulang" atau "target terpisah".
- **AC-24.** `curate --audit-only` dan `check-drafts` pada hasil `scaffold` penuh tidak menghasilkan gap wajib atau FAIL baru akibat langkah skills.
  Verify: command: `node <bin> curate --audit-only` dan `node <bin> check-drafts` | expect: exit code 0, 0 required gap, 0 FAIL.

## Aturan tambahan

- Branch yang sama. Satu commit per task. Awalan `CAF-INIT-DOCS-REMOVE (scaffold-skills):` supaya rentang commit ini bisa direview terpisah.
- Hanya commit lokal. Tidak ada push, publish, atau PR.
- Task 13 selesai tidak berarti Task 14 boleh dimulai: checkpoint wajib berlaku.
- Jangan mengerjakan hal di luar scope; catat sebagai temuan di `verify-report.md`.