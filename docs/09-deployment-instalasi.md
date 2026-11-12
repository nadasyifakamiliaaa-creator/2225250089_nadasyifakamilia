# 09 — Deployment & Instalasi

## 1. Syarat Penting: HTTPS

Fitur instal PWA dan Service Worker (offline) **hanya bekerja di HTTPS** (kecuali di `localhost`). Karena itu aplikasi harus di-*hosting* di layanan yang menyediakan HTTPS — hampir semua hosting modern menyediakannya gratis.

---

## 2. Pilihan Hosting

| Opsi | Cara | Kelebihan | Keterbatasan | Cocok untuk |
|---|---|---|---|---|
| **A. Frontend statis saja** | Unggah folder `frontend/` ke GitHub Pages / Netlify / Cloudflare Pages | Gratis, stabil, HTTPS otomatis, cepat | Tanpa server → tidak ada sinkronisasi log & dasbor guru | Sprint 0–5, validasi ahli, uji perorangan |
| **B. Aplikasi lengkap (FastAPI)** | Deploy repositori ke layanan PaaS yang mendukung Python (mis. Render, Railway, Fly.io, PythonAnywhere) | Semua fitur (sync, dasbor, ekspor) | Paket gratis sering "tidur" saat tidak dipakai dan **penyimpanan berkas bisa terhapus saat restart** → SQLite hilang kecuali memakai *persistent disk*/volume | Uji kelompok kecil & lapangan |
| **C. Gabungan** | Frontend di opsi A + backend di opsi B; `config.js → apiBase` diarahkan ke URL backend; aktifkan CORS untuk domain frontend | Aplikasi siswa tetap cepat & selalu bisa diakses walau backend tidur | Pengaturan sedikit lebih banyak | **Rekomendasi untuk penelitian** |

> ⚠️ Ketentuan paket gratis layanan hosting sering berubah. Sebelum memilih, periksa halaman harga resminya, khususnya: apakah ada **penyimpanan permanen** untuk berkas `data.db`, batas jam aktif, dan apakah aplikasi tidur saat tidak dipakai.
> Apa pun pilihannya: **ekspor CSV setiap selesai sesi uji coba** sebagai cadangan.

### 2.1 Langkah ringkas opsi A (GitHub Pages)
1. Buat repositori di GitHub dan unggah proyek.
2. Settings → Pages → *Deploy from branch* → pilih folder `/frontend` (atau gunakan GitHub Actions untuk menerbitkan folder `frontend/`).
3. Buka `https://<nama-pengguna>.github.io/<nama-repo>/` di HP.
4. Pastikan `start_url` dan `scope` di manifest bersifat relatif (`./`) agar bekerja di subfolder.

### 2.2 Langkah ringkas opsi B (layanan PaaS Python)
1. Perintah *build*: `pip install -r backend/requirements.txt`
2. Perintah *start*: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"`
   (`--proxy-headers` agar server tahu aksesnya lewat HTTPS, sehingga cookie guru bertanda *Secure*.)
3. Variabel lingkungan (lihat `.env.example`):
   - `DATABASE_PATH` → **wajib** diarahkan ke *volume*/disk permanen, mis. `/data/rataku.db`;
   - `COOKIE_SECURE=auto`; `ALLOWED_ORIGINS` hanya bila frontend di domain lain (opsi C).
   - Tidak perlu kunci rahasia: sesi guru berupa token acak yang disimpan di basis data.
4. Buat kelas lewat *shell/console* layanan hosting:
   `python tools/create_classroom.py --code 8B-2026 --name "Kelas 8B" --research`
   (`--research` = siswa kelas itu melihat skala beban kognitif; kata sandi guru akan ditanyakan.)
5. Uji: buka `https://<alamat>/api/health`, lalu `https://<alamat>/guru` untuk dasbor guru.

### 2.3 Rutinitas selama uji coba penelitian
- Setelah setiap sesi kelas: buka dasbor guru → **Unduh data (CSV)** semua jenis → simpan di satu folder.
- Jalankan `python tools/analyze_logs.py <folder>` untuk ringkasan ketepatan, kesalahan, skala Paas, Leppink (IL/EL/GL), dan skor kuis.
- Cadangkan juga berkas `rataku.db` dari volume bila layanan hosting menyediakannya.

---

## 3. Cara Siswa Menginstal Aplikasi (tanpa Play Store / App Store)

Bagian ini juga ditampilkan di dalam aplikasi (menu **Pengaturan → Cara instal**) dan bisa dicetak sebagai lembar petunjuk.

### Android (Chrome)
1. Buka alamat aplikasi di **Chrome**.
2. Ketuk tombol **Instal Aplikasi** di aplikasi, *atau* ketuk menu **⋮** → **Instal aplikasi** / **Tambahkan ke layar utama**.
3. Ketuk **Instal**. Ikon RataKu muncul di layar utama.
4. Buka sekali saat online; setelah itu aplikasi bisa dipakai tanpa internet.

### iPhone / iPad (Safari)
1. Buka alamat aplikasi di **Safari**.
2. Ketuk ikon **Bagikan** (kotak dengan panah ke atas).
3. Pilih **Tambahkan ke Layar Utama** → **Tambah**.

### Laptop (Chrome / Edge)
Klik ikon instal (monitor dengan panah) di ujung kanan bilah alamat → **Instal**.

### Lembar petunjuk untuk kelas
Buat satu halaman A4 berisi: alamat aplikasi, **kode QR** menuju alamat tersebut (bisa dibuat dengan pustaka Python `qrcode`), kode kelas, dan langkah instal Android di atas.

---

## 4. (Opsional) Berkas APK Tanpa Play Store

Jika sekolah menginginkan berkas `.apk`:
- Gunakan **PWABuilder** (pwabuilder.com) atau **Bubblewrap** untuk membungkus PWA menjadi aplikasi Android (*Trusted Web Activity*).
- Agar tampil layar penuh tanpa bilah alamat, unggah berkas `/.well-known/assetlinks.json` ke domain aplikasi.
- Siswa perlu mengizinkan "Instal aplikasi tidak dikenal" di HP — **kurang disarankan** untuk siswa; instal PWA lewat browser lebih aman dan sederhana.

---

## 5. Pemeriksaan Sebelum Rilis

- [ ] `CACHE_VERSION` di `sw.js` sudah dinaikkan.
- [ ] Semua tes lulus (`pytest`, `node --test`, `validate_content.py`).
- [ ] Lighthouse: installable ✓, Performance ≥ 90, Accessibility ≥ 95.
- [ ] Dicoba instal di minimal 1 HP Android dan berjalan dalam mode pesawat.
- [ ] `researchMode` sesuai tahap (mati untuk validasi ahli, hidup untuk uji coba).
- [ ] Cadangan `data.db` / ekspor CSV terbaru tersimpan.
