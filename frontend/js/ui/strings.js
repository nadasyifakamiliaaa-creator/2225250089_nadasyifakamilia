// Semua teks antarmuka dikumpulkan di sini (CLAUDE.md bagian 5).
// Teks umpan balik diagnostik ada di js/core/hints.js.
export const STR = Object.freeze({
  appName: 'RataKu',
  tagline: 'Belajar rata-rata pelan-pelan, langkah demi langkah.',
  loading: 'Memuat…',
  loadError: 'Materi gagal dimuat. Periksa internet, lalu coba lagi.',
  retry: 'Coba lagi',
  backHome: 'Kembali ke Beranda',

  home: {
    whatYouLearn: 'Yang akan kamu pelajari',
    features: [
      'Apa arti rata-rata',
      'Menghitung rata-rata dengan Tabel Data',
      'Memahami soal cerita',
      'Latihan dengan pembahasan langkah demi langkah',
    ],
    classCodeLabel: 'Kode dari guru',
    classCodeHint: 'Boleh dikosongkan. Isi jika gurumu memberikan kode kelas.',
    studentCodeLabel: 'Kode siswa',
    studentCodeHint: 'Kode dari guru, misalnya S01. Jangan isi dengan nama.',
    classCodeInvalid: 'Kode kelas hanya berisi huruf, angka, dan tanda hubung.',
    classCodeUnknown: 'Kode kelas tidak ditemukan. Periksa lagi kode dari gurumu, atau kosongkan untuk belajar sendiri.',
    studentCodeRequired: 'Isi juga kode siswa dari gurumu (huruf dan angka, tanpa spasi).',
    start: 'Mulai Belajar',
    offlineNote: 'Setelah dibuka sekali, aplikasi ini bisa dipakai tanpa internet.',
  },

  install: {
    button: 'Instal Aplikasi',
    iosHint: 'Untuk memasang di iPhone: ketuk ikon Bagikan, lalu pilih "Tambahkan ke Layar Utama".',
  },

  update: {
    message: 'Versi baru tersedia.',
    reload: 'Muat ulang',
  },

  menu: {
    intro: 'Pilih bagian yang ingin kamu pelajari. Sebaiknya kerjakan berurutan.',
    sectionLabel: (number) => `Bagian ${number}`,
    status: {
      not_started: 'Belum dimulai',
      started: (last, total) => `Sedang dipelajari (layar ${last} dari ${total})`,
      done: 'Selesai',
      soon: 'Segera hadir',
    },
    action: {
      not_started: 'Mulai',
      started: 'Lanjutkan',
      done: 'Ulangi',
    },
    recommended: 'Disarankan',
  },

  lesson: {
    position: (current, total) => `${current} dari ${total}`,
    backToMenu: 'Kembali ke daftar materi',
    prev: 'Kembali',
    next: 'Lanjut',
    finish: 'Selesai',
    lockedNext: 'Selesaikan soal ini dulu, atau buka pembahasannya.',
    labels: {
      context: 'Ayo pikirkan',
      concept: 'Konsep',
      equal_share: 'Bagi sama rata',
      worked_example: 'Contoh',
      faded_example: 'Contoh — lengkapi langkahnya',
      practice_item: (index, total) => `Latihan ${index} dari ${total}`,
    },
    formulaLead: 'Rata-rata =',
    nextStep: 'Tampilkan langkah berikutnya',
    stepNumber: (number) => `Langkah ${number}`,
    done: {
      title: 'Bagian ini selesai',
      body: (title) => `Kamu sudah menyelesaikan "${title}". Kamu boleh membukanya lagi kapan saja.`,
      next: (title) => `Lanjut: ${title}`,
      menu: 'Kembali ke daftar materi',
    },
  },

  equalShare: {
    before: 'Jumlah benda setiap anak berbeda. Ketuk tombol untuk membaginya sama rata.',
    level: 'Bagi sama rata',
    reset: 'Kembalikan seperti semula',
  },

  dataTable: {
    number: 'No',
    data: (unit) => (unit ? `Data (${unit})` : 'Data'),
    check: 'Sudah dihitung',
    checkLabel: (number, value) => `Centang data ke-${number}: ${value}`,
    counted: (k) => `Sudah dicentang: ${k} data`,
    countedOf: (k, n) => `Sudah dicentang: ${k} dari ${n} data`,
    runningTotal: (total) => `Jumlah sementara: ${total}`,
    tip: 'Ketuk setiap baris sambil menghitung, supaya tidak ada data yang terlewat.',
    showHelp: 'Bantuan: tampilkan penghitung',
  },

  frequencyTable: {
    defaultValue: 'Nilai',
    defaultFrequency: 'Frekuensi',
    value: (label, unit) => (unit ? `${label} (x, ${unit})` : `${label} (x)`),
    frequency: (label) => `${label} (f)`,
    product: 'x × f',
    showProducts: 'Bantuan: tampilkan kolom x × f',
  },

  adaptive: {
    fluent:
      'Hebat, tiga soal berturut-turut benar pada percobaan pertama. Penghitung Tabel Data sekarang disembunyikan; ketuk "Bantuan" bila perlu. Kamu boleh lanjut ke bagian berikutnya atau tetap berlatih.',
    skipAhead: 'Lanjut ke bagian berikutnya',
    review: 'Dua soal terakhir perlu pembahasan. Tidak apa-apa. Mau melihat contohnya lagi?',
    reviewExample: 'Lihat contoh lagi',
  },

  twin: {
    offer: 'Sekarang coba soal yang mirip, supaya kamu makin paham.',
    button: 'Coba soal serupa',
    label: 'Soal serupa',
  },

  steps: {
    n: 'Banyak data (n)',
    sum: 'Jumlah semua data',
    divide: 'Rata-rata',
    nUnit: 'data',
    divideNote: (sum, n) => `Rata-rata = jumlah : banyak data = ${sum} : ${n}`,
    answer: 'Jawabanmu',
    missing: 'Nilai yang dicari',
    knownData: 'Data yang diketahui',
  },

  story: {
    stagesLabel: 'Tahap mengerjakan soal cerita',
    stages: {
      understand: 'Pahami',
      select: 'Pilah',
      compute: 'Hitung',
      interpret: 'Maknai',
    },
    selectInstruction: 'Ketuk angka di soal yang menjadi data untuk menghitung rata-rata. Ketuk sekali lagi untuk membatalkan.',
    chosen: (list) => `Data terpilih: ${list}`,
    none: 'belum ada',
    selectFirst: 'Ketuk dulu angka di soal yang menjadi data.',
    selectCorrect: (list) => `Benar. Data yang dipakai: ${list}.`,
    tokenLabel: (text) => `Pilih ${text}`,
    tokenSelected: (text) => `${text}, terpilih. Ketuk untuk membatalkan`,
  },

  explain: {
    label: 'Tulis penjelasanmu',
    note: 'Jelaskan dengan kata-katamu sendiri, seolah-olah kepada teman. Tidak ada jawaban salah.',
    save: 'Simpan jawaban',
    tooShort: 'Tulis sedikit lebih panjang, minimal satu kalimat.',
    thanks: 'Terima kasih. Menjelaskan dengan kata-katamu sendiri membantu kamu lebih ingat.',
  },

  solver: {
    check: 'Periksa',
    tryAgain: 'Coba lagi',
    showSolution: 'Lihat pembahasan',
    empty: 'Isi dulu jawabanmu.',
    invalid: 'Tulis jawaban dengan angka, misalnya 80 atau 80,5.',
    chooseFirst: 'Pilih dulu salah satu jawaban.',
    locked: 'Selesaikan langkah sebelumnya dulu.',
    given: 'Sudah dikerjakan',
    solutionLabel: 'Pembahasan',
    correctAnswer: 'Jawaban yang tepat:',
    completed: 'Soal selesai. Tekan Lanjut untuk meneruskan.',
    // Judul kartu umpan balik. Kartu "benar" tanpa judul: teksnya sudah diawali "Benar"
    // (prinsip redundancy — jangan menyampaikan hal yang sama dua kali).
    feedback: {
      success: null,
      hint: 'Petunjuk',
      info: 'Perhatikan',
      solution: 'Pembahasan',
    },
  },

  nav: {
    progress: 'Progres saya',
    settings: 'Pengaturan',
    menu: 'Daftar materi',
  },

  menuExtras: {
    readinessTitle: 'Cek Kesiapan',
    readinessBody: 'Opsional. 5 soal singkat penjumlahan dan pembagian sebelum mulai.',
    readinessAction: 'Cek kesiapan',
    quizTitle: 'Kuis Akhir',
    quizBody: '10 soal acak dari semua bagian. Tanpa batas waktu.',
    quizAction: 'Mulai kuis',
    quizBest: (percent) => `Skor terbaik: ${percent}`,
  },

  readiness: {
    title: 'Cek Kesiapan',
    intro: 'Kerjakan 5 soal singkat ini. Hasilnya hanya untuk membantumu, bukan nilai.',
    result: (correct, total) => `Kamu menjawab benar ${correct} dari ${total} soal pada percobaan pertama.`,
    ready: 'Kemampuan berhitungmu sudah siap. Ayo mulai belajar rata-rata.',
    review: 'Tidak apa-apa. Baca dulu kartu "Ingat lagi" di bawah, lalu mulai belajar.',
    tipsTitle: 'Ingat lagi',
    tips: [
      'Penjumlahan banyak bilangan: jumlahkan dua-dua, lalu tambahkan bilangan berikutnya. Contoh: 70 + 80 = 150, 150 + 75 = 225, dan seterusnya.',
      'Penjumlahan bersusun: tulis bilangan rata kanan (satuan di bawah satuan), lalu jumlahkan dari kanan.',
      'Pembagian: 400 : 5 artinya 400 dibagi menjadi 5 bagian sama besar. Periksa dengan perkalian: 80 × 5 = 400.',
    ],
    start: 'Mulai belajar',
  },

  quiz: {
    title: 'Kuis Akhir',
    intro: [
      'Ada 10 soal dari semua bagian materi, dari yang mudah ke yang sulit.',
      'Tidak ada batas waktu. Kamu boleh kembali ke soal sebelumnya.',
      'Selama kuis tidak ada petunjuk. Skor dan pembahasan muncul setelah kamu mengumpulkan jawaban.',
    ],
    start: 'Mulai kuis',
    resume: 'Lanjutkan kuis',
    position: (current, total) => `Soal ${current} dari ${total}`,
    prev: 'Sebelumnya',
    next: 'Berikutnya',
    review: 'Periksa jawaban',
    answerLabel: 'Rata-rata',
    answerMissing: 'Nilai yang dicari',
    answerGeneric: 'Jawabanmu',
    answerHint: 'Tulis angkanya saja, misalnya 80 atau 80,5.',
    summaryTitle: 'Periksa lagi sebelum mengumpulkan',
    summaryBody: (answered, total) => `Kamu sudah menjawab ${answered} dari ${total} soal.`,
    unanswered: 'belum dijawab',
    answered: 'sudah dijawab',
    open: (number) => `Buka soal ${number}`,
    submit: 'Kumpulkan jawaban',
    confirmUnanswered: (count) =>
      `Masih ada ${count} soal yang belum dijawab. Soal kosong mendapat 0 poin. Yakin mengumpulkan?`,
    confirmYes: 'Ya, kumpulkan',
    confirmNo: 'Kembali menjawab',
    resultTitle: 'Hasil kuis',
    score: (points, max, percent) => `Skormu ${points} dari ${max} poin (${percent}).`,
    resultMessage: {
      high: 'Hebat. Kamu sudah memahami rata-rata dengan baik.',
      mid: 'Bagus. Pelajari lagi pembahasan soal yang belum tepat di bawah ini.',
      low: 'Tidak apa-apa. Baca pembahasan di bawah, lalu pelajari lagi bagian yang disarankan.',
    },
    reviewTitle: 'Pembahasan',
    yourAnswer: 'Jawabanmu:',
    noAnswer: '(kosong)',
    correctAnswer: 'Jawaban tepat:',
    likelyError: 'Kemungkinan kesalahan:',
    stepsTitle: 'Langkah penyelesaian:',
    retry: 'Ulangi kuis (soal baru)',
    toProgress: 'Lihat progres',
    correct: 'Benar',
    incorrect: 'Belum tepat',
    interpretLabel: 'Makna hasil',
  },

  progress: {
    title: 'Progres Saya',
    intro: 'Progres disimpan di perangkat ini.',
    sections: 'Bagian materi',
    doneCount: (done, total) => `${done} dari ${total} bagian selesai`,
    quiz: 'Kuis akhir',
    quizNone: 'Belum pernah mengerjakan kuis.',
    quizStats: (attempts, best, last) =>
      `Dikerjakan ${attempts} kali. Skor terbaik ${best}, skor terakhir ${last}.`,
    errors: 'Kesalahan yang paling sering',
    errorsNone: 'Belum ada catatan kesalahan. Terus berlatih.',
    errorCount: (count) => `${count} kali`,
    learnAgain: (title) => `Pelajari lagi: ${title}`,
  },

  errorNames: {
    'E-N': 'Salah menghitung banyak data',
    'E-SUM': 'Salah menjumlahkan data',
    'E-SUM-MISS': 'Ada data yang terlewat saat dijumlahkan',
    'E-DIV-N1': 'Membagi dengan bilangan yang salah',
    'E-DIV': 'Salah saat membagi',
    'E-ROUND': 'Salah membulatkan',
    'E-FREQ-N': 'Banyak data pada tabel frekuensi',
    'E-FREQ-SUM': 'Lupa mengalikan nilai dengan frekuensi',
    'E-SELECT': 'Memilih angka yang bukan data pada soal cerita',
    'E-UNDERSTAND': 'Salah memahami yang ditanyakan',
    'E-INTERP': 'Salah memaknai hasil rata-rata',
    'E-MISSING': 'Mencari nilai yang hilang',
  },

  settings: {
    title: 'Pengaturan',
    fontSize: 'Ukuran huruf',
    fontSizes: { normal: 'Biasa', large: 'Besar', xlarge: 'Sangat besar' },
    preview: 'Contoh: rata-rata nilai 70, 80, dan 90 adalah 80.',
    theme: 'Tema warna',
    themes: { system: 'Ikuti perangkat', light: 'Terang', dark: 'Gelap' },
    install: 'Pasang aplikasi',
    installAndroid: [
      'Buka aplikasi ini di Chrome.',
      'Ketuk tombol "Instal Aplikasi", atau menu ⋮ lalu "Instal aplikasi" / "Tambahkan ke layar utama".',
      'Ketuk "Instal". Ikon RataKu muncul di layar utama.',
    ],
    installIos: [
      'Buka aplikasi ini di Safari.',
      'Ketuk ikon Bagikan (kotak dengan panah ke atas).',
      'Pilih "Tambahkan ke Layar Utama", lalu "Tambah".',
    ],
    installAndroidTitle: 'Android (Chrome)',
    installIosTitle: 'iPhone / iPad (Safari)',
    installed: 'Aplikasi sudah terpasang di perangkat ini.',
    reset: 'Hapus progres',
    resetBody: 'Menghapus semua progres dan skor kuis di perangkat ini. Berguna jika perangkat dipakai bergantian.',
    resetButton: 'Hapus progres',
    resetConfirm: 'Yakin? Progres yang dihapus tidak bisa dikembalikan.',
    resetYes: 'Ya, hapus',
    resetNo: 'Batal',
    resetDone: 'Progres sudah dihapus.',
    about: (version) => `RataKu versi ${version}`,
  },

  questionnaire: {
    title: 'Kuesioner Belajar',
    submit: 'Kirim jawaban',
    incomplete: (numbers) => `Masih ada pernyataan yang belum dijawab: nomor ${numbers.join(', ')}.`,
    thanks: 'Terima kasih. Jawabanmu sangat membantu penelitian ini.',
    notResearch: 'Kuesioner ini hanya untuk kelas yang mengikuti penelitian.',
    alreadyDone: 'Kamu sudah mengisi kuesioner ini. Terima kasih.',
    invite: 'Satu langkah lagi: isi kuesioner singkat (10 pernyataan) tentang pengalaman belajarmu.',
    inviteButton: 'Isi kuesioner',
  },

  effort: {
    title: 'Sebelum lanjut',
    save: 'Simpan',
    choose: 'Pilih salah satu angka dulu.',
    thanks: 'Terima kasih sudah menjawab.',
  },

  research: {
    connected: (classCode, studentCode) => `Terhubung ke kelas ${classCode} sebagai ${studentCode}.`,
    pending: (count) =>
      count ? `${count} catatan belajar menunggu dikirim (otomatis saat online).` : 'Semua catatan belajar sudah terkirim.',
  },

  notFound: {
    title: 'Halaman tidak ditemukan',
    body: 'Sepertinya alamat ini salah.',
    back: 'Kembali ke Beranda',
  },

  footer: (version) => `Versi ${version}`,
});
