// Penyusunan urutan layar subbab (fungsi murni).

/**
 * Ubah layar `practice` (berisi beberapa soal) menjadi satu layar per soal,
 * agar setiap layar memuat satu hal saja (segmenting).
 * @returns {Array<object>} layar; layar soal latihan bertipe `practice_item`
 */
export function expandScreens(lesson) {
  const screens = [];
  for (const screen of lesson.screens) {
    if (screen.type === 'practice') {
      screen.itemRefs.forEach((itemRef, i) => {
        screens.push({ type: 'practice_item', itemRef, index: i + 1, total: screen.itemRefs.length });
      });
    } else {
      screens.push(screen);
    }
  }
  return screens;
}

/**
 * Soal kembar dari sebuah soal (untuk dicoba setelah melihat pembahasan).
 * @param {Iterable<object>} items
 * @param {string} itemId
 */
export function findTwin(items, itemId) {
  for (const item of items) {
    if (item.twinOf === itemId) return item;
  }
  return null;
}

/** Nomor layar (1-based) contoh-dikerjakan pertama, untuk tombol "Lihat contoh lagi". */
export function workedExampleScreen(screens) {
  const index = screens.findIndex((screen) => screen.type === 'worked_example');
  return index >= 0 ? index + 1 : null;
}

/** Layar yang berisi soal untuk dikerjakan siswa. */
export function isItemScreen(screen) {
  return screen.type === 'faded_example' || screen.type === 'practice_item';
}

/** "mean-02" → "02" (dipakai di alamat #/mean/02/3). */
export function subtopicSlug(subtopicId) {
  return subtopicId.split('-').pop();
}

/** Batasi nomor layar ke rentang 1..total; nilai tidak valid → 1. */
export function clampScreen(value, total) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return 1;
  return Math.min(number, total);
}

/** Subbab berikutnya yang sudah tersedia (punya file), atau null. */
export function nextSubtopic(topic, currentId) {
  const index = topic.subtopics.findIndex((subtopic) => subtopic.id === currentId);
  if (index < 0) return null;
  return topic.subtopics.slice(index + 1).find((subtopic) => subtopic.file) ?? null;
}

/**
 * Subbab yang disarankan untuk dikerjakan: yang pertama belum selesai.
 * @param {Record<string, { status: string }>} progressById
 */
export function recommendedSubtopic(topic, progressById) {
  return (
    topic.subtopics.find(
      (subtopic) => subtopic.file && progressById[subtopic.id]?.status !== 'done',
    ) ?? null
  );
}
