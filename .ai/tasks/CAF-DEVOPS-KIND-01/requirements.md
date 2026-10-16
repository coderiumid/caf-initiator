# Ticket: CAF-DEVOPS-KIND-01 — `devops` Tidak Dikenali (Risiko Privilege Escalation) + Sembunyikan dari Menu Sementara

## Latar Belakang
Ditemukan saat investigasi follow-up `CAF-RETRYLOGIC-01`: `devops` punya
entry sendiri di `TOOLS_BY_KIND`/`TOOLS_RATIONALE` (`agent-md.js`) — sengaja
dibatasi `Read`+`Bash` (read-only, ada TODO eksplisit soal kehati-hatian
akses kredensial deployment). Tapi `devops` TIDAK ada di `KNOWN_KINDS`
(`agent-sections.js`), sehingga `detectKind('caf-devops.md')` salah
mengembalikan `implementation` (`Read`+`Write`+`Edit`+`Bash`).

Dikonfirmasi lewat perbandingan langsung tiap builder `SYNCABLE_SECTIONS`
(`kind='devops'` vs `kind='implementation'` dipaksa manual):

| Section | Beda? | Severity |
|---|---|---|
| `Allowed Tools` | YA | **Kritis — privilege escalation** |
| `Input` | YA | Rendah (salah kontrak, bukan lubang keamanan) |
| `Output` | YA | Rendah |
| `Working Pattern (PIV)` | Tidak | — |
| `Retry Logic` | Tidak | — |

Skenario risiko: kalau ada `caf-devops.md` (Read+Bash, benar) di-`curate
baseline` lalu suatu saat template berubah dan `curate sync` jalan,
`Allowed Tools` akan terbaca `DRIFT` terhadap template `implementation` (kind
salah) dan tertimpa jadi `Read`+`Write`+`Edit`+`Bash` — agent yang sengaja
read-only mendadak dapat akses tulis kode.

**Status saat ini: TIDAK ada eksposur aktif.** Dikonfirmasi tidak ada file
`caf-devops.md` di `coderium-web-v2`, `umkm-pos`, maupun `caf-orchestrator` —
agent ini secara konsisten di-skip saat generate. Risiko murni laten,
tidak mendesak, tapi tetap perlu diperbaiki di sumbernya sebelum agent ini
dipakai kapan pun di masa depan.

## Apa yang Diminta
1. Tambahkan `devops` ke `KNOWN_KINDS` supaya `detectKind()` mengenalinya
   dengan benar
2. Guard `Allowed Tools` untuk kind `devops` (pola sama seperti
   `DISCOVERY_GUARDED_SECTIONS` di `CAF-RETRYLOGIC-01`) — MINIMAL sampai
   dikonfirmasi section builder-nya sendiri sudah kind-aware, supaya
   `curate sync` tidak bisa menimpa `Allowed Tools` dengan versi kind yang
   salah
3. Investigasi `Input`/`Output` — severity lebih rendah, tapi tetap perlu
   diputuskan: guard juga, atau biarkan (kalau dampaknya cuma kontrak
   generik yang tetap masuk akal)
4. **[BARU]** Sembunyikan `devops` dari opsi pilihan interaktif di
   `caf-init scaffold agents` (`src/commands/agents.js`) — perannya belum
   didefinisikan dengan jelas (belum diputuskan agent ini akan mengerjakan
   apa persis), jadi jangan ditawarkan ke user dulu sampai definisinya
   matang. Ini TIDAK menggantikan fix #1-3 — dua-duanya tetap perlu:
   hide di UI mencegah pemilihan tidak sengaja lewat jalur interaktif,
   fix kind-detection mencegah kerusakan kalau file `devops` somehow tetap
   ada lewat jalur lain (non-interactive flag, dibuat manual, dst)

## Acceptance Criteria
- [ ] `detectKind('caf-devops.md')` (dan variasi nama file yang relevan)
      mengembalikan `devops`, bukan `implementation`
- [ ] `Allowed Tools` untuk kind `devops` di-guard dari `curate sync` SAMPAI
      builder section itu sendiri dikonfirmasi kind-aware dengan benar (atau
      diperbaiki di ticket ini juga, kalau scope-nya kecil — lihat Task 1
      investigasi dulu sebelum putuskan)
- [ ] Regression: seluruh test suite (48 test dari sesi sebelumnya) tetap
      100% pass
- [ ] Test baru: fixture `caf-devops.md` dengan `Allowed Tools` yang benar
      (Read+Bash) → `curate audit` TIDAK melaporkan `DRIFT`/tertimpa jadi
      versi `implementation`
- [ ] Keputusan eksplisit + dicatat untuk `Input`/`Output` (guard atau
      biarkan), dengan alasan
- [ ] **[BARU]** `devops` TIDAK muncul lagi di daftar pilihan interaktif
      `caf-init scaffold agents` — dikonfirmasi lewat menjalankan command
      itu (atau membaca daftar opsi di kode) sebelum dan sesudah perubahan
- [ ] **[BARU]** Kalau ada jalur non-interactive untuk memilih agent secara
      eksplisit (mis. flag `--agent devops`), putuskan juga apakah itu perlu
      diblokir atau dibiarkan (dengan warning) — jangan asumsi hide di menu
      interaktif otomatis menutup semua jalur

## Eksplisit Out of Scope
- Menjalankan `caf-init scaffold agents` beneran untuk generate `caf-devops.md`
  di project manapun — di luar scope ticket ini, keputusan pemakaian agent
  ini terpisah
- Perubahan ke `coderium-web-v2`/`umkm-pos`/`caf-orchestrator` — tidak
  relevan karena dikonfirmasi tidak ada file `devops` di sana
- `CAF-DISCOVERY-SECTIONS-01` (konten Discovery untuk `pm`/`ux-designer`) —
  ticket terpisah, tidak digabung ke sini meski pola fix-nya mirip