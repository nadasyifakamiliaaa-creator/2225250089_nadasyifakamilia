# 08 — Rencana Pengujian & Evaluasi

Dua bagian: (A) pengujian **perangkat lunak** — apakah aplikasi bekerja benar; (B) evaluasi **penelitian** — apakah aplikasi valid, praktis, dan efektif.

---

## A. Pengujian Perangkat Lunak

### A.1 Tingkat pengujian
| Jenis | Alat | Yang diuji | Kapan |
|---|---|---|---|
| Unit (JS) | `node --test` | `core/*.js`: hitung mean, parsing angka, setiap kode kesalahan, fading, adaptif | Setiap perubahan logika |
| Unit (Python) | `pytest` | Validator konten, skema API | Setiap perubahan |
| Integrasi API | `pytest` + `httpx`/`TestClient` | `/api/sync` (idempoten, validasi), login guru, ekspor CSV | Setiap perubahan backend |
| Konten | `tools/validate_content.py` | Skema, kunci otomatis, blueprint | Setiap perubahan soal |
| End-to-end | Playwright (Python), emulasi Pixel 5 | Alur: beranda → subbab 2 → latihan salah lalu benar → kuis → progres; mode offline | Akhir sprint |
| Lighthouse | Chrome DevTools | Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, installable | Akhir sprint |
| Manual di perangkat | HP sungguhan | Lihat matriks A.2 | Sprint 5–6 |

### A.2 Matriks perangkat uji manual
| Perangkat | Browser | Instal | Offline | Catatan |
|---|---|---|---|---|
| Android murah (RAM 2–3 GB, Android 8–10) | Chrome | ☐ | ☐ | |
| Android menengah (Android 12+) | Chrome | ☐ | ☐ | |
| Android | Browser bawaan (mis. Samsung Internet) | ☐ | ☐ | |
| iPhone (iOS 16.4+) | Safari | ☐ | ☐ | Instal manual via Bagikan |
| Laptop Windows | Chrome / Edge | ☐ | ☐ | |

### A.3 Contoh kasus uji diagnosis (wajib ada di `frontend/tests/diagnose.test.js`)
| Data | Jawaban siswa | Kode yang diharapkan |
|---|---|---|
| 70, 80, 75, 85, 90 | n = 4 | E-N |
| 70, 80, 75, 85, 90 | jumlah = 310 | E-SUM-MISS (90 terlewat) |
| 70, 80, 75, 85, 90 | jumlah = 395 | E-SUM |
| 70, 80, 75, 85, 90 | rata-rata = 100 (400 : 4) | E-DIV-N1 |
| 70, 80, 75, 85, 90 | rata-rata = 85 dengan n & jumlah benar | E-DIV |
| tabel x = 6,7,8; f = 2,5,3 | n = 3 | E-FREQ-N |
| tabel x = 6,7,8; f = 2,5,3 | jumlah = 21 | E-FREQ-SUM |
| 24, 30, 27, 31 | rata-rata = 28,0 / "28" / "28.0" | benar |

---

## B. Evaluasi Penelitian

Kualitas produk dinilai dari **kevalidan**, **kepraktisan**, dan **keefektifan** (Nieveen), ditambah **beban kognitif**.

### B.1 Kevalidan — validasi ahli
| Validator | Aspek yang dinilai |
|---|---|
| Ahli materi (dosen/guru matematika) | Kesesuaian CP/TP, kebenaran konsep, kualitas soal literasi, kesesuaian level L1–L3, bahasa |
| Ahli media/TI | Tampilan, navigasi, keterbacaan, kinerja, instalasi, offline |
| Ahli pembelajaran (opsional) | Penerapan prinsip beban kognitif (segmentasi, worked example, umpan balik) |

- Skala Likert 1–4 atau 1–5.
- Analisis: rata-rata skor per aspek dan/atau **indeks Aiken's V**: `V = Σ(r − lo) / [n (c − 1)]` (r = skor, lo = skor terendah, n = banyak validator, c = banyak kategori).
- Bank soal juga divalidasi per butir (kesesuaian TP, level, konteks, kunci).

### B.2 Kepraktisan
- **Angket respons siswa** (Likert): kemudahan penggunaan, kejelasan tampilan, kemudahan memahami materi, manfaat umpan balik, keinginan menggunakan lagi.
- **System Usability Scale (SUS)** — 10 butir, versi Bahasa Indonesia yang sudah diadaptasi; skor ≥ 68 dianggap di atas rata-rata.
- **Angket guru** tentang keterlaksanaan & dasbor.
- **Observasi/think-aloud** pada uji perorangan: catat di mana siswa bingung.

### B.3 Keefektifan — kemampuan literasi matematika (materi mean)
- **Pretes–postes** (bentuk paralel), 6–8 soal uraian berbasis konteks yang mencakup proses merumuskan, menerapkan, menafsirkan; disertai rubrik penskoran.
- Analisis: **N-gain** `g = (postes − pretes) / (skor maks − pretes)`; kategori tinggi (g ≥ 0,7), sedang (0,3 ≤ g < 0,7), rendah (g < 0,3). Bila sampel memadai, tambahkan uji-t berpasangan / Wilcoxon.
- Data log aplikasi sebagai pendukung: persentase benar pada percobaan pertama per subbab, pergeseran jenis kesalahan dari awal ke akhir.

### B.4 Beban kognitif
| Instrumen | Waktu pemberian | Keterangan |
|---|---|---|
| **Skala usaha mental Paas** (1 butir, skala 1–9) | Akhir setiap subbab, di dalam aplikasi | "Seberapa besar usaha yang kamu keluarkan untuk memahami bagian ini?" |
| **Kuesioner beban kognitif Leppink dkk. (2013)** (10 butir, skala 0–10; IL 3 butir, EL 3 butir, GL 4 butir) | Akhir modul | Butir perlu **diterjemahkan, disesuaikan dengan materi mean, dan divalidasi** (keterbacaan siswa SMP) |

Harapan desain: skor EL rendah, IL menurun dari subbab awal ke akhir untuk materi sejenis, GL tinggi.

### B.5 Tahap uji coba
| Tahap | Peserta | Tujuan | Data |
|---|---|---|---|
| Perorangan | 3 siswa (kemampuan tinggi, sedang, rendah) | Temukan masalah keterbacaan & navigasi | Think-aloud, catatan, wawancara singkat |
| Kelompok kecil | 6–9 siswa | Kepraktisan awal | Angket, SUS, log |
| Lapangan | 1 kelas | Kepraktisan & keefektifan | Pretes–postes, angket, skala beban kognitif, log |

### B.6 Etika penelitian
- Izin sekolah dan **persetujuan orang tua/wali** (siswa di bawah umur) serta persetujuan siswa.
- Data anonim (kode siswa). Pemetaan kode ↔ nama disimpan terpisah oleh peneliti dan dihapus setelah penelitian selesai.
- Foto dokumentasi: wajah siswa disamarkan (seperti pada laporan wawancara) kecuali ada izin tertulis.
- Siswa boleh berhenti kapan saja tanpa konsekuensi nilai.

### B.7 Pengolahan data dengan Python
`tools/analyze_logs.py` (pandas) membaca CSV ekspor dan menghasilkan:
- tabel ketepatan per subbab dan per kode kesalahan,
- rata-rata skala Paas per subbab,
- skor IL/EL/GL per siswa (rata-rata butir per dimensi),
- berkas ringkasan `.xlsx`/`.csv` untuk dimasukkan ke laporan.
