// Tabel Data (F04) dan Tabel Frekuensi.
import { frequencyProducts, sum } from '../../core/mean.js';
import { formatNumber } from '../../core/number-format.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';

let tableCount = 0;

/** Tombol "Bantuan" yang membuka bagian tersembunyi (fading — bantuan bisa dibuka lagi). */
function helpToggle(label, target) {
  target.hidden = true;
  const button = h('button', { type: 'button', className: 'btn btn-secondary help-toggle' }, label);
  button.addEventListener('click', () => {
    target.hidden = false;
    button.hidden = true;
  });
  return button;
}

/**
 * Tabel Data: data bernomor yang dapat dicentang satu per satu, dengan banyak data tercentang
 * dan jumlah sementara di bawahnya.
 * @param {{
 *   values: number[],
 *   unit?: string|null,
 *   prechecked?: boolean,     semua baris sudah dicentang (daftar data diberikan)
 *   showTotalCount?: boolean, tampilkan "k dari n" — hanya untuk contoh, karena n adalah jawaban
 *   helpHidden?: boolean,     penghitung disembunyikan, dapat dibuka dengan tombol Bantuan
 * }} options
 */
export function dataTable({
  values,
  unit = null,
  prechecked = false,
  showTotalCount = false,
  helpHidden = false,
}) {
  tableCount += 1;
  const id = `data-table-${tableCount}`;
  const checked = values.map(() => prechecked);

  const counted = h('p', {});
  const total = h('p', {});
  const summary = h('div', { className: 'data-table-summary', 'aria-live': 'polite' }, counted, total);

  const rows = values.map((value, index) => {
    const display = formatNumber(value);
    const box = h('input', {
      type: 'checkbox',
      id: `${id}-${index}`,
      'aria-label': STR.dataTable.checkLabel(index + 1, display),
    });
    box.checked = prechecked;
    box.addEventListener('change', () => {
      checked[index] = box.checked;
      update();
    });
    const row = h(
      'tr',
      {
        onClick: (event) => {
          if (event.target === box) return;
          box.checked = !box.checked;
          box.dispatchEvent(new Event('change'));
        },
      },
      h('td', { className: 'num' }, String(index + 1)),
      h('td', { className: 'value' }, display),
      h('td', { className: 'check' }, box),
    );
    return { row, box };
  });

  function update() {
    const k = checked.filter(Boolean).length;
    counted.textContent = showTotalCount
      ? STR.dataTable.countedOf(k, values.length)
      : STR.dataTable.counted(k);
    const running = sum(values.filter((_, index) => checked[index]));
    total.textContent = STR.dataTable.runningTotal(formatNumber(running));
    rows.forEach(({ row }, index) => row.classList.toggle('is-checked', checked[index]));
  }
  update();

  const el = h(
    'div',
    { className: 'data-table-wrap' },
    prechecked ? null : h('p', { className: 'data-table-tip' }, STR.dataTable.tip),
    h(
      'table',
      { className: 'data-table' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', { scope: 'col' }, STR.dataTable.number),
          h('th', { scope: 'col' }, STR.dataTable.data(unit)),
          h('th', { scope: 'col' }, STR.dataTable.check),
        ),
      ),
      h('tbody', {}, rows.map(({ row }) => row)),
    ),
    summary,
    helpHidden ? helpToggle(STR.dataTable.showHelp, summary) : null,
  );
  return { el };
}

/**
 * Tabel frekuensi: Nilai (x) | Frekuensi (f) | x × f.
 * Kolom x × f langsung terlihat pada contoh; pada latihan dapat dibuka dengan tombol Bantuan.
 * @param {{
 *   table: Array<{ x: number, f: number }>,
 *   unit?: string|null,
 *   valueLabel?: string|null,
 *   frequencyLabel?: string|null,
 *   showProducts?: boolean,
 * }} options
 */
export function frequencyTable({
  table,
  unit = null,
  valueLabel = null,
  frequencyLabel = null,
  showProducts = false,
  allowHelp = true, // false di kuis: kolom x × f tidak bisa dibuka
}) {
  const products = frequencyProducts(table);
  const productCells = [];
  const productHeader = h('th', { scope: 'col' }, STR.frequencyTable.product);
  productCells.push(productHeader);

  const rows = table.map((row, index) => {
    const productCell = h('td', { className: 'value product' }, formatNumber(products[index]));
    productCells.push(productCell);
    return h(
      'tr',
      {},
      h('td', { className: 'value' }, formatNumber(row.x)),
      h('td', { className: 'value' }, formatNumber(row.f)),
      productCell,
    );
  });

  const valueHeader = STR.frequencyTable.value(valueLabel ?? STR.frequencyTable.defaultValue, unit);
  const frequencyHeader = STR.frequencyTable.frequency(frequencyLabel ?? STR.frequencyTable.defaultFrequency);

  let toggle = null;
  if (!showProducts) {
    productCells.forEach((cell) => {
      cell.hidden = true;
    });
  }
  if (!showProducts && allowHelp) {
    toggle = h('button', { type: 'button', className: 'btn btn-secondary help-toggle' }, STR.frequencyTable.showProducts);
    toggle.addEventListener('click', () => {
      productCells.forEach((cell) => {
        cell.hidden = false;
      });
      toggle.hidden = true;
    });
  }

  const el = h(
    'div',
    { className: 'data-table-wrap' },
    h(
      'table',
      { className: 'data-table frequency-table' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, valueHeader), h('th', { scope: 'col' }, frequencyHeader), productHeader)),
      h('tbody', {}, rows),
    ),
    toggle,
  );
  return { el };
}
