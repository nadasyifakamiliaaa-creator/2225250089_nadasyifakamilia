// Router berbasis hash: #/ , #/mean , #/mean/02/3 , dst. (docs/06 bagian 3.1)
// Berbasis hash agar bekerja di hosting statis apa pun dan saat offline.

/**
 * @typedef {{ isCurrent: () => boolean }} RenderContext
 *   View asinkron memeriksa ctx.isCurrent() setelah await, agar hasil lama tidak menimpa halaman baru.
 * @typedef {{ render: (root: HTMLElement, params: string[], ctx: RenderContext) => void }} View
 * @typedef {{ pattern: RegExp, view: View }} Route
 */

export function currentPath() {
  const path = location.hash.replace(/^#/, '');
  return path.startsWith('/') ? path : '/';
}

export function navigate(path) {
  location.hash = `#${path}`;
}

/**
 * @param {HTMLElement} root
 * @param {Route[]} routes
 * @param {View} notFoundView
 */
export function startRouter(root, routes, notFoundView) {
  let renderId = 0;

  const render = () => {
    renderId += 1;
    const id = renderId;
    const ctx = { isCurrent: () => id === renderId };

    const path = currentPath();
    let view = notFoundView;
    let params = [];
    for (const route of routes) {
      const match = route.pattern.exec(path);
      if (match) {
        view = route.view;
        params = match.slice(1);
        break;
      }
    }
    root.replaceChildren();
    view.render(root, params, ctx);
    window.scrollTo(0, 0);
    // Pindahkan fokus ke isi utama agar pembaca layar mengumumkan halaman baru.
    root.focus({ preventScroll: true });
  };

  window.addEventListener('hashchange', render);
  render();
}
