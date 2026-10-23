import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, FolderOpen, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { FOTO_DESCRICAO_LIMITES, FOTO_TIPOS_ACEITOS } from '@/services/ccoService';
import { MensagemErro } from './campos';

export interface FotoSelecionada {
  nome: string;
  blob: Blob;
  url: string;
}

interface CampoFotoProps {
  id: string;
  foto: FotoSelecionada | null;
  processando: boolean;
  erro?: string | null;
  disabled?: boolean;
  onArquivo: (arquivo: File) => void;
  onRemover: () => void;
}

const tamanhoLegivel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Celular: tirar foto ou escolher da galeria. Computador: arrastar ou selecionar. */
const useToque = () => {
  const [toque, setToque] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const consulta = window.matchMedia('(pointer: coarse)');
    const atualizar = () => setToque(consulta.matches);
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);
  return toque;
};

export const CampoFoto: React.FC<CampoFotoProps> = ({ id, foto, processando, erro, disabled, onArquivo, onRemover }) => {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const toque = useToque();

  const receber = (lista: FileList | null) => {
    const arquivo = lista?.[0];
    if (arquivo) onArquivo(arquivo);
  };

  const entrada = (ref: React.RefObject<HTMLInputElement>, captura?: boolean) => (
    <input
      ref={ref}
      type="file"
      accept={FOTO_TIPOS_ACEITOS.join(',')}
      {...(captura ? { capture: 'environment' as const } : {})}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        receber(e.target.files);
        e.target.value = '';
      }}
    />
  );

  const botaoPequeno =
    'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#b9cfe9] bg-white px-3 text-sm font-bold text-[#0b4fa3] transition-colors hover:bg-[#f0f6fe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800';

  return (
    <div>
      {entrada(camera, true)}
      {entrada(galeria)}

      {foto ? (
        <div className={cn('flex h-full min-h-[180px] flex-col gap-3 rounded-2xl border bg-[#f7faff] p-3 sm:flex-row dark:bg-[#0f1524]', erro ? 'border-rose-400' : 'border-[#cfdbea] dark:border-slate-700')}>
          <button
            type="button"
            onClick={() => setAmpliada(true)}
            className="group relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-[#e6eef8] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#0b63ce] sm:h-auto sm:w-44 dark:bg-slate-800"
            aria-label="Visualizar a foto em tamanho maior"
          >
            <img src={foto.url} alt="Prévia da foto anexada" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#10233f] dark:text-slate-100" title={foto.nome}>{foto.nome}</p>
              <p className="mt-0.5 text-xs text-[#5f7391] dark:text-slate-400">
                Foto pronta para envio · {tamanhoLegivel(foto.blob.size)}
              </p>
              <p className="mt-1 text-xs text-[#5f7391] dark:text-slate-400">A localização gravada pela câmera é removida antes do envio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAmpliada(true)} className={botaoPequeno} disabled={disabled}>
                <Eye className="h-4 w-4" aria-hidden="true" /> Visualizar
              </button>
              <button type="button" onClick={() => (toque ? camera : galeria).current?.click()} className={botaoPequeno} disabled={disabled}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Substituir
              </button>
              <button
                type="button"
                onClick={onRemover}
                disabled={disabled}
                className={cn(botaoPequeno, 'border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-950/30')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          id={id}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (!disabled) receber(e.dataTransfer.files);
          }}
          aria-describedby={erro ? `${id}-erro` : undefined}
          className={cn(
            'flex min-h-[196px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-4 text-center transition-colors',
            arrastando ? 'border-[#0b63ce] bg-[#eaf3ff] dark:bg-sky-500/10' : 'border-[#bcd2ec] bg-[#f7faff] dark:border-slate-700 dark:bg-[#0f1524]',
            erro && 'border-rose-400',
          )}
        >
          {processando ? (
            <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#4c6283] dark:text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Preparando a foto…
            </p>
          ) : (
            <>
              <Camera className="h-8 w-8 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
              <div>
                <p className="text-[15px] font-bold text-[#0d2240] dark:text-slate-100">Adicione uma foto</p>
                <p className="mt-0.5 text-[13px] text-[#5f7391] dark:text-slate-400">
                  {toque ? 'Tire uma foto ou escolha da galeria' : 'Arraste aqui ou selecione um arquivo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => galeria.current?.click()}
                className={cn(botaoPequeno, 'min-w-[210px] border-[#0b63ce]/60 text-[#0b63ce]')}
                disabled={disabled}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" /> {toque ? 'Escolher da galeria' : 'Selecionar foto'}
              </button>
              <span className="my-1 h-px w-full max-w-[410px] bg-[#d9e4f1] dark:bg-slate-700" aria-hidden="true" />
              <button
                type="button"
                onClick={() => camera.current?.click()}
                disabled={disabled}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-[#0b63ce] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] disabled:opacity-50 dark:text-sky-300 dark:hover:bg-slate-800"
              >
                <Camera className="h-4 w-4" aria-hidden="true" /> {toque ? 'Tirar foto' : 'Usar câmera'}
              </button>
              <p className="text-xs text-[#5f7391] dark:text-slate-400">{FOTO_DESCRICAO_LIMITES.replace('até', 'Até')}</p>
            </>
          )}
        </div>
      )}
      <MensagemErro id={`${id}-erro`}>{erro}</MensagemErro>

      {foto && (
        <Modal isOpen={ampliada} onClose={() => setAmpliada(false)} title="Foto anexada" description={foto.nome} maxWidth="3xl">
          <img src={foto.url} alt="Foto anexada à ocorrência" className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />
        </Modal>
      )}
    </div>
  );
};
