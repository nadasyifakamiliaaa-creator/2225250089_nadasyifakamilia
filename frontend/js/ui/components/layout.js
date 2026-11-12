// AppBar (judul + posisi + kembali ke menu) dan StepNav (Kembali / Lanjut) — docs/05 bagian 2.
import { h } from '../dom.js';
import { STR } from '../strings.js';

/**
 * @param {{ title: string, position?: string, backHref: string, backLabel: string, asHeading?: boolean }} options
 *   asHeading: judul dijadikan <h1> (untuk halaman yang tidak punya judul utama lain)
 */
export function appBar({ title, position, backHref, backLabel, asHeading = false }) {
  return h(
    'header',
    { className: 'app-bar' },
    h('a', { href: backHref, className: 'app-bar-back', 'aria-label': backLabel }, '←'),
    h(asHeading ? 'h1' : 'p', { className: 'app-bar-title' }, title),
    position ? h('p', { className: 'app-bar-position' }, position) : null,
  );
}

/**
 * @param {{ prevHref?: string|null, nextHref: string, nextLabel?: string, locked?: boolean }} options
 * @returns {{ el: HTMLElement, unlock: () => void }}
 */
export function stepNav({ prevHref = null, nextHref, nextLabel = STR.lesson.next, locked = false }) {
  const prev = prevHref
    ? h('a', { href: prevHref, className: 'btn btn-secondary' }, STR.lesson.prev)
    : h('span', { className: 'step-nav-spacer' });

  const next = h(
    'button',
    {
      type: 'button',
      className: 'btn btn-primary',
      onClick: () => {
        location.hash = nextHref;
      },
    },
    nextLabel,
  );
  const lockedNote = h('p', { className: 'step-nav-note', id: 'step-nav-note' }, STR.lesson.lockedNext);

  const setLocked = (value) => {
    next.disabled = value;
    lockedNote.hidden = !value;
    if (value) next.setAttribute('aria-describedby', 'step-nav-note');
    else next.removeAttribute('aria-describedby');
  };
  setLocked(locked);

  const el = h('nav', { className: 'step-nav', 'aria-label': 'Navigasi layar' }, lockedNote, h('div', { className: 'step-nav-buttons' }, prev, next));
  return { el, unlock: () => setLocked(false) };
}
