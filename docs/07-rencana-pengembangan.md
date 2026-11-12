# 07 — Rencana Pengembangan

## 1. Kerangka Model Pengembangan (ADDIE)

| Tahap | Kegiatan | Keluaran | Status |
|---|---|---|---|
| **Analysis** | Wawancara siswa, (tambahan) wawancara guru, analisis kurikulum, survei perangkat | docs/01 | Sebagian selesai |
| **Design** | Desain pedagogis, konten, UI/UX, arsitektur, instrumen evaluasi | docs/02–06, docs/08 | Draf selesai |
| **Development** | Pembuatan aplikasi (sprint 0–6), validasi ahli materi & media, revisi | Aplikasi v1.0 | Belum |
| **Implementation** | Uji coba perorangan → kelompok kecil → lapangan | Data log, angket, tes | Belum |
| **Evaluation** | Analisis kevalidan, kepraktisan, keefektifan; revisi akhir | Laporan, aplikasi v1.1 | Belum |

> Jika pembimbing meminta model lain (4D Thiagarajan atau Plomp), tahapan sprint di bawah tetap dapat dipakai; cukup ubah pemetaan tahapnya.

---

## 2. Sprint Pengembangan

Setiap sprint ±1 minggu. Di akhir sprint: jalankan semua tes, coba di HP sungguhan, catat temuan.
Kolom **Perintah untuk Claude Code** dapat disalin langsung.

### Sprint 0 — Fondasi
- Struktur folder sesuai docs/06, `pyproject.toml`, `requirements*.txt`, `.gitignore`.
- `git init`, unggah ke GitHub (repositori privat).
- FastAPI menyajikan `frontend/` + `/api/health`.
- `index.html`, `tokens.css`, router hash, layar Beranda kosong.
- Manifest + Service Worker dasar → aplikasi bisa diinstal & dibuka offline.
- **Perintah:** *"Baca CLAUDE.md dan docs/06. Kerjakan Sprint 0 dari docs/07: buat kerangka proyek, server FastAPI yang menyajikan frontend, PWA minimal yang bisa diinstal dan berjalan offline. Sertakan tes pytest untuk /api/health."*
- **Selesai bila:** Lighthouse menyatakan dapat diinstal; mode pesawat → beranda tetap terbuka.

### Sprint 1 — Logika inti & konten
- `core/mean.js`, `check.js`, `number-format.js`, `diagnose.js` + tes `node --test` (semua kode kesalahan docs/03).
- `tools/content_schema.py`, `validate_content.py` + tes pytest.
- Tulis konten JSON subbab 1–2 dan soalnya.
- **Perintah:** *"Kerjakan Sprint 1 dari docs/07. Implementasikan fungsi murni di frontend/js/core sesuai taksonomi kesalahan docs/03 bagian 3, lengkap dengan tes node --test. Lalu buat validator konten Python sesuai docs/04 bagian 4."*

### Sprint 2 — Materi bertahap & Tabel Data
- View `lesson.js` (F03) dengan StepNav, indikator posisi, layar context/concept/worked_example/faded_example.
- Komponen `DataTable` (F04) dan `Fraction`.
- Penyimpanan progres di IndexedDB.
- **Selesai bila:** subbab 1–2 dapat dipelajari dari awal sampai akhir di HP, offline.

### Sprint 3 — Latihan & umpan balik
- `StepInput` (F05), `FeedbackCard` (F07), alur percobaan 1–2–pembahasan–soal kembar.
- `fading.js` & `adaptive.js`.
- Konten subbab 3–4 (termasuk `FreqTable`).

### Sprint 4 — Soal cerita & literasi
- `StoryText` dan alur Pahami–Pilah–Hitung–Maknai (F06), diagnosis **E-SELECT** & **E-INTERP**.
- Konten subbab 5–6.
- Pertanyaan alasan (F08).

### Sprint 5 — Kuis, progres, instalasi
- Kuis acak sesuai blueprint (F09), halaman Progres.
- Tombol Instal + petunjuk iOS, banner versi baru (F10).
- Pengaturan ukuran huruf & mode gelap (F13, bila sempat).
- Audit aksesibilitas & Lighthouse.

### Sprint 6 — Fitur penelitian & guru
- Log belajar + antrian sinkronisasi (F11), skala Paas & kuesioner beban kognitif.
- Model SQLite, `POST /api/sync`, dasbor guru, ekspor CSV (F12), `create_classroom.py`.
- Uji end-to-end Playwright alur siswa lengkap.
- Deploy ke hosting (docs/09).

### Setelah Sprint 6
1. **Validasi ahli** (materi & media) → revisi.
2. **Uji coba perorangan** (3 siswa, *think-aloud*) → revisi.
3. **Uji coba kelompok kecil** (6–9 siswa) → revisi.
4. **Uji lapangan** (1 kelas) → analisis data.

---

## 3. Kebiasaan Kerja yang Disarankan

- Satu fitur = satu *branch* Git = satu *commit* bermakna (pesan dalam bahasa Indonesia, mis. `Tambah Tabel Data dengan penghitung berjalan`).
- Sebelum meminta fitur baru ke Claude Code, sebutkan ID fitur (F0x) dan dokumen yang relevan.
- Setiap kali mengubah konten soal: jalankan `python tools/validate_content.py`.
- Catat setiap perubahan desain hasil validasi/uji coba di `docs/CATATAN-REVISI.md` (tabel: tanggal · sumber masukan · perubahan · alasan) — berguna untuk Bab IV skripsi.

## 4. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| HP siswa lama / browser bukan Chrome | Tidak bisa instal | Tetap bisa dipakai di browser; uji di Android 8+; hindari fitur JS terbaru tanpa cek dukungan |
| Tidak ada internet di sekolah | Tidak bisa unduh pertama kali | Buka aplikasi sekali di rumah/Wi-Fi guru; atau jalankan server lokal di laptop guru (docs/09) |
| Hosting gratis berubah kebijakan | Aplikasi tak dapat diakses | Frontend statis dapat dipindah ke GitHub Pages/Netlify; data penting rutin diekspor |
| Data log hilang | Data penelitian kurang | Antrian sinkronisasi + ekspor CSV berkala + cadangan `data.db` |
| Cakupan membengkak | Terlambat | Patuhi MoSCoW di docs/02; tunda fitur C/W |
