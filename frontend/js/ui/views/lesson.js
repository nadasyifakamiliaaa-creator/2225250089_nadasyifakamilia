// Layar materi bertahap (F03): satu layar satu ide, tempo diatur siswa (tanpa auto-advance).
// Alamat: #/mean/<subbab>/<layar>  dan  #/mean/<subbab>/selesai
import {
  adaptiveMessage,
  classifyResult,
  initialAdaptiveState,
  nextAdaptiveState,
} from '../../core/adaptive.js';
import { tableSupport } from '../../core/fading.js';
import {
  clampScreen,
  expandScreens,
  findTwin,
  isItemScreen,
  nextSubtopic,
  subtopicSlug,
  workedExampleScreen,
} from '../../core/lesson-plan.js';
import { loadItems, loadLesson, loadQuestionnaires, loadTopic } from '../../data/content-loader.js';
import { isResearchMode, logAttempt, logEvent } from '../../data/log.js';
import { getResearchState, saveResearchState } from '../../data/store.js';
import { codesFromResult } from '../../core/progress-summary.js';
import {
  getAdaptive,
  markDone,
  recordErrors,
  recordScreen,
  saveAdaptive,
} from '../../data/progress.js';
import { dataTable, frequencyTable } from '../components/data-table.js';
import { feedbackCard } from '../components/inputs.js';
import { itemSolver } from '../components/item-solver.js';
import { appBar, stepNav } from '../components/layout.js';
import { ratingScale } from '../components/scale.js';
import { equalShare, fraction } from '../components/visuals.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { errorView, loadingView } from './shared.js';

const TOPIC_ID = 'mean';
const MENU_HREF = '#/mean';

export async function render(root, [slug, screenParam], ctx) {
  root.append(loadingView());
  const subtopicId = `${TOPIC_ID}-${slug}`;

  let topic;
  let lesson;
  let items;
  try {
    topic = await loadTopic(TOPIC_ID);
    [lesson, items] = await Promise.all([loadLesson(topic, subtopicId), loadItems(topic)]);
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const screens = expandScreens(lesson);
  const base = `#/mean/${slug}`;

  if (screenParam === 'selesai') {
    await markDone(subtopicId);
    logEvent('progress', { subtopicId, status: 'done' });
    const questions = isResearchMode() ? await loadQuestionnaires() : null;
    if (ctx.isCurrent()) root.replaceChildren(...doneView(topic, lesson, questions?.paas));
    return;
  }

  const number = clampScreen(screenParam, screens.length);
  const before = await recordScreen(subtopicId, number, screens.length);
  if (before.status === 'not_started') logEvent('progress', { subtopicId, status: 'started' });
  const adaptive = (await getAdaptive(subtopicId)) ?? initialAdaptiveState();
  if (!ctx.isCurrent()) return;

  const screen = screens[number - 1];
  const isLast = number === screens.length;
  // Layar soal: Lanjut terbuka setelah soal selesai, atau bila layar ini sudah pernah dilewati.
  const locked = isItemScreen(screen) && number >= before.furthestScreen && before.status !== 'done';

  const nav = stepNav({
    prevHref: number > 1 ? `${base}/${number - 1}` : null,
    nextHref: isLast ? `${base}/selesai` : `${base}/${number + 1}`,
    nextLabel: isLast ? STR.lesson.finish : STR.lesson.next,
    locked,
  });

  const env = { items, nav, subtopicId, base, screens, adaptive };
  root.replaceChildren(
    appBar({
      title: lesson.title,
      position: STR.lesson.position(number, screens.length),
      backHref: MENU_HREF,
      backLabel: STR.lesson.backToMenu,
      asHeading: true,
    }),
    h('section', { className: 'screen', 'aria-label': screenLabel(screen) }, renderScreen(screen, env)),
    nav.el,
  );
}

function screenLabel(screen) {
  const label = STR.lesson.labels[screen.type];
  return typeof label === 'function' ? label(screen.index, screen.total) : label;
}

function renderScreen(screen, env) {
  const heading = h('p', { className: 'screen-label' }, screenLabel(screen));
  switch (screen.type) {
    case 'context':
      return [heading, h('div', { className: 'card' }, h('p', { className: 'lead' }, screen.text))];
    case 'concept':
      return [
        heading,
        h(
          'div',
          { className: 'card' },
          h('p', { className: 'lead' }, screen.text),
          screen.formula
            ? h(
                'p',
                { className: 'formula' },
                h('span', {}, STR.lesson.formulaLead),
                fraction(screen.formula.numerator, screen.formula.denominator),
              )
            : null,
        ),
      ];
    case 'equal_share':
      return [heading, h('div', { className: 'card' }, equalShare(screen))];
    case 'worked_example':
      return [heading, workedExample(screen)];
    case 'faded_example':
    case 'practice_item':
      return [heading, itemScreen(screen, env)];
    default:
      return [heading, h('p', {}, `Jenis layar "${screen.type}" belum didukung.`)];
  }
}

/**
 * Layar soal: pengerjaan + soal kembar setelah pembahasan (F07) + aturan adaptif (docs/03).
 */
function itemScreen(screen, env) {
  const { items, nav, subtopicId, base, screens } = env;
  const givenSteps = screen.type === 'faded_example' ? screen.givenSteps : [];
  let adaptive = env.adaptive;

  const solverSlot = h('div', {});
  const messages = h('div', { className: 'screen-messages', 'aria-live': 'polite' });

  const mount = (item, isTwin) => {
    const solver = itemSolver(item, {
      givenSteps,
      support: tableSupport({ screenType: screen.type, givenSteps, counterHidden: adaptive.counterHidden }),
      onComplete: (result) => handleComplete(item, result, isTwin),
      onEvent: (event) =>
        event.kind === 'explain'
          ? logEvent('explain', { subtopicId, itemId: event.itemId, text: event.text })
          : logAttempt(event, { context: 'lesson', subtopicId }),
    });
    // replaceChildren() mengubah null menjadi teks "null", jadi susun daftar tanpa null.
    const children = isTwin ? [h('p', { className: 'screen-label' }, STR.twin.label), solver] : [solver];
    solverSlot.replaceChildren(...children);
  };

  async function handleComplete(item, result, isTwin) {
    nav.unlock();
    const cards = [];
    await recordErrors(subtopicId, codesFromResult(result));

    // Pertanyaan alasan (self_explain) tidak memengaruhi aturan adaptif.
    if (screen.type === 'practice_item' && item.type !== 'self_explain') {
      adaptive = nextAdaptiveState(adaptive, result);
      await saveAdaptive(subtopicId, adaptive);
      const message = adaptiveMessage(adaptive);
      if (message === 'fluent') {
        cards.push(
          feedbackCard('info', STR.adaptive.fluent, [
            { label: STR.adaptive.skipAhead, onClick: () => (location.hash = `${base}/selesai`) },
          ]),
        );
      } else if (message === 'review') {
        const example = workedExampleScreen(screens);
        cards.push(
          feedbackCard(
            'info',
            STR.adaptive.review,
            example
              ? [{ label: STR.adaptive.reviewExample, onClick: () => (location.hash = `${base}/${example}`) }]
              : [],
          ),
        );
      }
    }

    const twin = !isTwin && classifyResult(result) === 'revealed' ? findTwin(items.values(), item.id) : null;
    if (twin) {
      cards.push(
        feedbackCard('info', STR.twin.offer, [
          {
            label: STR.twin.button,
            primary: true,
            onClick: () => {
              messages.replaceChildren();
              mount(twin, true);
              solverSlot.scrollIntoView({ block: 'start' });
            },
          },
        ]),
      );
    }
    messages.replaceChildren(...cards);
  }

  mount(items.get(screen.itemRef), false);
  return h('div', {}, solverSlot, messages);
}

/** Contoh-dikerjakan: langkah dibuka satu per satu oleh siswa (penjelasan pelan, EL02/EL04). */
function workedExample(screen) {
  const steps = screen.steps.map((step, index) =>
    h(
      'li',
      { className: 'worked-step' },
      h('p', { className: 'worked-step-number' }, STR.lesson.stepNumber(index + 1)),
      h('p', {}, step.text),
    ),
  );
  let shown = 0;
  const list = h('ol', { className: 'worked-steps', 'aria-live': 'polite' });
  const more = h('button', { type: 'button', className: 'btn btn-secondary btn-block' }, STR.lesson.nextStep);

  const showNext = () => {
    steps[shown - 1]?.classList.remove('is-current');
    list.append(steps[shown]);
    steps[shown].classList.add('is-current');
    shown += 1;
    more.hidden = shown >= steps.length;
  };
  more.addEventListener('click', showNext);
  showNext();

  const table = screen.table
    ? frequencyTable({
        table: screen.table,
        unit: screen.unit,
        valueLabel: screen.valueLabel,
        frequencyLabel: screen.frequencyLabel,
        showProducts: true,
      })
    : dataTable({ values: screen.data, unit: screen.unit, ...tableSupport({ screenType: 'worked_example' }) });

  return h(
    'div',
    { className: 'worked-example' },
    screen.text ? h('div', { className: 'card prompt' }, h('p', {}, screen.text)) : null,
    table.el,
    list,
    more,
  );
}

/** Skala usaha mental Paas (1–9), sekali per subbab, hanya pada mode penelitian (docs/08 B.4). */
function effortCard(subtopicId, paas) {
  if (!paas || getResearchState().paas[subtopicId]) return null;
  const message = h('div', { 'aria-live': 'polite' });
  const scale = ratingScale({ question: paas.question, min: paas.min, max: paas.max, labels: paas.labels });
  const save = h('button', { type: 'submit', className: 'btn btn-primary' }, STR.effort.save);
  return h(
    'form',
    {
      className: 'card effort-card',
      onSubmit: async (event) => {
        event.preventDefault();
        const value = scale.value();
        if (value === null) {
          message.replaceChildren(feedbackCard('info', STR.effort.choose));
          return;
        }
        await logEvent('effort', { scale: 'paas', subtopicId, itemNo: 1, value });
        saveResearchState({ paas: { ...getResearchState().paas, [subtopicId]: value } });
        scale.disable();
        save.hidden = true;
        message.replaceChildren(feedbackCard('success', STR.effort.thanks));
      },
    },
    h('h2', {}, STR.effort.title),
    scale.el,
    message,
    save,
  );
}

function doneView(topic, lesson, paas = null) {
  const next = nextSubtopic(topic, lesson.id);
  return [
    appBar({ title: lesson.title, backHref: MENU_HREF, backLabel: STR.lesson.backToMenu }),
    h(
      'section',
      { className: 'card done' },
      h('p', { className: 'done-icon', 'aria-hidden': 'true' }, '✓'),
      h('h1', {}, STR.lesson.done.title),
      h('p', {}, STR.lesson.done.body(lesson.title)),
      effortCard(lesson.id, paas),
      h(
        'div',
        { className: 'stack' },
        next
          ? h(
              'a',
              { href: `#/mean/${subtopicSlug(next.id)}/1`, className: 'btn btn-primary' },
              STR.lesson.done.next(next.title),
            )
          : null,
        h('a', { href: MENU_HREF, className: `btn ${next ? 'btn-secondary' : 'btn-primary'}` }, STR.lesson.done.menu),
      ),
    ),
  ];
}
