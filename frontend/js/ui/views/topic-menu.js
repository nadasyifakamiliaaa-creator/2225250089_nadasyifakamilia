// Menu topik: daftar subbab dengan status progres. Semua subbab yang tersedia boleh dibuka
// ("terkunci-lunak"); urutan yang disarankan ditandai.
import { recommendedSubtopic, subtopicSlug } from '../../core/lesson-plan.js';
import { loadTopic } from '../../data/content-loader.js';
import { getAllProgress, getQuizRecord } from '../../data/progress.js';
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
  try {
    [topic, progress, quiz] = await Promise.all([loadTopic(TOPIC_ID), getAllProgress(), getQuizRecord()]);
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const recommended = recommendedSubtopic(topic, progress);
  const cards = topic.subtopics.map((subtopic, index) =>
    subtopicCard(subtopic, index + 1, progress[subtopic.id], subtopic === recommended),
  );

  root.replaceChildren(
    appBar({ title: STR.appName, backHref: '#/', backLabel: STR.backHome }),
    h('h1', {}, topic.title),
    h('p', { className: 'text-muted' }, STR.menu.intro),
    extraCard(STR.menuExtras.readinessTitle, STR.menuExtras.readinessBody, '#/mean/kesiapan', STR.menuExtras.readinessAction),
    h('ol', { className: 'subtopic-list' }, cards),
    extraCard(
      STR.menuExtras.quizTitle,
      quiz.attempts ? `${STR.menuExtras.quizBody} ${STR.menuExtras.quizBest(`${quiz.bestPercent}%`)}` : STR.menuExtras.quizBody,
      '#/mean/kuis',
      STR.menuExtras.quizAction,
    ),
    h(
      'nav',
      { className: 'link-row', 'aria-label': STR.appName },
      h('a', { href: '#/progres', className: 'btn btn-secondary' }, STR.nav.progress),
      h('a', { href: '#/pengaturan', className: 'btn btn-secondary' }, STR.nav.settings),
    ),
  );
}

function extraCard(title, body, href, action) {
  return h(
    'section',
    { className: 'card extra-card' },
    h('h2', {}, title),
    h('p', { className: 'text-muted' }, body),
    h('a', { href, className: 'btn btn-secondary' }, action),
  );
}

function subtopicCard(subtopic, number, progress, isRecommended) {
  const slug = subtopicSlug(subtopic.id);
  const status = subtopic.file ? (progress?.status ?? 'not_started') : 'soon';

  let statusText;
  if (status === 'started') {
    statusText = STR.menu.status.started(progress.lastScreen, progress.totalScreens);
  } else {
    statusText = STR.menu.status[status];
  }

  const resumeScreen = status === 'started' ? progress.lastScreen : 1;
  const action = subtopic.file
    ? h(
        'a',
        {
          href: `#/mean/${slug}/${resumeScreen}`,
          className: `btn ${isRecommended ? 'btn-primary' : 'btn-secondary'}`,
          'aria-label': `${STR.menu.action[status]}: ${subtopic.title}`,
        },
        STR.menu.action[status],
      )
    : null;

  return h(
    'li',
    { className: `card subtopic is-${status}` },
    h(
      'div',
      { className: 'subtopic-head' },
      h('p', { className: 'subtopic-number' }, STR.menu.sectionLabel(number)),
      isRecommended ? h('span', { className: 'badge' }, STR.menu.recommended) : null,
    ),
    h('h2', {}, subtopic.title),
    h(
      'p',
      { className: 'subtopic-status' },
      status === 'done' ? h('span', { className: 'status-icon', 'aria-hidden': 'true' }, '✓ ') : null,
      statusText,
    ),
    action,
  );
}
