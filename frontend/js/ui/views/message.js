// Tampilan pesan sederhana (judul + isi + tombol kembali). Dipakai untuk "segera hadir" & 404.
import { h } from '../dom.js';

/** @param {{ title: string, body: string, back: string }} text */
export function messageView(text) {
  return {
    render(root) {
      root.append(
        h(
          'section',
          { className: 'card' },
          h('h1', {}, text.title),
          h('p', {}, text.body),
          h('a', { href: '#/', className: 'btn btn-primary' }, text.back),
        ),
      );
    },
  };
}
