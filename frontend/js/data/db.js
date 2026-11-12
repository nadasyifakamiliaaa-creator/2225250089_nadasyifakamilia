// Pembungkus IndexedDB sederhana (docs/06 bagian 3.2).
// Jika IndexedDB tidak tersedia (mode penyamaran tertentu, browser lama), data disimpan di memori
// selama aplikasi terbuka — aplikasi tetap berjalan, hanya progres tidak tersimpan permanen.

const DB_NAME = 'rataku';
const DB_VERSION = 1;
const STORES = {
  progress: { keyPath: 'subtopicId' },
  attempts: { keyPath: 'clientId' }, // dipakai Sprint 6 (log belajar)
  outbox: { keyPath: 'clientId' }, // dipakai Sprint 6 (antrian sinkronisasi)
};

let dbPromise = null;
const memory = new Map(Object.keys(STORES).map((name) => [name, new Map()]));

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) {
        reject(new Error('IndexedDB tidak tersedia'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [name, options] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB terblokir'));
    }).catch((error) => {
      console.warn('Memakai penyimpanan sementara:', error);
      return null;
    });
  }
  return dbPromise;
}

function run(storeName, mode, action) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = action(transaction.objectStore(storeName));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
  );
}

async function withFallback(storeName, idbAction, memoryAction) {
  const db = await openDb();
  if (!db) return memoryAction(memory.get(storeName));
  try {
    return await idbAction();
  } catch (error) {
    console.warn('Gagal mengakses IndexedDB:', error);
    return memoryAction(memory.get(storeName));
  }
}

export function getRecord(storeName, key) {
  return withFallback(
    storeName,
    () => run(storeName, 'readonly', (store) => store.get(key)),
    (map) => map.get(key),
  );
}

export function getAllRecords(storeName) {
  return withFallback(
    storeName,
    () => run(storeName, 'readonly', (store) => store.getAll()),
    (map) => [...map.values()],
  );
}

export function deleteRecords(storeName, keys) {
  return withFallback(
    storeName,
    () =>
      run(storeName, 'readwrite', (store) => {
        let last = null;
        for (const key of keys) last = store.delete(key);
        return last ?? store.count();
      }),
    (map) => keys.forEach((key) => map.delete(key)),
  );
}

export function clearStore(storeName) {
  return withFallback(
    storeName,
    () => run(storeName, 'readwrite', (store) => store.clear()),
    (map) => map.clear(),
  );
}

export function putRecord(storeName, value) {
  const { keyPath } = STORES[storeName];
  return withFallback(
    storeName,
    () => run(storeName, 'readwrite', (store) => store.put(value)),
    (map) => map.set(value[keyPath], value),
  );
}
