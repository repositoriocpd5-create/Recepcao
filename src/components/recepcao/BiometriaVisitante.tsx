import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Fingerprint, ImagePlus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { DeviceStatus } from '@/services/identification';
import { cn } from '@/lib/utils';

/** Proporção 3:4 (retrato), adequada para reconhecimento facial e para o crachá. */
const LARGURA_FOTO = 600;
const ALTURA_FOTO = 800;

/** Recorta ao centro em 3:4, reduz e converte para JPEG. */
const gerarJpeg = (origem: CanvasImageSource, largura: number, altura: number, espelhar = false): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA_FOTO;
  canvas.height = ALTURA_FOTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Não foi possível processar a imagem.'));
  const proporcao = LARGURA_FOTO / ALTURA_FOTO;
  const recorteLargura = Math.min(largura, altura * proporcao);
  const recorteAltura = recorteLargura / proporcao;
  const x = (largura - recorteLargura) / 2;
  const y = (altura - recorteAltura) / 2;
  if (espelhar) {
    ctx.translate(LARGURA_FOTO, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(origem, x, y, recorteLargura, recorteAltura, 0, 0, LARGURA_FOTO, ALTURA_FOTO);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a foto.'))), 'image/jpeg', 0.85)
  );
};

export interface BiometriaVisitanteProps {
  foto: Blob | null;
  onFotoChange: (foto: Blob | null) => void;
  coletarDigital: boolean;
  onColetarDigitalChange: (coletar: boolean) => void;
  consentimento: boolean;
  onConsentimentoChange: (consentimento: boolean) => void;
  leitorStatus: DeviceStatus;
}

const LEITOR_PRONTO: DeviceStatus[] = ['conectado', 'aguardando_leitura', 'identificado', 'nao_encontrado'];

export const BiometriaVisitante: React.FC<BiometriaVisitanteProps> = ({
  foto,
  onFotoChange,
  coletarDigital,
  onColetarDigitalChange,
  consentimento,
  onConsentimentoChange,
  leitorStatus,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [iniciandoCamera, setIniciandoCamera] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const [previa, setPrevia] = useState<string | null>(null);

  const leitorPronto = LEITOR_PRONTO.includes(leitorStatus);
  const precisaConsentimento = Boolean(foto) || coletarDigital;

  useEffect(() => {
    if (!foto) {
      setPrevia(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const fecharCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraAberta(false);
  };

  // Desliga a câmera ao fechar o cadastro.
  useEffect(() => fecharCamera, []);

  const abrirCamera = async () => {
    setErroFoto('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErroFoto('A câmera exige HTTPS e um navegador compatível. Use "Enviar foto".');
      return;
    }
    setIniciandoCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setCameraAberta(true);
      // O <video> só existe após a renderização com a câmera aberta.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      const negado = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setErroFoto(negado
        ? 'O acesso à câmera foi negado. Libere a permissão no navegador ou use "Enviar foto".'
        : 'Nenhuma câmera disponível nesta estação. Use "Enviar foto".');
    } finally {
      setIniciandoCamera(false);
    }
  };

  const capturar = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      // A prévia é espelhada (como um espelho); a foto salva também, para coincidir com o que o operador viu.
      onFotoChange(await gerarJpeg(video, video.videoWidth, video.videoHeight, true));
      fecharCamera();
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : 'Não foi possível capturar a foto.');
    }
  };

  const enviarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setErroFoto('');
    if (!arquivo.type.startsWith('image/')) {
      setErroFoto('Selecione um arquivo de imagem (JPG ou PNG).');
      return;
    }
    try {
      const bitmap = await createImageBitmap(arquivo);
      onFotoChange(await gerarJpeg(bitmap, bitmap.width, bitmap.height));
      bitmap.close();
    } catch {
      setErroFoto('Não foi possível ler esta imagem.');
    }
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-[#dce4f0] bg-[#f8fbff] p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
      <legend className="flex items-center gap-1.5 px-1 text-xs font-bold text-[#102755] dark:text-slate-100">
        <ShieldCheck className="h-3.5 w-3.5 text-[#005a9c] dark:text-sky-300" />
        Biometria <span className="font-medium text-[#627fa5] dark:text-slate-400">(opcional)</span>
      </legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Foto do rosto */}
        <div className="rounded-lg border border-[#e3eaf4] bg-white p-3 dark:border-slate-800 dark:bg-[#121826]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4b6485] dark:text-slate-400">
            <Camera className="h-3.5 w-3.5" /> Foto do rosto
          </p>

          {cameraAberta ? (
            <div className="space-y-2">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
                {/* Guia de enquadramento do rosto */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[62%] w-[58%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.35)]" />
                </div>
                <p className="pointer-events-none absolute inset-x-0 bottom-1.5 text-center text-[10px] font-semibold text-white drop-shadow">
                  Rosto no oval, de frente e sem óculos escuros
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={capturar}
                  className="flex items-center gap-1.5 rounded-lg bg-[#005a9c] px-3 py-2 text-xs font-bold text-white hover:bg-[#004b83]"
                >
                  <Camera className="h-4 w-4" /> Capturar
                </button>
                <button
                  type="button"
                  onClick={fecharCamera}
                  className="flex items-center gap-1.5 rounded-lg border border-[#d8e3f2] px-3 py-2 text-xs font-semibold text-[#4b6485] hover:bg-[#f2f7fd] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              </div>
            </div>
          ) : previa ? (
            <div className="flex items-center gap-3">
              <img src={previa} alt="Foto do visitante" className="aspect-[3/4] w-20 shrink-0 rounded-lg object-cover ring-2 ring-emerald-500/40" />
              <div className="min-w-0 space-y-1.5">
                <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Foto pronta
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={abrirCamera}
                    className="flex items-center gap-1 rounded-md border border-[#d8e3f2] px-2 py-1 text-[11px] font-semibold text-[#005a9c] hover:bg-[#f2f7fd] dark:border-slate-700 dark:text-sky-300 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className="h-3 w-3" /> Refazer
                  </button>
                  <button
                    type="button"
                    onClick={() => onFotoChange(null)}
                    className="flex items-center gap-1 rounded-md border border-[#d8e3f2] px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={abrirCamera}
                disabled={iniciandoCamera}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#cfe0f2] bg-[#f2f7fd] px-3 py-2.5 text-xs font-bold text-[#005a9c] hover:border-[#005a9c] disabled:opacity-60 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
              >
                {iniciandoCamera ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Abrir câmera
              </button>
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-[#c7d6ea] px-3 py-2.5 text-xs font-semibold text-[#4b6485] hover:border-[#005a9c] hover:text-[#005a9c] dark:border-slate-700 dark:text-slate-300"
              >
                <ImagePlus className="h-4 w-4" /> Enviar foto
              </button>
            </div>
          )}
          <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={enviarArquivo} />
          {erroFoto && <p className="mt-2 text-[11px] text-rose-500">{erroFoto}</p>}
        </div>

        {/* Impressão digital */}
        <div className="rounded-lg border border-[#e3eaf4] bg-white p-3 dark:border-slate-800 dark:bg-[#121826]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4b6485] dark:text-slate-400">
            <Fingerprint className="h-3.5 w-3.5" /> Digital
          </p>
          <label
            className={cn(
              'flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors',
              leitorPronto
                ? 'cursor-pointer border-[#d8e3f2] text-[#102755] hover:border-[#005a9c] has-[:checked]:border-emerald-500/60 has-[:checked]:bg-emerald-50 dark:border-slate-700 dark:text-slate-100 dark:has-[:checked]:bg-emerald-500/10'
                : 'cursor-not-allowed border-dashed border-[#d8e3f2] text-[#8aa0bd] dark:border-slate-800 dark:text-slate-500'
            )}
          >
            <input
              type="checkbox"
              checked={coletarDigital}
              disabled={!leitorPronto}
              onChange={(event) => onColetarDigitalChange(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
            />
            <span>
              <span className="block font-semibold">Coletar digital ao salvar</span>
              <span className="mt-0.5 block text-[11px] leading-snug opacity-80">
                {leitorPronto
                  ? 'O visitante posiciona o dedo no leitor logo após salvar.'
                  : leitorStatus === 'nao_configurado'
                    ? 'Leitor biométrico não configurado nesta estação.'
                    : 'Leitor biométrico indisponível no momento.'}
              </span>
            </span>
          </label>
        </div>
      </div>

      {precisaConsentimento && (
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-[#5b4410] has-[:checked]:border-emerald-500/50 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100 dark:has-[:checked]:bg-emerald-500/10 dark:has-[:checked]:text-emerald-100">
          <input
            type="checkbox"
            checked={consentimento}
            onChange={(event) => onConsentimentoChange(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
            required
          />
          <span>
            <strong>O visitante autorizou</strong> a coleta e o armazenamento da {foto && coletarDigital ? 'foto e da digital' : foto ? 'foto' : 'digital'} para
            identificação no acesso à SMEDU, conforme a LGPD (art. 11). Ele pode revogar a autorização a qualquer momento.
          </span>
        </label>
      )}
    </fieldset>
  );
};
