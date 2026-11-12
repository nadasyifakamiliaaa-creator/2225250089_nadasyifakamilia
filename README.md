# RataKu — Aplikasi Belajar Rata-rata (Mean) untuk Siswa SMP

> Nama "RataKu" adalah nama kerja dan dapat diganti.

RataKu adalah aplikasi web progresif (PWA) untuk membantu siswa SMP mempelajari **rata-rata (mean)** secara mandiri.
Aplikasi dirancang berdasarkan **teori beban kognitif** dan bertujuan menumbuhkembangkan **literasi matematika**.

- Dapat dibuka di browser (HP, tablet, laptop).
- Dapat **diinstal langsung dari browser** tanpa Play Store / App Store.
- Tetap berjalan **tanpa internet** setelah dibuka pertama kali.
- Dikembangkan dengan **JavaScript** (tampilan) dan **Python** (server & perkakas konten).

## Status

Tahap **perencanaan & desain** (model pengembangan ADDIE: tahap *Analysis* selesai, tahap *Design* berlangsung).
https://nadasyifakamiliaaa-creator.github.io/2225250089_nadasyifakamilia/

## Isi Repositori

```
.
├── CLAUDE.md                 ← panduan untuk Claude Code (aturan proyek)
├── README.md                 ← dokumen ini
└── docs/
    ├── 01-analisis-kebutuhan.md        hasil wawancara → kebutuhan → fitur
    ├── 02-spesifikasi-produk.md        fitur, user story, cakupan MVP
    ├── 03-desain-pedagogis.md          beban kognitif, literasi, umpan balik
    ├── 04-desain-konten-mean.md        TP, alur materi, bank soal, format JSON
    ├── 05-desain-ui-ux.md              warna, huruf, komponen, wireframe
    ├── 06-arsitektur-teknis.md         struktur kode, API, PWA, offline
    ├── 07-rencana-pengembangan.md      jadwal sprint & prioritas
    ├── 08-rencana-pengujian-evaluasi.md uji perangkat lunak & instrumen penelitian
    └── 09-deployment-instalasi.md      hosting gratis & cara instal di HP
```

Struktur kode yang akan dibuat (lihat [docs/06](docs/06-arsitektur-teknis.md)):

```
frontend/   PWA (HTML, CSS, JavaScript) + konten JSON
backend/    server FastAPI (Python)
tools/      skrip Python untuk validasi konten & ekspor data
tests/      pengujian Python (pytest, Playwright)
```

## Cara Memulai Pengembangan

1. Instal **Python 3.11+**, **Node.js 20+** (hanya untuk menjalankan tes JS), **Git**, dan **VS Code**.
2. Buka folder ini di VS Code, jalankan Claude Code, lalu minta:
   *"Baca CLAUDE.md dan docs/07-rencana-pengembangan.md, lalu kerjakan Sprint 0."*
3. Kerjakan sprint satu per satu sesuai [docs/07](docs/07-rencana-pengembangan.md).

## Pengembang

Nada Syifa Kamilia — S1 Pendidikan Matematika.
