import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Download, Loader2, Menu, MoreVertical, RefreshCw, Share, Smartphone, SquarePlus, Wifi, X, Zap } from 'lucide-react';
import {
  applyUpdate,
  closeInstallSheet,
  detectMobileBrowser,
  dismissInstalledNotice,
  isInstallAvailable,
  isMobileDevice,
  openInstallSheet,
  promptInstall,
  usePwa,
  waitForInstallPrompt,
} from '@/pwa/pwa';

// "Agora não" vale só para esta visita: ao abrir o sistema de novo, o convite volta.
const DISMISS_KEY = 'sme-pwa-install-dismissed';

const wasDismissedThisVisit = () => {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

const BENEFITS = [
  { Icon: Smartphone, text: 'Abre direto da tela inicial, em tela cheia' },
  { Icon: Zap, text: 'Carrega mais rápido no dia a dia do balcão' },
  { Icon: Wifi, text: 'Atualizações automáticas, sem reinstalar' },
];

const IOS_STEPS = [
  { Icon: Share, text: <>Toque em <strong>Compartilhar</strong> na barra do navegador</> },
  { Icon: SquarePlus, text: <>Escolha <strong>Adicionar à Tela de Início</strong></> },
  { Icon: CheckCircle2, text: <>Confirme em <strong>Adicionar</strong></> },
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

  // Ao abrir o sistema no celular (fora do app instalado), o convite aparece em seguida.
  useEffect(() => {
    if (pwa.isStandalone || !isMobileDevice() || wasDismissedThisVisit()) return;
    const timer = window.setTimeout(openInstallSheet, 900);
    return () => window.clearTimeout(timer);
  }, [pwa.isStandalone]);

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
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setShowManualSteps(false);
    closeInstallSheet();
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      // O Chrome pode levar alguns segundos para liberar a instalação nativa.
      const nativeReady = pwa.canInstall || (await waitForInstallPrompt(3000));
      if (!nativeReady) {
        setShowManualSteps(true);
        return;
      }
      const accepted = await promptInstall();
      if (accepted) closeInstallSheet();
      else dismiss();
    } finally {
      setIsInstalling(false);
    }
  };

  const steps = pwa.isIos && !pwa.canInstall ? IOS_STEPS : showManualSteps ? ANDROID_STEPS[detectMobileBrowser()] : null;

  return createPortal(
    <>
      {pwa.installSheetOpen && isInstallAvailable(pwa) && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" aria-describedby="pwa-install-desc">
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-[#082b57]/50 backdrop-blur-[2px]" onClick={dismiss} />
          <section className="relative w-full max-w-md rounded-t-3xl border border-[#d7e6f6] bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-[#102755] shadow-[0_-18px_48px_rgba(8,43,87,.3)] sm:rounded-3xl sm:pb-6 dark:border-slate-800 dark:bg-[#0f1422] dark:text-slate-100">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#d7e6f6] sm:hidden dark:bg-slate-700" aria-hidden="true" />
            <button type="button" onClick={dismiss} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-[#526d91] hover:bg-[#f2f7ff] dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Fechar"><X className="h-5 w-5" /></button>

            <div className="flex flex-col items-center pt-3 text-center">
              <img src="/icons/icon-192.png" alt="" width={80} height={80} className="h-20 w-20 rounded-[22px] shadow-[0_14px_28px_-12px_rgba(0,90,156,.75)]" />
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
              {steps ? (
                <button type="button" onClick={dismiss} className="min-h-12 rounded-xl bg-[#005a9c] text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(0,90,156,.9)] hover:bg-[#0877c9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ef5]">
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
