import { useSyncExternalStore } from 'react';

/**
 * Indica se o teclado virtual do celular está aberto: um campo de texto em foco
 * e a área visível da tela encolhida. O foco sozinho não basta, porque no Android
 * o botão "voltar" fecha o teclado sem tirar o foco do campo.
 */
const TIPOS_SEM_TECLADO = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image']);
// Diferença mínima de altura para considerar o teclado aberto (barras do navegador variam ~60 px).
const ENCOLHIMENTO_MINIMO = 120;

let aberto = false;
let alturaCheia = 0;
let iniciado = false;
const ouvintes = new Set<() => void>();

const campoDigitavel = (elemento: Element | null) => {
  if (!(elemento instanceof HTMLElement)) return false;
  if (elemento.isContentEditable || elemento.tagName === 'TEXTAREA') return true;
  return elemento.tagName === 'INPUT' && !TIPOS_SEM_TECLADO.has((elemento as HTMLInputElement).type);
};

const alturaVisivel = () => window.visualViewport?.height ?? window.innerHeight;

const atualizar = () => {
  const altura = alturaVisivel();
  const focado = campoDigitavel(document.activeElement);
  // Sem campo em foco, a altura atual é a da tela cheia (inclusive após girar o aparelho).
  if (!focado || altura > alturaCheia) alturaCheia = altura;
  const novo = window.matchMedia('(pointer: coarse)').matches && focado && alturaCheia - altura > ENCOLHIMENTO_MINIMO;
  if (novo !== aberto) {
    aberto = novo;
    ouvintes.forEach((ouvinte) => ouvinte());
  }
};

const iniciar = () => {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  alturaCheia = alturaVisivel();
  document.addEventListener('focusin', atualizar);
  document.addEventListener('focusout', () => window.setTimeout(atualizar, 0));
  window.visualViewport?.addEventListener('resize', atualizar);
  // Reforço: alguns aparelhos demoram a avisar o redimensionamento; digitar também reavalia.
  document.addEventListener('input', atualizar);
  window.addEventListener('resize', atualizar);
};

export const useTecladoVirtual = () => {
  iniciar();
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => aberto,
    () => false
  );
};
