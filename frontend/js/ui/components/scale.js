// Skala penilaian (radio bernomor) untuk instrumen beban kognitif: Paas (1–9) dan Leppink (0–10).
import { h } from '../dom.js';

let scaleCount = 0;

/**
 * @param {{
 *   question: string,
 *   min: number,
 *   max: number,
 *   labels?: Record<string, string>,  label setiap angka (Paas)
 *   minLabel?: string,                label ujung (Leppink)
 *   maxLabel?: string,
 *   onChange?: (value: number) => void,
 * }} options
 * @returns {{ el: HTMLElement, value: () => number|null, disable: () => void }}
 */
export function ratingScale({ question, min, max, labels = null, minLabel = '', maxLabel = '', onChange = () => {} }) {
  scaleCount += 1;
  const name = `scale-${scaleCount}`;
  const legendId = `${name}-legend`;
  let selected = null;

  const radios = [];
  const options = [];
  for (let value = min; value <= max; value += 1) {
    const id = `${name}-${value}`;
    const radio = h('input', { type: 'radio', name, id, value: String(value) });
    radio.addEventListener('change', () => {
      selected = value;
      onChange(value);
    });
    radios.push(radio);
    const text = labels?.[String(value)];
    options.push(
      h(
        'label',
        { for: id, className: `scale-option${text ? ' has-label' : ''}` },
        radio,
        h('span', { className: 'scale-number' }, String(value)),
        text ? h('span', { className: 'scale-text' }, text) : null,
      ),
    );
  }

  const el = h(
    'fieldset',
    { className: `rating-scale${labels ? ' is-labelled' : ''}`, 'aria-labelledby': legendId },
    h('p', { id: legendId, className: 'step-label' }, question),
    labels
      ? null
      : h(
          'p',
          { className: 'scale-ends', 'aria-hidden': 'true' },
          h('span', {}, `${min} = ${minLabel}`),
          h('span', {}, `${max} = ${maxLabel}`),
        ),
    h('div', { className: 'scale-options' }, options),
  );

  return {
    el,
    value: () => selected,
    disable() {
      radios.forEach((radio) => {
        radio.disabled = true;
      });
    },
  };
}
