// Potongan tampilan yang dipakai beberapa view.
import { h } from '../dom.js';
import { STR } from '../strings.js';

export function loadingView() {
  return h('p', { className: 'loading' }, STR.loading);
}

export function errorView(error) {
  console.error(error);
  return h(
    'section',
    { className: 'card' },
    h('p', {}, STR.loadError),
    h(
      'div',
      { className: 'stack' },
      h('button', { type: 'button', className: 'btn btn-primary', onClick: () => location.reload() }, STR.retry),
      h('a', { href: '#/', className: 'btn btn-secondary' }, STR.backHome),
    ),
  );
}
