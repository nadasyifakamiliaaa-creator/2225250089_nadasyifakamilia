// Komponen visual kecil: pecahan rumus dan "bagi sama rata".
import { mean } from '../../core/mean.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';

/** Pecahan bertumpuk: pembilang di atas garis, penyebut di bawah. */
export function fraction(numerator, denominator) {
  return h(
    'span',
    { className: 'fraction', role: 'img', 'aria-label': `${numerator} dibagi ${denominator}` },
    h('span', { className: 'fraction-top', 'aria-hidden': 'true' }, numerator),
    h('span', { className: 'fraction-bottom', 'aria-hidden': 'true' }, denominator),
  );
}

/**
 * Visual bagi sama rata (subbab 1): setiap anak punya tumpukan benda; tombol menyamaratakan.
 * @param {{ data: number[], names: string[], unit: string, text: string }} screen
 */
export function equalShare({ data, names, unit, text }) {
  const share = mean(data);
  let leveled = false;

  const rows = names.map((name) => {
    const dots = h('span', { className: 'dots', 'aria-hidden': 'true' });
    const label = h('span', { className: 'share-count' });
    return { el: h('li', { className: 'share-row' }, h('span', { className: 'share-name' }, name), dots, label), dots, label };
  });

  const explanation = h('p', { className: 'share-text', 'aria-live': 'polite' });
  const button = h('button', { type: 'button', className: 'btn btn-secondary btn-block' });

  function render() {
    rows.forEach(({ dots, label }, index) => {
      const count = leveled ? share : data[index];
      dots.replaceChildren(...Array.from({ length: count }, () => h('span', { className: 'dot' })));
      label.textContent = `${count} ${unit}`;
    });
    explanation.textContent = leveled ? text : STR.equalShare.before;
    button.textContent = leveled ? STR.equalShare.reset : STR.equalShare.level;
  }

  button.addEventListener('click', () => {
    leveled = !leveled;
    render();
  });
  render();

  return h('div', { className: 'equal-share' }, explanation, h('ul', { className: 'share-list' }, rows.map((row) => row.el)), button);
}
