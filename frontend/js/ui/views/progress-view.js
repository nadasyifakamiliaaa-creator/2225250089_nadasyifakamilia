// Halaman Progres (F09): status subbab, skor kuis, dan kesalahan yang paling sering + "Pelajari lagi".
import { subtopicSlug } from '../../core/lesson-plan.js';
import { topErrors } from '../../core/progress-summary.js';
import { loadTopic } from '../../data/content-loader.js';
import { isLogging } from '../../data/log.js';
import { getAllProgress, getQuizRecord } from '../../data/progress.js';
import { getIdentity } from '../../data/store.js';
import { pendingCount } from '../../data/sync.js';
import { appBar } from '../components/layout.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { errorView, loadingView } from './shared.js';

const TOPIC_ID = 'mean';

export async function render(root, _params, ctx) {
  root.append(loadingView());
  let topic;
  let progress;
  let quiz;
  let pending;
  try {
    [topic, progress, quiz] = await Promise.all([loadTopic(TOPIC_ID), getAllProgress(), getQuizRecord()]);
    pending = isLogging() ? await pendingCount() : 0;
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const available = topic.subtopics.filter((subtopic) => subtopic.file);
  const done = available.filter((subtopic) => progress[subtopic.id]?.status === 'done').length;
  const titles = Object.fromEntries(topic.subtopics.map((subtopic) => [subtopic.id, subtopic.title]));
  const errors = topErrors([...Object.values(progress), quiz]);

  root.replaceChildren(
    appBar({ title: STR.appName, backHref: '#/mean', backLabel: STR.nav.menu }),
    h('h1', {}, STR.progress.title),
    h('p', { className: 'text-muted' }, STR.progress.intro),
    // replaceChildren() mengubah null menjadi teks "null"; pakai elemen kosong bila tidak ada.
    isLogging() ? researchInfo(pending) : document.createDocumentFragment(),

    h(
      'section',
      { className: 'card', 'aria-labelledby': 'progress-sections' },
      h('h2', { id: 'progress-sections' }, STR.progress.sections),
      h('p', {}, STR.progress.doneCount(done, available.length)),
      h(
        'ul',
        { className: 'progress-list' },
        available.map((subtopic) => {
          const record = progress[subtopic.id];
          const status = record?.status ?? 'not_started';
          const text =
            status === 'started'
              ? STR.menu.status.started(record.lastScreen, record.totalScreens)
              : STR.menu.status[status];
          return h(
            'li',
            { className: `is-${status}` },
            h('span', { className: 'status-icon', 'aria-hidden': 'true' }, status === 'done' ? '✓' : '•'),
            h('span', {}, h('strong', {}, subtopic.title), h('br', {}), text),
          );
        }),
      ),
    ),

    h(
      'section',
      { className: 'card', 'aria-labelledby': 'progress-quiz' },
      h('h2', { id: 'progress-quiz' }, STR.progress.quiz),
      h(
        'p',
        {},
        quiz.attempts
          ? STR.progress.quizStats(quiz.attempts, `${quiz.bestPercent}%`, `${quiz.lastPercent}%`)
          : STR.progress.quizNone,
      ),
      h('a', { href: '#/mean/kuis', className: 'btn btn-secondary' }, STR.menuExtras.quizAction),
    ),

    h(
      'section',
      { className: 'card', 'aria-labelledby': 'progress-errors' },
      h('h2', { id: 'progress-errors' }, STR.progress.errors),
      errors.length
        ? h(
            'ol',
            { className: 'error-list' },
            errors.map(({ code, count, subtopicId }) =>
              h(
                'li',
                {},
                h('p', {}, h('strong', {}, STR.errorNames[code]), ` (${STR.progress.errorCount(count)})`),
                h(
                  'a',
                  { href: `#/mean/${subtopicSlug(subtopicId)}/1`, className: 'btn btn-secondary' },
                  STR.progress.learnAgain(titles[subtopicId]),
                ),
              ),
            ),
          )
        : h('p', {}, STR.progress.errorsNone),
    ),
  );
}

function researchInfo(pending) {
  const { classCode, studentCode } = getIdentity();
  return h(
    'section',
    { className: 'card research-info' },
    h('p', {}, STR.research.connected(classCode, studentCode)),
    h('p', { className: 'text-muted' }, STR.research.pending(pending)),
  );
}
