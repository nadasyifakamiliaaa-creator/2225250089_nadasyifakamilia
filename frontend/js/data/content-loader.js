// Memuat konten JSON (docs/04). Saat offline, Service Worker menyajikan salinan dari cache.

const CONTENT_ROOT = 'content';
const cache = new Map();

function loadJson(path) {
  if (!cache.has(path)) {
    const promise = fetch(`${CONTENT_ROOT}/${path}`).then((response) => {
      if (!response.ok) throw new Error(`Gagal memuat ${path} (${response.status})`);
      return response.json();
    });
    // Jangan simpan kegagalan, agar bisa dicoba lagi.
    promise.catch(() => cache.delete(path));
    cache.set(path, promise);
  }
  return cache.get(path);
}

function topicDir(topicId) {
  return topicId;
}

/** Instrumen beban kognitif (Paas & Leppink), lihat content/questionnaires.json. */
export function loadQuestionnaires() {
  return loadJson('questionnaires.json');
}

export function loadTopic(topicId) {
  return loadJson(`${topicDir(topicId)}/topic.json`);
}

/** @returns {Promise<object>} isi berkas subbab */
export function loadLesson(topic, subtopicId) {
  const subtopic = topic.subtopics.find((entry) => entry.id === subtopicId);
  if (!subtopic?.file) return Promise.reject(new Error(`Subbab ${subtopicId} belum tersedia`));
  return loadJson(`${topicDir(topic.id)}/${subtopic.file}`);
}

/**
 * Soal dari satu berkas saja.
 * @param {'readiness'|'practice'|'quiz'} kind
 * @returns {Promise<object[]>}
 */
export function loadItemFile(topic, kind) {
  const file = topic.items[kind];
  if (!file) return Promise.resolve([]);
  return loadJson(`${topicDir(topic.id)}/${file}`);
}

/** @returns {Promise<Map<string, object>>} semua soal (kesiapan, latihan, kuis) menurut id */
export async function loadItems(topic) {
  const files = [topic.items.readiness, topic.items.practice, topic.items.quiz].filter(Boolean);
  const lists = await Promise.all(files.map((file) => loadJson(`${topicDir(topic.id)}/${file}`)));
  return new Map(lists.flat().map((item) => [item.id, item]));
}
