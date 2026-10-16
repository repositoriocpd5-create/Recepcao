import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
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

/** Leitura exclusivamente local: o vídeo nunca sai do dispositivo. */
export const BarcodeCameraScanner: React.FC<Props> = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let animationFrame = 0;
    let busy = false;
    let stream: MediaStream | null = null;
    setError('');
    setReady(false);

    const stop = () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };

    const start = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('A câmera exige HTTPS ou localhost e um navegador com suporte a câmera. Use a digitação manual.');
        }
        const ctor = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (!ctor) throw new Error('Este navegador não oferece leitura de códigos pela câmera. Utilize o leitor USB ou digitação manual.');
        const supported = ctor.getSupportedFormats ? await ctor.getSupportedFormats() : ['code_128', 'code_39'];
        const formats = ['code_128', 'code_39'].filter(format => supported.includes(format));
        if (!formats.length) throw new Error('Este navegador não suporta Code 39/Code 128. Utilize um leitor USB.');
        if (cancelled) return;
        const detector = new ctor({ formats });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' } },
        });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setReady(true);
        const scan = async () => {
          if (cancelled) return;
          if (!busy && video.readyState >= 2) {
            busy = true;
            try {
              const codes = await detector.detect(video);
              if (cancelled) return;
              for (const code of codes) {
                const value = code.rawValue.trim().toUpperCase();
                if (/^[A-Z0-9-]{1,64}$/.test(value)) {
                  stop();
                  onDetectedRef.current(value);
                  return;
                }
                setError('Código ilegível ou inválido. Posicione outro código dentro da moldura.');
              }
            } catch { /* frame desfocado ou não decodificável: tentar o próximo */ }
            finally { busy = false; }
          }
          if (!cancelled) animationFrame = window.requestAnimationFrame(() => { void scan(); });
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
            : cause instanceof Error ? cause.message : 'Não foi possível iniciar a câmera.';
        setError(message);
      }
    };
    void start();
    return stop;
  }, [isOpen, attempt]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ler código pela câmera"
      description="Aponte a câmera para o código de barras do crachá. A leitura não registra movimentações." maxWidth="md">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Imagem da câmera para leitura do código de barras" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-[20%_8%] rounded-xl border-2 border-emerald-400/90" />
          {!ready && !error && <div className="absolute inset-0 flex items-center justify-center text-white text-sm"><Camera className="mr-2 h-5 w-5" /> Iniciando câmera...</div>}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Centralize o código na moldura, com boa iluminação e sem reflexos.</p>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          {error && <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button>}
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar leitura</Button>
        </div>
      </div>
    </Modal>
  );
};
