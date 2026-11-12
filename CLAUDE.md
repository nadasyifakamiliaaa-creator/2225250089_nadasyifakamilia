# CLAUDE.md — Panduan Proyek untuk Claude Code

Dokumen ini dibaca otomatis oleh Claude Code setiap kali bekerja di folder ini.
Isinya: konteks proyek, aturan teknis, dan **aturan pedagogis yang wajib dipatuhi oleh setiap baris kode**.

---

## 1. Ringkasan Proyek

- **Nama kerja aplikasi:** RataKu (boleh diganti)
- **Jenis:** Progressive Web App (PWA) pembelajaran matematika untuk siswa SMP (Fase D, kelas VII–VIII).
- **Materi awal (MVP):** Rata-rata (mean). Arsitektur harus siap ditambah materi lain (median, modus, dst.).
- **Tujuan ganda:**
  1. Mengelola **beban kognitif** siswa (menekan *extraneous load*, mengelola *intrinsic load*, mendorong *germane load*).
  2. Menumbuhkembangkan **literasi matematika** (merumuskan → menerapkan → menafsirkan, mengacu kerangka PISA 2022).
- **Platform:** dibuka di browser (desktop & Android) dan **dapat diinstal tanpa Play Store/App Store** (fitur "Tambahkan ke Layar Utama"/"Instal aplikasi" PWA).
- **Bahasa pemrograman:** JavaScript (frontend) dan Python (backend + perkakas konten).
- **Pengembang:** mahasiswa S1 Pendidikan Matematika (penelitian pengembangan). Tulis penjelasan teknis dengan bahasa yang mudah dipahami.

Dokumen rinci ada di folder [docs/](docs/). Baca dokumen yang relevan sebelum mengerjakan fitur:

| Dokumen | Kapan dibaca |
|---|---|
| [docs/01-analisis-kebutuhan.md](docs/01-analisis-kebutuhan.md) | Memahami alasan setiap fitur (jejak dari wawancara) |
| [docs/02-spesifikasi-produk.md](docs/02-spesifikasi-produk.md) | Fitur, user story, kriteria penerimaan, cakupan MVP |
| [docs/03-desain-pedagogis.md](docs/03-desain-pedagogis.md) | Prinsip beban kognitif, literasi, umpan balik, diagnosis kesalahan |
| [docs/04-desain-konten-mean.md](docs/04-desain-konten-mean.md) | Isi materi, tujuan pembelajaran, format JSON konten |
| [docs/05-desain-ui-ux.md](docs/05-desain-ui-ux.md) | Warna, tipografi, komponen, wireframe |
| [docs/06-arsitektur-teknis.md](docs/06-arsitektur-teknis.md) | Struktur folder, API, basis data, PWA, offline |
| [docs/07-rencana-pengembangan.md](docs/07-rencana-pengembangan.md) | Urutan kerja (sprint) dan prioritas |
| [docs/08-rencana-pengujian-evaluasi.md](docs/08-rencana-pengujian-evaluasi.md) | Pengujian perangkat lunak & instrumen penelitian |
| [docs/09-deployment-instalasi.md](docs/09-deployment-instalasi.md) | Hosting, HTTPS, cara instal di HP |

---

## 2. Tumpukan Teknologi (jangan diganti tanpa persetujuan)

| Lapisan | Teknologi | Alasan |
|---|---|---|
| Frontend | HTML + CSS + **JavaScript murni (ES Modules)**, tanpa framework, tanpa build step | Ringan di HP murah, mudah dipelajari & dipelihara oleh pengembang pemula |
| PWA | `manifest.webmanifest` + Service Worker (`sw.js`) buatan sendiri | Bisa diinstal & berjalan offline |
| Penyimpanan lokal | `localStorage` (pengaturan) + IndexedDB (progres, log jawaban) | Tetap berfungsi tanpa internet |
| Backend | **Python 3.11+ dengan FastAPI** + Uvicorn | Menyajikan file frontend, API sinkronisasi progres, dasbor guru, ekspor data penelitian |
| Basis data | SQLite melalui SQLModel | Gratis, satu file, cukup untuk skala kelas/sekolah |
| Perkakas konten | Python + Pydantic (`tools/validate_content.py`) | Memastikan file JSON materi/soal valid sebelum dipakai |
| Pengujian | `pytest` (backend & konten), `node --test` (logika JS murni), Playwright for Python (uji end-to-end) | |

**Larangan:** jangan menambahkan React/Vue/Angular, Tailwind, bundler (webpack/vite), CDN eksternal, font eksternal, atau pustaka analitik pihak ketiga. Semua aset harus tersimpan lokal agar aplikasi bekerja offline.

---

## 3. Prinsip Arsitektur

1. **Offline-first.** Seluruh alur belajar (materi, contoh, latihan, kuis, umpan balik) harus berjalan tanpa internet. Backend hanya untuk sinkronisasi progres & dasbor guru — aplikasi **tidak boleh rusak** bila server mati.
2. **Konten terpisah dari kode.** Materi dan soal ditulis dalam JSON di `frontend/content/`. Menambah soal tidak boleh memerlukan perubahan kode JavaScript.
3. **Logika murni terpisah dari tampilan.** Perhitungan, pengecekan jawaban, dan diagnosis kesalahan ada di `frontend/js/core/` sebagai fungsi murni (tanpa akses DOM) agar mudah diuji.
4. **Mobile-first.** Rancang untuk layar 360×640 px terlebih dahulu, lalu perluas ke tablet/desktop.
5. **Anonim secara bawaan.** Siswa adalah anak di bawah umur: jangan pernah meminta nama lengkap, email, nomor HP, foto, atau lokasi. Identitas cukup berupa kode siswa (mis. `S01`) + kode kelas dari guru.

---

## 4. Aturan Pedagogis yang WAJIB Dipatuhi Kode

Aturan ini berasal langsung dari hasil wawancara (kode IL/EL/GL/K). Jika sebuah permintaan bertentangan dengan aturan ini, beri tahu pengembang sebelum melanjutkan.

### Menekan extraneous load (EL)
- **Satu ide per layar.** Satu layar materi = satu konsep/langkah. Teks paragraf maksimal ±40 kata per blok.
- **Tempo dikendalikan siswa.** Tidak ada perpindahan layar otomatis, tidak ada penghitung waktu pada mode belajar & latihan. Tombol "Lanjut" dan "Kembali" selalu ada. (EL02, EL04)
- **Tanpa animasi berlebihan.** Hanya transisi ≤200 ms; hormati `prefers-reduced-motion`. Tidak ada elemen berkedip, konfeti, atau suara otomatis. (DS05)
- **Warna tenang**, kontras teks memenuhi WCAG AA (≥4.5:1). Warna dipakai untuk *memberi tanda*, bukan dekorasi. (DS03, DS05)
- **Hindari split-attention.** Keterangan diletakkan menempel pada bagian yang dijelaskan (mis. label langsung di samping baris tabel), bukan di legenda terpisah.
- **Soal cerita** selalu punya fitur bantu "Tandai informasi penting". (EL01, EL05)

### Mengelola intrinsic load (IL)
- **Segmentasi langkah mean:** (1) daftar data → (2) hitung banyak data *n* → (3) jumlahkan semua data → (4) bagi → (5) maknai hasil. Jangan gabungkan langkah pada level awal. (IL01–IL06, DS02)
- **Alat "Tabel Data":** setiap data ditampilkan sebagai baris tabel bernomor yang bisa dicentang; *n* dan jumlah berjalan ditampilkan di bawahnya. Tujuannya mencegah data terlewat. (IL04, EL03)
- **Bertahap dari sederhana ke kompleks:** data sedikit & bilangan bulat → data lebih banyak → tabel frekuensi → soal cerita → data hilang/penalaran.

### Mendorong germane load (GL)
- **Contoh-dikerjakan → contoh-sebagian (fading) → latihan mandiri.** (GL01, GL03)
- **Umpan balik langkah demi langkah** yang menunjukkan *bagian mana* yang salah, lalu memberi kesempatan mencoba lagi. Jangan langsung menampilkan kunci jawaban pada percobaan pertama. (DS04, H2)
- **Hasil langsung diketahui** setelah siswa menekan "Periksa". (H3)
- **Penjelasan diri:** sesekali minta siswa memilih/menulis alasan ("Mengapa dibagi 5?"). (GL04)
- **Ajakan memeriksa ulang** sebelum mengirim jawaban akhir. (GL02)

### Literasi matematika
Setiap soal kontekstual mengikuti siklus **Pahami → Pilah → Hitung → Maknai** (sejajar dengan *formulate – employ – interpret/evaluate* PISA). Langkah "Maknai" tidak boleh dihilangkan: siswa harus menafsirkan hasil mean dalam konteks soal.

---

## 5. Konvensi Kode

- **Bahasa:** nama variabel/fungsi/berkas dalam **bahasa Inggris**; komentar kode, teks antarmuka, dan isi konten dalam **bahasa Indonesia** baku yang ramah siswa SMP.
- **JavaScript:** ES2020+, `const`/`let`, ES Modules (`import`/`export`), tanpa `var`. Format dengan Prettier bawaan editor (2 spasi, tanda kutip tunggal, titik koma).
- **Python:** PEP 8, type hints wajib, format dengan `ruff format`, lint dengan `ruff check`.
- **CSS:** gunakan variabel CSS dari `frontend/css/tokens.css`; jangan menulis warna heksadesimal langsung di komponen.
- **Aksesibilitas:** setiap tombol punya teks/`aria-label`, target sentuh minimal 48×48 px, ukuran huruf dasar 18 px, semua fungsi dapat dipakai dengan keyboard.
- **Angka:** tampilkan dengan format Indonesia (koma desimal, mis. `80,5`). Input siswa harus menerima koma **dan** titik sebagai pemisah desimal. Gunakan `frontend/js/core/number-format.js`.
- **Teks antarmuka** tidak di-hardcode tersebar; kumpulkan di `frontend/js/ui/strings.js`. Pengecualian: teks petunjuk/umpan balik diagnostik ada di `frontend/js/core/hints.js` karena terikat dengan taksonomi kesalahan.
- **Kunci jawaban** tidak pernah ditulis di JSON. Dihitung oleh `frontend/js/core/answer-key.js` (JS) dan `tools/content_schema.py` (Python); keduanya harus memberi hasil yang sama.
- **ID soal:** `p-<topik>-<subbab>-<nomor>` (latihan), akhiran `-k` untuk soal kembar, `r-` untuk cek kesiapan.

---

## 6. Perintah Penting

```bash
# Menyiapkan lingkungan Python (sekali saja)
py -m venv .venv                 # di laptop ini Python dipanggil dengan `py`
.venv\Scripts\activate          # Windows (setelah aktif, `python` bisa dipakai)
pip install -r backend/requirements.txt -r requirements-dev.txt

# Membuat ulang ikon aplikasi (jika desain ikon diubah)
python tools/generate_icons.py

# Menjalankan aplikasi lokal (frontend + backend) di http://localhost:8000
uvicorn backend.app.main:app --reload

# Validasi file konten JSON
python tools/validate_content.py

# Rilis: susun ulang daftar cache offline + samakan versi
python tools/release.py 0.7.1

# Membuat kelas (untuk dasbor guru & penelitian); kata sandi ditanyakan
python tools/create_classroom.py --code 8B-2026 --name "Kelas 8B" --research

# Ringkasan data penelitian dari CSV ekspor dasbor guru
python tools/analyze_logs.py folder-csv/

# Pengujian
pytest                           # semua: backend, konten, e2e (butuh Google Chrome)
pytest -m "not e2e"              # cepat, tanpa browser
node --test frontend/tests/      # logika JS murni (butuh Node.js)

# Format & lint
ruff format . && ruff check .
```

Untuk mencoba di HP pada jaringan Wi-Fi yang sama: `uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`, lalu buka `http://<IP-laptop>:8000`. (Catatan: fitur instal PWA penuh butuh HTTPS — lihat docs/09.)

---

## 7. Definisi "Selesai" untuk Setiap Fitur

Sebuah fitur dianggap selesai bila:
1. Memenuhi kriteria penerimaan di docs/02.
2. Tidak melanggar aturan pedagogis di bagian 4.
3. Berjalan saat **offline** (uji dengan DevTools → Network → Offline).
4. Tampil baik pada lebar 360 px dan 1280 px.
5. Lolos `pytest`, `node --test`, dan `python tools/validate_content.py`.
6. Jika menambah/mengubah file frontend, jalankan `python tools/release.py X.Y.Z` (menyusun ulang daftar cache offline di `sw.js` dan menyamakan versi di semua tempat).

---

## 8. Hal yang Perlu Ditanyakan Dulu ke Pengembang

- Mengubah urutan langkah belajar atau menghapus langkah "Maknai".
- Menambah pengumpulan data siswa baru (apa pun) — berkaitan dengan etika penelitian.
- Menambah dependensi baru (Python maupun JavaScript).
- Mengubah skema JSON konten (berdampak ke semua soal yang sudah ditulis).
