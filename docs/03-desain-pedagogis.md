# 03 — Desain Pedagogis

Dokumen ini menjelaskan *mengapa* aplikasi dirancang seperti itu. Setiap keputusan di sini menjadi aturan bagi kode (lihat CLAUDE.md bagian 4).

---

## 1. Landasan Teori

### 1.1 Teori Beban Kognitif (Cognitive Load Theory)
Memori kerja terbatas. Beban kognitif terdiri atas:
- **Intrinsic load (IL):** kerumitan bawaan materi (banyaknya unsur yang harus diolah bersamaan). *Dikelola* — tidak dihilangkan — dengan segmentasi dan urutan sederhana→kompleks.
- **Extraneous load (EL):** beban akibat cara penyajian yang buruk. *Ditekan* serendah mungkin.
- **Germane load (GL):** usaha mental yang diarahkan untuk membangun skema. *Didorong* dengan memanfaatkan kapasitas yang dibebaskan dari EL.

### 1.2 Prinsip desain yang dipakai
| Prinsip | Penerapan di aplikasi | Dasar dari wawancara |
|---|---|---|
| **Worked example effect** | Contoh-dikerjakan lengkap sebelum latihan | GL01, GL03 |
| **Fading / completion problem** | Langkah contoh dikosongkan bertahap: 0 → 1 → 2 → semua langkah diisi siswa | GL03 |
| **Segmenting** | Satu layar satu langkah; tombol Lanjut | EL02, EL04 |
| **Learner pacing** | Tidak ada waktu/auto-advance | EL02, EL04 |
| **Signaling** | Angka penting disorot; langkah aktif diberi warna aksen | EL01, EL05 |
| **Spatial contiguity (hindari split-attention)** | Penjelasan menempel pada baris tabel/angka terkait | EL03 |
| **Coherence** | Tanpa gambar dekoratif, musik, animasi yang tak perlu | DS05 |
| **Redundancy** | Tidak menampilkan teks yang sama sekaligus dalam dua bentuk | DS05 |
| **Expertise reversal** | Bantuan (penghitung otomatis, petunjuk) dikurangi saat siswa makin mahir | — |
| **Self-explanation** | Pertanyaan "Mengapa…?" | GL04 |
| **Formative feedback** | Umpan balik segera, spesifik, bertingkat | DS04, H2, H3 |

### 1.3 Literasi Matematika (kerangka PISA 2022)
Literasi matematika = kemampuan **bernalar matematis** serta **merumuskan, menerapkan, dan menafsirkan** matematika untuk memecahkan masalah dalam berbagai konteks dunia nyata.

| Proses PISA | Tahap di aplikasi | Pertanyaan panduan untuk siswa |
|---|---|---|
| Merumuskan (*formulate*) | **1. Pahami** & **2. Pilah** | Apa yang ditanyakan? Data mana yang dipakai? Berapa banyak datanya? |
| Menerapkan (*employ*) | **3. Hitung** | Jumlahkan semua data, lalu bagi dengan banyak data. |
| Menafsirkan & mengevaluasi (*interpret/evaluate*) | **4. Maknai** | Apa arti hasil ini? Masuk akalkah? Apakah mean mewakili data? |
| Penalaran matematis (inti) | Pertanyaan "Mengapa…?" | Mengapa hasilnya berubah jika satu data ditambah? |

**Konteks** soal disebar ke empat kategori PISA: *personal* (uang saku, nilai ulangan), *pekerjaan* (penjualan warung, hasil panen), *sosial* (jumlah pengunjung perpustakaan, sampah per kelas), *ilmiah* (suhu harian, tinggi tanaman).
**Konten** PISA: *ketidakpastian dan data*.

### 1.4 Level literasi soal (disederhanakan untuk aplikasi)
| Level | Ciri | Contoh |
|---|---|---|
| L1 — Reproduksi | Data langsung diberikan, langsung hitung | Rata-rata dari 70, 80, 75, 85, 90 |
| L2 — Koneksi | Data dalam tabel/soal cerita, ada informasi pengecoh, perlu memilah | Tabel penjualan 7 hari, ditanya rata-rata hari kerja saja |
| L3 — Refleksi | Menafsirkan, membandingkan, menalar balik, menilai kewajaran | Mencari nilai yang hilang agar rata-rata 80; menilai apakah mean cocok bila ada data ekstrem |

---

## 2. Alur Belajar per Subbab

```
┌──────────┐  ┌────────┐  ┌─────────────────┐  ┌────────────────┐  ┌──────────┐  ┌──────────┐
│ Pemantik │→ │ Konsep │→ │ Contoh-dikerjakan│→ │ Contoh-sebagian │→ │ Latihan  │→ │ Refleksi │
│ konteks  │  │ singkat│  │ (lengkap)        │  │ (fading)        │  │ (umpan   │  │ (skala   │
│          │  │        │  │                  │  │                 │  │  balik)  │  │  usaha)  │
└──────────┘  └────────┘  └─────────────────┘  └────────────────┘  └──────────┘  └──────────┘
```

**Jadwal fading untuk langkah mean** (✓ = sudah diisikan aplikasi, ✎ = diisi siswa):

| Tahap | Daftar data | n | Jumlah | Bagi | Maknai |
|---|---|---|---|---|---|
| Contoh-dikerjakan | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contoh-sebagian 1 | ✓ | ✓ | ✓ | ✓ | ✎ |
| Contoh-sebagian 2 | ✓ | ✓ | ✓ | ✎ | ✎ |
| Contoh-sebagian 3 | ✓ | ✎ | ✎ | ✎ | ✎ |
| Latihan mandiri | ✎ | ✎ | ✎ | ✎ | ✎ |

**Aturan adaptif sederhana (tanpa AI):**
- 3 soal latihan berturut-turut benar pada percobaan pertama → bantuan Tabel Data otomatis disembunyikan (bisa dibuka lagi) dan siswa ditawari lanjut.
- 2 soal berturut-turut salah sampai pembahasan → tawarkan "Lihat contoh lagi" (contoh-dikerjakan yang mirip).

---

## 3. Taksonomi Kesalahan (dasar umpan balik diagnostik)

Logika diagnosis diimplementasikan sebagai fungsi murni di `frontend/js/core/diagnose.js`.
Kode kesalahan ini juga dipakai untuk log penelitian dan dasbor guru.

| Kode | Kesalahan | Cara mendeteksi | Petunjuk tingkat 1 | Petunjuk tingkat 2 |
|---|---|---|---|---|
| **E-N** | Banyak data salah (data terlewat/terhitung dua kali) | `n_siswa ≠ n_benar` | "Coba hitung lagi banyak datanya. Pakai Tabel Data dan centang satu per satu." | "Ada **{n_benar}** data. Kamu menghitung {n_siswa}. Data mana yang terlewat?" (sorot baris) |
| **E-SUM** | Jumlah salah | `jumlah_siswa ≠ jumlah_benar` | "Jumlahnya belum tepat. Coba jumlahkan dua-dua." | Tampilkan jumlah berjalan baris demi baris; sorot baris tempat selisih muncul |
| **E-SUM-MISS** | Jumlah kurang tepat satu data | `jumlah_benar − jumlah_siswa ∈ data` | "Sepertinya ada satu data yang belum dijumlahkan." | Sorot data yang hilang |
| **E-DIV-N1** | Membagi dengan n−1 atau n+1 | `jumlah/(n±1) ≈ jawaban` | "Kamu membagi dengan bilangan yang salah. Dibagi dengan apa?" | "Jumlah dibagi **banyak data**, yaitu {n}." |
| **E-DIV** | Pembagian salah | `jumlah dan n benar, hasil salah` | "Jumlah dan banyak datamu sudah benar. Periksa lagi pembagiannya." | Tampilkan pembagian bersusun |
| **E-FREQ-N** | Tabel frekuensi: n = banyak baris, bukan Σf | `n_siswa = banyak baris` | "Banyak data bukan banyak baris tabel. Lihat kolom frekuensi." | "Jumlahkan semua frekuensi: {f1} + {f2} + …" |
| **E-FREQ-SUM** | Tabel frekuensi: menjumlah nilai tanpa dikali frekuensi | `jumlah_siswa = Σx` | "Setiap nilai muncul beberapa kali. Apakah sudah dikali frekuensinya?" | Tampilkan kolom x × f |
| **E-SELECT** | Memilih informasi pengecoh pada soal cerita | angka terpilih ∉ data relevan | "Angka {a} itu menyatakan {makna}. Apakah termasuk data yang ditanyakan?" | Sorot kalimat yang berisi data relevan |
| **E-ROUND** | Pembulatan/desimal | selisih kecil dari jawaban benar | "Hampir tepat! Periksa angka di belakang koma." | "Bulatkan sampai {k} angka di belakang koma." |
| **E-INTERP** | Tafsiran salah | pilihan tafsiran salah | Umpan balik spesifik per opsi pengecoh (ditulis di konten) | — |
| **E-UNDERSTAND** | Salah memahami apa yang ditanyakan (tahap Pahami) | opsi "Pahami" salah | Umpan balik spesifik per opsi (ditulis di konten) | — |
| **E-MISSING** | Soal nilai yang hilang: belum memakai jumlah = rata-rata × banyak data | jawaban ≠ kunci dan bukan salah bulat | "Mulai dari jumlah semua data: rata-rata × banyak data. Lalu kurangi dengan jumlah data yang diketahui." | "Jumlah semua data = {rata-rata} × {n} = {jumlah}. Jumlah data yang diketahui = {…}. Berapa selisihnya?" |
| **E-OTHER** | Tidak terdiagnosis | selain di atas | "Belum tepat. Yuk lihat lagi langkahnya satu per satu." | Buka mode pengerjaan bertahap |

**Toleransi angka:** jawaban benar bila `|jawaban − kunci| ≤ toleransi` (bawaan 0,01; dapat diatur per soal).

---

## 4. Desain Umpan Balik Bertingkat

| Percobaan | Yang ditampilkan |
|---|---|
| Benar | ✓ + alasan singkat ("Benar! 400 dibagi 5 data = 80.") + pertanyaan maknai (jika soal konteks) |
| Salah ke-1 | Petunjuk tingkat 1 (sesuai kode kesalahan), kolom tetap bisa diedit |
| Salah ke-2 | Petunjuk tingkat 2 + sorotan visual pada data/langkah |
| Salah ke-3 / tombol "Lihat pembahasan" | Pembahasan langkah demi langkah; langkah yang salah diberi tanda; lalu tawaran **soal kembar** |

Nada bahasa: hangat, tidak menyalahkan ("Belum tepat", bukan "Salah!"); hindari tanda seru berlebihan; tanpa suara atau getar.

---

## 5. Refleksi & Metakognisi

- Sebelum menekan **Periksa** pada jawaban akhir soal L2–L3, tampil ringkasan: "n = 5, jumlah = 400, rata-rata = 80. Sudah kamu periksa?" (GL02).
- Pertanyaan kewajaran: "Apakah rata-rata bisa lebih besar dari data terbesar?" (penalaran).
- Akhir subbab: skala usaha mental 1–9 (lihat docs/08), hanya bila `researchMode` aktif.

---

## 6. Rujukan Utama (untuk Bab II skripsi)

- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. *Educational Psychology Review, 31*, 261–292.
- Mayer, R. E. (2021). *Multimedia Learning* (3rd ed.). Cambridge University Press.
- Renkl, A., & Atkinson, R. K. (2003). Structuring the transition from example study to problem solving in cognitive skill acquisition: A cognitive load perspective. *Educational Psychologist, 38*(1), 15–22.
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. *Educational Psychology Review, 19*, 509–539.
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research, 78*(1), 153–189.
- Chi, M. T. H., et al. (1989). Self-explanations: How students study and use examples in learning to solve problems. *Cognitive Science, 13*, 145–182.
- OECD (2023). *PISA 2022 Assessment and Analytical Framework*. OECD Publishing.
- Paas, F. (1992). Training strategies for attaining transfer of problem-solving skill in statistics: A cognitive-load approach. *Journal of Educational Psychology, 84*(4), 429–434.
- Leppink, J., Paas, F., van der Vleuten, C. P. M., van Gog, T., & van Merriënboer, J. J. G. (2013). Development of an instrument for measuring different types of cognitive load. *Behavior Research Methods, 45*, 1058–1072.

> Periksa kembali detail setiap rujukan (tahun, halaman, DOI) sebelum dimasukkan ke daftar pustaka.
