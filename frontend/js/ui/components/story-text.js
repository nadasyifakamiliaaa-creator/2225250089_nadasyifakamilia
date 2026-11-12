// Teks soal cerita dengan angka yang dapat diketuk (F06, tahap Pilah).
// Sebelum tahap Pilah, angka tampil sebagai teks biasa; setelah itu menjadi tombol yang bisa dipilih.
import { h } from '../dom.js';
import { STR } from '../strings.js';

const PLACEHOLDER = /\[\[([\w-]+)\]\]/g;

/**
 * @param {{ prompt: string, selectables: Record<string, { display: string }> }} item
 */
export function storyText(item) {
  const selected = new Set();
  const listeners = new Set();
  const tokens = new Map();

  const parts = [];
  let last = 0;
  for (const match of item.prompt.matchAll(PLACEHOLDER)) {
    parts.push(item.prompt.slice(last, match.index));
    const key = match[1];
    const { display } = item.selectables[key];
    const token = h('button', { type: 'button', className: 'token', 'aria-pressed': 'false' }, display);
    token.disabled = true;
    token.addEventListener('click', () => {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      render();
      listeners.forEach((listener) => listener());
    });
    tokens.set(key, token);
    parts.push(token);
    last = match.index + match[0].length;
  }
  parts.push(item.prompt.slice(last));

  function render() {
    for (const [key, token] of tokens) {
      const isSelected = selected.has(key);
      token.classList.toggle('is-selected', isSelected);
      token.setAttribute('aria-pressed', String(isSelected));
      token.setAttribute(
        'aria-label',
        isSelected ? STR.story.tokenSelected(token.textContent) : STR.story.tokenLabel(token.textContent),
      );
    }
  }
  render();

  const el = h('p', { className: 'story-text' }, parts);

  return {
    el,
    /** Kunci angka terpilih, sesuai urutan di teks soal. */
    selected: () => [...tokens.keys()].filter((key) => selected.has(key)),
    onChange: (listener) => listeners.add(listener),
    enable() {
      el.classList.add('is-selectable');
      tokens.forEach((token) => {
        token.disabled = false;
      });
    },
    disable() {
      el.classList.remove('is-selectable');
      tokens.forEach((token) => {
        token.disabled = true;
      });
    },
    setSelected(keys) {
      selected.clear();
      keys.forEach((key) => selected.add(key));
      render();
      listeners.forEach((listener) => listener());
    },
    /** Tandai angka tertentu (mis. data yang benar, atau pengecoh yang perlu dibatalkan). */
    mark(keys, className) {
      tokens.forEach((token, key) => token.classList.toggle(className, keys.includes(key)));
    },
  };
}
