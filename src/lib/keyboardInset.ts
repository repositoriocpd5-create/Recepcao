/**
 * Mantém a variável CSS --keyboard-inset com a altura do teclado virtual.
 * No Android (interactive-widget=resizes-content) ela fica 0, pois a tela já encolhe;
 * no iPhone o teclado só cobre a tela, então os modais usam a variável para subir.
 */
export const initKeyboardInset = () => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const root = document.documentElement;
  const update = () => {
    const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    root.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
};
