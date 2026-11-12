// Pengaturan aplikasi. Samakan `version` dengan CACHE_VERSION di sw.js setiap rilis.
export const CONFIG = Object.freeze({
  appName: 'RataKu',
  version: '0.7.0',
  // Aktifkan saat uji coba penelitian (F11): log belajar & skala beban kognitif.
  researchMode: false,
  // Kosong = server yang sama. Isi URL backend jika frontend di-hosting terpisah (docs/09 opsi C).
  apiBase: '',
});
