// FeedbackCard, StepInput, dan ChoiceList (docs/05 bagian 2).
// Umpan balik ditampilkan menempel di bawah isian — bukan pop-up — agar perhatian tidak terpecah.
import { h } from '../dom.js';
import { STR } from '../strings.js';

const ICONS = { success: '✓', hint: '!', info: 'i', solution: '?' };

/**
 * @param {'success'|'hint'|'info'|'solution'} kind
 * @param {string} text
 * @param {Array<{ label: string, onClick: () => void, primary?: boolean }>} [actions]
 */
export function feedbackCard(kind, text, actions = []) {
  return h(
    'div',
    { className: `feedback feedback-${kind}` },
    h('span', { className: 'feedback-icon', 'aria-hidden': 'true' }, ICONS[kind]),
    h(
      'div',
      { className: 'feedback-body' },
      STR.solver.feedback[kind] ? h('p', { className: 'feedback-title' }, STR.solver.feedback[kind]) : null,
      h('p', {}, text),
      actions.length
        ? h(
            'div',
            { className: 'feedback-actions' },
            actions.map(({ label, onClick, primary }) =>
              h(
                'button',
                { type: 'button', className: `btn ${primary ? 'btn-primary' : 'btn-secondary'}`, onClick },
                label,
              ),
            ),
          )
        : null,
    ),
  );
}

let inputCount = 0;

/**
 * Isian satu langkah (n, jumlah, rata-rata).
 * @param {{ label: string, unit?: string|null, onCheck: (raw: string) => void }} options
 */
export function stepInput({ label, unit = null, onCheck }) {
  inputCount += 1;
  const id = `step-input-${inputCount}`;
  const input = h('input', {
    id,
    className: 'input step-field',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    enterkeyhint: 'done',
  });
  const check = h('button', { type: 'submit', className: 'btn btn-primary' }, STR.solver.check);
  const note = h('p', { className: 'step-note' });
  note.hidden = true;
  const feedbackSlot = h('div', { className: 'feedback-slot', 'aria-live': 'polite' });

  const el = h(
    'form',
    {
      className: 'step-input',
      onSubmit: (event) => {
        event.preventDefault();
        if (!input.disabled && !input.readOnly) onCheck(input.value);
      },
    },
    h('label', { for: id, className: 'step-label' }, label),
    note,
    h(
      'div',
      { className: 'step-row' },
      input,
      unit ? h('span', { className: 'step-unit' }, unit) : null,
      check,
    ),
    feedbackSlot,
  );

  const api = {
    el,
    lock() {
      el.classList.add('is-locked');
      input.disabled = true;
      check.disabled = true;
      api.note(STR.solver.locked);
    },
    unlock() {
      el.classList.remove('is-locked');
      input.disabled = false;
      check.disabled = false;
      note.hidden = true;
    },
    note(text) {
      note.textContent = text;
      note.hidden = !text;
    },
    feedback(kind, text, actions = []) {
      feedbackSlot.replaceChildren(feedbackCard(kind, text, actions));
    },
    /** Langkah selesai: kunci isian, tampilkan nilai dan umpan balik akhir. */
    done(kind, text, valueText = null) {
      if (valueText !== null) input.value = valueText;
      input.readOnly = true;
      check.hidden = true;
      el.classList.add('is-done');
      api.feedback(kind, text);
    },
    focus() {
      input.focus();
      input.select();
    },
  };
  return api;
}

let choiceCount = 0;

/**
 * Pilihan ganda (untuk soal pilihan ganda dan langkah Maknai).
 * @param {{ question?: string|null, options: Array<{ text: string }>, onCheck: (index: number|null) => void }} options
 */
export function choiceList({ question = null, options, onCheck }) {
  choiceCount += 1;
  const name = `choice-${choiceCount}`;
  const radios = options.map((option, index) =>
    h('input', { type: 'radio', name, value: String(index), id: `${name}-${index}` }),
  );
  const labels = options.map((option, index) =>
    h('label', { for: `${name}-${index}`, className: 'choice' }, radios[index], h('span', {}, option.text)),
  );
  const check = h('button', { type: 'submit', className: 'btn btn-primary' }, STR.solver.check);
  const feedbackSlot = h('div', { className: 'feedback-slot', 'aria-live': 'polite' });
  const legendId = `${name}-legend`;

  const el = h(
    'form',
    {
      className: 'choice-list',
      onSubmit: (event) => {
        event.preventDefault();
        const selected = radios.findIndex((radio) => radio.checked);
        onCheck(selected >= 0 ? selected : null);
      },
    },
    h(
      'fieldset',
      { 'aria-labelledby': question ? legendId : null },
      question ? h('p', { id: legendId, className: 'step-label' }, question) : null,
      labels,
    ),
    check,
    feedbackSlot,
  );

  const api = {
    el,
    lock() {
      el.classList.add('is-locked');
      radios.forEach((radio) => {
        radio.disabled = true;
      });
      check.disabled = true;
    },
    unlock() {
      el.classList.remove('is-locked');
      radios.forEach((radio) => {
        radio.disabled = false;
      });
      check.disabled = false;
    },
    feedback(kind, text, actions = []) {
      feedbackSlot.replaceChildren(feedbackCard(kind, text, actions));
    },
    /** Tandai opsi yang benar, kunci pilihan. */
    done(correctIndex, kind, text) {
      radios.forEach((radio, index) => {
        radio.disabled = true;
        radio.checked = index === correctIndex;
      });
      labels[correctIndex].classList.add('is-correct');
      check.hidden = true;
      api.feedback(kind, text);
    },
  };
  return api;
}
