// Penyimpanan ringan di localStorage. Progres & log (IndexedDB) ditambahkan pada Sprint 2 & 6.
// Semua akses dibungkus try/catch: penyimpanan bisa diblokir (mode penyamaran, memori penuh).

const KEYS = Object.freeze({
  identity: 'rataku.identity',
  settings: 'rataku.settings',
  research: 'rataku.research',
});

/** Instrumen penelitian yang sudah diisi di perangkat ini (agar tidak ditanyakan dua kali). */
export function getResearchState() {
  return { paas: {}, leppinkDone: false, ...read(KEYS.research, {}) };
}

export function saveResearchState(patch) {
  return write(KEYS.research, { ...getResearchState(), ...patch });
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Identitas anonim siswa: kode kelas & kode siswa dari guru (tanpa nama).
 * `research` diisi dari server: true bila kelas dalam mode penelitian.
 * @returns {{ classCode: string, studentCode: string, research: boolean|null }}
 */
export function getIdentity() {
  return { classCode: '', studentCode: '', research: null, ...read(KEYS.identity, {}) };
}

/** @param {Partial<ReturnType<typeof getIdentity>>} patch */
export function saveIdentity(patch) {
  return write(KEYS.identity, { ...getIdentity(), ...patch });
}

/** @returns {{ theme: 'system'|'light'|'dark', fontSize: 'normal'|'large'|'xlarge' }} */
export function getSettings() {
  return { theme: 'system', fontSize: 'normal', ...read(KEYS.settings, {}) };
}

/** Simpan pengaturan dan langsung terapkan ke halaman (lihat js/theme-init.js). */
export function saveSettings(patch) {
  const settings = { ...getSettings(), ...patch };
  applySettings(settings);
  return write(KEYS.settings, settings);
}

export function applySettings({ theme, fontSize }) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  if (fontSize === 'large' || fontSize === 'xlarge') root.setAttribute('data-font-size', fontSize);
  else root.removeAttribute('data-font-size');
}
