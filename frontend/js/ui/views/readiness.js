// Cek kesiapan (F02): 5 soal prasyarat penjumlahan & pembagian (IL05). Opsional dan bukan nilai.
// Jika ≥ 2 soal salah pada percobaan pertama, tampilkan kartu "Ingat lagi"; siswa tetap boleh lanjut.
import { loadItemFile, loadTopic } from '../../data/content-loader.js';
import { logAttempt } from '../../data/log.js';
import { itemSolver } from '../components/item-solver.js';
import { appBar } from '../components/layout.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { errorView, loadingView } from './shared.js';

const TOPIC_ID = 'mean';
const REVIEW_THRESHOLD = 2;

export async function render(root, _params, ctx) {
  root.append(loadingView());
  let items;
  try {
    items = await loadItemFile(await loadTopic(TOPIC_ID), 'readiness');
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const firstTry = new Map();
  const summary = h('div', { 'aria-live': 'polite' });

  const showSummary = () => {
    const correct = [...firstTry.values()].filter(Boolean).length;
    const wrong = items.length - correct;
    summary.replaceChildren(
      h(
        'section',
        { className: 'card' },
        h('h2', {}, STR.readiness.result(correct, items.length)),
        h('p', {}, wrong >= REVIEW_THRESHOLD ? STR.readiness.review : STR.readiness.ready),
        wrong >= REVIEW_THRESHOLD
          ? h(
              'div',
              { className: 'tips' },
              h('h3', {}, STR.readiness.tipsTitle),
              h('ul', { className: 'feature-list' }, STR.readiness.tips.map((tip) => h('li', {}, tip))),
            )
          : null,
        h('a', { href: '#/mean/01/1', className: 'btn btn-primary' }, STR.readiness.start),
      ),
    );
  };

  const solvers = items.map((item, index) =>
    h(
      'li',
      { className: 'readiness-item' },
      itemSolver(item, {
        onEvent: (event) => logAttempt(event, { context: 'readiness' }),
        onComplete: (result) => {
          const step = result.steps.answer;
          firstTry.set(index, step.correct && step.attempts === 1);
          if (firstTry.size === items.length) showSummary();
        },
      }),
    ),
  );

  root.replaceChildren(
    appBar({ title: STR.readiness.title, backHref: '#/mean', backLabel: STR.lesson.backToMenu }),
    h('h1', {}, STR.readiness.title),
    h('p', { className: 'text-muted' }, STR.readiness.intro),
    h('ol', { className: 'readiness-list' }, solvers),
    summary,
  );
}
