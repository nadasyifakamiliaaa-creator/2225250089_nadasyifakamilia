// Pengerja soal: pengerjaan bertahap (F05), soal cerita Pahami–Pilah–Hitung–Maknai (F06),
// umpan balik diagnostik bertingkat (F07), dan pertanyaan alasan (F08).
//   Benar       → umpan balik dengan alasan, langkah berikutnya terbuka
//   Salah ke-1  → petunjuk tingkat 1 + tombol "Lihat pembahasan"
//   Salah ke-2  → petunjuk tingkat 2
//   Salah ke-3  → pembahasan langkah itu ditampilkan otomatis
import { computeKey, itemData, storyKeys } from '../../core/answer-key.js';
import { diagnose } from '../../core/diagnose.js';
import { tableSupport } from '../../core/fading.js';
import { hintFor, praiseFor, praiseMissing } from '../../core/hints.js';
import { roundTo } from '../../core/mean.js';
import { formatNumber, parseNumber } from '../../core/number-format.js';
import { correctOptionIndex, solutionFor } from '../../core/solution.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { dataTable, frequencyTable } from './data-table.js';
import { choiceList, feedbackCard, stepInput } from './inputs.js';
import { storyText } from './story-text.js';

const MAX_ATTEMPTS = 3;
const NUMERIC_STEPS = ['n', 'sum', 'divide'];
const MIN_EXPLANATION_LENGTH = 10;

/** Tahap literasi (docs/03 bagian 1.3) untuk setiap langkah soal cerita. */
const STAGE_OF_STEP = {
  understand: 'understand',
  select: 'select',
  n: 'compute',
  sum: 'compute',
  divide: 'compute',
  interpret: 'interpret',
};
const STAGES = ['understand', 'select', 'compute', 'interpret'];

/**
 * @typedef {{ attempts: number, codes: string[], correct: boolean, revealed: boolean }} StepRecord
 * @typedef {{ itemId: string, steps: Record<string, StepRecord>, completed: boolean, text?: string }} ItemResult
 * @typedef {{ kind: 'attempt', itemId: string, step: string, answer: string, isCorrect: boolean,
 *   errorCode: string|null, attemptNo: number, revealed: boolean, durationMs: number }
 *   | { kind: 'explain', itemId: string, text: string }} SolverEvent
 */

/**
 * @param {object} item butir soal (format docs/04)
 * @param {{
 *   givenSteps?: string[],      langkah yang sudah dikerjakan aplikasi (contoh-sebagian)
 *   support?: ReturnType<typeof tableSupport>, bantuan Tabel Data (core/fading.js)
 *   onComplete?: (result: ItemResult) => void,
 *   onEvent?: (event: SolverEvent) => void, setiap jawaban diperiksa / pembahasan dibuka (log F11)
 * }} [options]
 */
export function itemSolver(
  item,
  {
    givenSteps = [],
    support = tableSupport({ screenType: 'practice_item', givenSteps }),
    onComplete = () => {},
    onEvent = () => {},
  } = {},
) {
  /** @type {ItemResult} */
  const result = { itemId: item.id, steps: {}, completed: false };
  // Penerus event log; tidak ikut terlihat sebagai data hasil (non-enumerable).
  Object.defineProperty(result, 'emit', { value: (event) => onEvent({ itemId: item.id, ...event }) });
  const container = h('div', { className: 'solver' });
  const completionSlot = h('div', { 'aria-live': 'polite' });
  let onFinish = () => {};

  const finish = () => {
    result.completed = true;
    onFinish();
    completionSlot.replaceChildren(feedbackCard('success', STR.solver.completed));
    onComplete(result);
  };

  const ctx = { item, givenSteps, support, result, container, finish };

  switch (item.type) {
    case 'stepwise_mean':
    case 'frequency_mean':
      container.append(promptCard(item.prompt));
      buildSteps(ctx, null);
      break;
    case 'story_mean': {
      const story = storyText(item);
      const bar = stageBar();
      container.append(h('div', { className: 'card prompt' }, story.el), bar.el);
      onFinish = () => bar.set(null);
      buildSteps(ctx, { story, bar });
      break;
    }
    case 'missing_value':
    case 'number':
      container.append(promptCard(item.prompt));
      buildSingleAnswer(ctx);
      break;
    case 'multiple_choice':
      container.append(promptCard(item.prompt), choiceStep(item, 'choice', item.options, null, result, finish).el);
      break;
    case 'self_explain':
      container.append(promptCard(item.prompt));
      container.append(
        item.options
          ? choiceStep(item, 'choice', item.options, null, result, finish).el
          : explainStep(item, result, finish).el,
      );
      break;
    default:
      container.append(feedbackCard('info', `Tipe soal "${item.type}" belum didukung.`));
      finish();
  }

  container.append(completionSlot);
  return container;
}

function promptCard(text) {
  return h('div', { className: 'card prompt' }, h('p', {}, text));
}

/** Penanda tahap: Pahami → Pilah → Hitung → Maknai. */
function stageBar() {
  const items = STAGES.map((stage, index) =>
    h('li', { className: 'stage' }, h('span', { className: 'stage-number' }, String(index + 1)), STR.story.stages[stage]),
  );
  const el = h('ol', { className: 'stage-bar', 'aria-label': STR.story.stagesLabel }, items);
  return {
    el,
    /** Tandai tahap aktif; null = semua selesai. */
    set(current) {
      const currentIndex = current === null ? STAGES.length : STAGES.indexOf(current);
      items.forEach((li, index) => {
        li.classList.toggle('is-done', index < currentIndex);
        li.classList.toggle('is-current', index === currentIndex);
        if (index === currentIndex) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
    },
  };
}

function buildTable(item, support) {
  if (item.type === 'frequency_mean') {
    return frequencyTable({
      table: item.table,
      unit: item.unit,
      valueLabel: item.valueLabel,
      frequencyLabel: item.frequencyLabel,
      showProducts: false,
    });
  }
  return dataTable({ values: itemData(item), unit: item.unit, ...support });
}

/** Soal bertahap: (Pahami → Pilah →) n → jumlah → rata-rata (→ Maknai). */
function buildSteps(ctx, storyParts) {
  const { item, givenSteps, support, result, container, finish } = ctx;
  const key = computeKey(item);
  const previous = {};
  const isStory = storyParts !== null;

  const table = buildTable(item, isStory ? { ...support, prechecked: false } : support);
  // Pada soal cerita, tabel baru muncul setelah siswa memilah datanya.
  const selectGiven = givenSteps.includes('select');
  if (isStory && !selectGiven) table.el.hidden = true;
  const showTable = () => {
    table.el.hidden = false;
  };
  if (!isStory) container.append(table.el);

  // Setiap langkah punya { el, lock(), start() }; start() dipanggil saat langkah sebelumnya selesai.
  const blocks = [];
  const advance = (index) => {
    const nextBlock = blocks[index + 1];
    if (nextBlock) nextBlock.start();
    else finish();
  };

  item.steps.forEach((step, index) => {
    const onDone = () => advance(index);
    const given = givenSteps.includes(step);
    let block;
    if (step === 'understand') {
      block = given
        ? givenTextStep(STR.story.stages.understand, solutionFor(item, 'understand'), onDone)
        : choiceStep(item, 'understand', item.understand.options, item.understand.question, result, onDone);
    } else if (step === 'select') {
      block = given
        ? givenSelectStep(item, storyParts.story, onDone)
        : selectStep(item, storyParts.story, result, () => {
            showTable();
            onDone();
          });
    } else if (NUMERIC_STEPS.includes(step)) {
      if (isStory && !container.contains(table.el)) container.append(table.el);
      block = given
        ? givenNumericStep(item, step, key, previous, onDone)
        : numericStep(item, step, key, previous, result, onDone);
    } else if (step === 'interpret') {
      block = choiceStep(item, 'interpret', item.interpret.options, item.interpret.question, result, onDone);
    } else {
      return;
    }
    if (isStory) {
      const start = block.start;
      block.start = () => {
        storyParts.bar.set(STAGE_OF_STEP[step]);
        start();
      };
    }
    blocks.push(block);
    container.append(block.el);
  });

  // Kunci semua dulu, baru mulai langkah pertama (langkah "diberikan" langsung berantai ke berikutnya).
  blocks.forEach((block) => block.lock());
  blocks[0]?.start();
}

/** Soal jawaban tunggal: nilai yang hilang (atau soal angka biasa). */
function buildSingleAnswer(ctx) {
  const { item, support, result, container, finish } = ctx;
  const key = computeKey(item);
  if (item.type === 'missing_value') {
    container.append(
      h('p', { className: 'step-label' }, STR.steps.knownData),
      dataTable({ values: item.knownData, unit: item.unit, ...support }).el,
    );
  }
  const block = numericStep(item, 'answer', key, {}, result, finish);
  container.append(block.el);
  block.start();
}

function unitFor(item, step) {
  return step === 'n' ? STR.steps.nUnit : (item.unit ?? null);
}

function displayValue(item, step, value) {
  const decimals = step === 'divide' || step === 'answer' ? (item.decimals ?? 2) : 2;
  return formatNumber(roundTo(value, decimals), { decimals });
}

function stepLabel(item, step) {
  if (step === 'answer') return item.type === 'missing_value' ? STR.steps.missing : STR.steps.answer;
  return STR.steps[step];
}

/** Langkah teks yang sudah dikerjakan aplikasi (contoh-sebagian). */
function givenTextStep(label, text, onDone) {
  const el = h(
    'div',
    { className: 'step-given' },
    h('p', { className: 'step-label' }, label),
    h('p', { className: 'text-muted' }, text),
  );
  return { el, lock() {}, start: onDone };
}

/** Langkah Pilah yang sudah dikerjakan aplikasi: angka data langsung ditandai. */
function givenSelectStep(item, story, onDone) {
  const relevant = storyKeys(item).filter((key) => item.selectables[key].relevant);
  const block = givenTextStep(STR.story.stages.select, solutionFor(item, 'select'), onDone);
  story.setSelected(relevant);
  story.mark(relevant, 'is-correct');
  return block;
}

/** Langkah angka yang sudah dikerjakan aplikasi (fading). */
function givenNumericStep(item, step, key, previous, onDone) {
  const block = givenTextStep(
    `${STR.steps[step]} = ${displayValue(item, step, key[step])}`,
    solutionFor(item, step),
    () => {
      previous[step] = key[step];
      onDone();
    },
  );
  return block;
}

function newRecord(result, step) {
  /** @type {StepRecord} */
  const record = { attempts: 0, codes: [], correct: false, revealed: false };
  result.steps[step] = record;
  let startedAt = performance.now();
  // Catat satu percobaan: lama dihitung sejak langkah dibuka / percobaan sebelumnya.
  const log = ({ answer, isCorrect, errorCode = null, revealed = false }) => {
    const now = performance.now();
    result.emit({
      kind: 'attempt',
      step,
      answer: String(answer),
      isCorrect,
      errorCode,
      attemptNo: revealed ? record.attempts + 1 : record.attempts,
      revealed,
      durationMs: Math.round(now - startedAt),
    });
    startedAt = now;
  };
  Object.defineProperty(record, 'log', { value: log });
  Object.defineProperty(record, 'restartTimer', { value: () => (startedAt = performance.now()) });
  return record;
}

function numericStep(item, step, key, previous, result, onDone) {
  const record = newRecord(result, step);
  const input = stepInput({ label: stepLabel(item, step), unit: unitFor(item, step), onCheck: check });

  function praise(value) {
    if (step === 'answer' && item.type === 'missing_value') return praiseMissing(item, value);
    return praiseFor(step, key, { decimals: item.decimals ?? null });
  }

  function reveal() {
    record.log({ answer: '', isCorrect: false, revealed: true });
    record.revealed = true;
    previous[step] = key[step];
    input.done('solution', solutionFor(item, step), displayValue(item, step, key[step]));
    onDone();
  }

  function check(raw) {
    if (raw.trim() === '') {
      input.feedback('info', STR.solver.empty);
      return;
    }
    const value = parseNumber(raw);
    if (value === null) {
      input.feedback('info', STR.solver.invalid);
      return;
    }
    record.attempts += 1;
    const diagnosis = diagnose(item, step, value, { ...previous });
    record.log({ answer: raw.trim(), isCorrect: diagnosis.correct, errorCode: diagnosis.code });
    if (diagnosis.correct) {
      record.correct = true;
      previous[step] = value;
      input.done('success', praise(value));
      onDone();
      return;
    }
    record.codes.push(diagnosis.code);
    if (record.attempts >= MAX_ATTEMPTS) {
      reveal();
      return;
    }
    const level = Math.min(record.attempts, 2);
    input.feedback('hint', hintFor(diagnosis.code, level, diagnosis.params), [
      { label: STR.solver.tryAgain, onClick: () => input.focus(), primary: true },
      { label: STR.solver.showSolution, onClick: reveal },
    ]);
  }

  return {
    el: input.el,
    lock: () => input.lock(),
    start() {
      record.restartTimer();
      input.unlock();
      if (step === 'divide' && previous.n !== undefined && previous.sum !== undefined) {
        input.note(STR.steps.divideNote(formatNumber(previous.sum), formatNumber(previous.n)));
      }
    },
  };
}

/** Tahap Pilah: siswa mengetuk angka yang menjadi data di teks soal. */
function selectStep(item, story, result, onDone) {
  const record = newRecord(result, 'select');
  const relevant = storyKeys(item).filter((key) => item.selectables[key].relevant);

  const chosen = h('p', { className: 'selected-data', 'aria-live': 'polite' });
  const updateChosen = () => {
    const keys = story.selected();
    chosen.textContent = STR.story.chosen(
      keys.length ? keys.map((key) => item.selectables[key].display).join(', ') : STR.story.none,
    );
  };
  story.onChange(updateChosen);
  updateChosen();

  const check = h('button', { type: 'submit', className: 'btn btn-primary' }, STR.solver.check);
  const feedbackSlot = h('div', { className: 'feedback-slot', 'aria-live': 'polite' });
  const feedback = (kind, text, actions = []) => feedbackSlot.replaceChildren(feedbackCard(kind, text, actions));

  const el = h(
    'form',
    {
      className: 'step-input select-step',
      onSubmit: (event) => {
        event.preventDefault();
        if (!check.disabled) submit();
      },
    },
    h('p', { className: 'step-label' }, STR.story.stages.select),
    h('p', { className: 'step-note' }, STR.story.selectInstruction),
    chosen,
    check,
    feedbackSlot,
  );

  function complete(kind, text) {
    story.disable();
    story.mark(relevant, 'is-correct');
    check.hidden = true;
    el.classList.add('is-done');
    feedback(kind, text);
    onDone();
  }

  function reveal() {
    record.log({ answer: '', isCorrect: false, revealed: true });
    record.revealed = true;
    story.setSelected(relevant);
    complete('solution', solutionFor(item, 'select'));
  }

  function submit() {
    const keys = story.selected();
    if (keys.length === 0) {
      feedback('info', STR.story.selectFirst);
      return;
    }
    record.attempts += 1;
    const diagnosis = diagnose(item, 'select', keys);
    record.log({
      answer: keys.map((key) => item.selectables[key].display).join(';'),
      isCorrect: diagnosis.correct,
      errorCode: diagnosis.code,
    });
    story.mark([], 'is-flagged');
    if (diagnosis.correct) {
      record.correct = true;
      complete('success', STR.story.selectCorrect(relevant.map((key) => item.selectables[key].display).join(', ')));
      return;
    }
    record.codes.push(diagnosis.code);
    if (record.attempts >= MAX_ATTEMPTS) {
      reveal();
      return;
    }
    const level = Math.min(record.attempts, 2);
    if (level === 2 && diagnosis.params.kind === 'extra') story.mark([diagnosis.params.key], 'is-flagged');
    feedback('hint', hintFor(diagnosis.code, level, diagnosis.params), [
      { label: STR.solver.showSolution, onClick: reveal },
    ]);
  }

  return {
    el,
    lock() {
      el.classList.add('is-locked');
      check.disabled = true;
    },
    start() {
      record.restartTimer();
      el.classList.remove('is-locked');
      check.disabled = false;
      story.enable();
    },
  };
}

function choiceStep(item, step, options, question, result, onDone) {
  const record = newRecord(result, step);
  const correctIndex = correctOptionIndex(options);
  const list = choiceList({ question, options, onCheck: check });

  function reveal() {
    record.log({ answer: '', isCorrect: false, revealed: true });
    record.revealed = true;
    const correct = options[correctIndex];
    list.done(correctIndex, 'solution', `${STR.solver.correctAnswer} ${correct.text} ${correct.feedback}`);
    onDone();
  }

  function check(index) {
    if (index === null) {
      list.feedback('info', STR.solver.chooseFirst);
      return;
    }
    record.attempts += 1;
    const diagnosis = diagnose(item, step, index);
    record.log({ answer: index, isCorrect: diagnosis.correct, errorCode: diagnosis.code });
    if (diagnosis.correct) {
      record.correct = true;
      list.done(correctIndex, 'success', diagnosis.params.feedback);
      onDone();
      return;
    }
    record.codes.push(diagnosis.code);
    if (record.attempts >= MAX_ATTEMPTS) {
      reveal();
      return;
    }
    list.feedback('hint', hintFor(diagnosis.code, 1, diagnosis.params), [
      { label: STR.solver.showSolution, onClick: reveal },
    ]);
  }

  return {
    el: list.el,
    lock: () => list.lock(),
    start() {
      record.restartTimer();
      list.unlock();
    },
  };
}

/** Penjelasan bebas (F08): tidak dinilai otomatis, disimpan untuk guru/peneliti. */
function explainStep(item, result, onDone) {
  const id = `explain-${item.id}`;
  const area = h('textarea', { id, className: 'input explain-field', rows: 4, maxlength: 600 });
  const save = h('button', { type: 'submit', className: 'btn btn-primary' }, STR.explain.save);
  const feedbackSlot = h('div', { className: 'feedback-slot', 'aria-live': 'polite' });

  const el = h(
    'form',
    {
      className: 'step-input explain-step',
      onSubmit: (event) => {
        event.preventDefault();
        if (area.readOnly) return;
        const text = area.value.trim();
        if (text.length < MIN_EXPLANATION_LENGTH) {
          feedbackSlot.replaceChildren(feedbackCard('info', STR.explain.tooShort));
          return;
        }
        result.text = text;
        result.steps.explain = { attempts: 1, codes: [], correct: true, revealed: false };
        result.emit({ kind: 'explain', text });
        area.readOnly = true;
        save.hidden = true;
        el.classList.add('is-done');
        feedbackSlot.replaceChildren(feedbackCard('success', STR.explain.thanks));
        onDone();
      },
    },
    h('label', { for: id, className: 'step-label' }, STR.explain.label),
    h('p', { className: 'step-note' }, STR.explain.note),
    area,
    save,
    feedbackSlot,
  );
  return { el };
}
