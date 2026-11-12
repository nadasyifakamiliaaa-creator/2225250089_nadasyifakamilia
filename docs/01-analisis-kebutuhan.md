# 01 — Analisis Kebutuhan

Tahap *Analysis* (ADDIE). Dokumen ini menerjemahkan hasil wawancara menjadi kebutuhan desain yang dapat ditelusuri.

---

## 1. Sumber Data

| Aspek | Keterangan |
|---|---|
| Instrumen | Wawancara semi-terstruktur analisis kebutuhan, berbasis teori beban kognitif |
| Responden | 1 siswa kelas VIII (kode S01), pernah belajar mean di kelas VII |
| Durasi | 30 menit |
| Artefak pemicu | Nilai ulangan Rani: 70, 80, 75, 85, 90 → siswa menjawab benar: 400 ÷ 5 = 80 |
| Kode analisis | **IL** (intrinsic load), **EL** (extraneous load), **GL** (germane load), **K** (pengalaman/kebutuhan/rekomendasi) |

> **Keputusan:** hasil wawancara S01 ini dipakai apa adanya sebagai dasar desain aplikasi.
> Jika nanti ada responden tambahan (siswa lain atau guru), cukup tambahkan temuannya ke tabel di bawah dan perbarui matriks ketertelusuran di bagian 3.

---

## 2. Temuan Utama

### 2.1 Intrinsic Load — kesulitan dari materi itu sendiri
| Kode | Temuan |
|---|---|
| K03, IL01, H1 | Kesulitan utama: **menentukan banyak data (n)**, terutama pada soal cerita dan data yang banyak. |
| IL04, IL06 | Takut **ada angka yang terlewat**; kesalahan terjadi saat menjumlahkan dan menghitung n. |
| IL05 | Penjumlahan & pembagian adalah **prasyarat**; lemahnya prasyarat menghambat mean. |
| IL02, IL03, G | Konsep inti (jumlah ÷ banyak data) sudah dipahami pada data sederhana. |

### 2.2 Extraneous Load — hambatan dari cara penyajian
| Kode | Temuan |
|---|---|
| EL01, EL05 | Soal cerita panjang menyulitkan **memilah angka yang relevan**. |
| EL02, EL04 | Penjelasan **terlalu cepat**; siswa ingin tempo pelan & bertahap. |
| EL03 | **Tabel** membantu data tidak tertukar. |
| DS05 | Teks berlebihan, animasi berlebihan, warna mencolok **mengganggu konsentrasi**. |

### 2.3 Germane Load — strategi yang membangun pemahaman
| Kode | Temuan |
|---|---|
| GL01 | Belajar efektif lewat **contoh soal lalu mencoba sendiri**. |
| GL02 | Terbiasa **memeriksa ulang** hasil hitung. |
| GL03 | Butuh **petunjuk langkah demi langkah** dan **contoh yang mirip**. |
| GL04 | **Menjelaskan ke teman** membuat lebih ingat. |
| GL05 | Strategi membaca soal: cari yang diketahui → yang ditanya → rumus. |

### 2.4 Kebutuhan & Rekomendasi Aplikasi (K)
| Kode | Temuan |
|---|---|
| DS01 | Ada penjelasan rumus, contoh soal, latihan, pembahasan → bisa belajar sendiri. |
| DS02 | Langkah menjumlah & menentukan n dijelaskan pelan dan bertahap. |
| DS03 | Tampilan menarik namun tidak mencolok, tulisan jelas, ada gambar/tabel. |
| DS04 | Pembahasan langkah demi langkah yang **menunjukkan bagian yang salah**, lalu **boleh mencoba lagi**. |
| H2, H3 | Pembahasan bertahap & **hasil jawaban langsung diketahui**. |

---

## 3. Matriks Ketertelusuran (Temuan → Prinsip → Fitur)

Matriks ini adalah inti justifikasi desain untuk laporan penelitian. ID fitur merujuk ke [02-spesifikasi-produk.md](02-spesifikasi-produk.md).

| Temuan (kode) | Prinsip desain (lihat docs/03) | Fitur | Prioritas |
|---|---|---|---|
| IL01, IL04, IL06, K03, H1 | Segmentasi; alat bantu eksternal (*offloading*) | **F04 Tabel Data** berpenghitung: data dicentang satu per satu, n & jumlah berjalan tampil otomatis | Wajib |
| IL06, DS02 | Segmentasi langkah | **F05 Pengerjaan Bertahap**: input terpisah untuk n, jumlah, hasil bagi | Wajib |
| IL05 | Aktivasi prasyarat | **F02 Cek Kesiapan** (5 soal penjumlahan/pembagian) + tautan "Ingat lagi" | Sebaiknya |
| EL01, EL05, GL05 | Signaling; strategi literasi | **F06 Penanda Informasi** soal cerita (Pahami–Pilah–Hitung–Maknai) | Wajib |
| EL02, EL04 | *Learner-paced*; segmentasi | **F03 Materi Bertahap** dengan tombol Lanjut/Kembali, tanpa auto-play | Wajib |
| EL03, DS03 | Representasi tabel; *multimedia principle* | Tabel & ilustrasi sederhana di materi dan soal | Wajib |
| DS05 | Coherence & redundancy principle | Panduan UI (docs/05): teks ringkas, tanpa animasi berlebih, palet tenang | Wajib |
| GL01, GL03 | *Worked example* → *fading* | **F03** contoh-dikerjakan → contoh-sebagian → latihan | Wajib |
| DS04, H2, H3 | Umpan balik elaboratif segera | **F07 Umpan Balik Diagnostik** + coba lagi + pembahasan bertahap | Wajib |
| GL02 | Metakognisi | Ajakan "Periksa lagi" + ringkasan langkah sebelum kirim | Sebaiknya |
| GL04 | *Self-explanation* | **F08 Jelaskan Kembali**: pilihan/isian alasan singkat | Sebaiknya |
| DS01 | Kelengkapan untuk belajar mandiri | Modul lengkap: rumus, contoh, latihan, pembahasan, kuis | Wajib |
| H3 | Motivasi melalui umpan balik | **F09 Kuis & Progres** dengan hasil langsung | Wajib |
| — (kebutuhan peneliti) | Pengumpulan data penelitian | **F11 Log Belajar & Skala Beban Kognitif**, **F12 Dasbor Guru** | Sebaiknya |

---

## 4. Analisis Pendukung yang Perlu Dilengkapi

| Analisis | Isi yang perlu dicatat | Status |
|---|---|---|
| Analisis kurikulum | CP Fase D elemen Analisis Data dan Peluang; TP & ATP mean (draf di docs/04) | Draf |
| Analisis karakteristik siswa | Usia 12–14 th, kemampuan awal, gaya belajar mandiri, kepemilikan HP | Perlu data |
| Analisis perangkat | Jenis HP Android siswa, versi Android, RAM, ketersediaan kuota/Wi-Fi sekolah | **Perlu survei singkat** |
| Analisis guru | Cara guru mengajar mean, kesalahan yang sering ditemui, kebutuhan pemantauan | Perlu wawancara guru |

Saran survei perangkat (Google Form 5 butir): merek & tipe HP, versi Android, browser yang dipakai (Chrome/lainnya), akses internet di rumah, apakah HP milik sendiri.
