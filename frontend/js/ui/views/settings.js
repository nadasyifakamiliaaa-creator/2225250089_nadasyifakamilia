// Pengaturan (F13): ukuran huruf, tema, cara instal, hapus progres.
import { CONFIG } from '../../config.js';
import { clearProgress } from '../../data/progress.js';
import { getSettings, saveSettings } from '../../data/store.js';
import { canPromptInstall, isStandalone, onInstallChange, promptInstall } from '../../install.js';
import { feedbackCard } from '../components/inputs.js';
import { appBar } from '../components/layout.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';

let stopInstallListener = null;

/** Kelompok tombol pilihan (radio) bergaya segmen. */
function segmented(name, legend, options, current, onChange) {
  return h(
    'fieldset',
    { className: 'segmented' },
    h('legend', { className: 'step-label' }, legend),
    h(
      'div',
      { className: 'segmented-options' },
      Object.entries(options).map(([value, label]) => {
        const id = `${name}-${value}`;
        const radio = h('input', { type: 'radio', name, id, value });
        radio.checked = value === current;
        radio.addEventListener('change', () => onChange(value));
        return h('label', { for: id, className: 'segment' }, radio, h('span', {}, label));
      }),
    ),
  );
}

export function render(root) {
  stopInstallListener?.();
  const settings = getSettings();

  // ---- Pasang aplikasi
  const installButton = h(
    'button',
    { type: 'button', className: 'btn btn-primary', onClick: () => promptInstall() },
    STR.install.button,
  );
  const installedNote = h('p', {}, STR.settings.installed);
  const updateInstall = () => {
    installButton.hidden = !canPromptInstall();
    installedNote.hidden = !isStandalone();
  };
  updateInstall();
  stopInstallListener = onInstallChange(updateInstall);

  // ---- Hapus progres (konfirmasi di dalam halaman)
  const resetSlot = h('div', { 'aria-live': 'polite' });
  const resetButton = h('button', { type: 'button', className: 'btn btn-secondary' }, STR.settings.resetButton);
  resetButton.addEventListener('click', () => {
    resetSlot.replaceChildren(
      feedbackCard('info', STR.settings.resetConfirm, [
        {
          label: STR.settings.resetYes,
          primary: true,
          onClick: async () => {
            await clearProgress();
            resetSlot.replaceChildren(feedbackCard('success', STR.settings.resetDone));
          },
        },
        { label: STR.settings.resetNo, onClick: () => resetSlot.replaceChildren() },
      ]),
    );
  });

  root.append(
    appBar({ title: STR.appName, backHref: '#/mean', backLabel: STR.nav.menu }),
    h('h1', {}, STR.settings.title),

    h(
      'section',
      { className: 'card' },
      segmented('font-size', STR.settings.fontSize, STR.settings.fontSizes, settings.fontSize, (fontSize) =>
        saveSettings({ fontSize }),
      ),
      h('p', { className: 'settings-preview' }, STR.settings.preview),
      segmented('theme', STR.settings.theme, STR.settings.themes, settings.theme, (theme) => saveSettings({ theme })),
    ),

    h(
      'section',
      { className: 'card', 'aria-labelledby': 'settings-install' },
      h('h2', { id: 'settings-install' }, STR.settings.install),
      installedNote,
      installButton,
      h('h3', {}, STR.settings.installAndroidTitle),
      h('ol', {}, STR.settings.installAndroid.map((line) => h('li', {}, line))),
      h('h3', {}, STR.settings.installIosTitle),
      h('ol', {}, STR.settings.installIos.map((line) => h('li', {}, line))),
    ),

    h(
      'section',
      { className: 'card', 'aria-labelledby': 'settings-reset' },
      h('h2', { id: 'settings-reset' }, STR.settings.reset),
      h('p', {}, STR.settings.resetBody),
      resetButton,
      resetSlot,
    ),

    h('p', { className: 'app-footer' }, STR.settings.about(CONFIG.version)),
  );
}
