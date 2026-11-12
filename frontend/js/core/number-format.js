// Membaca dan menampilkan angka dengan format Indonesia (fungsi murni).
//
// Aturan membaca jawaban siswa:
//   "80,5" dan "80.5"      → 80,5   (koma maupun titik diterima sebagai desimal)
//   "12.000" dan "1.250"   → 12000 dan 1250 (titik + tepat 3 angka = pemisah ribuan)
//   "1.250,5"              → 1250,5
//   "12 000"               → 12000  (spasi diabaikan)
//   teks lain              → null   (tidak dapat dibaca)

const THOUSANDS_GROUPED = /^-?\d{1,3}(\.\d{3})+$/;
const PLAIN_NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;

/**
 * @param {unknown} input
 * @returns {number|null} angka, atau null jika kosong/tidak dapat dibaca
 */
export function parseNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;

  let text = input.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (text === '') return null;

  if (text.includes(',')) {
    const parts = text.split(',');
    if (parts.length > 2) return null;
    const [whole, fraction] = parts;
    if (whole.includes('.') && !THOUSANDS_GROUPED.test(whole)) return null;
    text = `${whole.replace(/\./g, '')}.${fraction}`;
  } else if (THOUSANDS_GROUPED.test(text)) {
    text = text.replace(/\./g, '');
  }

  if (!PLAIN_NUMBER.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const formatters = new Map();

/**
 * Tampilkan angka gaya Indonesia: 80.5 → "80,5", 12000 → "12.000".
 * @param {number} value
 * @param {{ decimals?: number }} [options] maksimum angka di belakang koma (bawaan 2)
 */
export function formatNumber(value, { decimals = 2 } = {}) {
  if (!formatters.has(decimals)) {
    formatters.set(
      decimals,
      new Intl.NumberFormat('id-ID', { maximumFractionDigits: decimals, minimumFractionDigits: 0 }),
    );
  }
  return formatters.get(decimals).format(value);
}
