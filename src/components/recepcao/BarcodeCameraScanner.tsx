import React, { useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type DetectedCode = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement): Promise<DetectedCode[]> };
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

// Formatos usados em crachás e etiquetas (barras lineares e 2D).
const WANTED_FORMATS = ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'];
const SCAN_INTERVAL_MS = 120;

/**
 * Leitor nativo do navegador (Chrome/Android) quando disponível; no iPhone/Safari e em navegadores
 * sem suporte usa o decodificador ZXing (WebAssembly servido pelo próprio sistema).
 */
const createDetector = async (): Promise<Detector> => {
  const native = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
  if (native?.getSupportedFormats) {
    const supported = await native.getSupportedFormats().catch(() => [] as string[]);
    const formats = WANTED_FORMATS.filter((format) => supported.includes(format));
    if (formats.includes('code_128') && formats.includes('ean_13')) return new native({ formats });
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  });
  return new BarcodeDetector({ formats: WANTED_FORMATS as never }) as unknown as Detector;
};

/** Leitura exclusivamente local: o vídeo nunca sai do dispositivo. */
export const BarcodeCameraScanner: React.FC<Props> = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let timer = 0;
    let stream: MediaStream | null = null;
    setError('');
    setReady(false);
    setTorchAvailable(false);
    setTorchOn(false);

    const stop = () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      trackRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };

    const start = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('A câmera exige HTTPS e um navegador com suporte a câmera. Use a digitação manual.');
        }
        // Câmera e decodificador em paralelo para abrir mais rápido.
        const [detector, mediaStream] = await Promise.all([
          createDetector().catch(() => { throw new Error('Não foi possível carregar o leitor de códigos. Verifique a conexão e tente novamente.'); }),
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
        ]);
        stream = mediaStream;
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }

        const [track] = stream.getVideoTracks();
        trackRef.current = track;
        const capabilities = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
        // Foco contínuo melhora muito a leitura de barras finas a curta distância.
        if (capabilities.focusMode?.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => undefined);
        }
        setTorchAvailable(Boolean(capabilities.torch));

        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setReady(true);

        const scan = async () => {
          if (cancelled) return;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              if (cancelled) return;
              for (const code of codes) {
                const value = code.rawValue.trim().toUpperCase();
                if (/^[A-Z0-9-]{1,64}$/.test(value)) {
                  navigator.vibrate?.(80);
                  stop();
                  onDetectedRef.current(value);
                  return;
                }
                setError('Código lido, mas o conteúdo não é um número de crachá válido. Tente outro código.');
              }
            } catch { /* quadro desfocado ou não decodificável: tenta o próximo */ }
          }
          if (!cancelled) timer = window.setTimeout(() => { void scan(); }, SCAN_INTERVAL_MS);
        };
        void scan();
      } catch (cause) {
        if (cancelled) return;
        stop();
        const exception = cause as DOMException;
        const message = exception.name === 'NotAllowedError' || exception.name === 'PermissionDeniedError'
          ? 'Acesso à câmera negado. Autorize a câmera nas permissões do navegador ou digite o código.'
          : exception.name === 'NotFoundError'
            ? 'Nenhuma câmera foi localizada neste dispositivo.'
            : exception.name === 'NotReadableError'
              ? 'A câmera está em uso por outro aplicativo. Feche-o e tente novamente.'
              : cause instanceof Error ? cause.message : 'Não foi possível iniciar a câmera.';
        setError(message);
      }
    };
    void start();
    return stop;
  }, [isOpen, attempt]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ler código pela câmera"
      description="Aponte a câmera para o código de barras ou QR Code do crachá. A leitura não registra movimentações." maxWidth="md">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Imagem da câmera para leitura do código de barras" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-[20%_8%] rounded-xl border-2 border-emerald-400/90">
            {ready && <span className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,.9)] motion-safe:animate-pulse" />}
          </div>
          {!ready && !error && <div className="absolute inset-0 flex items-center justify-center text-white text-sm"><Camera className="mr-2 h-5 w-5" /> Iniciando câmera...</div>}
          {ready && torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-pressed={torchOn}
              aria-label={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
              className={`absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full border border-white/30 backdrop-blur ${torchOn ? 'bg-amber-400 text-[#1a1200]' : 'bg-black/50 text-white'}`}
            >
              {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Centralize o código na moldura, a cerca de 15 cm, com boa iluminação e sem reflexos.</p>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          {error && <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>}
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar leitura</Button>
        </div>
      </div>
    </Modal>
  );
};
