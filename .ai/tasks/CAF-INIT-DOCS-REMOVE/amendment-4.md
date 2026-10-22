# Amendment 4 — CAF-INIT-DOCS-REMOVE (golden-examples: beberapa app dalam satu run)

Status: keputusan manusia (Ganjar). Branch dan tiket tetap sama. Menambah Task 17–20 dan AC-25–AC-34.
Syarat mulai: Task 14–16 (Amendment 3) sudah selesai dan dilaporkan, dan manusia sudah menyetujui lanjut. Jangan dimulai paralel.
Hal yang tidak diubah: aturan eksekusi di tasks.md, prinsip P1/P2 (Amendment 1), dan semua AC lama.

## Masalah

Langkah golden-examples di rantai `scaffold` hanya bisa memilih **satu app** per run. Di repo tunggal itu cukup. Di monorepo (beberapa app), pengguna harus menjalankan `scaffold golden-examples` lagi untuk tiap app berikutnya.

## Tujuan

Di monorepo, pengguna bisa memilih beberapa app dalam satu run (baik di rantai `scaffold` maupun di `scaffold golden-examples`), tanpa menjalankan ulang.

## Keputusan (default, dapat diubah di checkpoint)

- **Repo tunggal:** perilaku tidak berubah (satu app, tanpa picker tambahan).
- **Monorepo:** picker multi-pilih (centang) menampilkan semua app terdeteksi. **Default: tidak ada yang tercentang**, pengguna memilih sendiri.
- **Tidak ada app dipilih (Enter saja):** tidak error, tidak menulis apa pun, exit code 0, dan mencetak petunjuk app mana yang belum punya golden example serta cara menjalankannya nanti. Ini sama dengan perilaku langkah Agents saat nol agent terpilih.
- Pemrosesan berurutan dengan penanda kemajuan ("App i/N: <slug>"). Tiap app boleh di-skip.
- Flag non-interaktif: `--app <slug>` (boleh diulang) dan `--all-apps`. Slug tidak dikenal menghasilkan error yang jelas, exit non-zero, dan tidak menulis apa pun.
- Idempoten: golden example yang sudah ada tidak ditimpa; menjalankan ulang hanya menambah app yang belum punya (perilaku `writeIfAbsent` dipertahankan).
- Di akhir, cetak ringkasan "app tanpa golden example: ..." yang akurat setelah run parsial.
- Target `scaffold golden-examples` tetap ada dan mendapat kemampuan yang sama.

## Di luar scope

- Mengubah isi atau format golden example, atau cara contoh dipilih/di-generate per app.
- Mengubah `complete-drafts`, `curate`, atau `check-drafts` selain yang dibutuhkan agar tidak error.
- Migrasi proyek yang sudah ter-scaffold.
- Perubahan di `caf-orchestrator`.
- Menambah file TODO baru per app (lihat AC-32 dan titik berhenti Task 17).

## Task 17 — Inventaris langkah golden-examples (read-only)

- Telusuri implementasi `scaffold golden-examples` dan langkahnya di rantai: bagaimana app dipilih, apa yang ditulis dan di mana (tata letak per app atau per repo), nama file, di mana `RULES.md` berada dan apakah ia per repo atau per app, perilaku bila file sudah ada, state yang diteruskan antar langkah rantai (apakah ada asumsi satu app).
- Catat apakah ada langkah lain di rantai (Agents, skills, Task Completion, Workflow) atau fitur lain (`complete-drafts`, `curate`, `check-drafts`, `export`) yang membaca hasil golden-examples dan mengasumsikan satu app.
- Catat apakah langkah ini punya jalur non-interaktif sekarang, dan prompt yang dipakai.
- Catat test, golden, fixture, snapshot, file sha256, teks help, README, `CAF.md`, dan `CLAUDE.md` yang terdampak, dengan estimasi jumlah file yang berubah.
- Tulis `inventory-report-4.md` di folder tiket: temuan, rekomendasi desain, dan daftar file yang akan berubah.

**CHECKPOINT WAJIB.** Commit laporan, lalu BERHENTI dan tampilkan ringkasannya. Jangan lanjut ke Task 18 sebelum manusia memutuskan.

**Titik berhenti di dalam Task 17 (laporkan, jangan menebak):**
- `RULES.md` ternyata per repo tetapi multi-app menuntutnya per app, atau sebaliknya: perubahan tata letak yang menambah atau memindah file;
- pendukung multi-app akan menambah file ber-TODO per app (bertentangan dengan tujuan mengurangi cangkang TODO);
- pembaca hasil golden-examples di tempat lain mengasumsikan satu app dan harus diubah;
- dampaknya menyentuh snapshot beku, golden, atau file sha256.

## Task 18 — Implementasi (setelah checkpoint disetujui)

- Terapkan keputusan checkpoint: picker multi-pilih tanpa default tercentang, loop dengan penanda kemajuan dan skip per app, `--app` dan `--all-apps`, ringkasan akhir, idempotensi.
- Di rantai `scaffold` dan di target `scaffold golden-examples` perilakunya sama.
- Repo tunggal tidak berubah.
- Edit test dan golden hanya yang tercantum di laporan yang disetujui; larangan regenerate untuk meloloskan test tetap berlaku, perubahan harus disengaja dengan diff terlampir di `verify-report.md`.

## Task 19 — Test dan verifikasi

- Tambahkan test untuk AC-25–AC-32.
- Jalankan `npm test` dan semua perintah Verify AC-25–AC-34, lalu ulang AC-2–AC-24 dan catat hasil asli.
- Uji manual lewat pty di salinan fixture monorepo dan fixture repo tunggal.

## Task 20 — Dokumentasi

- Perbarui README, `CAF.md`, dan `CLAUDE.md` (bila ada baris yang jadi salah): jelaskan pemilihan beberapa app, flag, dan bahwa `scaffold golden-examples` bisa dijalankan ulang untuk menambah app. Tanpa CHANGELOG.md.

## Acceptance criteria tambahan

- **AC-25.** Perilaku repo tunggal tidak berubah.
  Verify: command: test yang ada untuk repo tunggal dijalankan tanpa diubah, dan `scaffold golden-examples` di fixture single-nuxt menghasilkan file yang sama dengan sebelum perubahan (bandingkan dengan keluaran commit sebelum Task 18) | expect: lulus dan `diff -r` kosong.
- **AC-26.** Di monorepo, picker menampilkan semua app terdeteksi tanpa satu pun tercentang, dan memilih dua app menulis golden example untuk keduanya dalam satu run.
  Verify: command: jalankan `scaffold golden-examples` lewat pty di salinan fixture mono-pnpm, centang dua app | expect: file untuk kedua app ada setelah satu run.
- **AC-27.** Enter tanpa memilih app: exit 0, tidak menulis apa pun, dan mencetak petunjuk app yang belum punya golden example.
  Verify: command: jalankan lewat pty, tekan Enter tanpa memilih, lalu `git status`/`diff` pada salinan fixture | expect: exit code 0, tidak ada file baru, ada petunjuk di output.
- **AC-28.** `--app <slug>` (diulang) dan `--all-apps` berjalan tanpa prompt. Slug tidak dikenal: error jelas, exit non-zero, tidak menulis apa pun.
  Verify: command: `node <bin> scaffold golden-examples --app <slug1> --app <slug2>`, `--all-apps`, dan `--app tidak-ada` di fixture mono-pnpm | expect: dua yang pertama exit 0 tanpa prompt dengan file untuk app terkait; yang ketiga exit non-zero tanpa file baru.
- **AC-29.** Menjalankan ulang tidak menimpa golden example yang sudah ada dan hanya menambah app yang belum punya.
  Verify: command: jalankan untuk app A, ubah salah satu file, jalankan untuk app A dan B | expect: file yang diubah tetap utuh, app B baru ditambahkan.
- **AC-30.** Ringkasan akhir mencantumkan app tanpa golden example secara akurat setelah run parsial.
  Verify: command: jalankan untuk satu dari dua app | expect: output menyebut app yang belum punya, dan tidak menyebut app yang sudah.
- **AC-31.** Langkah golden-examples di rantai `scaffold` tanpa target memakai picker yang sama, skip per app berfungsi, dan rantai berlanjut ke langkah berikutnya.
  Verify: command: jalankan `scaffold` penuh lewat pty di salinan fixture mono-pnpm, centang satu app dan skip yang lain | expect: rantai selesai exit 0, golden example hanya untuk app terpilih.
- **AC-32.** Tidak ada file ber-TODO baru per app, kecuali yang disetujui eksplisit di checkpoint.
  Verify: command: `grep -rlE "TODO" .caf/knowledge` setelah memilih dua app | expect: tidak ada file baru dengan TODO dibanding memilih satu app, kecuali yang disetujui di checkpoint.
- **AC-33.** `npm test` lulus tanpa test dilewati. File yang diubah hanya yang tercantum di laporan yang disetujui, dan tidak ada snapshot beku atau file sha256 yang berubah tanpa persetujuan eksplisit.
  Verify: command: `npm test` dan `git diff --stat <commit-sebelum-Task-18>..HEAD` | expect: lulus, daftar file sesuai persetujuan.
- **AC-34.** README, `CAF.md`, dan `CLAUDE.md` tidak lagi menyiratkan golden-examples hanya untuk satu app atau mewajibkan menjalankan ulang per app.
  Verify: command: `grep -rn "golden-examples" README.md CAF.md CLAUDE.md` | expect: teks sesuai perilaku baru.

## Aturan tambahan

- Branch yang sama. Satu commit per task. Awalan `CAF-INIT-DOCS-REMOVE (golden-examples):` supaya rentang commit ini bisa direview terpisah.
- Hanya commit lokal. Tidak ada push, publish, atau PR. Commit `b83013d` tidak disentuh.
- Task 17 selesai tidak berarti Task 18 boleh dimulai: checkpoint wajib berlaku.
- Jangan mengerjakan hal di luar scope; catat sebagai temuan di `verify-report.md`.