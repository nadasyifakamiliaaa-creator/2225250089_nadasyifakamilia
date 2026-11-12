// Beranda (F01): mulai belajar tanpa akun. Kode kelas & kode siswa dari guru bersifat opsional;
// bila diisi, log belajar dikirim ke server untuk guru/peneliti (F11). Tombol instal.
import { CONFIG } from '../../config.js';
import { getIdentity, saveIdentity } from '../../data/store.js';
import { checkClassroom, syncNow } from '../../data/sync.js';
import { canPromptInstall, isIosBrowser, onInstallChange, promptInstall } from '../../install.js';
import { navigate } from '../../router.js';
import { feedbackCard } from '../components/inputs.js';
import { h } from '../dom.js';
import { STR } from '../strings.js';

const CLASS_CODE_PATTERN = /^[A-Z0-9-]{2,20}$/;
const STUDENT_CODE_PATTERN = /^[A-Z0-9-]{1,20}$/;

let stopInstallListener = null;

function codeInput(id, value, describedBy) {
  return h('input', {
    id,
    className: 'input',
    type: 'text',
    inputmode: 'text',
    autocomplete: 'off',
    autocapitalize: 'characters',
    spellcheck: 'false',
    maxlength: 20,
    'aria-describedby': describedBy,
    value,
  });
}

export function render(root) {
  stopInstallListener?.();
  const identity = getIdentity();

  const classInput = codeInput('class-code', identity.classCode, 'class-code-hint');
  const studentInput = codeInput('student-code', identity.studentCode, 'student-code-hint');
  const studentField = h(
    'div',
    { className: 'field' },
    h('label', { for: 'student-code' }, STR.home.studentCodeLabel),
    h('span', { id: 'student-code-hint', className: 'hint' }, STR.home.studentCodeHint),
    studentInput,
  );
  const message = h('div', { 'aria-live': 'polite' });
  const submit = h('button', { type: 'submit', className: 'btn btn-primary btn-block' }, STR.home.start);

  // Kode siswa baru diminta setelah kode kelas diisi (mengurangi isian yang tidak perlu).
  const syncStudentField = () => {
    studentField.hidden = classInput.value.trim() === '';
  };
  classInput.addEventListener('input', syncStudentField);
  syncStudentField();

  const showError = (text) => {
    message.replaceChildren(feedbackCard('info', text));
  };

  async function start(event) {
    event.preventDefault();
    const classCode = classInput.value.trim().toUpperCase();
    const studentCode = studentInput.value.trim().toUpperCase();

    // Tanpa kode kelas: belajar mandiri, tidak ada data yang dicatat.
    if (classCode === '') {
      saveIdentity({ classCode: '', studentCode: '', research: null });
      navigate('/mean');
      return;
    }
    if (!CLASS_CODE_PATTERN.test(classCode)) return showError(STR.home.classCodeInvalid);
    if (!STUDENT_CODE_PATTERN.test(studentCode)) {
      studentInput.focus();
      return showError(STR.home.studentCodeRequired);
    }

    submit.disabled = true;
    const check = await checkClassroom(classCode);
    submit.disabled = false;
    if (check.status === 'unknown') {
      classInput.focus();
      return showError(STR.home.classCodeUnknown);
    }
    const research = check.status === 'ok' ? check.classroom.research : identity.research;
    saveIdentity({ classCode, studentCode, research });
    syncNow();
    navigate('/mean');
  }

  const form = h(
    'form',
    { className: 'card stack', onSubmit: start },
    h(
      'div',
      { className: 'field' },
      h('label', { for: 'class-code' }, STR.home.classCodeLabel),
      h('span', { id: 'class-code-hint', className: 'hint' }, STR.home.classCodeHint),
      classInput,
    ),
    studentField,
    message,
    submit,
  );

  const installButton = h(
    'button',
    { type: 'button', className: 'btn btn-secondary btn-block', onClick: () => promptInstall() },
    STR.install.button,
  );
  const iosHint = h('p', { className: 'install-hint' }, STR.install.iosHint);

  const updateInstallUi = () => {
    installButton.hidden = !canPromptInstall();
    iosHint.hidden = !isIosBrowser();
  };
  updateInstallUi();
  stopInstallListener = onInstallChange(updateInstallUi);

  root.append(
    h(
      'section',
      { className: 'hero' },
      h('img', { src: 'icons/icon-192.png', alt: '', width: 96, height: 96 }),
      h('h1', {}, STR.appName),
      h('p', { className: 'text-muted' }, STR.tagline),
    ),
    h(
      'section',
      { className: 'card', 'aria-labelledby': 'learn-title' },
      h('h2', { id: 'learn-title' }, STR.home.whatYouLearn),
      h('ul', { className: 'feature-list' }, STR.home.features.map((item) => h('li', {}, item))),
    ),
    form,
    h('div', { className: 'stack' }, installButton, iosHint),
    h(
      'nav',
      { className: 'link-row', 'aria-label': STR.appName },
      h('a', { href: '#/progres', className: 'btn btn-secondary' }, STR.nav.progress),
      h('a', { href: '#/pengaturan', className: 'btn btn-secondary' }, STR.nav.settings),
    ),
    h(
      'footer',
      { className: 'app-footer' },
      h('p', {}, STR.home.offlineNote),
      h('p', {}, STR.footer(CONFIG.version)),
    ),
  );
}
