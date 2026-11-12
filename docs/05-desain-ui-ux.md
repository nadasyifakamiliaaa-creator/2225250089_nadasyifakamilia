# 05 — Desain UI/UX

Prinsip dasar dari wawancara (DS03, DS05): **tenang, jelas, ringkas** — "menarik tetapi tidak mencolok".

---

## 1. Token Desain (`frontend/css/tokens.css`)

### 1.1 Warna
Palet lembut dengan satu warna aksen. Warna status selalu disertai ikon/teks (tidak mengandalkan warna saja — ramah buta warna).

| Token | Terang | Gelap | Kegunaan |
|---|---|---|---|
| `--bg` | `#F7F8FA` | `#16181D` | Latar halaman |
| `--surface` | `#FFFFFF` | `#20232A` | Kartu, tabel |
| `--text` | `#1F2933` | `#E6E8EB` | Teks utama |
| `--text-muted` | `#52606D` | `#A9B1BB` | Teks pendukung |
| `--primary` | `#2F6FB2` | `#7FB0E6` | Tombol utama, langkah aktif |
| `--primary-soft` | `#E6EFF8` | `#243445` | Latar sorotan (signaling) |
| `--success` | `#2E7D4F` | `#7CC79C` | Jawaban benar (+ ikon ✓) |
| `--warning` | `#9A6700` | `#E3B341` | Petunjuk (+ ikon 💡 sebagai SVG) |
| `--error` | `#B23B3B` | `#E58A8A` | Belum tepat (+ ikon ✗) |
| `--border` | `#D9DEE4` | `#343841` | Garis tabel & kartu |

Semua pasangan teks/latar wajib lolos kontras **≥ 4.5:1** (cek dengan DevTools atau webaim.org/resources/contrastchecker).

### 1.2 Tipografi
- Huruf: tumpukan huruf sistem — `system-ui, "Segoe UI", Roboto, "Noto Sans", sans-serif` (tanpa unduhan font).
- Ukuran dasar **18 px**; judul layar 22 px; angka dalam tabel 20 px dengan `font-variant-numeric: tabular-nums` agar angka sejajar.
- Tinggi baris 1,5; lebar teks maksimal 60 karakter.
- Rumus ditampilkan dengan komponen pecahan HTML/CSS sederhana (tanpa pustaka matematika).

### 1.3 Ruang & bentuk
- Skala jarak: 4, 8, 12, 16, 24, 32 px.
- Sudut membulat 12 px untuk kartu, 10 px untuk tombol.
- Target sentuh minimal **48 × 48 px**; jarak antartombol ≥ 8 px.

### 1.4 Gerak
- Transisi maks 200 ms (pudar/geser ringan). Nonaktif bila `prefers-reduced-motion: reduce`.
- Dilarang: konfeti, kedip, gerak berulang, suara otomatis.

---

## 2. Komponen Inti

| Komponen | Deskripsi |
|---|---|
| `AppBar` | Judul subbab + indikator "3 dari 7" + tombol kembali ke menu |
| `StepNav` | Tombol **Kembali** (sekunder) dan **Lanjut** (utama) di bawah layar, tetap terlihat (sticky) |
| `DataTable` | Tabel Data F04: No · Data · ✓; baris dapat diketuk; ringkasan n & jumlah berjalan di bawah |
| `FreqTable` | Tabel frekuensi dengan kolom x·f yang dapat dimunculkan |
| `StoryText` | Teks soal dengan angka yang dapat diketuk (sorot `--primary-soft`) |
| `StepInput` | Kolom isian per langkah (n, jumlah, rata-rata), keyboard angka (`inputmode="decimal"`) |
| `FeedbackCard` | Kartu umpan balik di bawah isian (bukan pop-up), ikon + teks + tombol "Coba lagi"/"Lihat pembahasan" |
| `Fraction` | Tampilan pecahan rumus |
| `ProgressList` | Daftar subbab dengan status ✓ / sedang / terkunci-lunak (boleh dibuka, hanya disarankan urut) |
| `MentalEffortScale` | Skala 1–9 dengan label ujung "Sangat-sangat ringan" – "Sangat-sangat berat" |
| `InstallBanner` | Ajakan instal, dapat ditutup dan tidak muncul lagi selama 7 hari |

Umpan balik **tidak memakai pop-up/modal** agar tidak memutus perhatian; ditampilkan menempel di bawah isian yang bersangkutan (spatial contiguity).

---

## 3. Peta Layar

```
Beranda ──► Menu Topik (Mean) ──► Cek Kesiapan (opsional)
                │
                ├─► Subbab 1..6 ──► Layar materi ──► Contoh ──► Latihan ──► Refleksi
                ├─► Kuis Akhir ──► Hasil & Pembahasan
                ├─► Progres Saya
                └─► Pengaturan (ukuran huruf, mode gelap, cara instal)

/guru ──► Masuk kata sandi kelas ──► Dasbor kelas ──► Detail siswa / Unduh CSV
```

---

## 4. Wireframe (lebar 360 px)

### 4.1 Layar contoh-dikerjakan dengan Tabel Data
```
┌────────────────────────────────┐
│ ←  Menghitung Rata-rata   3/7  │
├────────────────────────────────┤
│ Nilai ulangan Rani:            │
│                                │
│ ┌────┬────────┬────┐           │
│ │ No │ Nilai  │ ✓  │           │
│ ├────┼────────┼────┤           │
│ │ 1  │   70   │ ✓  │           │
│ │ 2  │   80   │ ✓  │           │
│ │ 3  │   75   │ ✓  │           │
│ │ 4  │   85   │ ✓  │           │
│ │ 5  │   90   │ ✓  │           │
│ └────┴────────┴────┘           │
│ Sudah dihitung: 5 dari 5 data  │
│ Jumlah sementara: 400          │
│                                │
│ ▸ Langkah 3: Bagi              │
│     400                        │
│    ───── = 80                  │
│      5                         │
├────────────────────────────────┤
│ [ Kembali ]      [  Lanjut  ]  │
└────────────────────────────────┘
```

### 4.2 Soal cerita — tahap Pilah
```
┌────────────────────────────────┐
│ ←  Soal Cerita            2/5  │
├────────────────────────────────┤
│ ① Pahami ✓  ② Pilah  ③ ④       │
├────────────────────────────────┤
│ Ketuk angka yang dipakai untuk │
│ menghitung rata-rata.          │
│                                │
│ Pada [tanggal 3 Maret] Bu Sari │
│ membuka warung. Hari Senin     │
│ terjual [24] bungkus, Selasa   │
│ [30], Rabu [27], Kamis [31].   │
│ Harga sebungkus [12.000].      │
│                                │
│ Data terpilih: 24, 30, 27, 31  │
│                                │
│ ┌ 💡 ───────────────────────┐  │
│ │ "12.000" adalah harga satu │  │
│ │ bungkus. Apakah termasuk   │  │
│ │ data penjualan?            │  │
│ └───────────────────────────┘  │
├────────────────────────────────┤
│ [ Kembali ]      [  Periksa ]  │
└────────────────────────────────┘
```

### 4.3 Pengerjaan bertahap dengan umpan balik
```
┌────────────────────────────────┐
│ Banyak data (n)   [ 4 ]  ✓     │
│ Jumlah semua data [ 81 ]  ✗    │
│ ┌ Belum tepat ───────────────┐ │
│ │ Sepertinya ada satu data   │ │
│ │ yang belum dijumlahkan.    │ │
│ │ [Coba lagi] [Lihat bahasan]│ │
│ └────────────────────────────┘ │
│ Rata-rata          [  ] 🔒     │
└────────────────────────────────┘
```

---

## 5. Pedoman Penulisan Teks Antarmuka

- Sapaan "kamu"; kalimat aktif dan pendek.
- Tombol berupa kata kerja: **Mulai**, **Lanjut**, **Periksa**, **Coba lagi**, **Lihat pembahasan**.
- Hindari kata "Salah!"; gunakan "Belum tepat".
- Pujian spesifik dan sederhana: "Benar, banyak datanya 5."

## 6. Aset Visual

- Ilustrasi berupa **SVG sederhana** (garis + 2 warna), hanya bila membantu konsep (mis. tumpukan kelereng disamaratakan). Tidak ada gambar dekoratif.
- Ikon SVG inline (✓, ✗, petunjuk, rumah, kembali).
- Ikon aplikasi PWA: 192×192, 512×512, dan versi *maskable*.
