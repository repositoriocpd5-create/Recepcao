import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ClipboardList, Loader2, MoonStar, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  agoraBrasilia,
  ccoService,
  formatarData,
  hojeBrasilia,
  novoIdentificador,
  prepararFoto,
  validarFoto,
} from '@/services/ccoService';
import { CcoOcorrencia, UserProfile } from '@/types';
import { Campo, CampoHora, caixaCampo, horaValida } from './campos';
import { CampoFoto, FotoSelecionada } from './CampoFoto';
import { Cartao, Confirmacao, IconeTitulo, botaoPrimario, botaoSecundario } from './ui';

const DESCRICAO_MIN = 10;
const DESCRICAO_MAX = 4000;
const ORIENTACAO = 'Descreva o que aconteceu, o local ou a câmera envolvida e outras informações que ajudem no atendimento.';

type CampoId = 'data' | 'horaInicio' | 'horaFim' | 'descricao' | 'foto';
type Erros = Partial<Record<CampoId, string>>;
type Estado = 'parado' | 'enviando' | 'sucesso' | 'erro';

const ORDEM_CAMPOS: CampoId[] = ['data', 'horaInicio', 'horaFim', 'descricao', 'foto'];
const ID_CAMPO: Record<CampoId, string> = {
  data: 'cco-data',
  horaInicio: 'cco-hora-inicio',
  horaFim: 'cco-hora-fim',
  descricao: 'cco-descricao',
  foto: 'cco-foto',
};

const diaSeguinteDe = (data: string) => {
  const d = new Date(`${data}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

interface Props {
  user: UserProfile;
  unidadeId: string;
  unidadeNome?: string;
  onRegistrada: (ocorrencia: CcoOcorrencia) => void;
}

export const FormularioOcorrencia: React.FC<Props> = ({ user, unidadeId, unidadeNome, onRegistrada }) => {
  const [data, setData] = useState(hojeBrasilia);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [emAndamento, setEmAndamento] = useState(false);
  const [diaSeguinte, setDiaSeguinte] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [foto, setFoto] = useState<FotoSelecionada | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [estado, setEstado] = useState<Estado>('parado');
  const [mensagemEnvio, setMensagemEnvio] = useState('');
  const [perguntarDiaSeguinte, setPerguntarDiaSeguinte] = useState(false);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  // Trava contra clique duplo e identificador do envio (repetir o mesmo envio não duplica).
  const enviando = useRef(false);
  const idEnvio = useRef<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const temDados = Boolean(horaInicio || horaFim || emAndamento || descricao.trim() || foto || data !== hojeBrasilia());

  // Libera a memória da prévia da foto.
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  /** Qualquer alteração depois de um envio com erro vira um novo envio. */
  const alterou = (campo?: CampoId) => {
    idEnvio.current = null;
    if (estado === 'erro' || estado === 'sucesso') setEstado('parado');
    if (campo && erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const mudarHoraInicio = (valor: string) => { setHoraInicio(valor); setDiaSeguinte(false); alterou('horaInicio'); };
  const mudarHoraFim = (valor: string) => { setHoraFim(valor); setDiaSeguinte(false); alterou('horaFim'); };

  const receberFoto = async (arquivo: File) => {
    alterou('foto');
    const problema = validarFoto(arquivo);
    if (problema) {
      setErros((atual) => ({ ...atual, foto: problema }));
      return;
    }
    setProcessandoFoto(true);
    try {
      const blob = await prepararFoto(arquivo);
      setFoto({ nome: arquivo.name || 'foto.jpg', blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setErros((atual) => ({ ...atual, foto: err instanceof Error ? err.message : 'Não foi possível ler a foto.' }));
    } finally {
      setProcessandoFoto(false);
    }
  };

  const validar = (): Erros => {
    const novos: Erros = {};
    const hoje = hojeBrasilia();
    const agora = agoraBrasilia();
    if (!data) novos.data = 'Informe a data da ocorrência.';
    else if (data > hoje) novos.data = 'A data não pode ser futura.';

    if (!horaInicio) novos.horaInicio = 'Informe o horário inicial.';
    else if (!horaValida(horaInicio)) novos.horaInicio = 'Horário inválido. Use o formato 24 h, por exemplo 08:30 ou 14:05.';
    else if (data === hoje && horaInicio > agora) novos.horaInicio = 'Este horário ainda não chegou.';

    if (!emAndamento) {
      if (!horaFim) novos.horaFim = 'Informe o horário final ou marque “Ocorrência em andamento”.';
      else if (!horaValida(horaFim)) novos.horaFim = 'Horário inválido. Use o formato 24 h, por exemplo 17:45.';
      else if (data === hoje && (diaSeguinte || horaFim > agora) && !novos.horaInicio) {
        novos.horaFim = 'Este horário ainda não chegou. Se a ocorrência continua, marque “Ocorrência em andamento”.';
      }
    }

    const texto = descricao.trim();
    if (!texto) novos.descricao = 'Descreva o que aconteceu.';
    else if (texto.length < DESCRICAO_MIN) novos.descricao = `Descreva com pelo menos ${DESCRICAO_MIN} caracteres.`;
    else if (texto.length > DESCRICAO_MAX) novos.descricao = `A descrição pode ter até ${DESCRICAO_MAX} caracteres.`;
    return novos;
  };

  const focarPrimeiroErro = (lista: Erros) => {
    const primeiro = ORDEM_CAMPOS.find((campo) => lista[campo]);
    if (!primeiro) return;
    const elemento = document.getElementById(ID_CAMPO[primeiro]);
    elemento?.focus();
    elemento?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const limpar = () => {
    if (foto) URL.revokeObjectURL(foto.url);
    setData(hojeBrasilia());
    setHoraInicio('');
    setHoraFim('');
    setEmAndamento(false);
    setDiaSeguinte(false);
    setDescricao('');
    setFoto(null);
    setErros({});
    setMensagemEnvio('');
    idEnvio.current = null;
  };

  const enviar = async (terminaDiaSeguinte: boolean) => {
    if (enviando.current) return;
    enviando.current = true;
    idEnvio.current ??= novoIdentificador();
    setEstado('enviando');
    setMensagemEnvio('');
    try {
      const ocorrencia = await ccoService.registrarOcorrencia(user, {
        client_request_id: idEnvio.current,
        unidade_id: unidadeId,
        data_ocorrencia: data,
        hora_inicio: horaInicio,
        hora_fim: emAndamento ? null : horaFim,
        em_andamento: emAndamento,
        termina_dia_seguinte: !emAndamento && terminaDiaSeguinte,
        descricao: descricao.trim(),
        foto: foto?.blob ?? null,
      });
      // Só limpa depois de confirmado que os dados foram salvos.
      limpar();
      setEstado('sucesso');
      onRegistrada(ocorrencia);
      window.setTimeout(() => setEstado((atual) => (atual === 'sucesso' ? 'parado' : atual)), 3000);
    } catch (err) {
      setEstado('erro');
      setMensagemEnvio(err instanceof Error ? err.message : 'Não foi possível registrar a ocorrência.');
    } finally {
      enviando.current = false;
    }
  };

  const aoEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando.current || processandoFoto) return;
    const novos = validar();
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      setEstado('parado');
      focarPrimeiroErro(novos);
      return;
    }
    if (!emAndamento && horaFim < horaInicio && !diaSeguinte) {
      setPerguntarDiaSeguinte(true);
      return;
    }
    void enviar(!emAndamento && horaFim < horaInicio);
  };

  const ocupado = estado === 'enviando';
  const caracteres = descricao.trim().length;

  return (
    <Cartao aria-labelledby="cco-form-titulo">
      <div className="flex items-start gap-4 border-b border-[#e6edf6] px-4 py-5 sm:px-6 dark:border-slate-800">
        <IconeTitulo><ClipboardList className="h-6 w-6" aria-hidden="true" /></IconeTitulo>
        <div className="min-w-0">
          <h2 id="cco-form-titulo" className="text-xl font-extrabold tracking-tight text-[#0d2240] dark:text-slate-100">Registrar ocorrência</h2>
          <p className="mt-0.5 text-sm text-[#5f7391] dark:text-slate-400">Preencha os dados abaixo para comunicar a ocorrência ao CCO.</p>
        </div>
      </div>

      <form ref={formulario} onSubmit={aoEnviar} noValidate className="px-4 pb-5 pt-5 sm:px-6">
        <p className="sr-only">Campos marcados com asterisco são obrigatórios.</p>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-3">
          <Campo id={ID_CAMPO.data} rotulo="Data da ocorrência" obrigatorio erro={erros.data}>
            <input
              id={ID_CAMPO.data}
              type="date"
              value={data}
              max={hojeBrasilia()}
              disabled={ocupado}
              onChange={(e) => { setData(e.target.value); alterou('data'); }}
              aria-invalid={Boolean(erros.data)}
              aria-describedby={erros.data ? `${ID_CAMPO.data}-erro` : undefined}
              className={cn(caixaCampo(erros.data), 'font-medium')}
            />
          </Campo>

          <Campo id={ID_CAMPO.horaInicio} rotulo="Horário inicial" obrigatorio erro={erros.horaInicio}>
            <CampoHora id={ID_CAMPO.horaInicio} valor={horaInicio} onChange={mudarHoraInicio} erro={erros.horaInicio} disabled={ocupado} rotuloAgora="Usar o horário atual no horário inicial" />
          </Campo>

          <Campo
            id={ID_CAMPO.horaFim}
            rotulo="Horário final"
            obrigatorio={!emAndamento}
            erro={erros.horaFim}
          >
            <CampoHora
              id={ID_CAMPO.horaFim}
              valor={emAndamento ? '' : horaFim}
              onChange={mudarHoraFim}
              erro={erros.horaFim}
              disabled={ocupado || emAndamento}
              rotuloAgora="Usar o horário atual no horário final"
            />
            {diaSeguinte && !emAndamento && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
                Termina no dia seguinte ({formatarData(diaSeguinteDe(data))})
                <button type="button" onClick={() => setDiaSeguinte(false)} className="ml-1 rounded px-1 underline underline-offset-2 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                  desfazer
                </button>
              </p>
            )}
            <label className="mt-2 inline-flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-lg pr-2 text-sm font-medium text-[#3b4d68] dark:text-slate-300">
              <input
                type="checkbox"
                checked={emAndamento}
                disabled={ocupado}
                onChange={(e) => {
                  setEmAndamento(e.target.checked);
                  setDiaSeguinte(false);
                  alterou('horaFim');
                }}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-[#a9bdd6] accent-[#0b63ce] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]"
              />
              Ocorrência em andamento
            </label>
          </Campo>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <Campo
            id={ID_CAMPO.descricao}
            rotulo="Ocorrência"
            obrigatorio
            erro={erros.descricao}
          >
            <textarea
              id={ID_CAMPO.descricao}
              value={descricao}
              disabled={ocupado}
              onChange={(e) => { setDescricao(e.target.value); alterou('descricao'); }}
              placeholder={ORIENTACAO}
              rows={6}
              maxLength={DESCRICAO_MAX}
              aria-invalid={Boolean(erros.descricao)}
              aria-describedby={`${ID_CAMPO.descricao}-contador${erros.descricao ? ` ${ID_CAMPO.descricao}-erro` : ''}`}
              className={cn(caixaCampo(erros.descricao), 'min-h-[180px] resize-y py-3 leading-relaxed')}
            />
            <p id={`${ID_CAMPO.descricao}-contador`} className="mt-1 text-right text-[11px] tabular-nums text-[#7a8ba3] dark:text-slate-500">
              {caracteres < DESCRICAO_MIN ? `mínimo ${DESCRICAO_MIN} caracteres · ` : ''}{caracteres}/{DESCRICAO_MAX}
            </p>
          </Campo>

          <div className="min-w-0">
            <span className="mb-1.5 block text-sm font-bold text-[#10233f] dark:text-slate-200" id={`${ID_CAMPO.foto}-rotulo`}>Foto</span>
            <CampoFoto
              id={ID_CAMPO.foto}
              foto={foto}
              processando={processandoFoto}
              erro={erros.foto}
              disabled={ocupado}
              onArquivo={receberFoto}
              onRemover={() => {
                if (foto) URL.revokeObjectURL(foto.url);
                setFoto(null);
                alterou('foto');
              }}
            />
          </div>
        </div>

        {estado === 'erro' && mensagemEnvio && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">A ocorrência não foi registrada.</p>
              <p className="mt-0.5">{mensagemEnvio}</p>
              <p className="mt-1 text-rose-700/80 dark:text-rose-300/80">Os dados continuam no formulário. Confira e tente novamente.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-4 border-t border-[#e6edf6] pt-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <p className="text-sm text-[#5f7391] dark:text-slate-400">
            Confira as informações antes de enviar.
            <span className="block text-xs">
              Será registrada por <strong className="font-semibold text-[#3b4d68] dark:text-slate-300">{user.nome_completo}</strong>
              {unidadeNome ? <> · {unidadeNome}</> : null}
            </span>
          </p>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={ocupado}
              onClick={() => (temDados ? setConfirmarLimpar(true) : limpar())}
              className={botaoSecundario}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar formulário
            </button>
            <button
              type="submit"
              disabled={ocupado || processandoFoto}
              aria-busy={ocupado}
              className={cn(
                botaoPrimario,
                'min-w-[230px]',
                estado === 'sucesso' && 'bg-green-600 hover:bg-green-600 shadow-[0_10px_20px_-12px_rgba(5,150,105,.9)]',
                estado === 'erro' && 'bg-rose-600 hover:bg-rose-700 shadow-none',
              )}
            >
              {estado === 'enviando' ? (
                <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Registrando…</>
              ) : estado === 'sucesso' ? (
                <><Check className="h-5 w-5" aria-hidden="true" /> Ocorrência registrada</>
              ) : estado === 'erro' ? (
                <><RotateCcw className="h-5 w-5" aria-hidden="true" /> Tentar novamente</>
              ) : (
                <><Check className="h-5 w-5" aria-hidden="true" /> Registrar ocorrência</>
              )}
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {estado === 'enviando' ? 'Registrando a ocorrência.' : estado === 'sucesso' ? 'Ocorrência registrada.' : ''}
        </p>
      </form>

      <Confirmacao
        aberta={perguntarDiaSeguinte}
        titulo="A ocorrência terminou no dia seguinte?"
        mensagem={
          <>
            O horário final (<strong>{horaFim}</strong>) é menor que o inicial (<strong>{horaInicio}</strong>).
            {' '}Confirme se a ocorrência começou em {formatarData(data)} e terminou em <strong>{formatarData(diaSeguinteDe(data))}</strong>.
          </>
        }
        confirmar="Sim, terminou no dia seguinte"
        cancelar="Não, corrigir o horário"
        onFechar={() => setPerguntarDiaSeguinte(false)}
        onCancelar={() => {
          setPerguntarDiaSeguinte(false);
          setErros((atual) => ({ ...atual, horaFim: 'O horário final não pode ser anterior ao inicial no mesmo dia.' }));
          window.setTimeout(() => document.getElementById(ID_CAMPO.horaFim)?.focus(), 50);
        }}
        onConfirmar={() => {
          setPerguntarDiaSeguinte(false);
          setDiaSeguinte(true);
          // Termina amanhã, mas a data é hoje: o horário final ainda não chegou.
          if (data === hojeBrasilia()) {
            setErros((atual) => ({ ...atual, horaFim: 'Este horário ainda não chegou. Se a ocorrência continua, marque “Ocorrência em andamento”.' }));
            return;
          }
          void enviar(true);
        }}
      />

      <Confirmacao
        aberta={confirmarLimpar}
        titulo="Limpar o formulário?"
        mensagem="Os dados preenchidos e a foto anexada serão descartados. Esta ação não pode ser desfeita."
        confirmar="Limpar formulário"
        cancelar="Continuar preenchendo"
        perigo
        onCancelar={() => setConfirmarLimpar(false)}
        onConfirmar={() => {
          setConfirmarLimpar(false);
          limpar();
          setEstado('parado');
        }}
      />
    </Cartao>
  );
};
