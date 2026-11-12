// Teks umpan balik diagnostik bertingkat (docs/03 bagian 3–4).
// Disimpan di sini, bukan di ui/strings.js, karena terikat erat dengan taksonomi kesalahan.
// Nada: hangat, "Belum tepat" bukan "Salah!", tanpa tanda seru berlebihan.
import { ERROR_CODES as E } from './diagnose.js';
import { formatNumber } from './number-format.js';

const fmt = (value) => formatNumber(value);

/**
 * Teks petunjuk untuk kode kesalahan.
 * @param {string} code kode dari diagnose()
 * @param {1|2} level 1 = petunjuk umum, 2 = petunjuk lebih spesifik
 * @param {Record<string, any>} [params] parameter dari diagnose()
 */
export function hintFor(code, level, params = {}) {
  const specific = level >= 2;
  switch (code) {
    case E.N:
      return specific
        ? `Ada ${fmt(params.nCorrect)} data. Kamu menghitung ${fmt(params.nStudent)}. Data mana yang terlewat atau terhitung dua kali?`
        : 'Coba hitung lagi banyak datanya. Pakai Tabel Data dan centang satu per satu.';
    case E.SUM:
      return specific
        ? 'Jumlahkan satu per satu sambil melihat jumlah sementara di Tabel Data.'
        : 'Jumlahnya belum tepat. Coba jumlahkan dua-dua.';
    case E.SUM_MISS:
      return specific
        ? `Data ${fmt(params.missing)} belum ikut dijumlahkan.`
        : 'Sepertinya ada satu data yang belum dijumlahkan.';
    case E.DIV_N1:
      return specific
        ? `Jumlah dibagi banyak data, yaitu ${fmt(params.n)}.`
        : 'Kamu membagi dengan bilangan yang salah. Jumlah semua data dibagi dengan apa?';
    case E.DIV:
      return specific
        ? `Hitung lagi ${fmt(params.sum)} : ${fmt(params.n)} dengan pembagian bersusun.`
        : 'Banyak data dan jumlahmu sudah benar. Periksa lagi pembagiannya.';
    case E.FREQ_N:
      return specific
        ? `Jumlahkan semua frekuensi: ${params.frequencies.map(fmt).join(' + ')}.`
        : 'Banyak data bukan banyak baris tabel. Lihat kolom frekuensi.';
    case E.FREQ_SUM:
      return specific
        ? 'Kalikan setiap nilai dengan frekuensinya dulu, lalu jumlahkan semua hasil kalinya.'
        : 'Setiap nilai muncul beberapa kali. Apakah sudah dikali dengan frekuensinya?';
    case E.SELECT:
      if (params.kind === 'extra') {
        return specific
          ? `Pilih hanya angka yang menjadi data. Batalkan pilihan "${params.display}".`
          : `Angka "${params.display}" itu menyatakan ${params.meaning}. Apakah termasuk data yang ditanyakan?`;
      }
      return specific
        ? `Ada ${fmt(params.nCorrect)} data yang dipakai. Kamu baru memilih ${fmt(params.nStudent)}.`
        : 'Masih ada data yang belum kamu pilih. Baca lagi soalnya kalimat demi kalimat.';
    case E.ROUND:
      if (!specific) return 'Hampir tepat. Periksa angka di belakang koma.';
      return params.decimals === null || params.decimals === undefined
        ? 'Lanjutkan pembagiannya sampai angka di belakang koma.'
        : `Tulis hasilnya sampai ${params.decimals} angka di belakang koma.`;
    case E.INTERP:
      return params.feedback ?? 'Belum tepat. Baca lagi soalnya dan pikirkan arti rata-rata.';
    case E.CALC:
      if (!specific) return 'Belum tepat. Hitung lagi pelan-pelan.';
      return params.op === 'divide'
        ? 'Periksa dengan perkalian: hasil bagi × pembagi harus sama dengan bilangan yang dibagi.'
        : 'Jumlahkan dua-dua dulu, lalu tambahkan bilangan berikutnya satu per satu.';
    case E.UNDERSTAND:
      return params.feedback ?? 'Belum tepat. Baca lagi kalimat terakhir soal: apa yang ditanyakan?';
    case E.MISSING:
      return specific
        ? `Jumlah semua data = ${fmt(params.targetMean)} × ${fmt(params.totalCount)} = ${fmt(params.total)}. Jumlah data yang diketahui = ${fmt(params.knownSum)}. Berapa selisihnya?`
        : 'Mulai dari jumlah semua data: rata-rata × banyak data. Lalu kurangi dengan jumlah data yang diketahui.';
    default:
      return specific
        ? 'Belum tepat. Kerjakan langkah demi langkah: hitung banyak data, jumlahkan, lalu bagi.'
        : 'Belum tepat. Yuk lihat lagi langkahnya satu per satu.';
  }
}

/** Umpan balik benar untuk soal nilai yang hilang: ajak siswa memeriksa kembali (GL02). */
export function praiseMissing(item, answer) {
  const knownSum = item.knownData.reduce((total, value) => total + value, 0);
  return `Benar. Periksa: (${fmt(knownSum)} + ${fmt(answer)}) : ${fmt(item.totalCount)} = ${fmt(item.targetMean)}.`;
}

/**
 * Umpan balik untuk jawaban benar: menyebut alasannya, bukan sekadar "Benar".
 * @param {'n'|'sum'|'divide'|'answer'} step
 * @param {{ n?: number, sum?: number, divide?: number, answer?: number }} key dari computeKey()
 * @param {{ decimals?: number|null }} [options]
 */
export function praiseFor(step, key, { decimals = null } = {}) {
  const meanText = formatNumber(key.divide ?? 0, { decimals: decimals ?? 2 });
  switch (step) {
    case 'n':
      return `Benar, banyak datanya ${fmt(key.n)}.`;
    case 'sum':
      return `Benar, jumlah semua datanya ${fmt(key.sum)}.`;
    case 'divide':
      return `Benar. ${fmt(key.sum)} dibagi ${fmt(key.n)} data = ${meanText}.`;
    default:
      return `Benar, jawabannya ${formatNumber(key.answer ?? 0, { decimals: decimals ?? 2 })}.`;
  }
}
