// Perhitungan rata-rata (fungsi murni, tanpa DOM).

const PRECISION = 1e10;

/** Hilangkan galat pembulatan biner, mis. 0.1 + 0.2 = 0.30000000000000004 → 0.3. */
function clean(value) {
  return Math.round(value * PRECISION) / PRECISION;
}

/** Bulatkan ke `decimals` angka di belakang koma (0,5 dibulatkan ke atas). */
export function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(clean(value * factor)) / factor;
}

/** Potong (bukan bulatkan) ke `decimals` angka di belakang koma. */
export function truncateTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.trunc(clean(value * factor)) / factor;
}

/** Banyak data (n). */
export function count(data) {
  return data.length;
}

/** Jumlah semua data. */
export function sum(data) {
  return clean(data.reduce((total, value) => total + value, 0));
}

/** Rata-rata = jumlah semua data : banyak data. */
export function mean(data) {
  if (data.length === 0) throw new RangeError('Data kosong: rata-rata tidak dapat dihitung.');
  return clean(sum(data) / data.length);
}

/** Jumlah sementara setelah setiap data, untuk Tabel Data. [70, 80, 75] → [70, 150, 225] */
export function runningTotals(data) {
  const totals = [];
  let total = 0;
  for (const value of data) {
    total = clean(total + value);
    totals.push(total);
  }
  return totals;
}

// ---- Tabel frekuensi: [{ x: nilai, f: frekuensi }, ...] ----

/** Banyak data pada tabel frekuensi = jumlah semua frekuensi. */
export function frequencyCount(table) {
  return table.reduce((total, row) => total + row.f, 0);
}

/** Hasil kali nilai × frekuensi tiap baris. */
export function frequencyProducts(table) {
  return table.map((row) => clean(row.x * row.f));
}

/** Jumlah semua data pada tabel frekuensi = Σ(nilai × frekuensi). */
export function frequencySum(table) {
  return sum(frequencyProducts(table));
}

/** Rata-rata data pada tabel frekuensi. */
export function frequencyMean(table) {
  const n = frequencyCount(table);
  if (n === 0) throw new RangeError('Tabel kosong: rata-rata tidak dapat dihitung.');
  return clean(frequencySum(table) / n);
}

/**
 * Nilai yang hilang agar rata-rata `totalCount` data sama dengan `targetMean`.
 * Contoh: data 70, 80, 75, 85 dan rata-rata 5 data = 80 → 80 × 5 − 310 = 90.
 */
export function missingValue(knownData, targetMean, totalCount) {
  return clean(targetMean * totalCount - sum(knownData));
}
