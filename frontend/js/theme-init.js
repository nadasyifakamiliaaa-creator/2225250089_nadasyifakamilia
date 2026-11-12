// Terapkan tema & ukuran huruf SEBELUM halaman digambar, agar tidak ada kedipan tampilan.
// Sengaja skrip biasa (bukan module) dan dimuat di <head>. Pengaturan diubah di #/pengaturan.
(function applySavedSettings() {
  try {
    var settings = JSON.parse(localStorage.getItem('rataku.settings') || '{}');
    var root = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') root.setAttribute('data-theme', settings.theme);
    if (settings.fontSize === 'large' || settings.fontSize === 'xlarge') {
      root.setAttribute('data-font-size', settings.fontSize);
    }
  } catch (error) {
    // Penyimpanan diblokir: pakai tampilan bawaan.
  }
})();
