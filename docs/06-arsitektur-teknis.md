# 06 — Arsitektur Teknis

---

## 1. Gambaran Umum

```
                 ┌──────────────────────── HP / Laptop siswa ────────────────────────┐
                 │  Browser (Chrome/Safari)                                           │
                 │  ┌──────────────── PWA (JavaScript) ────────────────┐              │
                 │  │ UI (views/components) ─► core (logika murni)      │              │
                 │  │        │                                          │              │
                 │  │        ▼                                          │              │
                 │  │ storage: localStorage + IndexedDB (progres, log)  │              │
                 │  └────────┬──────────────────────────────────────────┘              │
                 │           │ Service Worker: cache semua aset & konten → offline     │
                 └───────────┼─────────────────────────────────────────────────────────┘
                             │ HTTPS (hanya saat online, opsional)
                             ▼
                 ┌──────────── Server (Python FastAPI) ─────────────┐
                 │ • Menyajikan file frontend statis                │
                 │ • POST /api/sync      (log & progres siswa)      │
                 │ • /guru               (dasbor guru)              │
                 │ • GET /api/export.csv (data penelitian)          │
                 │ SQLite (data.db)                                 │
                 └──────────────────────────────────────────────────┘
```

**Pembagian peran bahasa:**
- **JavaScript:** semua yang dialami siswa (tampilan, logika soal, diagnosis, offline).
- **Python:** server, basis data, dasbor guru, validasi konten, ekspor & analisis data penelitian.

---

## 2. Struktur Folder

```
.
├── CLAUDE.md
├── README.md
├── requirements-dev.txt          pytest, ruff, playwright, httpx
├── pyproject.toml                konfigurasi ruff & pytest
├── docs/
├── frontend/                     ← PWA (disajikan apa adanya, tanpa build)
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── sw.js                     Service Worker
│   ├── icons/                    icon-192.png, icon-512.png, maskable-512.png
│   ├── css/
│   │   ├── tokens.css            variabel warna/huruf/jarak
│   │   ├── base.css
│   │   └── components.css
│   ├── js/
│   │   ├── app.js                titik masuk, registrasi SW, router
│   │   ├── config.js             researchMode, apiBase, versi
│   │   ├── router.js             router berbasis hash (#/topik/mean/2/3)
│   │   ├── core/                 ← FUNGSI MURNI, tanpa DOM, diuji node --test
│   │   │   ├── mean.js           hitung n, jumlah, mean, mean frekuensi, nilai hilang
│   │   │   ├── check.js          bandingkan jawaban dengan toleransi
│   │   │   ├── diagnose.js       taksonomi kesalahan (docs/03) → kode + petunjuk
│   │   │   ├── number-format.js  parsing "80,5"/"80.5", format Indonesia
│   │   │   ├── fading.js         langkah mana yang diisi aplikasi/siswa
│   │   │   └── adaptive.js       aturan sederhana sembunyikan/tampilkan bantuan
│   │   ├── data/
│   │   │   ├── content-loader.js memuat JSON konten
│   │   │   ├── store.js          localStorage + IndexedDB (pembungkus idb sederhana)
│   │   │   └── sync.js           antrian kirim log ke server saat online
│   │   ├── ui/
│   │   │   ├── strings.js        semua teks antarmuka
│   │   │   ├── components/       data-table.js, story-text.js, step-input.js, feedback-card.js, ...
│   │   │   └── views/            home.js, topic-menu.js, lesson.js, practice.js, quiz.js, progress.js, settings.js
│   │   └── install.js            tombol Instal (beforeinstallprompt) + petunjuk iOS
│   ├── content/                  JSON materi & soal (docs/04)
│   └── tests/                    *.test.js untuk node --test
├── backend/
│   ├── requirements.txt          fastapi, uvicorn[standard], sqlmodel, passlib[bcrypt], jinja2
│   └── app/
│       ├── main.py               membuat app, mount frontend statis, router
│       ├── config.py             pengaturan dari variabel lingkungan
│       ├── db.py                 koneksi SQLite & pembuatan tabel
│       ├── models.py             SQLModel: Classroom, Student, Attempt, Progress, EffortRating
│       ├── schemas.py            Pydantic untuk request/response
│       ├── routers/
│       │   ├── sync.py           POST /api/sync
│       │   ├── teacher.py        dasbor guru (/guru) + login sesi
│       │   └── export.py         GET /api/export.csv
│       └── templates/            halaman dasbor guru (Jinja2, HTML sederhana)
├── tools/
│   ├── content_schema.py         model Pydantic konten
│   ├── validate_content.py       validasi semua JSON + hitung kunci otomatis
│   ├── create_classroom.py       CLI membuat kode kelas & kata sandi guru
│   └── analyze_logs.py           ringkasan statistik deskriptif dari CSV (pandas)
└── tests/
    ├── test_content.py
    ├── test_api_sync.py
    ├── test_export.py
    └── e2e/test_student_flow.py  Playwright (Python)
```

---

## 3. Frontend

### 3.1 Router
SPA berbasis hash agar bekerja di hosting statis apa pun dan saat offline:
`#/` beranda · `#/mean` menu · `#/mean/02/3` subbab 2 layar 3 · `#/mean/kuis` · `#/progres` · `#/pengaturan`.

### 3.2 Penyimpanan lokal
| Kunci / store | Isi |
|---|---|
| `localStorage.settings` | ukuran huruf, tema, banner instal ditutup |
| `localStorage.identity` | `{ studentCode, classCode }` (opsional) |
| IndexedDB `progress` | status subbab, layar terakhir, skor kuis terbaik |
| IndexedDB `attempts` | log percobaan (F11) |
| IndexedDB `outbox` | antrian log yang belum terkirim ke server |

### 3.3 Sinkronisasi
- Saat online dan `classCode` terisi, `sync.js` mengirim isi `outbox` per paket (≤100 entri) ke `POST /api/sync`.
- Setiap entri punya `clientId` (UUID) → server mengabaikan duplikat (idempoten).
- Dipicu saat: aplikasi dibuka, event `online`, dan setiap selesai subbab.
- Gagal kirim → tetap di antrian; tidak pernah memblokir siswa.

### 3.4 Service Worker (`sw.js`)
| Jenis permintaan | Strategi |
|---|---|
| App shell (HTML, CSS, JS, ikon) | **Precache** saat instal; *cache-first* |
| Konten JSON | Precache; *stale-while-revalidate* |
| `/api/*` | *Network-only* (tidak di-cache) |
| Navigasi | Kembalikan `index.html` dari cache bila offline |

- Konstanta `CACHE_VERSION` dinaikkan setiap rilis; cache lama dihapus pada event `activate`.
- Daftar precache disimpan di `sw.js` (`PRECACHE_URLS`). Tes otomatis memastikan setiap file di `frontend/` terdaftar.
- Pembaruan: SW baru menunggu; aplikasi menampilkan "Versi baru tersedia — Muat ulang" lalu mengirim `SKIP_WAITING`.

### 3.5 Manifest (`manifest.webmanifest`)
```json
{
  "name": "RataKu — Belajar Rata-rata",
  "short_name": "RataKu",
  "lang": "id",
  "start_url": "./#/",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F8FA",
  "theme_color": "#2F6FB2",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 4. Backend

### 4.1 Model data (SQLite)
| Tabel | Kolom penting |
|---|---|
| `classroom` | id, code (mis. `8B-2026`), name, teacher_password_hash, created_at |
| `student` | id, classroom_id, code (mis. `S01`), first_seen, last_seen |
| `attempt` | id, client_id (unik), student_id, item_id, step, answer, is_correct, error_code, attempt_no, hint_level, duration_ms, created_at |
| `progress` | student_id, subtopic_id, status, best_quiz_score, updated_at |
| `effort_rating` | id, client_id, student_id, subtopic_id, scale (`paas` / `leppink`), item_no, value, created_at |
| `self_explanation` | id, client_id, student_id, item_id, text, created_at |

### 4.2 API
| Metode & jalur | Fungsi | Autentikasi |
|---|---|---|
| `GET /` dan file statis | Menyajikan PWA | – |
| `GET /api/health` | Cek server hidup | – |
| `POST /api/classroom/check` | Validasi kode kelas yang diketik siswa | – |
| `POST /api/sync` | Terima paket log/progres siswa | kode kelas + kode siswa |
| `GET /guru`, `POST /guru/masuk`, `POST /guru/keluar` | Masuk/keluar dasbor guru | kode kelas + kata sandi → cookie sesi |
| `GET /guru/kelas`, `GET /guru/siswa/{kode}` | Ringkasan kelas & detail siswa | sesi guru |
| `GET /guru/ekspor/{jenis}.csv` | Unduh data (siswa, percobaan, progres, kuis, beban-kognitif, penjelasan) | sesi guru (hanya kelasnya sendiri) |

Contoh `POST /api/sync` — satu daftar `events`, setiap event punya `type` dan `clientId` (UUID dari perangkat; server mengabaikan duplikat):
```json
{
  "classCode": "8B-2026",
  "studentCode": "S01",
  "events": [
    { "type": "attempt", "clientId": "b3f…", "createdAt": "2026-11-20T08:15:00+07:00",
      "context": "lesson", "subtopicId": "mean-02", "itemId": "p-mean-02-001", "step": "sum",
      "answer": "40", "isCorrect": false, "errorCode": "E-SUM", "attemptNo": 1,
      "revealed": false, "durationMs": 15400 },
    { "type": "progress", "clientId": "…", "createdAt": "…", "subtopicId": "mean-02", "status": "done" },
    { "type": "effort", "clientId": "…", "createdAt": "…", "scale": "paas", "subtopicId": "mean-02", "itemNo": 1, "value": 4 },
    { "type": "explain", "clientId": "…", "createdAt": "…", "itemId": "p-mean-02-se1", "text": "…" },
    { "type": "quiz", "clientId": "…", "createdAt": "…", "points": 10, "max": 12, "percent": 83, "itemIds": ["q-mean-001"] }
  ]
}
```
Skema lengkap: `backend/app/schemas.py`. Kolom tak dikenal ditolak (mencegah data pribadi ikut terkirim).

### 4.3 Keamanan & privasi
- Kata sandi guru di-hash dengan `hashlib.scrypt` (pustaka standar Python; passlib tidak dipakai karena tidak dirawat lagi). Sesi guru = token acak di tabel `teachersession`, cookie `HttpOnly`, `Secure` (saat HTTPS), `SameSite=Lax`, berlaku 8 jam.
- Validasi semua masukan dengan Pydantic; batasi ukuran paket sync (mis. 256 KB).
- Pembatasan laju: maksimal 5 percobaan masuk per menit per alamat IP (`/guru/masuk`).
- Log belajar hanya dicatat & dikirim bila siswa mengisi kode kelas **dan** kode siswa; kelas dengan `research=True` (dibuat dengan `--research`) menampilkan skala beban kognitif.
- Tidak ada data identitas pribadi; tabel pemetaan kode siswa ↔ nama **disimpan peneliti di luar aplikasi** (mis. berkas terpisah yang dienkripsi).
- Header keamanan: `Content-Security-Policy: default-src 'self'`, `X-Content-Type-Options: nosniff`.
- Variabel rahasia (`SECRET_KEY`, kata sandi admin) lewat variabel lingkungan, tidak disimpan di Git.

---

## 5. Keputusan Arsitektur (ringkas)

| Keputusan | Alternatif yang ditolak | Alasan |
|---|---|---|
| PWA | Aplikasi Android native (Kotlin), Flutter, React Native | Bisa diinstal tanpa toko aplikasi, satu kode untuk web & HP, sesuai syarat bahasa JS/Python |
| JS murni tanpa framework | React/Vue | Tanpa build, ringan, mudah dipahami pengembang pemula; skala aplikasi kecil |
| FastAPI | Django, Flask | Modern, validasi otomatis Pydantic, dokumentasi API otomatis di `/docs` |
| SQLite | PostgreSQL, Firebase | Satu berkas, gratis, cukup untuk penelitian 1–3 kelas; tanpa layanan pihak ketiga |
| Konten JSON | Basis data/CMS | Mudah ditulis & ditinjau, ikut ter-cache untuk offline, tervalidasi skrip Python |
| Diagnosis berbasis aturan | AI/LLM | Dapat dijelaskan, dapat diuji, berjalan offline, tanpa biaya, sesuai taksonomi kesalahan penelitian |
