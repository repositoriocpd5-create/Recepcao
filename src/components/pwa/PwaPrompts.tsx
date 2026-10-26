import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, CheckCircle2, Compass, Copy, Download, Loader2, Menu, MoreHorizontal, MoreVertical, RefreshCw, Share, Smartphone, SquarePlus, Wifi, X, Zap } from 'lucide-react';
import {
  applyUpdate,
  closeInstallSheet,
  detectIosBrowser,
  detectMobileBrowser,
  dismissInstalledNotice,
  iosBrowserCanInstall,
  isInstallAvailable,
  isMobileDevice,
  markInstalled,
  openInstallSheet,
  promptInstall,
  usePwa,
  waitForInstallPrompt,
  wasInstalled,
} from '@/pwa/pwa';

// "Agora não" pausa o convite por 30 minutos. Pausas longas (ou por aba, que no iPhone
// fica aberta por dias) faziam o convite sumir; "Entendi" não pausa, só fecha.
const DISMISS_KEY = 'sme-pwa-install-dismissed-until';
const DISMISS_MINUTES = 30;
// Link que sempre abre o convite, ignorando a pausa (ex.: enviar por WhatsApp): /?instalar
const FORCE_PARAM = 'instalar';
// Depois de tocar em "Instalar", o convite não abre sozinho por 7 dias (a pessoa já agiu).
const ATTEMPT_DAYS = 7;
// O convite automático aparece no máximo uma vez por visita, mesmo que a página recarregue.
const SHOWN_SESSION_KEY = 'sme-pwa-install-auto-shown';

const wasDismissedRecently = () => {
  try { return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now(); } catch { return false; }
};

const rememberAttempt = () => {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + ATTEMPT_DAYS * 86_400_000)); } catch {}
};

const wasAutoShownThisVisit = () => {
  try { return sessionStorage.getItem(SHOWN_SESSION_KEY) === '1'; } catch { return false; }
};

const rememberAutoShown = () => {
  try { sessionStorage.setItem(SHOWN_SESSION_KEY, '1'); } catch {}
};

const rememberDismiss = () => {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MINUTES * 60_000)); } catch {}
};

const BENEFITS = [
  { Icon: Smartphone, text: 'Abre direto da tela inicial, em tela cheia' },
  { Icon: Zap, text: 'Carrega mais rápido no dia a dia do balcão' },
  { Icon: Wifi, text: 'Atualizações automáticas, sem reinstalar' },
];

// Passo a passo no iPhone/iPad: o botão Compartilhar fica em lugares diferentes em cada navegador.
const IOS_STEPS = {
  safari: [
    { Icon: Share, text: <>Toque em <strong>Compartilhar</strong> na barra inferior (ou no menu <strong>⋯</strong>)</> },
    { Icon: SquarePlus, text: <>Role e escolha <strong>Adicionar à Tela de Início</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
  chrome: [
    { Icon: Share, text: <>Toque em <strong>Compartilhar</strong>, no topo, ao lado do endereço</> },
    { Icon: SquarePlus, text: <>Role e escolha <strong>Adicionar à Tela de Início</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
  edge: [
    { Icon: MoreHorizontal, text: <>Toque no menu <strong>⋯</strong> na barra inferior</> },
    { Icon: Share, text: <>Toque em <strong>Compartilhar</strong> e escolha <strong>Adicionar à Tela de Início</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
  firefox: [
    { Icon: Menu, text: <>Toque no menu <strong>☰</strong> e depois em <strong>Compartilhar</strong></> },
    { Icon: SquarePlus, text: <>Escolha <strong>Adicionar à Tela de Início</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
};

// Navegador do iPhone que não instala apps (iOS antigo ou navegador embutido de outro app).
const IOS_SAFARI_STEPS = [
  { Icon: Copy, text: <>Toque em <strong>Copiar link</strong> abaixo</> },
  { Icon: Compass, text: <>Abra o <strong>Safari</strong> e cole o link na barra de endereço</> },
  { Icon: SquarePlus, text: <>Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong></> },
];

// Passo a passo quando o navegador Android não libera a instalação nativa.
const ANDROID_STEPS = {
  chrome: [
    { Icon: MoreVertical, text: <>Toque no menu <strong>⋮</strong> no canto superior do navegador</> },
    { Icon: Download, text: <>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Instalar</strong></> },
  ],
  samsung: [
    { Icon: Menu, text: <>Toque no menu <strong>☰</strong> na barra inferior</> },
    { Icon: SquarePlus, text: <>Escolha <strong>Adicionar página a</strong> → <strong>Tela inicial</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
  firefox: [
    { Icon: MoreVertical, text: <>Toque no menu <strong>⋮</strong> do navegador</> },
    { Icon: Download, text: <>Escolha <strong>Instalar</strong> ou <strong>Adicionar à tela inicial</strong></> },
    { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
  ],
  other: [
    { Icon: MoreVertical, text: <>Abra o <strong>menu</strong> do navegador</> },
    { Icon: Download, text: <>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></> },
    { Icon: CheckCircle2, text: <>Confirme a instalação</> },
  ],
};

// Convite de instalação (Android / iPhone), aviso de nova versão e confirmação de instalação.
export const PwaPrompts = () => {
  const pwa = usePwa();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  // iPhone/iPad: primeiro o convite com "Instalar"; o passo a passo aparece ao tocar nele.
  const [iosPassos, setIosPassos] = useState(false);

  // Ao abrir o sistema no celular (fora do app instalado), o convite aparece em seguida.
  useEffect(() => {
    const url = new URL(window.location.href);
    const forcado = url.searchParams.has(FORCE_PARAM);
    if (forcado) {
      url.searchParams.delete(FORCE_PARAM);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    // iPads maiores que 1024 px não passam em isMobileDevice(), mas também instalam pelo Compartilhar.
    if (pwa.isStandalone || !(pwa.isIos || isMobileDevice())) return;
    if (!forcado && (wasDismissedRecently() || wasAutoShownThisVisit())) return;
    let cancelado = false;
    const timer = window.setTimeout(async () => {
      // App já instalado neste aparelho: não insiste (os botões "Instalar o app" continuam disponíveis).
      if (!forcado && (await wasInstalled())) return;
      if (cancelado) return;
      rememberAutoShown();
      openInstallSheet();
    }, 900);
    return () => { cancelado = true; window.clearTimeout(timer); };
  }, [pwa.isStandalone, pwa.isIos]);

  // Cada abertura do convite começa pela pergunta, não pelo passo a passo.
  useEffect(() => {
    if (pwa.installSheetOpen) setIosPassos(false);
  }, [pwa.installSheetOpen]);

  // Se a instalação nativa ficar disponível com o passo a passo aberto, volta para o botão "Instalar".
  useEffect(() => {
    if (pwa.canInstall) setShowManualSteps(false);
  }, [pwa.canInstall]);

  useEffect(() => {
    if (!pwa.justInstalled) return;
    const timer = window.setTimeout(dismissInstalledNotice, 6000);
    return () => window.clearTimeout(timer);
  }, [pwa.justInstalled]);

  useEffect(() => {
    if (!pwa.installSheetOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pwa.installSheetOpen]);

  const dismiss = () => {
    rememberDismiss();
    setShowManualSteps(false);
    closeInstallSheet();
  };

  /** "Entendi": a pessoa vai instalar agora, então o convite fecha sem pausar. */
  const concluirPassos = () => {
    setShowManualSteps(false);
    closeInstallSheet();
  };

  const handleInstall = async () => {
    // A pessoa já decidiu instalar: o convite não reabre sozinho, qualquer que seja o resultado.
    rememberAttempt();
    // O iPhone não tem instalação automática: mostra onde tocar.
    if (pwa.isIos && !pwa.canInstall) {
      setIosPassos(true);
      return;
    }
    setIsInstalling(true);
    try {
      // O Chrome pode levar alguns segundos para liberar a instalação nativa.
      const nativeReady = pwa.canInstall || (await waitForInstallPrompt(3000));
      if (!nativeReady) {
        setShowManualSteps(true);
        return;
      }
      const accepted = await promptInstall();
      if (accepted) markInstalled();
      setShowManualSteps(false);
      closeInstallSheet();
    } finally {
      setIsInstalling(false);
    }
  };

  const iosBrowser = pwa.isIos ? detectIosBrowser() : null;
  const iosPrecisaSafari = pwa.isIos && !iosBrowserCanInstall();
  const iosSteps = iosPrecisaSafari || iosBrowser === 'other' || !iosBrowser ? IOS_SAFARI_STEPS : IOS_STEPS[iosBrowser];
  const steps = pwa.isIos && !pwa.canInstall
    ? iosPassos ? iosSteps : null
    : showManualSteps ? ANDROID_STEPS[detectMobileBrowser()] : null;
  // Seta animada apontando onde fica o botão Compartilhar.
  const setaCompartilhar = steps && steps !== IOS_SAFARI_STEPS ? (iosBrowser === 'chrome' ? 'topo' : iosBrowser === 'safari' ? 'baixo' : null) : null;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setLinkCopiado(true);
      window.setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      window.prompt('Copie o endereço do sistema:', window.location.origin);
    }
  };

  return createPortal(
    <>
      {pwa.installSheetOpen && isInstallAvailable(pwa) && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" aria-describedby="pwa-install-desc">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-[#082b57]/50 backdrop-blur-[2px]" onClick={dismiss} />
          <section className="relative w-full max-w-md rounded-t-3xl border border-[#d7e6f6] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-[#102755] shadow-[0_-18px_48px_rgba(8,43,87,.3)] sm:rounded-3xl sm:pb-6 dark:border-slate-800 dark:bg-[#0f1422] dark:text-slate-100">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#d7e6f6] sm:hidden dark:bg-slate-700" aria-hidden="true" />
            <button type="button" onClick={dismiss} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-[#526d91] hover:bg-[#f2f7ff] dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Fechar"><X className="h-5 w-5" /></button>

            <div className="flex flex-col items-center pt-3 text-center">
              <img src="/icons/icon-192.png?v=4" alt="" width={80} height={80} className="h-20 w-20 rounded-[22px] shadow-[0_14px_28px_-12px_rgba(0,90,156,.75)]" />
              <h2 id="pwa-install-title" className="mt-4 text-xl font-extrabold">Deseja instalar o App?</h2>
              <p id="pwa-install-desc" className="mt-1 text-sm text-[#52647d] dark:text-slate-400">
                Tenha o <strong className="text-[#005a9c] dark:text-sky-300">SMEDU Recepção</strong> na tela inicial do seu aparelho.
              </p>
            </div>

            {steps ? (
              <>
              <ol className="mt-5 space-y-2" aria-label="Como instalar">
                {steps.map(({ Icon, text }, index) => (
                  <li key={index} className="flex items-center gap-3 rounded-2xl border border-[#e3ecf7] bg-[#f6faff] px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-[#101625]">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#005a9c] text-xs font-bold text-white">{index + 1}</span>
                    <span className="flex-1 text-[#37475e] dark:text-slate-300">{text}</span>
                    <Icon className="h-5 w-5 shrink-0 text-[#087ef5]" aria-hidden="true" />
                  </li>
                ))}
              </ol>
              {setaCompartilhar === 'baixo' && (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#005a9c] dark:text-sky-300">
                  <ArrowDown className="h-4 w-4 animate-bounce" /> O botão Compartilhar fica logo abaixo desta tela
                </p>
              )}
              {iosPrecisaSafari && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  Neste navegador o iPhone não permite instalar apps. Use o <strong>Safari</strong>.
                </p>
              )}
              <p className="mt-3 text-center text-[11px] text-[#68809f] dark:text-slate-500">Se o app já estiver instalado, abra pelo ícone <strong>SMEDU Recepção</strong> na tela inicial.</p>
              </>
            ) : (
              <ul className="mt-5 space-y-2">
                {BENEFITS.map(({ Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-[#37475e] dark:text-slate-300">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#edf5ff] text-[#087ef5] dark:bg-blue-950/60 dark:text-sky-300"><Icon className="h-4 w-4" /></span>
                    {text}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={dismiss} className="min-h-12 rounded-xl border border-[#d7e6f6] text-sm font-bold text-[#526d91] hover:bg-[#f2f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087ef5] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Agora não
              </button>
              {steps === IOS_SAFARI_STEPS ? (
                <button type="button" onClick={copiarLink} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#005a9c] text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(0,90,156,.9)] hover:bg-[#0877c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5]">
                  {linkCopiado ? <><CheckCircle2 className="h-4 w-4" />Link copiado</> : <><Copy className="h-4 w-4" />Copiar link</>}
                </button>
              ) : steps ? (
                <button type="button" onClick={concluirPassos} className="min-h-12 rounded-xl bg-[#005a9c] text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(0,90,156,.9)] hover:bg-[#0877c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5]">
                  Entendi
                </button>
              ) : (
                <button type="button" onClick={handleInstall} disabled={isInstalling} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#005a9c] text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(0,90,156,.9)] hover:bg-[#0877c9] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5]">
                  {isInstalling ? <><Loader2 className="h-4 w-4 animate-spin" />Preparando…</> : <><Download className="h-4 w-4" />Instalar</>}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Chrome no iPhone: o Compartilhar fica no topo, à direita do endereço. */}
      {pwa.installSheetOpen && setaCompartilhar === 'topo' && (
        <div className="pointer-events-none fixed right-3 top-[max(8px,env(safe-area-inset-top))] z-[81] flex flex-col items-end gap-1 text-white" aria-hidden="true">
          <ArrowUp className="h-8 w-8 animate-bounce drop-shadow-[0_2px_6px_rgba(0,0,0,.5)]" />
          <span className="rounded-full bg-[#005a9c] px-3 py-1 text-xs font-bold shadow-lg">Compartilhar</span>
        </div>
      )}

      {/* Nova versão disponível */}
      {pwa.updateReady && (
        <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[75] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#0a71bb] bg-[linear-gradient(160deg,#075fa7_0%,#005a9c_48%,#043c74_100%)] p-3 text-white shadow-[0_18px_40px_-14px_rgba(4,60,116,.8)] md:bottom-6 md:right-6 md:left-auto md:mx-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15"><RefreshCw className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Nova versão disponível</p>
            <p className="text-xs text-white/80">Atualize para usar as últimas melhorias.</p>
          </div>
          <button type="button" onClick={applyUpdate} className="min-h-10 shrink-0 rounded-xl bg-white px-4 text-sm font-bold text-[#005a9c] hover:bg-[#edf5ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Atualizar
          </button>
        </div>
      )}

      {/* Confirmação de instalação */}
      {pwa.justInstalled && !pwa.updateReady && (
        <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[75] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-500/30 bg-white p-3 text-[#102755] shadow-[0_18px_40px_-14px_rgba(8,43,87,.45)] md:bottom-6 md:right-6 md:left-auto md:mx-0 dark:bg-[#0f1422] dark:text-slate-100">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-[#16a34a]" />
          <p className="flex-1 text-sm font-semibold">App instalado! Abra pelo ícone na tela inicial.</p>
          <button type="button" onClick={dismissInstalledNotice} className="grid h-9 w-9 place-items-center rounded-full text-[#526d91] hover:bg-[#f2f7ff] dark:hover:bg-slate-800" aria-label="Fechar aviso"><X className="h-4 w-4" /></button>
        </div>
      )}
    </>,
    document.body,
  );
};
