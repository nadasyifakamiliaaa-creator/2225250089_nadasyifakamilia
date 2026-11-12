// Kuesioner beban kognitif Leppink dkk. (2013), 10 butir 0–10 (docs/08 B.4).
// Hanya untuk kelas dalam mode penelitian; diisi sekali setelah kuis akhir.
import { loadQuestionnaires } from '../../data/content-loader.js';
import { isResearchMode, logEvent } from '../../data/log.js';
import { getResearchState, saveResearchState } from '../../data/store.js';
import { feedbackCard } from '../components/inputs.js';
import { appBar } from '../components/layout.js';
import { ratingScale } from '../components/scale.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';
import { errorView, loadingView } from './shared.js';

export async function render(root, _params, ctx) {
  const header = appBar({ title: STR.questionnaire.title, backHref: '#/mean', backLabel: STR.nav.menu });

  if (!isResearchMode()) {
    root.append(header, h('section', { className: 'card' }, h('p', {}, STR.questionnaire.notResearch)));
    return;
  }
  if (getResearchState().leppinkDone) {
    root.append(header, h('section', { className: 'card' }, h('p', {}, STR.questionnaire.alreadyDone)));
    return;
  }

  root.append(loadingView());
  let instrument;
  try {
    instrument = (await loadQuestionnaires()).leppink;
  } catch (error) {
    if (ctx.isCurrent()) root.replaceChildren(errorView(error));
    return;
  }
  if (!ctx.isCurrent()) return;

  const scales = instrument.items.map((item) => ({
    item,
    scale: ratingScale({
      question: `${item.no}. ${item.text}`,
      min: instrument.min,
      max: instrument.max,
      minLabel: instrument.minLabel,
      maxLabel: instrument.maxLabel,
    }),
  }));
  const message = h('div', { 'aria-live': 'polite' });
  const submit = h('button', { type: 'submit', className: 'btn btn-primary btn-block' }, STR.questionnaire.submit);

  const form = h(
    'form',
    {
      className: 'stack',
      onSubmit: async (event) => {
        event.preventDefault();
        const missing = scales.filter(({ scale }) => scale.value() === null);
        if (missing.length) {
          message.replaceChildren(feedbackCard('info', STR.questionnaire.incomplete(missing.map((m) => m.item.no))));
          missing[0].scale.el.querySelector('input')?.focus();
          return;
        }
        submit.disabled = true;
        for (const { item, scale } of scales) {
          await logEvent('effort', {
            scale: 'leppink',
            subtopicId: null,
            itemNo: item.no,
            dimension: item.dimension,
            value: scale.value(),
          });
          scale.disable();
        }
        saveResearchState({ leppinkDone: true });
        submit.hidden = true;
        message.replaceChildren(feedbackCard('success', STR.questionnaire.thanks));
      },
    },
    scales.map(({ scale }) => h('div', { className: 'card' }, scale.el)),
    message,
    submit,
  );

  root.replaceChildren(
    header,
    h('h1', {}, STR.questionnaire.title),
    h('p', {}, instrument.intro),
    form,
  );
}
