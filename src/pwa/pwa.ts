import { useSyncExternalStore } from 'react';

// Evento do Chrome/Edge/Samsung Internet que permite abrir o diálogo nativo de instalação.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** Navegador ofereceu instalação nativa (Android / Chrome / Edge). */
  canInstall: boolean;
  /** iPhone/iPad: a instalação é manual, pelo menu Compartilhar. */
  isIos: boolean;
  /** Já está aberto como app instalado. */
  isStandalone: boolean;
  /** Nova versão baixada e aguardando o usuário confirmar. */
  updateReady: boolean;
  /** App acabou de ser instalado nesta sessão. */
  justInstalled: boolean;
  /** Modal "Deseja instalar o App?" aberto. */
  installSheetOpen: boolean;
}

const detectIos = () => {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac, mas tem tela de toque.
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
};

export type MobileBrowser = 'samsung' | 'firefox' | 'chrome' | 'other';

/** Navegador do celular, para mostrar o passo a passo certo quando não há instalação nativa. */
export const detectMobileBrowser = (): MobileBrowser => {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Chrome|CriOS|EdgA|EdgiOS/i.test(ua)) return 'chrome';
  return 'other';
};

/** Celular ou tablet com tela de toque. */
export const isMobileDevice = () =>
  window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) <= 1024;

const detectStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

let state: PwaState = {
  canInstall: false,
  isIos: detectIos(),
  isStandalone: detectStandalone(),
  updateReady: false,
  justInstalled: false,
  installSheetOpen: false,
};
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

const setState = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePwa = () => useSyncExternalStore(subscribe, () => state);

export const openInstallSheet = () => setState({ installSheetOpen: true });
export const closeInstallSheet = () => setState({ installSheetOpen: false });
export const dismissInstalledNotice = () => setState({ justInstalled: false });

/** Instalação disponível: nativa (Chrome/Edge) ou manual em qualquer celular. */
export const isInstallAvailable = (pwa: PwaState) => !pwa.isStandalone && (pwa.canInstall || pwa.isIos || isMobileDevice());

/** Aguarda o navegador liberar a instalação nativa (o Chrome pode demorar alguns segundos). */
export const waitForInstallPrompt = (timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    if (deferredPrompt) return resolve(true);
    const unsubscribe = subscribe(() => {
      if (!state.canInstall) return;
      unsubscribe();
      window.clearTimeout(timer);
      resolve(true);
    });
    const timer = window.setTimeout(() => { unsubscribe(); resolve(false); }, timeoutMs);
  });

/** Abre o diálogo nativo de instalação. Retorna true se o usuário aceitou. */
export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  setState({ canInstall: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
};

/** Ativa a versão nova; a página recarrega quando o novo service worker assumir. */
export const applyUpdate = () => {
  if (!waitingWorker) return window.location.reload();
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
};

const trackWaiting = (registration: ServiceWorkerRegistration) => {
  const markReady = (worker: ServiceWorker) => {
    waitingWorker = worker;
    setState({ updateReady: true });
  };
  // Só é atualização se já havia uma versão controlando a página.
  if (registration.waiting && navigator.serviceWorker.controller) markReady(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) markReady(installing);
    });
  });
};

let initialized = false;

export const initPwa = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    setState({ canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canInstall: false, justInstalled: true, installSheetOpen: false });
  });

  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => setState({ isStandalone: detectStandalone() }));

  // Service worker só no build de produção (no dev o Vite recarrega sozinho).
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      trackWaiting(registration);
      // Procura versões novas ao voltar para o app e a cada 30 minutos.
      const checkForUpdate = () => registration.update().catch(() => undefined);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
      window.setInterval(checkForUpdate, 30 * 60 * 1000);
    } catch (error) {
      console.error('Falha ao registrar o service worker:', error);
    }
  });
};
