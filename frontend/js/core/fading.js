// Fading: langkah mana yang dikerjakan aplikasi dan mana yang dikerjakan siswa,
// serta seberapa banyak bantuan Tabel Data yang ditampilkan (docs/03 bagian 2). Fungsi murni.

/**
 * Pisahkan langkah soal menjadi yang sudah diberikan dan yang dikerjakan siswa.
 * @param {{ steps?: string[] }} item
 * @param {string[]} givenSteps
 */
export function splitSteps(item, givenSteps = []) {
  const steps = item.steps ?? [];
  return {
    given: steps.filter((step) => givenSteps.includes(step)),
    student: steps.filter((step) => !givenSteps.includes(step)),
  };
}

/**
 * Pengaturan bantuan Tabel Data.
 * @param {{ screenType: string, givenSteps?: string[], counterHidden?: boolean }} options
 * @returns {{ prechecked: boolean, showTotalCount: boolean, helpHidden: boolean }}
 *   prechecked     semua baris sudah dicentang (daftar data diberikan aplikasi)
 *   showTotalCount tampilkan "k dari n" — hanya pada contoh, karena n adalah jawaban siswa
 *   helpHidden     penghitung disembunyikan (bisa dibuka dengan tombol Bantuan)
 */
export function tableSupport({ screenType, givenSteps = [], counterHidden = false }) {
  if (screenType === 'worked_example') {
    return { prechecked: true, showTotalCount: true, helpHidden: false };
  }
  return {
    prechecked: givenSteps.includes('list'),
    showTotalCount: false,
    // Contoh-sebagian selalu dengan bantuan penuh; penghitung hanya disembunyikan pada latihan mandiri.
    helpHidden: screenType === 'practice_item' && counterHidden,
  };
}
