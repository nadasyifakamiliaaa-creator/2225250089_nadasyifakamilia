// Kuis akhir (F09): 10 soal acak sesuai kisi-kisi, tanpa batas waktu, tanpa petunjuk selama kuis.
// Skor dan pembahasan (termasuk kemungkinan jenis kesalahan) ditampilkan setelah dikumpulkan.
// Keadaan kuis disimpan di memori modul, jadi siswa bisa keluar-masuk halaman tanpa kehilangan jawaban.
import { computeKey } from '../../core/answer-key.js';
import { hintFor } from '../../core/hints.js';
import { roundTo } from '../../core/mean.js';
import { formatNumber } from '../../core/number-format.js';
import { answeredCount, pickQuiz, quizParts, scoreQuiz } from '../../core/quiz.js';
import { correctOptionIndex, promptText, solutionFor } from '../../core/solution.js';
import { loadItemFile, loadTopic } from '../../data/content-loader.js';
import { isResearchMode, logAttempt, logEvent } from '../../data/log.js';
import { saveQuizResult } from '../../data/progress.js';
import { getResearchState } from '../../data/store.js';
import { frequencyTable } from '../components/data-table.js';
import { feedbackCard } from '../components/inputs.js';
import { appBar } from '../components/layout.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { errorView, loadingView } from './shared.js';

const TOPIC_ID = 'mean';
const MENU_HREF = '#/mean';

/** @type {{ ids: string[], answers: Record<string, Record<string, string|number>>, index: number, score: object|null } | null} */
let session = null;

export async function render(root, _params, ctx) {
  root.append(loadingView());
  let topic;
  let bank;
  try {
    topic = await loadTopic(TOPIC_ID);
    bank = await loadItemFile(topic, 'quiz');
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const byId = new Map(bank.map((item) => [item.id, item]));
  if (session && !session.ids.every((id) => byId.has(id))) session = null; // bank soal berubah
  const view = { root, topic, bank, byId };

  if (session?.score) showResults(view);
  else showIntro(view);
}

function startNewSession(view) {
  session = { ids: pickQuiz(view.bank, view.topic.quizBlueprint), answers: {}, index: 0, score: null };
}

function items(view) {
  return session.ids.map((id) => view.byId.get(id));
}

function paint(view, ...children) {
  // Saring null/false: replaceChildren() akan mengubahnya menjadi teks "null".
  view.root.replaceChildren(...children.filter(Boolean));
  window.scrollTo(0, 0);
  view.root.querySelector('h1, h2')?.focus?.();
}

// ---------------------------------------------------------------- Pembuka

function showIntro(view) {
  const inProgress = session && !session.score;
  paint(
    view,
    appBar({ title: STR.quiz.title, backHref: MENU_HREF, backLabel: STR.lesson.backToMenu }),
    h('h1', { tabindex: '-1' }, STR.quiz.title),
    h(
      'section',
      { className: 'card' },
      h('ul', { className: 'feature-list' }, STR.quiz.intro.map((line) => h('li', {}, line))),
    ),
    h(
      'div',
      { className: 'stack' },
      inProgress
        ? h('button', { type: 'button', className: 'btn btn-primary', onClick: () => showQuestion(view) }, STR.quiz.resume)
        : null,
      h(
        'button',
        {
          type: 'button',
          className: `btn ${inProgress ? 'btn-secondary' : 'btn-primary'}`,
          onClick: () => {
            startNewSession(view);
            showQuestion(view);
          },
        },
        STR.quiz.start,
      ),
    ),
  );
}

// ---------------------------------------------------------------- Soal

function numberLabel(item) {
  if (item.type === 'missing_value') return STR.quiz.answerMissing;
  if (item.type === 'number') return STR.quiz.answerGeneric;
  return STR.quiz.answerLabel;
}

function answerFields(item) {
  const saved = (session.answers[item.id] ??= {});
  return quizParts(item).map(({ step, kind }) => {
    const id = `quiz-${item.id}-${step}`;
    if (kind === 'number') {
      const input = h('input', {
        id,
        className: 'input step-field',
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        'aria-describedby': `${id}-hint`,
      });
      input.value = saved[step] ?? '';
      input.addEventListener('input', () => {
        saved[step] = input.value.trim();
      });
      return h(
        'div',
        { className: 'step-input' },
        h('label', { for: id, className: 'step-label' }, numberLabel(item)),
        h('p', { id: `${id}-hint`, className: 'step-note' }, STR.quiz.answerHint),
        h('div', { className: 'step-row' }, input, item.unit ? h('span', { className: 'step-unit' }, item.unit) : null),
      );
    }
    const options = step === 'interpret' ? item.interpret.options : item.options;
    const question = step === 'interpret' ? item.interpret.question : null;
    const legendId = `${id}-legend`;
    return h(
      'fieldset',
      { className: 'choice-list', 'aria-labelledby': question ? legendId : null },
      question ? h('p', { id: legendId, className: 'step-label' }, question) : null,
      options.map((option, index) => {
        const radio = h('input', { type: 'radio', name: id, id: `${id}-${index}`, value: String(index) });
        radio.checked = saved[step] === index;
        radio.addEventListener('change', () => {
          saved[step] = index;
        });
        return h('label', { for: `${id}-${index}`, className: 'choice' }, radio, h('span', {}, option.text));
      }),
    );
  });
}

function questionBody(item) {
  const parts = [h('div', { className: 'card prompt' }, h('p', {}, promptText(item)))];
  if (item.type === 'frequency_mean') {
    parts.push(
      frequencyTable({
        table: item.table,
        unit: item.unit,
        valueLabel: item.valueLabel,
        frequencyLabel: item.frequencyLabel,
        allowHelp: false,
      }).el,
    );
  }
  return parts;
}

function showQuestion(view) {
  const list = items(view);
  const index = session.index;
  const item = list[index];
  const isLast = index === list.length - 1;

  const go = (next) => {
    session.index = next;
    showQuestion(view);
  };

  paint(
    view,
    appBar({
      title: STR.quiz.title,
      position: STR.quiz.position(index + 1, list.length),
      backHref: MENU_HREF,
      backLabel: STR.lesson.backToMenu,
    }),
    h('h1', { className: 'visually-hidden', tabindex: '-1' }, STR.quiz.position(index + 1, list.length)),
    h('section', { className: 'screen' }, questionBody(item), answerFields(item)),
    h(
      'nav',
      { className: 'step-nav', 'aria-label': STR.quiz.title },
      h(
        'div',
        { className: 'step-nav-buttons' },
        index > 0
          ? h('button', { type: 'button', className: 'btn btn-secondary', onClick: () => go(index - 1) }, STR.quiz.prev)
          : h('span', { className: 'step-nav-spacer' }),
        h(
          'button',
          { type: 'button', className: 'btn btn-primary', onClick: () => (isLast ? showSummary(view) : go(index + 1)) },
          isLast ? STR.quiz.review : STR.quiz.next,
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------- Ringkasan sebelum mengumpulkan

function showSummary(view) {
  const list = items(view);
  const answered = answeredCount(list, session.answers);
  const missing = list.length - answered;
  const confirmSlot = h('div', { 'aria-live': 'polite' });

  const submit = h('button', { type: 'button', className: 'btn btn-primary btn-block' }, STR.quiz.submit);
  submit.addEventListener('click', () => {
    if (missing === 0) {
      finish(view);
      return;
    }
    // Konfirmasi di dalam halaman (dialog bawaan browser tidak dipakai).
    confirmSlot.replaceChildren(
      feedbackCard('info', STR.quiz.confirmUnanswered(missing), [
        { label: STR.quiz.confirmYes, primary: true, onClick: () => finish(view) },
        { label: STR.quiz.confirmNo, onClick: () => confirmSlot.replaceChildren() },
      ]),
    );
  });

  paint(
    view,
    appBar({ title: STR.quiz.title, backHref: MENU_HREF, backLabel: STR.lesson.backToMenu }),
    h('h1', { tabindex: '-1' }, STR.quiz.summaryTitle),
    h('p', {}, STR.quiz.summaryBody(answered, list.length)),
    h(
      'ol',
      { className: 'quiz-summary' },
      list.map((item, index) => {
        const done = answeredCount([item], session.answers) === 1;
        return h(
          'li',
          { className: done ? 'is-answered' : 'is-empty' },
          h(
            'button',
            {
              type: 'button',
              className: 'btn btn-secondary',
              'aria-label': `${STR.quiz.open(index + 1)}, ${done ? STR.quiz.answered : STR.quiz.unanswered}`,
              onClick: () => {
                session.index = index;
                showQuestion(view);
              },
            },
            String(index + 1),
          ),
          h('span', {}, done ? STR.quiz.answered : STR.quiz.unanswered),
        );
      }),
    ),
    submit,
    confirmSlot,
  );
}

async function finish(view) {
  const list = items(view);
  session.score = scoreQuiz(list, session.answers);
  const codes = session.score.results.flatMap((result) =>
    result.parts.filter((part) => part.answered && !part.correct).map((part) => part.code),
  );
  await saveQuizResult(session.score.percent, codes);
  logQuiz(list);
  showResults(view);
}

/** Log penelitian: hasil kuis + jawaban setiap bagian (tanpa petunjuk, satu percobaan). */
function logQuiz(list) {
  const { score } = session;
  logEvent('quiz', { points: score.points, max: score.max, percent: score.percent, itemIds: session.ids });
  score.results.forEach((result, index) => {
    for (const part of result.parts) {
      if (!part.answered) continue;
      logAttempt(
        {
          itemId: list[index].id,
          step: part.step,
          answer: session.answers[list[index].id][part.step],
          isCorrect: part.correct,
          errorCode: part.code,
          attemptNo: 1,
          revealed: false,
          durationMs: null,
        },
        { context: 'quiz', subtopicId: list[index].subtopic },
      );
    }
  });
}

// ---------------------------------------------------------------- Hasil & pembahasan

function correctText(item, part) {
  if (part.kind === 'choice') {
    const options = part.step === 'interpret' ? item.interpret.options : item.options;
    return options[correctOptionIndex(options)].text;
  }
  const key = computeKey(item);
  const value = part.step === 'answer' ? key.answer : key.divide;
  const decimals = item.decimals ?? 2;
  return formatNumber(roundTo(value, decimals), { decimals });
}

function givenText(item, part) {
  const raw = session.answers[item.id]?.[part.step];
  if (!part.answered) return STR.quiz.noAnswer;
  if (part.kind === 'choice') {
    const options = part.step === 'interpret' ? item.interpret.options : item.options;
    return options[raw]?.text ?? STR.quiz.noAnswer;
  }
  return String(raw);
}

function explanation(item, part) {
  if (part.correct || !part.answered) return null;
  if (part.kind === 'choice') {
    const options = part.step === 'interpret' ? item.interpret.options : item.options;
    return options[session.answers[item.id][part.step]]?.feedback ?? null;
  }
  if (!part.code || part.code === 'E-OTHER') return null;
  return `${STR.quiz.likelyError} ${hintFor(part.code, 2, part.params)}`;
}

function solutionSteps(item) {
  switch (item.type) {
    case 'stepwise_mean':
    case 'frequency_mean':
      return ['n', 'sum', 'divide'].map((step) => solutionFor(item, step));
    case 'story_mean':
      return ['select', 'n', 'sum', 'divide'].map((step) => solutionFor(item, step));
    case 'missing_value':
    case 'number':
      return [solutionFor(item, 'answer')];
    default:
      return [];
  }
}

function resultCard(item, result, number) {
  const allCorrect = result.points === result.max;
  return h(
    'li',
    { className: `card quiz-result ${allCorrect ? 'is-correct' : 'is-wrong'}` },
    h(
      'p',
      { className: 'quiz-result-head' },
      h('span', { className: 'status-icon', 'aria-hidden': 'true' }, allCorrect ? '✓ ' : '✗ '),
      `${STR.quiz.position(number, session.ids.length)} — ${allCorrect ? STR.quiz.correct : STR.quiz.incorrect}`,
    ),
    h('p', {}, promptText(item)),
    result.parts.map((part) =>
      h(
        'div',
        { className: 'quiz-part' },
        part.step === 'interpret' ? h('p', { className: 'step-label' }, STR.quiz.interpretLabel) : null,
        h('p', {}, h('strong', {}, STR.quiz.yourAnswer), ` ${givenText(item, part)} `, part.correct ? '✓' : '✗'),
        part.correct ? null : h('p', {}, h('strong', {}, STR.quiz.correctAnswer), ` ${correctText(item, part)}`),
        explanation(item, part) ? h('p', { className: 'quiz-explain' }, explanation(item, part)) : null,
      ),
    ),
    allCorrect || solutionSteps(item).length === 0
      ? null
      : h(
          'div',
          { className: 'quiz-steps' },
          h('p', { className: 'step-label' }, STR.quiz.stepsTitle),
          h('ol', {}, solutionSteps(item).map((line) => h('li', {}, line))),
        ),
  );
}

function showResults(view) {
  const list = items(view);
  const { score } = session;
  const message =
    score.percent >= 80 ? STR.quiz.resultMessage.high : score.percent >= 60 ? STR.quiz.resultMessage.mid : STR.quiz.resultMessage.low;

  paint(
    view,
    appBar({ title: STR.quiz.title, backHref: MENU_HREF, backLabel: STR.lesson.backToMenu }),
    h(
      'section',
      { className: 'card done' },
      h('h1', { tabindex: '-1' }, STR.quiz.resultTitle),
      h('p', { className: 'quiz-score' }, STR.quiz.score(score.points, score.max, `${score.percent}%`)),
      h('p', {}, message),
    ),
    isResearchMode() && !getResearchState().leppinkDone
      ? h(
          'section',
          { className: 'card effort-card' },
          h('p', {}, STR.questionnaire.invite),
          h('a', { href: '#/kuesioner', className: 'btn btn-primary' }, STR.questionnaire.inviteButton),
        )
      : null,
    h('h2', {}, STR.quiz.reviewTitle),
    h('ol', { className: 'quiz-results' }, score.results.map((result, index) => resultCard(list[index], result, index + 1))),
    h(
      'div',
      { className: 'stack' },
      h(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary',
          onClick: () => {
            startNewSession(view);
            showQuestion(view);
          },
        },
        STR.quiz.retry,
      ),
      h('a', { href: '#/progres', className: 'btn btn-secondary' }, STR.quiz.toProgress),
      h('a', { href: MENU_HREF, className: 'btn btn-secondary' }, STR.lesson.done.menu),
    ),
  );
}
