# 02 — Spesifikasi Produk (PRD)

## 1. Visi

> Siswa SMP dapat belajar rata-rata secara mandiri, langkah demi langkah, dengan tempo sendiri, di HP apa pun — dan mampu **menggunakan** mean untuk memahami data dalam kehidupan sehari-hari, bukan sekadar menghitungnya.

## 2. Pengguna

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Siswa** (utama) | Kelas VII–VIII, 12–14 tahun, memakai HP Android (sering RAM kecil, kuota terbatas) | Penjelasan pelan, contoh mirip, latihan dengan umpan balik, tampilan tenang |
| **Guru** (pendukung) | Guru matematika SMP | Melihat progres & kesalahan umum kelas, membuat kode kelas |
| **Peneliti** (Anda) | Mahasiswa yang meneliti produk | Data log belajar anonim, skor kuis, skala beban kognitif, ekspor CSV |

## 3. Daftar Fitur

Prioritas MoSCoW: **M** = Must (MVP), **S** = Should, **C** = Could, **W** = Won't (untuk versi ini).

| ID | Fitur | Prioritas |
|---|---|---|
| F01 | Beranda & masuk anonim (kode siswa + kode kelas opsional) | M |
| F02 | Cek kesiapan (prasyarat penjumlahan & pembagian) | S |
| F03 | Materi bertahap dengan contoh-dikerjakan dan *fading* | M |
| F04 | Alat **Tabel Data** (centang data, n & jumlah berjalan) | M |
| F05 | Pengerjaan bertahap (input n → jumlah → hasil) | M |
| F06 | Penanda informasi soal cerita (Pahami–Pilah–Hitung–Maknai) | M |
| F07 | Umpan balik diagnostik + coba lagi + pembahasan | M |
| F08 | Jelaskan kembali (*self-explanation*) | S |
| F09 | Kuis akhir & halaman progres | M |
| F10 | PWA: instal ke layar utama & berjalan offline | M |
| F11 | Log belajar & skala beban kognitif (untuk penelitian) | S |
| F12 | Dasbor guru (progres kelas, kesalahan umum, ekspor CSV) | S |
| F13 | Pengaturan tampilan (ukuran huruf, mode gelap) | C |
| F14 | Audio penjelasan / narasi | W |
| F15 | Papan peringkat / kompetisi antarsiswa | W (menambah tekanan & distraksi) |

## 4. User Story & Kriteria Penerimaan

### F01 — Beranda & masuk anonim
*Sebagai siswa, saya ingin langsung mulai belajar tanpa membuat akun.*
- [ ] Layar pertama menampilkan nama aplikasi, tombol **Mulai Belajar**, dan isian opsional "Kode dari guru".
- [ ] Tanpa kode, aplikasi tetap berfungsi penuh; progres disimpan di perangkat.
- [ ] Tidak ada isian nama lengkap, email, atau nomor HP.

### F02 — Cek kesiapan
*Sebagai siswa, saya ingin tahu apakah kemampuan menjumlah & membagi saya sudah cukup.*
- [ ] 5 soal singkat (3 penjumlahan beberapa bilangan, 2 pembagian).
- [ ] Jika ≥2 salah, tampil saran "Ingat lagi: penjumlahan bersusun / pembagian" (kartu ringkas), tetapi siswa tetap boleh lanjut.
- [ ] Dapat dilewati.

### F03 — Materi bertahap
*Sebagai siswa, saya ingin penjelasan yang pelan, satu langkah setiap kali, dengan contoh yang mirip.*
- [ ] Setiap subbab terdiri dari layar-layar pendek (≤40 kata/teks blok), dinavigasi dengan **Kembali** / **Lanjut**.
- [ ] Indikator posisi (mis. "3 dari 7") tampil di atas.
- [ ] Urutan per subbab: Pemantik konteks → Konsep → Contoh-dikerjakan → Contoh-sebagian (siswa mengisi 1–2 langkah) → Latihan.
- [ ] Tidak ada pergantian layar otomatis maupun pengatur waktu.
- [ ] Siswa dapat membuka kembali subbab yang sudah selesai.

### F04 — Tabel Data
*Sebagai siswa, saya ingin semua data tersusun rapi supaya tidak ada yang terlewat saat dihitung.*
- [ ] Data tampil sebagai tabel bernomor (No | Data | ✓).
- [ ] Mengetuk baris menandainya ✓; di bawah tabel tampil **"Sudah dihitung: k dari n data"** dan **"Jumlah sementara: …"**.
- [ ] Pada level awal penghitung tampil otomatis; pada level lanjut penghitung disembunyikan (*fading*) dan dapat dibuka lewat tombol "Bantuan".
- [ ] Mendukung tabel frekuensi (Nilai | Frekuensi | Nilai × Frekuensi).
- [ ] Dapat dipakai dengan keyboard & pembaca layar.

### F05 — Pengerjaan bertahap
*Sebagai siswa, saya ingin mengerjakan soal per langkah agar tahu di langkah mana saya keliru.*
- [ ] Soal mode bertahap memiliki kolom: **Banyak data (n)**, **Jumlah semua data**, **Rata-rata**, dan (untuk soal konteks) **Kesimpulan**.
- [ ] Setiap kolom diperiksa sendiri-sendiri; kolom berikutnya terbuka setelah kolom sebelumnya benar atau setelah 2 kali percobaan (dengan pembahasan).
- [ ] Menerima `80,5` dan `80.5`.

### F06 — Penanda informasi soal cerita
*Sebagai siswa, saya ingin dibantu menemukan angka-angka yang penting dalam soal cerita.*
- [ ] Soal cerita menampilkan tahap **1. Pahami** (apa yang ditanya?), **2. Pilah** (ketuk angka yang dipakai), **3. Hitung**, **4. Maknai**.
- [ ] Pada tahap Pilah, siswa mengetuk angka di dalam teks soal; angka yang diketuk masuk ke Tabel Data.
- [ ] Jika siswa memilih angka pengecoh (mis. nomor absen, tanggal), muncul umpan balik spesifik.
- [ ] Tahap Maknai berupa pilihan ganda/isian singkat tentang arti hasil dalam konteks.

### F07 — Umpan balik diagnostik
*Sebagai siswa, saya ingin tahu bagian mana yang salah dan diberi kesempatan mencoba lagi.*
- [ ] Jawaban diperiksa segera setelah menekan **Periksa**.
- [ ] Benar → umpan balik singkat yang menyebut *alasannya* (bukan sekadar "Benar!").
- [ ] Salah, percobaan ke-1 → petunjuk sesuai jenis kesalahan (lihat taksonomi di docs/03), tanpa kunci jawaban.
- [ ] Salah, percobaan ke-2 → petunjuk lebih spesifik.
- [ ] Setelah percobaan ke-2 atau jika siswa menekan **Lihat pembahasan** → pembahasan langkah demi langkah dengan langkah yang salah disorot.
- [ ] Setelah melihat pembahasan, siswa diberi **soal serupa** (kembar) untuk dicoba.

### F08 — Jelaskan kembali
- [ ] Setelah beberapa soal, muncul satu pertanyaan alasan (pilihan ganda alasan atau isian bebas pendek), mis. "Mengapa 400 dibagi 5, bukan 4?"
- [ ] Isian bebas tidak dinilai otomatis; disimpan untuk dibaca guru/peneliti.

### F09 — Kuis & progres
- [ ] Kuis akhir 10 soal acak dari bank soal sesuai blueprint (docs/04), mencakup level 1–3 literasi.
- [ ] Mode kuis tetap tanpa batas waktu; skor & pembahasan tampil di akhir.
- [ ] Halaman progres: subbab selesai (✓), skor kuis terbaik, jenis kesalahan yang paling sering beserta tautan "Pelajari lagi".

### F10 — PWA
- [ ] Lighthouse kategori PWA/installability lolos; skor Performance ≥ 90 pada profil seluler.
- [ ] Tombol **Instal Aplikasi** muncul di Chrome Android (event `beforeinstallprompt`), plus petunjuk manual untuk iPhone (Safari → Bagikan → Tambahkan ke Layar Utama).
- [ ] Setelah kunjungan pertama, seluruh materi, soal, dan kuis dapat dipakai dalam mode pesawat.
- [ ] Ukuran unduhan awal total ≤ 1,5 MB.
- [ ] Muncul pemberitahuan sopan "Versi baru tersedia — Muat ulang" saat ada pembaruan.

### F11 — Log belajar & skala beban kognitif
- [ ] Mencatat (anonim): kode siswa, ID soal, jawaban per langkah, benar/salah, jenis kesalahan, jumlah percobaan, waktu pengerjaan, penggunaan bantuan.
- [ ] Di akhir subbab tertentu, tampil skala usaha mental 1–9 (Paas) dan, di akhir modul, kuesioner beban kognitif (docs/08).
- [ ] Data disimpan di IndexedDB dan dikirim ke server saat online (antrian sinkronisasi).
- [ ] Fitur dapat dimatikan melalui konfigurasi (`config.js → researchMode`).

### F12 — Dasbor guru
- [ ] Guru masuk dengan kata sandi kelas (dibuat oleh admin/peneliti).
- [ ] Menampilkan per siswa (kode): subbab selesai, skor kuis, jenis kesalahan terbanyak.
- [ ] Menampilkan ringkasan kelas: 3 kesalahan paling umum.
- [ ] Tombol **Unduh CSV** untuk analisis penelitian.

## 5. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Perangkat | Android 8+ dengan Chrome 100+; iOS Safari 16.4+; browser desktop modern |
| Kinerja | Layar pertama tampil < 3 detik di jaringan 3G; transisi antarlayar < 100 ms |
| Offline | 100 % alur belajar siswa berjalan offline |
| Aksesibilitas | WCAG 2.1 AA (kontras, ukuran target sentuh, keyboard, label) |
| Privasi | Tanpa data pribadi; tanpa pelacak pihak ketiga; data penelitian anonim |
| Keterpeliharaan | Soal baru cukup ditambah lewat JSON + validasi skrip |
| Bahasa | Bahasa Indonesia baku, kalimat pendek, sesuai usia SMP |

## 6. Cakupan MVP (Versi 1.0)

**Termasuk:** F01, F03, F04, F05, F06, F07, F09, F10 untuk subbab 1–5 materi mean (docs/04).
**Versi 1.1:** F02, F08, F11, F12, subbab 6.
**Nanti:** F13, materi median/modus/jangkauan.

## 7. Di Luar Cakupan

- Akun dengan email/kata sandi siswa.
- Pembayaran, iklan, chat antarsiswa.
- Publikasi di Play Store (opsional di masa depan melalui TWA, lihat docs/09).
