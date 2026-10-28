import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  MonitorSmartphone,
  Phone,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { perfilCco } from '@/lib/modulos';
import { cn } from '@/lib/utils';
import { FOTO_DESCRICAO_LIMITES, ORDEM_SITUACOES, SITUACOES } from '@/services/ccoService';
import { CcoSituacao } from '@/types';
import { ESTILO_SITUACAO, botaoPrimario, botaoSecundario } from './componentes/ui';

// ─── Ilustrações (vetoriais, com as cores da identidade) ────────────────────

const IlustracaoEscola: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
    <rect x="6" y="84" width="108" height="6" rx="3" className="fill-[#cfe0f7] dark:fill-sky-500/20" />
    <path d="M18 44 60 18l42 26v40H18Z" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" strokeLinejoin="round" />
    <path d="M12 46 60 14l48 32" className="fill-none stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="50" y="56" width="20" height="28" rx="2" className="fill-[#0b63ce] dark:fill-sky-500" />
    <rect x="27" y="52" width="14" height="12" rx="2" className="fill-[#dbeafe] stroke-[#0b63ce] dark:fill-sky-500/20 dark:stroke-sky-400" strokeWidth="2" />
    <rect x="79" y="52" width="14" height="12" rx="2" className="fill-[#dbeafe] stroke-[#0b63ce] dark:fill-sky-500/20 dark:stroke-sky-400" strokeWidth="2" />
    <circle cx="60" cy="38" r="6" className="fill-[#fbbf24]" />
    <path d="M60 4v10" className="stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M60 4h12l-3 4 3 4H60" className="fill-[#22c55e]" />
  </svg>
);

const IlustracaoCamera: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
    <rect x="6" y="84" width="108" height="6" rx="3" className="fill-[#cfe0f7] dark:fill-sky-500/20" />
    <path d="M18 14h10v62H18z" className="fill-[#cfe0f7] dark:fill-slate-700" />
    <path d="M28 30h18" className="stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="5" strokeLinecap="round" />
    <rect x="44" y="20" width="52" height="24" rx="8" transform="rotate(12 44 20)" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" />
    <circle cx="86" cy="40" r="7" className="fill-[#0b63ce] dark:fill-sky-500" />
    <circle cx="86" cy="40" r="2.5" className="fill-white" />
    <circle cx="56" cy="30" r="2.5" className="fill-[#ef4444]" />
    <path d="M78 54 104 76" className="stroke-[#93c5fd] dark:stroke-sky-500/50" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 5" />
    <path d="M70 58 84 80" className="stroke-[#93c5fd] dark:stroke-sky-500/50" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 5" />
    <circle cx="100" cy="18" r="10" className="fill-[#fef3c7] stroke-[#f59e0b]" strokeWidth="2.5" />
    <path d="M100 12v7M100 23v.5" className="stroke-[#b45309]" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const IlustracaoDocumento: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
    <rect x="6" y="84" width="108" height="6" rx="3" className="fill-[#cfe0f7] dark:fill-sky-500/20" />
    <rect x="30" y="8" width="56" height="74" rx="8" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" />
    <path d="M42 26h32M42 38h32M42 50h20" className="stroke-[#93c5fd] dark:stroke-sky-500/60" strokeWidth="4" strokeLinecap="round" />
    <rect x="42" y="60" width="26" height="10" rx="5" className="fill-[#dcfce7] stroke-[#16a34a]" strokeWidth="2" />
    <circle cx="88" cy="62" r="16" className="fill-[#0b63ce] dark:fill-sky-500" />
    <path d="M81 62.5 86 67l9-10" className="fill-none stroke-white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IlustracaoAtendimento: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
    <rect x="6" y="84" width="108" height="6" rx="3" className="fill-[#cfe0f7] dark:fill-sky-500/20" />
    <rect x="14" y="16" width="62" height="44" rx="10" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" />
    <path d="M26 62 22 74l14-12" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" strokeLinejoin="round" />
    <path d="M26 32h38M26 44h24" className="stroke-[#93c5fd] dark:stroke-sky-500/60" strokeWidth="4" strokeLinecap="round" />
    <circle cx="92" cy="44" r="14" className="fill-[#dbeafe] dark:fill-sky-500/20" />
    <path d="M78 44a14 14 0 0 1 28 0" className="fill-none stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="4" strokeLinecap="round" />
    <rect x="75" y="42" width="7" height="12" rx="3" className="fill-[#0b63ce] dark:fill-sky-500" />
    <rect x="102" y="42" width="7" height="12" rx="3" className="fill-[#0b63ce] dark:fill-sky-500" />
    <path d="M84 70c2-6 14-6 16 0" className="fill-none stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/** Ilustração do cabeçalho: escola, câmera e o registro chegando ao CCO. */
const IlustracaoCabecalho: React.FC = () => (
  <svg viewBox="0 0 220 110" className="h-[96px] w-auto" aria-hidden="true">
    <ellipse cx="110" cy="100" rx="104" ry="8" className="fill-[#dbeafe] dark:fill-sky-500/15" />
    <g transform="translate(0 6)"><IlustracaoEscolaG /></g>
    <path d="M86 52c22-26 46-26 64-6" className="fill-none stroke-[#93c5fd] dark:stroke-sky-500/50" strokeWidth="3" strokeDasharray="4 6" strokeLinecap="round" />
    <rect x="140" y="30" width="62" height="62" rx="12" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" />
    <path d="M152 50h38M152 62h38M152 74h22" className="stroke-[#93c5fd] dark:stroke-sky-500/60" strokeWidth="4" strokeLinecap="round" />
    <circle cx="198" cy="32" r="13" className="fill-[#0b63ce] dark:fill-sky-500" />
    <path d="M192 32.5 196.5 37l8-9" className="fill-none stroke-white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IlustracaoEscolaG: React.FC = () => (
  <g>
    <path d="M10 46 46 24l36 22v44H10Z" className="fill-white stroke-[#0b63ce] dark:fill-slate-800 dark:stroke-sky-400" strokeWidth="3" strokeLinejoin="round" />
    <path d="M6 48 46 20l40 28" className="fill-none stroke-[#0b4fa3] dark:stroke-sky-300" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="38" y="62" width="16" height="28" rx="2" className="fill-[#0b63ce] dark:fill-sky-500" />
    <rect x="18" y="56" width="12" height="10" rx="2" className="fill-[#dbeafe] dark:fill-sky-500/20" />
    <rect x="62" y="56" width="12" height="10" rx="2" className="fill-[#dbeafe] dark:fill-sky-500/20" />
    <rect x="58" y="10" width="26" height="12" rx="4" className="fill-[#0b4fa3] dark:fill-sky-600" />
    <circle cx="80" cy="16" r="3" className="fill-white" />
  </g>
);

// ─── Relógio discreto (data e hora de Brasília) ──────────────────────────────

const RelogioCompacto: React.FC = () => {
  const ler = () => {
    const agora = new Date();
    const fuso = 'America/Sao_Paulo';
    return {
      data: new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, day: '2-digit', month: 'short', weekday: 'short' }).format(agora).replace(/\./g, '').replace(/^./, (l) => l.toLocaleUpperCase('pt-BR')),
      hora: new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora),
    };
  };
  const [relogio, setRelogio] = useState(ler);
  useEffect(() => {
    let intervalo: number | undefined;
    const inicio = window.setTimeout(() => {
      setRelogio(ler());
      intervalo = window.setInterval(() => setRelogio(ler()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(inicio);
      if (intervalo) window.clearInterval(intervalo);
    };
  }, []);
  return (
    <p aria-label={`Horário de Brasília: ${relogio.hora}`} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[13px] text-[#4c6283] ring-1 ring-[#dbe6f4] dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700">
      <Clock className="h-4 w-4 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
      <span>{relogio.data}</span>
      <strong className="font-bold tabular-nums text-[#0d2240] dark:text-slate-100">{relogio.hora}</strong>
      <span className="hidden sm:inline">· Brasília</span>
    </p>
  );
};

// ─── Conteúdo ────────────────────────────────────────────────────────────────

type Assunto = 'ocorrencias' | 'cameras' | 'fotos' | 'acompanhamento' | 'equipe' | 'privacidade';
type GuiaId = 'ocorrencia' | 'camera' | 'acompanhar';

const ASSUNTOS: { id: Exclude<Assunto, 'equipe' | 'privacidade'>; rotulo: string; icone: typeof Camera }[] = [
  { id: 'ocorrencias', rotulo: 'Ocorrências', icone: ClipboardList },
  { id: 'cameras', rotulo: 'Câmeras', icone: Camera },
  { id: 'fotos', rotulo: 'Fotos', icone: ImageIcon },
  { id: 'acompanhamento', rotulo: 'Acompanhamento', icone: FileText },
];

interface Passo {
  id: string;
  titulo: string;
  texto: React.ReactNode;
  /** Texto puro para a busca. */
  busca: string;
  dica?: { titulo: string; texto: string };
  exemplo?: React.ReactNode;
}

/** Nome de botão, campo ou opção exatamente como aparece no sistema. */
const Ui: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="rounded-md bg-[#eef4fc] px-1.5 py-0.5 font-semibold text-[#0b4fa3] dark:bg-sky-500/15 dark:text-sky-200">{children}</strong>
);

/** Moldura dos exemplos: deixa claro que é ilustrativo. */
const Exemplo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <figure className="mt-3 rounded-xl border border-dashed border-[#bcd2ec] bg-[#f7faff] p-3 dark:border-slate-700 dark:bg-slate-900/40">
    <div aria-hidden="true">{children}</div>
    <figcaption className="mt-2 text-xs text-[#6b7f9b] dark:text-slate-500">Exemplo ilustrativo</figcaption>
  </figure>
);

const Marcador: React.FC<{ n: number }> = ({ n }) => (
  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f59e0b] text-xs font-extrabold text-white">{n}</span>
);

const CampoFalso: React.FC<{ rotulo: string; valor: string; icone?: React.ReactNode; largura?: string }> = ({ rotulo, valor, icone, largura = 'w-36' }) => (
  <div className={largura}>
    <p className="mb-1 text-[13px] font-bold text-[#10233f] dark:text-slate-200">{rotulo}<span className="text-rose-500">*</span></p>
    <p className="flex h-10 items-center justify-between rounded-lg border border-[#cfdbea] bg-white px-3 text-[15px] text-[#10233f] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {valor} {icone}
    </p>
  </div>
);

const ChaveFalsa: React.FC<{ ligada?: boolean; titulo: string; texto: string }> = ({ ligada, titulo, texto }) => (
  <div className="flex items-center gap-3">
    <span className={cn('relative h-7 w-12 shrink-0 rounded-full', ligada ? 'bg-[#0b63ce]' : 'bg-[#d5dde8] dark:bg-slate-700')}>
      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow', ligada ? 'left-6' : 'left-1')} />
    </span>
    <span>
      <span className="block text-sm font-bold text-[#0d2240] dark:text-slate-100">{titulo}</span>
      <span className="block text-xs text-[#5f7391] dark:text-slate-400">{texto}</span>
    </span>
  </div>
);

const PASSOS_OCORRENCIA: Passo[] = [
  {
    id: 'oc-data',
    titulo: 'Confira a data',
    busca: 'Na tela Início, em Novo registro, deixe marcado Registrar uma ocorrência. O campo Data já vem com o dia de hoje. Datas futuras não são aceitas.',
    texto: <>Na tela <Ui>Início</Ui>, em <Ui>Novo registro</Ui>, deixe marcado <Ui>Registrar uma ocorrência</Ui>. O campo <Ui>Data</Ui> já vem com o dia de hoje. Datas futuras não são aceitas.</>,
  },
  {
    id: 'oc-horarios',
    titulo: 'Informe os horários',
    busca: 'Preencha Horário inicial e Horário final no formato 24 horas. Toque no campo para escolher hora e minutos na lista, ou toque em Agora. A duração é calculada sozinha.',
    texto: <>Preencha <Ui>Horário inicial</Ui> e <Ui>Horário final</Ui> no formato 24 horas (ex.: 14:30). Toque no campo para escolher hora e minutos na lista, ou em <Ui>Agora</Ui>. A <Ui>Duração</Ui> aparece sozinha.</>,
    exemplo: (
      <Exemplo>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-start gap-1.5"><Marcador n={1} /><CampoFalso rotulo="Horário inicial" valor="20:30" icone={<Clock className="h-4 w-4 text-[#4c6283]" />} largura="w-32" /></div>
          <div className="flex items-start gap-1.5"><Marcador n={2} /><CampoFalso rotulo="Horário final" valor="20:45" icone={<Clock className="h-4 w-4 text-[#4c6283]" />} largura="w-32" /></div>
          <p className="flex h-10 items-center gap-1.5 text-sm text-[#3b4d68] dark:text-slate-300"><Clock className="h-4 w-4" /> Duração: 15 min</p>
        </div>
      </Exemplo>
    ),
    dica: { titulo: 'Terminou depois da meia-noite?', texto: 'Se o horário final for menor que o inicial, o sistema pergunta “A ocorrência terminou no dia seguinte?”. Confirme em “Sim, terminou no dia seguinte”.' },
  },
  {
    id: 'oc-andamento',
    titulo: 'Indique se ainda está acontecendo',
    busca: 'Se a ocorrência continua, ative a chave Ocorrência em andamento. O horário final fica em branco. Ainda está acontecendo? Informe o término depois em Minhas ocorrências com Salvar horário final.',
    texto: <>Se a situação continua, ative a chave <Ui>Ocorrência em andamento</Ui>. O horário final fica em branco.</>,
    exemplo: (
      <Exemplo>
        <ChaveFalsa ligada titulo="Ocorrência em andamento" texto="Ative se a ocorrência continua." />
      </Exemplo>
    ),
    dica: { titulo: 'Ainda está acontecendo?', texto: 'Ative a opção correspondente e informe o término depois: abra o registro em “Minhas ocorrências” e use “Salvar horário final”.' },
  },
  {
    id: 'oc-descricao',
    titulo: 'Descreva o fato e o local',
    busca: 'Em Descrição da ocorrência, conte o que aconteceu, o local e o que mais ajudar no atendimento. Mínimo de 10 e até 4.000 caracteres.',
    texto: <>Em <Ui>Descrição da ocorrência</Ui>, conte o que aconteceu, onde foi e quem estava envolvido. Use de 10 a 4.000 caracteres.</>,
    dica: { titulo: 'Uma boa descrição responde', texto: 'O que aconteceu? Onde (pátio, portão, sala)? Alguém se feriu? O que já foi feito?' },
  },
  {
    id: 'oc-foto',
    titulo: 'Adicione uma foto, se desejar',
    busca: 'A foto é opcional. Use Selecionar foto, Usar câmera, ou arraste a imagem para a área da foto.',
    texto: <>A foto é <Ui>Opcional</Ui>. Veja abaixo como adicionar pelo celular ou pelo computador.</>,
  },
  {
    id: 'oc-enviar',
    titulo: 'Revise e envie',
    busca: 'Confira os dados e toque em Enviar ocorrência. Aparece o protocolo; use Copiar protocolo para guardar. Limpar apaga o que foi preenchido.',
    texto: <>Confira tudo e toque em <Ui>Enviar ocorrência</Ui>. Aparece o <Ui>Protocolo</Ui> — use <Ui>Copiar protocolo</Ui> para guardar. O botão <Ui>Limpar</Ui> apaga o que foi preenchido.</>,
    exemplo: (
      <Exemplo>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#3b8cf0]/70 bg-white px-4 text-sm font-bold text-[#0b5fd0] dark:bg-slate-900"><RotateCcw className="h-4 w-4" /> Limpar</span>
          <span className="flex items-center gap-1.5"><Marcador n={1} /><span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b6be8] px-4 text-sm font-bold text-white"><Send className="h-4 w-4" /> Enviar ocorrência</span></span>
        </div>
      </Exemplo>
    ),
  },
];

const PASSOS_CAMERA: Passo[] = [
  {
    id: 'cam-tipo',
    titulo: 'Escolha o tipo de registro',
    busca: 'Em Novo registro, toque em Relatar problema em câmera(s). Aparecem os campos Detalhes do problema.',
    texto: <>Em <Ui>Novo registro</Ui>, toque em <Ui>Relatar problema em câmera(s)</Ui>. Aparece a parte <Ui>Detalhes do problema</Ui>.</>,
  },
  {
    id: 'cam-cameras',
    titulo: 'Marque as câmeras com problema',
    busca: 'Em Câmera(s) com problema, toque em + Adicionar e marque uma ou mais câmeras. Não achou? Digite em Outra câmera e toque em Incluir. Para tirar uma câmera, toque no X.',
    texto: <>Em <Ui>Câmera(s) com problema</Ui>, toque em <Ui>+ Adicionar</Ui> e marque todas as câmeras com falha. Não achou? Digite o local em <Ui>Outra câmera</Ui> e toque em <Ui>Incluir</Ui>. Para tirar uma câmera, toque no <Ui>×</Ui>.</>,
    exemplo: (
      <Exemplo>
        <div className="flex flex-wrap items-center gap-2">
          <Marcador n={1} />
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f0fc] px-3 py-1.5 text-[15px] text-[#1f3557] dark:bg-sky-500/15 dark:text-sky-100">Portão principal <X className="h-4 w-4" /></span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f0fc] px-3 py-1.5 text-[15px] text-[#1f3557] dark:bg-sky-500/15 dark:text-sky-100">Pátio <X className="h-4 w-4" /></span>
          <span className="flex items-center gap-1.5"><Marcador n={2} /><span className="text-[15px] font-semibold text-[#0b63ce] dark:text-sky-300">+ Adicionar</span></span>
        </div>
      </Exemplo>
    ),
  },
  {
    id: 'cam-problema',
    titulo: 'Diga qual é o problema',
    busca: 'Em Tipo de problema escolha Sem imagem, Imagem com falha ou chuviscada, Câmera desligada ou offline, Câmera fora de posição, Câmera danificada ou Gravação indisponível. Se nenhum servir, escolha Outro, escreva em Novo tipo de problema e toque em Adicionar.',
    texto: <>Em <Ui>Tipo de problema</Ui>, escolha a opção que mais combina (ex.: <Ui>Sem imagem</Ui>, <Ui>Câmera desligada ou offline</Ui>). Se nenhuma servir, escolha <Ui>Outro</Ui>, escreva em <Ui>Novo tipo de problema</Ui> e toque em <Ui>Adicionar</Ui>.</>,
  },
  {
    id: 'cam-quando',
    titulo: 'Informe quando a falha começou',
    busca: 'Em Quando aconteceu, preencha Data, Horário inicial e Horário final. Se a falha continua, ative Problema em andamento.',
    texto: <>Em <Ui>Quando aconteceu</Ui>, preencha a data e os horários. Se a falha continua, ative <Ui>Problema em andamento</Ui>.</>,
    exemplo: (
      <Exemplo>
        <ChaveFalsa ligada titulo="Problema em andamento" texto="Ative se a falha persistir." />
      </Exemplo>
    ),
  },
  {
    id: 'cam-descricao',
    titulo: 'Explique a falha',
    busca: 'Em Descrição do problema, explique o que aparece na tela: imagem preta, chuviscada, congelada, câmera virada. Conte desde quando e se algo aconteceu antes, como falta de luz.',
    texto: <>Em <Ui>Descrição do problema</Ui>, conte o que você vê (tela preta, imagem chuviscada ou congelada, câmera virada), desde quando, e se houve falta de luz ou chuva antes.</>,
  },
  {
    id: 'cam-enviar',
    titulo: 'Envie o relato',
    busca: 'Toque em Enviar relato. O relato recebe um protocolo como qualquer ocorrência.',
    texto: <>Toque em <Ui>Enviar relato</Ui>. O relato recebe um protocolo e aparece em <Ui>Minhas ocorrências</Ui>.</>,
  },
];

const PASSOS_ACOMPANHAR: Passo[] = [
  {
    id: 'ac-abrir',
    titulo: 'Abra “Minhas ocorrências”',
    busca: 'No menu, toque em Minhas ocorrências. No celular, use Ocorrências no menu de baixo. A lista se atualiza sozinha a cada 30 segundos.',
    texto: <>No menu, toque em <Ui>Minhas ocorrências</Ui> (no celular, <Ui>Ocorrências</Ui>, no menu de baixo). A lista se atualiza sozinha a cada 30 segundos.</>,
  },
  {
    id: 'ac-filtrar',
    titulo: 'Encontre o registro',
    busca: 'Use a busca por protocolo ou texto, as datas e os botões de situação para filtrar. Limpar filtros mostra tudo de novo.',
    texto: <>Busque pelo protocolo ou por uma palavra, use as datas e os botões de situação. <Ui>Limpar filtros</Ui> mostra tudo de novo.</>,
  },
  {
    id: 'ac-detalhe',
    titulo: 'Veja as respostas do CCO',
    busca: 'Toque no registro para abrir. Em Histórico de atendimento aparecem os andamentos da equipe, a situação e o responsável no CCO.',
    texto: <>Toque no registro. Em <Ui>Histórico de atendimento</Ui> aparecem os andamentos da equipe, com data e hora. Veja também a situação e o <Ui>Responsável no CCO</Ui>.</>,
  },
  {
    id: 'ac-editar',
    titulo: 'Precisa corrigir algo?',
    busca: 'O botão Editar aparece enquanto o administrador não visualizou o registro e o CCO não iniciou o atendimento. Depois disso aparece um cadeado.',
    texto: <>O botão <Ui>Editar</Ui> aparece enquanto o administrador ainda não visualizou o registro e o CCO não iniciou o atendimento. Depois disso, aparece um cadeado.</>,
  },
  {
    id: 'ac-termino',
    titulo: 'Informe o término',
    busca: 'Registro em andamento: abra o registro e preencha o horário final em Salvar horário final.',
    texto: <>Se você marcou “em andamento”, abra o registro, preencha o <Ui>Horário final</Ui> e toque em <Ui>Salvar horário final</Ui>.</>,
  },
];

const GUIAS: Record<GuiaId, { titulo: string; resumo: string; assunto: Assunto; passos: Passo[] }> = {
  ocorrencia: { titulo: 'Registrar uma ocorrência', resumo: 'Veja como informar o que aconteceu na sua unidade.', assunto: 'ocorrencias', passos: PASSOS_OCORRENCIA },
  camera: { titulo: 'Informar problema nas câmeras', resumo: 'Aprenda a relatar falhas em uma ou mais câmeras.', assunto: 'cameras', passos: PASSOS_CAMERA },
  acompanhar: { titulo: 'Acompanhar meus registros', resumo: 'Entenda onde consultar atualizações e respostas.', assunto: 'acompanhamento', passos: PASSOS_ACOMPANHAR },
};

interface Pergunta {
  id: string;
  pergunta: string;
  resposta: React.ReactNode;
  busca: string;
  assunto: Assunto;
  acao?: { rotulo: string; para: string };
}

const perguntasPara = (unidade: boolean): Pergunta[] => [
  {
    id: 'faq-andamento',
    pergunta: 'Como informar uma ocorrência em andamento?',
    assunto: 'ocorrencias',
    busca: 'Ative Ocorrência em andamento ou Problema em andamento e deixe o horário final em branco. Quando terminar, abra o registro e use Salvar horário final.',
    resposta: <>Ative <Ui>Ocorrência em andamento</Ui> (ou <Ui>Problema em andamento</Ui>) e deixe o horário final em branco. Quando terminar, abra o registro e use <Ui>Salvar horário final</Ui>.</>,
    acao: unidade ? { rotulo: 'Abrir Minhas ocorrências', para: '/cco/ocorrencias' } : undefined,
  },
  {
    id: 'faq-sem-foto',
    pergunta: 'Posso enviar sem foto?',
    assunto: 'fotos',
    busca: 'Sim. A foto é opcional. Envie sem foto se não tiver uma.',
    resposta: <>Sim. A foto é opcional — envie sem ela se não tiver uma.</>,
  },
  {
    id: 'faq-varias-cameras',
    pergunta: 'Como relatar problema em mais de uma câmera?',
    assunto: 'cameras',
    busca: 'Em Câmera(s) com problema, toque em + Adicionar e marque todas as câmeras. Um só relato vale para todas.',
    resposta: <>Em <Ui>Câmera(s) com problema</Ui>, toque em <Ui>+ Adicionar</Ui> e marque todas. Um só relato vale para todas as câmeras marcadas.</>,
  },
  {
    id: 'faq-resposta',
    pergunta: 'Onde acompanho a resposta do CCO?',
    assunto: 'acompanhamento',
    busca: 'Em Minhas ocorrências, abra o registro e veja o Histórico de atendimento. A situação também muda conforme o atendimento.',
    resposta: <>Em <Ui>Minhas ocorrências</Ui>, abra o registro e veja o <Ui>Histórico de atendimento</Ui>. A situação também muda conforme o atendimento.</>,
    acao: unidade ? { rotulo: 'Consultar meus registros', para: '/cco/ocorrencias' } : undefined,
  },
  {
    id: 'faq-falha',
    pergunta: 'O que fazer quando o envio falhar?',
    assunto: 'ocorrencias',
    busca: 'Os dados continuam no formulário. Confira a internet e toque em Tentar novamente. O sistema não duplica o registro.',
    resposta: <>Os dados continuam no formulário. Confira a internet e toque em <Ui>Tentar novamente</Ui>. O sistema não duplica o registro.</>,
  },
  {
    id: 'faq-quem-ve',
    pergunta: 'Quem pode visualizar os registros da minha unidade?',
    assunto: 'privacidade',
    busca: 'As pessoas da sua unidade, a equipe do CCO das unidades autorizadas e os administradores. Outras escolas não veem seus registros.',
    resposta: <>As pessoas da sua unidade, a equipe do CCO responsável pela sua escola e os administradores. Outras escolas não veem seus registros.</>,
  },
  {
    id: 'faq-corrigir',
    pergunta: 'Posso corrigir um registro já enviado?',
    assunto: 'acompanhamento',
    busca: 'Sim, enquanto o administrador não visualizou e o CCO não iniciou o atendimento. Use Editar em Minhas ocorrências.',
    resposta: <>Sim, enquanto o administrador não visualizou e o CCO não iniciou o atendimento. Use <Ui>Editar</Ui> em <Ui>Minhas ocorrências</Ui>.</>,
    acao: unidade ? { rotulo: 'Abrir Minhas ocorrências', para: '/cco/ocorrencias' } : undefined,
  },
];

interface TopicoEquipe {
  id: string;
  titulo: string;
  icone: typeof Camera;
  texto: React.ReactNode;
  busca: string;
  soAdmin?: boolean;
}

const TOPICOS_EQUIPE: TopicoEquipe[] = [
  {
    id: 'eq-filtros',
    titulo: 'Encontrar ocorrências no painel',
    icone: Search,
    busca: 'No Painel de ocorrências, use a busca, Todas as unidades, as datas e os botões de situação. Atualizar busca na hora; o painel também se atualiza sozinho a cada minuto.',
    texto: <>No <Ui>Painel de ocorrências</Ui>, combine a busca, <Ui>Todas as unidades</Ui>, as datas e os botões de situação. <Ui>Atualizar</Ui> busca na hora; o painel também se atualiza sozinho a cada minuto.</>,
  },
  {
    id: 'eq-sino',
    titulo: 'Avisos de novas ocorrências',
    icone: Bell,
    busca: 'O sininho no topo mostra as ocorrências que o administrador ainda não abriu, com a unidade de origem. Casos graves aparecem primeiro, em vermelho.',
    texto: <>O sininho no topo mostra as ocorrências que o administrador ainda não abriu e de qual unidade vieram. Casos graves aparecem primeiro, em vermelho.</>,
  },
  {
    id: 'eq-andamento',
    titulo: 'Registrar andamento e responsável',
    icone: ClipboardList,
    busca: 'Abra a ocorrência. Em Registrar andamento, escreva O que foi feito, escolha a Situação após o andamento e o Responsável pelo atendimento (ou Assumir como responsável) e toque em Adicionar andamento. O texto fica no histórico e é visível para a unidade.',
    texto: <>Abra a ocorrência. Em <Ui>Registrar andamento</Ui>, escreva <Ui>O que foi feito</Ui>, escolha a <Ui>Situação após o andamento</Ui> e o <Ui>Responsável pelo atendimento</Ui> (ou <Ui>Assumir como responsável</Ui>) e toque em <Ui>Adicionar andamento</Ui>. O texto fica no histórico e a unidade vê.</>,
  },
  {
    id: 'eq-finalizar',
    titulo: 'Finalizar e reabrir',
    icone: CheckCircle2,
    busca: 'Finalizar ocorrência pede a Solução aplicada e muda a situação para Solucionada; novos andamentos ficam bloqueados. Só o administrador usa Reabrir ocorrência, informando o motivo.',
    texto: <><Ui>Finalizar ocorrência</Ui> pede a <Ui>Solução aplicada</Ui> e muda a situação para <Ui>Solucionada</Ui>. Depois disso, novos andamentos ficam bloqueados. Só o administrador usa <Ui>Reabrir ocorrência</Ui>, informando o motivo.</>,
  },
  {
    id: 'eq-grave',
    titulo: 'Casos graves',
    icone: AlertTriangle,
    busca: 'Quando o texto fala de roubo, violência, briga, abuso ou outro crime, a ocorrência mostra Caso grave com a sugestão de extrair as imagens das câmeras e guardar uma cópia na nuvem.',
    texto: <>Se o texto fala de roubo, violência, briga, abuso ou outro crime, a ocorrência mostra <Ui>Caso grave</Ui> com a sugestão de extrair as imagens das câmeras do período e guardar uma cópia na nuvem.</>,
  },
  {
    id: 'eq-excluir',
    titulo: 'Excluir (administrador)',
    icone: ShieldCheck,
    soAdmin: true,
    busca: 'Excluir ocorrência pede o motivo. A ocorrência some para todos e uma cópia fica guardada no log do sistema.',
    texto: <><Ui>Excluir ocorrência</Ui> pede o motivo. A ocorrência some para todos e uma cópia fica guardada no <Ui>Log do sistema</Ui>.</>,
  },
];

// ─── Busca ───────────────────────────────────────────────────────────────────

const normalizar = (texto: string) => texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');

interface ItemBusca {
  id: string;
  titulo: string;
  texto: string;
  assunto: Assunto;
  secao: string;
  guia?: GuiaId;
  pergunta?: string;
}

/** Trecho do texto em volta da primeira palavra encontrada, com a palavra destacada. */
const Trecho: React.FC<{ texto: string; termos: string[] }> = ({ texto, termos }) => {
  const limpo = normalizar(texto);
  const posicao = termos.map((t) => limpo.indexOf(t)).filter((p) => p >= 0).sort((a, b) => a - b)[0] ?? 0;
  const inicio = Math.max(0, posicao - 50);
  const pedaco = (inicio > 0 ? '…' : '') + texto.slice(inicio, inicio + 150) + (inicio + 150 < texto.length ? '…' : '');
  // Destaca os termos preservando acentos do texto original.
  const partes: React.ReactNode[] = [];
  const limpoPedaco = normalizar(pedaco);
  let i = 0;
  while (i < pedaco.length) {
    const termo = termos.find((t) => t && limpoPedaco.startsWith(t, i));
    if (termo) {
      partes.push(<mark key={i} className="rounded bg-amber-100 px-0.5 text-inherit dark:bg-amber-500/30">{pedaco.slice(i, i + termo.length)}</mark>);
      i += termo.length;
    } else {
      partes.push(pedaco[i]);
      i += 1;
    }
  }
  return <>{partes}</>;
};

// ─── Peças da página ─────────────────────────────────────────────────────────

const cartao = 'rounded-2xl border border-[#e2eaf4] bg-white shadow-[0_10px_30px_-22px_rgba(16,48,96,.45)] dark:border-slate-800 dark:bg-[#121826] dark:shadow-none';
const tituloSecao = 'text-xl font-extrabold tracking-tight text-[#0d2240] sm:text-2xl dark:text-slate-50';
const linkAjuda = 'inline-flex items-center gap-1 text-[15px] font-bold text-[#0b63ce] underline-offset-4 group-hover:underline dark:text-sky-300';

const ICONE_SITUACAO: Record<CcoSituacao, typeof CheckCircle2> = Object.fromEntries(
  ORDEM_SITUACOES.map((s) => [s, ESTILO_SITUACAO[s].icone]),
) as Record<CcoSituacao, typeof CheckCircle2>;

const PassoGuia: React.FC<{ passo: Passo; numero: number }> = ({ passo, numero }) => (
  <li id={passo.id} tabIndex={-1} className="relative scroll-mt-28 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce]">
    <div className="flex gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0b63ce] text-base font-extrabold text-white shadow-[0_8px_16px_-10px_rgba(11,99,206,.9)]">{numero}</span>
      <div className="min-w-0 flex-1 pb-1">
        <h4 className="text-[17px] font-extrabold text-[#0d2240] dark:text-slate-100">{passo.titulo}</h4>
        <p className="mt-1 text-base leading-relaxed text-[#3b4d68] dark:text-slate-300">{passo.texto}</p>
        {passo.exemplo}
        {passo.dica && (
          <div className="mt-3 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-950/20">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            <p className="text-[15px] text-amber-900 dark:text-amber-100"><strong className="font-bold">{passo.dica.titulo}</strong> {passo.dica.texto}</p>
          </div>
        )}
      </div>
    </div>
  </li>
);

const ItemPergunta: React.FC<{ item: Pergunta; aberta: boolean; onAlternar: () => void }> = ({ item, aberta, onAlternar }) => {
  const idResposta = `${item.id}-resposta`;
  return (
    <li id={item.id} tabIndex={-1} className="scroll-mt-28 focus:outline-none">
      <h3>
        <button
          type="button"
          aria-expanded={aberta}
          aria-controls={idResposta}
          onClick={onAlternar}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-bold text-[#0d2240] transition-colors hover:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce] sm:px-5 dark:text-slate-100 dark:hover:bg-slate-800/40"
        >
          {item.pergunta}
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-[#0b63ce] motion-safe:transition-transform dark:text-sky-300', aberta && 'rotate-180')} aria-hidden="true" />
        </button>
      </h3>
      <div id={idResposta} role="region" aria-label={item.pergunta} hidden={!aberta}>
        {aberta && (
          <div className="px-4 pb-4 motion-safe:animate-[cco-ajuda-abrir_180ms_ease-out] sm:px-5">
            <p className="text-base leading-relaxed text-[#3b4d68] dark:text-slate-300">{item.resposta}</p>
            {item.acao && (
              <Link to={item.acao.para} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#0b63ce] px-4 text-sm font-bold text-white hover:bg-[#0a56b4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]">
                {item.acao.rotulo} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────

export const CcoAjudaPage: React.FC = () => {
  const { user } = useAuth();
  const perfil = perfilCco(user);
  const unidade = perfil === 'unidade';
  const equipe = perfil === 'equipe' || perfil === 'admin';
  const admin = perfil === 'admin';

  const [busca, setBusca] = useState('');
  const [assunto, setAssunto] = useState<Assunto | null>(null);
  const [guia, setGuia] = useState<GuiaId>('ocorrencia');
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const areaGuia = useRef<HTMLElement>(null);

  const perguntas = useMemo(() => perguntasPara(unidade), [unidade]);
  const topicosEquipe = TOPICOS_EQUIPE.filter((t) => !t.soAdmin || admin);

  const indice = useMemo<ItemBusca[]>(() => {
    const itens: ItemBusca[] = [];
    (Object.keys(GUIAS) as GuiaId[]).forEach((id) => {
      GUIAS[id].passos.forEach((p) => itens.push({ id: p.id, titulo: `${GUIAS[id].titulo}: ${p.titulo}`, texto: [p.busca, p.dica ? `${p.dica.titulo} ${p.dica.texto}` : ''].join(' '), assunto: GUIAS[id].assunto, secao: 'Passo a passo', guia: id }));
    });
    itens.push(
      { id: 'situacoes', titulo: 'Entenda a situação do seu registro', texto: ORDEM_SITUACOES.map((s) => `${SITUACOES[s].rotulo}: ${SITUACOES[s].descricao}`).join(' '), assunto: 'acompanhamento', secao: 'Situações' },
      { id: 'fotos', titulo: 'Como adicionar uma foto', texto: `No celular: Tirar foto ou Escolher da galeria. No computador: Selecionar foto, Usar câmera ou arraste a imagem. ${FOTO_DESCRICAO_LIMITES}. A foto é reduzida antes do envio e a localização gravada pela câmera é removida.`, assunto: 'fotos', secao: 'Fotos' },
      { id: 'falhou', titulo: 'Não conseguiu enviar?', texto: 'Os dados continuam no formulário. Confira a internet, toque em Tentar novamente. O sistema não duplica o registro. Foto acima de 10 MB ou em outro formato não é aceita.', assunto: 'ocorrencias', secao: 'Dificuldades' },
      { id: 'privacidade', titulo: 'Privacidade e acesso', texto: 'Cada unidade vê só os próprios registros. As fotos ficam em armazenamento privado e abrem por um link temporário. As ações ficam registradas no log do sistema.', assunto: 'privacidade', secao: 'Privacidade' },
    );
    perguntas.forEach((q) => itens.push({ id: q.id, titulo: q.pergunta, texto: q.busca, assunto: q.assunto, secao: 'Dúvidas frequentes', pergunta: q.id }));
    if (equipe) topicosEquipe.forEach((t) => itens.push({ id: t.id, titulo: t.titulo, texto: t.busca, assunto: 'equipe', secao: 'Equipe do CCO' }));
    return itens;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntas, equipe, admin]);

  const termos = normalizar(busca).split(/\s+/).filter((t) => t.length > 1);
  const resultados = termos.length || assunto
    ? indice.filter((item) => {
        if (assunto && item.assunto !== assunto) return false;
        const alvo = normalizar(`${item.titulo} ${item.texto}`);
        return termos.every((t) => alvo.includes(t));
      })
    : [];
  const pesquisando = termos.length > 0 || assunto !== null;

  /** Abre o que for preciso (guia ou pergunta), rola até lá e leva o foco. */
  const irPara = (item: Pick<ItemBusca, 'id' | 'guia' | 'pergunta'>) => {
    if (item.guia) setGuia(item.guia);
    if (item.pergunta) setAbertas((atual) => new Set(atual).add(item.pergunta!));
    window.setTimeout(() => {
      const alvo = document.getElementById(item.id);
      const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      alvo?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
      alvo?.focus({ preventScroll: true });
    }, 60);
  };

  const abrirGuia = (id: GuiaId) => {
    setGuia(id);
    window.setTimeout(() => {
      const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      areaGuia.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
      document.getElementById('cco-guia-titulo')?.focus({ preventScroll: true });
    }, 40);
  };

  const alternarPergunta = (id: string) =>
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id); else nova.add(id);
      return nova;
    });

  const atalhos: { id: GuiaId; acao: string; ilustracao: React.ReactNode; fundo: string }[] = [
    { id: 'ocorrencia', acao: 'Ver passo a passo', ilustracao: <IlustracaoEscola className="h-20 w-auto" />, fundo: 'from-[#eaf3ff] to-white' },
    { id: 'camera', acao: 'Ver orientações', ilustracao: <IlustracaoCamera className="h-20 w-auto" />, fundo: 'from-[#eef2ff] to-white' },
    { id: 'acompanhar', acao: 'Como acompanhar', ilustracao: <IlustracaoDocumento className="h-20 w-auto" />, fundo: 'from-[#ecfdf5] to-white' },
  ];

  return (
    <div className="space-y-6 text-base">
      {/* Cabeçalho */}
      <header className="overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#eaf3ff_0%,#f6f9ff_60%,#ffffff_100%)] px-5 pb-5 pt-4 ring-1 ring-[#dbe6f4] sm:px-8 dark:bg-[linear-gradient(135deg,#0f1b33_0%,#111827_100%)] dark:ring-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Você está em" className="flex items-center gap-1.5 text-sm text-[#5f7391] dark:text-slate-400">
            <Link to="/" className="rounded text-[#0b63ce] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300">Início</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link to="/cco" className="rounded text-[#0b63ce] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:text-sky-300">CCO</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-current="page" className="font-bold text-[#0d2240] dark:text-slate-100">Ajuda</span>
          </nav>
          <RelogioCompacto />
        </div>
        <div className="mt-3 flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-[#0d2240] sm:text-[34px] dark:text-slate-50">Central de Ajuda do CCO</h1>
            <p className="mt-1.5 max-w-2xl text-base text-[#4c6283] sm:text-[17px] dark:text-slate-300">Aprenda a registrar ocorrências, informar problemas nas câmeras e acompanhar seus registros.</p>
          </div>
          <div className="hidden shrink-0 md:block"><IlustracaoCabecalho /></div>
        </div>

        {/* Busca */}
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_14px_32px_-22px_rgba(16,48,96,.6)] ring-1 ring-[#dbe6f4] sm:p-5 dark:bg-[#121826] dark:ring-slate-700">
          <label htmlFor="cco-ajuda-busca" className="block text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Como podemos ajudar?</label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f7391]" aria-hidden="true" />
            <input
              id="cco-ajuda-busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque por ocorrência, câmera, foto ou situação do registro…"
              aria-describedby="cco-ajuda-resultado"
              className="h-14 w-full rounded-xl border border-[#cfdbea] bg-[#f9fbff] pl-12 pr-12 text-base text-[#10233f] placeholder:text-[#7a8ba3] focus:border-[#0b63ce] focus:outline-none focus:ring-4 focus:ring-[#0b63ce]/15 dark:border-slate-700 dark:bg-[#0f1524] dark:text-slate-100"
            />
            {busca && (
              <button type="button" onClick={() => setBusca('')} aria-label="Limpar a busca" className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#4c6283] hover:bg-[#eaf2fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Assuntos">
            {ASSUNTOS.map(({ id, rotulo, icone: Icone }) => {
              const ativo = assunto === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setAssunto(ativo ? null : id)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce]',
                    ativo ? 'border-[#0b63ce] bg-[#0b63ce] text-white' : 'border-[#cfdbea] bg-white text-[#0b4fa3] hover:border-[#9fc1e9] hover:bg-[#f2f7fe] dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200',
                  )}
                >
                  <Icone className="h-4 w-4" aria-hidden="true" /> {rotulo}
                </button>
              );
            })}
          </div>

          <div id="cco-ajuda-resultado" aria-live="polite">
            {pesquisando && (
              resultados.length ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#5f7391] dark:text-slate-400">{resultados.length} {resultados.length === 1 ? 'orientação encontrada' : 'orientações encontradas'}</p>
                  <ul className="mt-2 divide-y divide-[#edf2f8] overflow-hidden rounded-xl ring-1 ring-[#e2eaf4] dark:divide-slate-800 dark:ring-slate-800">
                    {resultados.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => irPara(item)} className="group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f5f9fe] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0b63ce] dark:hover:bg-slate-800/40">
                          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold uppercase tracking-wider text-[#6b7f9b] dark:text-slate-500">{item.secao}</span>
                            <span className="block text-base font-bold text-[#0d2240] dark:text-slate-100">{item.titulo}</span>
                            <span className="mt-0.5 block text-[15px] text-[#4c6283] dark:text-slate-400"><Trecho texto={item.texto} termos={termos} /></span>
                            <span className={cn(linkAjuda, 'mt-1 text-sm')}>Ver explicação <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#f5f8fc] p-4 text-[15px] text-[#3b4d68] dark:bg-slate-800/60 dark:text-slate-300">
                  Não encontramos uma orientação para essa busca. Tente outra palavra ou explore os assuntos abaixo.
                </p>
              )
            )}
          </div>
        </div>
      </header>

      {/* Atalhos ilustrados */}
      <section aria-labelledby="cco-atalhos-titulo">
        <h2 id="cco-atalhos-titulo" className="sr-only">Principais tarefas</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {atalhos.map(({ id, acao, ilustracao, fundo }) => (
            <button
              key={id}
              type="button"
              onClick={() => abrirGuia(id)}
              aria-controls="cco-guia"
              className={cn(
                cartao,
                'group flex items-center gap-4 bg-gradient-to-br p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgba(16,48,96,.6)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b63ce] motion-reduce:hover:translate-y-0 md:flex-col md:items-start md:p-5 dark:from-slate-900 dark:to-[#121826]',
                fundo,
                guia === id && 'ring-2 ring-[#0b63ce]/40',
              )}
            >
              <span className="shrink-0">{ilustracao}</span>
              <span className="min-w-0">
                <span className="block text-lg font-extrabold text-[#0d2240] dark:text-slate-100">{GUIAS[id].titulo}</span>
                <span className="mt-0.5 block text-[15px] text-[#4c6283] dark:text-slate-400">{GUIAS[id].resumo}</span>
                <span className={cn(linkAjuda, 'mt-2')}>{acao} <ChevronRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Guias passo a passo */}
      <section id="cco-guia" ref={areaGuia} aria-labelledby="cco-guia-titulo" className={cn(cartao, 'scroll-mt-24 p-5 sm:p-7')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#0b63ce] dark:text-sky-300">Passo a passo</p>
            <h2 id="cco-guia-titulo" tabIndex={-1} className={cn(tituloSecao, 'focus:outline-none')}>{GUIAS[guia].titulo}</h2>
          </div>
          <div role="tablist" aria-label="Escolha o guia" className="flex flex-wrap gap-1 rounded-xl bg-[#f1f6fd] p-1 dark:bg-slate-900">
            {(Object.keys(GUIAS) as GuiaId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={guia === id}
                onClick={() => setGuia(id)}
                className={cn(
                  'min-h-11 rounded-lg px-3.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]',
                  guia === id ? 'bg-white text-[#0b4fa3] shadow-sm dark:bg-slate-800 dark:text-sky-200' : 'text-[#4c6283] hover:text-[#0b4fa3] dark:text-slate-400',
                )}
              >
                {GUIAS[id].titulo}
              </button>
            ))}
          </div>
        </div>

        <ol role="tabpanel" aria-labelledby="cco-guia-titulo" className="mt-6 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
          {GUIAS[guia].passos.map((passo, i) => <PassoGuia key={passo.id} passo={passo} numero={i + 1} />)}
        </ol>

        {/* Ações operacionais: botões cheios, diferentes dos links de ajuda. */}
        <div className="mt-6 flex flex-col gap-3 border-t border-[#e6edf6] pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-[15px] text-[#4c6283] dark:text-slate-400">Pronto para fazer? Os botões abaixo abrem as telas do sistema.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {unidade && guia !== 'acompanhar' && (
              <Link to="/cco" className={botaoPrimario}><ClipboardList className="h-5 w-5" aria-hidden="true" /> Ir para o formulário</Link>
            )}
            {unidade && (
              <Link to="/cco/ocorrencias" className={guia === 'acompanhar' ? botaoPrimario : botaoSecundario}><FileText className="h-5 w-5" aria-hidden="true" /> Consultar meus registros</Link>
            )}
            {equipe && <Link to="/cco" className={botaoPrimario}><MonitorSmartphone className="h-5 w-5" aria-hidden="true" /> Abrir painel de ocorrências</Link>}
          </div>
        </div>
      </section>

      {/* Situações */}
      <section id="situacoes" tabIndex={-1} aria-labelledby="cco-situacoes-titulo" className={cn(cartao, 'scroll-mt-24 p-5 focus:outline-none sm:p-7')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="cco-situacoes-titulo" className={tituloSecao}>Entenda a situação do seu registro</h2>
            <p className="mt-1 text-base text-[#4c6283] dark:text-slate-400">A equipe do CCO atualiza a situação conforme o atendimento. Ela pode mudar em outra ordem — por exemplo, voltar para atendimento se o administrador reabrir.</p>
          </div>
          {unidade ? (
            <Link to="/cco/ocorrencias" className={cn(botaoPrimario, 'shrink-0')}><FileText className="h-5 w-5" aria-hidden="true" /> Consultar meus registros</Link>
          ) : equipe ? (
            <Link to="/cco" className={cn(botaoPrimario, 'shrink-0')}><MonitorSmartphone className="h-5 w-5" aria-hidden="true" /> Abrir painel de ocorrências</Link>
          ) : null}
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ORDEM_SITUACOES.map((s) => {
            const Icone = ICONE_SITUACAO[s];
            return (
              <li key={s} className={cn('flex items-start gap-3 rounded-2xl p-4 ring-1', ESTILO_SITUACAO[s].classe)}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 dark:bg-white/10" aria-hidden="true"><Icone className="h-5 w-5" /></span>
                <span>
                  <span className="block text-[17px] font-extrabold">{SITUACOES[s].rotulo}</span>
                  <span className="mt-0.5 block text-[15px] font-medium opacity-90">{SITUACOES[s].descricao}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Fotos */}
      <section id="fotos" tabIndex={-1} aria-labelledby="cco-fotos-titulo" className={cn(cartao, 'scroll-mt-24 p-5 focus:outline-none sm:p-7')}>
        <h2 id="cco-fotos-titulo" className={tituloSecao}>Como adicionar uma foto</h2>
        <p className="mt-1 text-base text-[#4c6283] dark:text-slate-400">A foto é opcional. Aceitamos <strong className="text-[#0d2240] dark:text-slate-100">{FOTO_DESCRICAO_LIMITES}</strong>.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-[#f3f8fe] p-5 ring-1 ring-[#dbe6f4] dark:bg-slate-900/40 dark:ring-slate-800">
            <p className="flex items-center gap-2 text-lg font-extrabold text-[#0d2240] dark:text-slate-100"><Smartphone className="h-6 w-6 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /> No celular</p>
            <ul className="mt-3 space-y-3 text-base text-[#3b4d68] dark:text-slate-300">
              <li className="flex gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span><Ui>Tirar foto</Ui> abre a câmera do aparelho.</span></li>
              <li className="flex gap-3"><ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span><Ui>Escolher da galeria</Ui> usa uma foto já salva.</span></li>
            </ul>
          </div>
          <div className="rounded-2xl bg-[#f3f8fe] p-5 ring-1 ring-[#dbe6f4] dark:bg-slate-900/40 dark:ring-slate-800">
            <p className="flex items-center gap-2 text-lg font-extrabold text-[#0d2240] dark:text-slate-100"><MonitorSmartphone className="h-6 w-6 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /> No computador</p>
            <ul className="mt-3 space-y-3 text-base text-[#3b4d68] dark:text-slate-300">
              <li className="flex gap-3"><FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span><Ui>Selecionar foto</Ui> abre as pastas do computador. Você também pode arrastar a imagem para a área da foto.</span></li>
              <li className="flex gap-3"><Camera className="mt-0.5 h-5 w-5 shrink-0 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span><Ui>Usar câmera</Ui> abre a escolha de arquivo ou a câmera, conforme o computador.</span></li>
            </ul>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[15px] text-[#4c6283] dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Antes do envio, a foto é reduzida e a localização gravada pela câmera é removida. Depois de anexar, use <Ui>Visualizar</Ui>, <Ui>Substituir</Ui> ou <Ui>Remover</Ui>.</span>
        </p>
      </section>

      {/* Dúvidas frequentes + Não conseguiu enviar */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="cco-faq-titulo" className={cn(cartao, 'overflow-hidden')}>
          <div className="flex items-center gap-3 border-b border-[#e6edf6] px-5 py-4 dark:border-slate-800">
            <IlustracaoAtendimento className="h-12 w-auto" />
            <h2 id="cco-faq-titulo" className={tituloSecao}>Dúvidas frequentes</h2>
          </div>
          <ul className="divide-y divide-[#edf2f8] dark:divide-slate-800">
            {perguntas.map((q) => <ItemPergunta key={q.id} item={q} aberta={abertas.has(q.id)} onAlternar={() => alternarPergunta(q.id)} />)}
          </ul>
        </section>

        <div className="space-y-5">
          <section id="falhou" tabIndex={-1} aria-labelledby="cco-falhou-titulo" className={cn(cartao, 'scroll-mt-24 p-5 focus:outline-none')}>
            <p className="flex items-center gap-2"><WifiOff className="h-6 w-6 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span id="cco-falhou-titulo" className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Não conseguiu enviar?</span></p>
            <ol className="mt-3 space-y-2.5 text-base text-[#3b4d68] dark:text-slate-300">
              <li className="flex gap-2.5"><Marcador n={1} /><span>Não feche a tela: <strong>os dados continuam no formulário</strong>.</span></li>
              <li className="flex gap-2.5"><Marcador n={2} /><span>Confira a internet (Wi-Fi ou dados móveis).</span></li>
              <li className="flex gap-2.5"><Marcador n={3} /><span>Toque em <Ui>Tentar novamente</Ui>. O sistema não duplica o registro.</span></li>
              <li className="flex gap-2.5"><Marcador n={4} /><span>Foto recusada? Use JPG, PNG ou WEBP com até 10 MB, ou envie sem foto.</span></li>
            </ol>
          </section>

          <section id="privacidade" tabIndex={-1} aria-labelledby="cco-priv-titulo" className={cn(cartao, 'scroll-mt-24 p-5 focus:outline-none')}>
            <p className="flex items-center gap-2"><Lock className="h-6 w-6 text-[#0b63ce] dark:text-sky-300" aria-hidden="true" /><span id="cco-priv-titulo" className="text-lg font-extrabold text-[#0d2240] dark:text-slate-100">Privacidade e acesso</span></p>
            <ul className="mt-3 space-y-2.5 text-base text-[#3b4d68] dark:text-slate-300">
              <li className="flex gap-2.5"><Users className="mt-0.5 h-5 w-5 shrink-0 text-[#4c6283]" aria-hidden="true" />Cada unidade vê só os próprios registros.</li>
              <li className="flex gap-2.5"><ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#4c6283]" aria-hidden="true" />As fotos ficam em armazenamento privado e abrem por um link temporário.</li>
              <li className="flex gap-2.5"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#4c6283]" aria-hidden="true" />Registros, andamentos e mudanças ficam no histórico e no log do sistema, com autor e horário.</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Equipe do CCO */}
      {equipe && (
        <section aria-labelledby="cco-equipe-titulo" className={cn(cartao, 'p-5 sm:p-7')}>
          <div className="flex items-center gap-4">
            <IlustracaoAtendimento className="h-16 w-auto shrink-0" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#0b63ce] dark:text-sky-300">{admin ? 'Equipe do CCO e administração' : 'Equipe do CCO'}</p>
              <h2 id="cco-equipe-titulo" className={tituloSecao}>Atender as ocorrências das unidades</h2>
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topicosEquipe.map(({ id, titulo, icone: Icone, texto }) => (
              <li key={id} id={id} tabIndex={-1} className="scroll-mt-24 rounded-2xl bg-[#f7faff] p-4 ring-1 ring-[#e2eaf4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b63ce] dark:bg-slate-900/40 dark:ring-slate-800">
                <p className="flex items-center gap-2 text-[17px] font-extrabold text-[#0d2240] dark:text-slate-100">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e3eefc] text-[#0b63ce] dark:bg-sky-500/15 dark:text-sky-300" aria-hidden="true"><Icone className="h-5 w-5" /></span>
                  {titulo}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#3b4d68] dark:text-slate-300">{texto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Emergência: separada da ajuda técnica */}
      <aside aria-labelledby="cco-emergencia" className="flex flex-col gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 sm:flex-row sm:items-center dark:border-rose-500/40 dark:bg-rose-950/30">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-600 text-white" aria-hidden="true"><Phone className="h-6 w-6" /></span>
        <div>
          <p id="cco-emergencia" className="text-lg font-extrabold text-rose-900 dark:text-rose-100">Emergência?</p>
          <p className="text-base text-rose-900 dark:text-rose-100">Não espere pelo sistema: acione a Guarda Municipal ou a Polícia Militar (<strong>190</strong>).</p>
        </div>
      </aside>
    </div>
  );
};
