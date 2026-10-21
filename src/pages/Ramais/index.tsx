import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Phone,
  Search,
  RefreshCw,
  Copy,
  Check,
  Pencil,
  X,
  Plus,
  School,
  Building2,
  Baby,
  Users,
  PhoneOff,
  AlertTriangle,
  Save,
  Trash2,
  ChevronRight,
  UserSearch,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTecladoVirtual } from '@/hooks/useTecladoVirtual';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/services/dataService';
import { CATEGORIAS_POR_TIPO, ORDEM_CATEGORIAS } from '@/services/ramaisUnidades';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RamalContato, RamalUnidade, RamalUnidadeTipo, Servidor, ServidorSetorVinculo, Setor } from '@/types';
import { cn } from '@/lib/utils';

type FiltroTipo = 'todos' | RamalUnidadeTipo;
/** Unidades: busca só no nome da unidade e no ramal. Servidores: busca só no nome das pessoas. */
type ModoBusca = 'unidades' | 'servidores';
const MODO_BUSCA_KEY = 'sme-ramais-modo-busca';
const MIN_LETRAS_SERVIDOR = 3;

/** Minúsculas e sem acentos, preservando um caractere por caractere do original. */
const normalizarCaractere = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() || c;
const normalizar = (texto: string) => Array.from(texto, normalizarCaractere).join('');

/** Chave para comparar lotações e nomes: sem acentos, maiúsculas ou espaços repetidos. */
const chave = (texto?: string | null) => normalizar(texto || '').replace(/\s+/g, ' ').trim();
/** "(DTE) Departamento de Transporte Escolar" → sigla "DTE" e nome sem a sigla. */
const SIGLA_NO_NOME = /^\s*\(([^)]+)\)\s*/;

/**
 * Servidores ativos de cada unidade: pela lotação do quadro funcional e, nos departamentos,
 * também pelas pessoas vinculadas ao setor de mesmo nome ou sigla (Departamentos & Setores).
 */
const agruparServidoresPorUnidade = (
  unidades: RamalUnidade[],
  servidores: Servidor[],
  setores: Setor[],
  vinculos: ServidorSetorVinculo[],
) => {
  const ativos = servidores.filter((servidor) => servidor.status === 'ativo');
  const porId = new Map(ativos.map((servidor) => [servidor.id, servidor]));
  const porLotacao = new Map<string, Servidor[]>();
  ativos.forEach((servidor) => {
    const lotacao = chave(servidor.lotacao);
    if (lotacao) porLotacao.set(lotacao, [...(porLotacao.get(lotacao) || []), servidor]);
  });
  const porSetor = new Map<string, Set<string>>();
  const vincular = (setorId: string, servidorId: string) => porSetor.set(setorId, (porSetor.get(setorId) || new Set()).add(servidorId));
  vinculos.forEach((vinculo) => vincular(vinculo.setor_id, vinculo.servidor_id));
  ativos.forEach((servidor) => { if (servidor.setor_id) vincular(servidor.setor_id, servidor.id); });

  const resultado = new Map<string, Servidor[]>();
  unidades.forEach((unidade) => {
    const encontrados = new Map<string, Servidor>();
    const adicionar = (servidor?: Servidor) => { if (servidor) encontrados.set(servidor.id, servidor); };
    const lotacoes = new Set([chave(unidade.lotacao), chave(unidade.nome)].filter(Boolean));
    lotacoes.forEach((lotacao) => porLotacao.get(lotacao)?.forEach(adicionar));

    if (unidade.tipo === 'departamento') {
      const sigla = chave(SIGLA_NO_NOME.exec(unidade.nome)?.[1]);
      const nome = chave(unidade.nome.replace(SIGLA_NO_NOME, ''));
      setores
        .filter((setor) => chave(setor.nome) === nome || (sigla && chave(setor.sigla) === sigla))
        .forEach((setor) => porSetor.get(setor.id)?.forEach((id) => adicionar(porId.get(id))));
    }

    if (encontrados.size) {
      resultado.set(unidade.id, [...encontrados.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    }
  });
  return resultado;
};

const iconeDaUnidade = (unidade: RamalUnidade) => {
  if (unidade.tipo === 'departamento') return Building2;
  if (unidade.categoria === 'Creches Municipais' || unidade.categoria === 'Educação Infantil') return Baby;
  return School;
};

/** Destaca os termos buscados no nome, ignorando acentos e maiúsculas. */
const Destaque: React.FC<{ texto: string; termos: string[] }> = ({ texto, termos }) => {
  if (!termos.length) return <>{texto}</>;
  const base = normalizar(texto);
  const marcado = new Array(texto.length).fill(false);
  termos.forEach((termo) => {
    for (let i = base.indexOf(termo); i >= 0; i = base.indexOf(termo, i + 1)) {
      for (let j = i; j < i + termo.length; j++) marcado[j] = true;
    }
  });
  const partes: React.ReactNode[] = [];
  let inicio = 0;
  for (let i = 1; i <= texto.length; i++) {
    if (i === texto.length || marcado[i] !== marcado[inicio]) {
      const trecho = texto.slice(inicio, i);
      partes.push(
        marcado[inicio]
          ? <mark key={inicio} className="rounded-sm bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30">{trecho}</mark>
          : trecho
      );
      inicio = i;
    }
  }
  return <>{partes}</>;
};

/** Botão de um ramal: mostra a descrição (ou "Ramal") e copia o número ao clicar. */
const RamalPill: React.FC<{
  contato: RamalContato;
  termos: string[];
  copiado: boolean;
  compacto?: boolean;
  onCopiar: () => void;
}> = ({ contato, termos, copiado, compacto, onCopiar }) => (
  <button
    type="button"
    onClick={onCopiar}
    className={cn(
      'flex max-w-full items-center gap-2 rounded-lg border transition-colors',
      compacto ? 'px-2.5 py-1' : 'px-3 py-1.5',
      copiado
        ? 'border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        : 'border-[#cfe0f2] bg-[#f2f7fd] text-[#005a9c] hover:border-[#005a9c] dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:border-sky-400'
    )}
    title={`Copiar ramal ${contato.numero}`}
    aria-label={`${contato.descricao || 'Ramal'} ${contato.numero}. Copiar`}
  >
    <span className="min-w-0 text-left leading-none">
      <span className="block truncate text-[9px] font-bold uppercase tracking-wider opacity-70">
        <Destaque texto={contato.descricao || 'Ramal'} termos={contato.descricao ? termos : []} />
      </span>
      <span className={cn('mt-0.5 block font-mono font-extrabold tabular-nums', compacto ? 'text-sm' : 'text-base')}>
        <Destaque texto={contato.numero} termos={termos} />
      </span>
    </span>
    {copiado ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-50" />}
  </button>
);

const MAX_RAMAIS_DEPARTAMENTO = 10;

export const RamaisPage: React.FC = () => {
  const { user } = useAuth();
  const podeEditar = user?.role === 'admin' || user?.role === 'gestor';
  const buscaRef = useRef<HTMLInputElement>(null);
  const inicioBuscaRef = useRef<HTMLDivElement>(null);
  const [buscaFocada, setBuscaFocada] = useState(false);
  // Celular digitando na busca: a barra sobe para o topo e os resultados ficam logo abaixo dela.
  const tecladoAberto = useTecladoVirtual();
  const modoFoco = tecladoAberto && buscaFocada;

  const [unidades, setUnidades] = useState<RamalUnidade[]>([]);
  const [quadro, setQuadro] = useState<{ servidores: Servidor[]; setores: Setor[]; vinculos: ServidorSetorVinculo[] }>({ servidores: [], setores: [], vinculos: [] });
  const [unidadeServidores, setUnidadeServidores] = useState<RamalUnidade | null>(null);
  const [buscaServidor, setBuscaServidor] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modoBusca, setModoBusca] = useState<ModoBusca>(() => {
    try { return localStorage.getItem(MODO_BUSCA_KEY) === 'servidores' ? 'servidores' : 'unidades'; } catch { return 'unidades'; }
  });
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [somenteComRamal, setSomenteComRamal] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [ramalEditado, setRamalEditado] = useState('');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  // Editor de vários ramais (departamentos)
  const [editorUnidade, setEditorUnidade] = useState<RamalUnidade | null>(null);
  const [linhasEditor, setLinhasEditor] = useState<RamalContato[]>([]);
  const [isSalvandoEditor, setIsSalvandoEditor] = useState(false);

  const [isNovaOpen, setIsNovaOpen] = useState(false);
  const [novaUnidade, setNovaUnidade] = useState({ nome: '', tipo: 'unidade_escolar' as RamalUnidadeTipo, categoria: 'Escolas Municipais', ramal: '' });
  const [isSalvandoNova, setIsSalvandoNova] = useState(false);

  const carregar = async () => {
    setIsLoading(true);
    setErro(null);
    const [ramais, servidores, setores, vinculos] = await Promise.allSettled([
      dataService.getRamaisUnidades(),
      dataService.getServidores(),
      dataService.getSetores(),
      dataService.getServidorSetorVinculos(),
    ]);
    if (ramais.status === 'fulfilled') setUnidades(ramais.value);
    else setErro(ramais.reason instanceof Error ? ramais.reason.message : 'Não foi possível carregar os ramais.');
    // Setores e vínculos são complementares: sem eles, a contagem segue só pela lotação.
    if (servidores.status === 'fulfilled') {
      setQuadro({
        servidores: servidores.value,
        setores: setores.status === 'fulfilled' ? setores.value : [],
        vinculos: vinculos.status === 'fulfilled' ? vinculos.value : [],
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  // "/" leva à busca; Esc limpa a busca.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const alvo = event.target as HTMLElement;
      const digitando = alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable;
      if (event.key === '/' && !digitando) {
        event.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), 2600);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  const termos = useMemo(() => normalizar(busca).split(/\s+/).filter(Boolean), [busca]);
  // No modo servidores, o nome da unidade não é destacado (a busca não olhou para ele).
  const termosUnidade = modoBusca === 'unidades' ? termos : [];
  const buscaServidorCurta = modoBusca === 'servidores' && termos.length > 0 && termos.join('').length < MIN_LETRAS_SERVIDOR;

  // Mantém o início dos resultados logo abaixo da barra enquanto o teclado está aberto.
  useEffect(() => {
    if (!modoFoco || !inicioBuscaRef.current) return;
    const topo = inicioBuscaRef.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: topo, behavior: 'auto' });
  }, [modoFoco, busca, modoBusca, filtroTipo, somenteComRamal]);

  /** Fecha o teclado para ver os resultados em tela cheia. */
  const fecharTeclado = () => buscaRef.current?.blur();

  const trocarModoBusca = (modo: ModoBusca) => {
    setModoBusca(modo);
    try { localStorage.setItem(MODO_BUSCA_KEY, modo); } catch {}
    buscaRef.current?.focus();
  };

  // Nomes dos servidores já normalizados, para a busca por servidor não repetir o trabalho a cada tecla.
  const servidoresPorUnidade = useMemo(
    () => agruparServidoresPorUnidade(unidades, quadro.servidores, quadro.setores, quadro.vinculos),
    [unidades, quadro],
  );

  const nomesNormalizados = useMemo(() => {
    const mapa = new Map<string, string>();
    servidoresPorUnidade.forEach((lista) => lista.forEach((servidor) => mapa.set(servidor.id, normalizar(servidor.nome))));
    return mapa;
  }, [servidoresPorUnidade]);

  /** Servidores de cada unidade cujo nome contém todos os termos buscados (mínimo de 3 letras). */
  const servidoresEncontrados = useMemo(() => {
    const encontrados = new Map<string, Servidor[]>();
    if (modoBusca !== 'servidores' || termos.join('').length < MIN_LETRAS_SERVIDOR) return encontrados;
    unidades.forEach((unidade) => {
      const lista = servidoresPorUnidade.get(unidade.id) || [];
      const achados = lista.filter((servidor) => {
        const nome = nomesNormalizados.get(servidor.id) || '';
        return termos.every((termo) => nome.includes(termo));
      });
      if (achados.length) encontrados.set(unidade.id, achados);
    });
    return encontrados;
  }, [unidades, servidoresPorUnidade, nomesNormalizados, termos, modoBusca]);

  const filtradas = useMemo(
    () =>
      unidades.filter((unidade) => {
        if (filtroTipo !== 'todos' && unidade.tipo !== filtroTipo) return false;
        if (somenteComRamal && !unidade.ramais.length) return false;
        if (!termos.length) return true;
        if (modoBusca === 'servidores') {
          // Com menos de 3 letras ainda não filtra: evita esvaziar a lista enquanto a pessoa digita.
          return termos.join('').length < MIN_LETRAS_SERVIDOR || servidoresEncontrados.has(unidade.id);
        }
        const ramais = unidade.ramais.map((r) => `${r.numero} ${r.descricao || ''}`).join(' ');
        const alvo = normalizar(`${unidade.nome} ${unidade.lotacao || ''} ${ramais}`);
        return termos.every((termo) => alvo.includes(termo));
      }),
    [unidades, filtroTipo, somenteComRamal, termos, servidoresEncontrados, modoBusca]
  );

  const totalServidoresEncontrados = useMemo(
    () => filtradas.reduce((total, unidade) => total + (servidoresEncontrados.get(unidade.id)?.length || 0), 0),
    [filtradas, servidoresEncontrados]
  );

  const grupos = useMemo(() => {
    const porCategoria = new Map<string, RamalUnidade[]>();
    filtradas.forEach((unidade) => {
      porCategoria.set(unidade.categoria, [...(porCategoria.get(unidade.categoria) || []), unidade]);
    });
    const ordem = (categoria: string) => {
      const indice = ORDEM_CATEGORIAS.indexOf(categoria);
      return indice < 0 ? ORDEM_CATEGORIAS.length : indice;
    };
    return Array.from(porCategoria.entries())
      .sort(([a], [b]) => ordem(a) - ordem(b) || a.localeCompare(b, 'pt-BR'))
      .map(([categoria, itens]) => ({
        categoria,
        itens: itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }));
  }, [filtradas]);

  const totalEscolas = unidades.filter((u) => u.tipo === 'unidade_escolar').length;
  const totalDepartamentos = unidades.filter((u) => u.tipo === 'departamento').length;
  const totalComRamal = unidades.filter((u) => u.ramais.length).length;
  const percentualComRamal = unidades.length ? Math.round((totalComRamal / unidades.length) * 100) : 0;

  const copiarRamal = async (unidade: RamalUnidade, contato: RamalContato, indice: number) => {
    const chave = `${unidade.id}-${indice}`;
    try {
      await navigator.clipboard.writeText(contato.numero);
      setCopiadoId(chave);
      setAviso({ tipo: 'sucesso', texto: `Ramal ${contato.numero}${contato.descricao ? ` (${contato.descricao})` : ''} copiado.` });
      window.setTimeout(() => setCopiadoId((atual) => (atual === chave ? null : atual)), 1600);
    } catch {
      setAviso({ tipo: 'erro', texto: 'Não foi possível copiar o ramal.' });
    }
  };

  const iniciarEdicao = (unidade: RamalUnidade) => {
    if (unidade.tipo === 'departamento') {
      setEditorUnidade(unidade);
      setLinhasEditor(unidade.ramais.length ? unidade.ramais.map((r) => ({ ...r })) : [{ numero: '', descricao: '' }]);
      return;
    }
    setEditandoId(unidade.id);
    setRamalEditado(unidade.ramal || '');
  };

  const salvarRamal = async (unidade: RamalUnidade) => {
    const ramal = ramalEditado.trim();
    if (ramal === (unidade.ramal || '')) {
      setEditandoId(null);
      return;
    }
    setSalvandoId(unidade.id);
    try {
      const salva = await dataService.salvarRamalUnidade({ id: unidade.id, ramal });
      setUnidades((lista) => lista.map((item) => (item.id === salva.id ? salva : item)));
      setEditandoId(null);
      setAviso({ tipo: 'sucesso', texto: ramal ? `Ramal de ${unidade.nome} atualizado.` : `Ramal de ${unidade.nome} removido.` });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível salvar o ramal.' });
    } finally {
      setSalvandoId(null);
    }
  };

  const servidoresDaUnidade = (unidade: RamalUnidade | null) =>
    (unidade && servidoresPorUnidade.get(unidade.id)) || [];

  const termosServidor = useMemo(() => normalizar(buscaServidor).split(/\s+/).filter(Boolean), [buscaServidor]);
  const servidoresDoModal = useMemo(() => {
    const lista = servidoresDaUnidade(unidadeServidores);
    if (!termosServidor.length) return lista;
    return lista.filter((servidor) => {
      const alvo = normalizar(`${servidor.nome} ${servidor.matricula} ${servidor.cargo}`);
      return termosServidor.every((termo) => alvo.includes(termo));
    });
  }, [unidadeServidores, servidoresPorUnidade, termosServidor]);

  /** Abre a lista de servidores; com filtro, já mostra só os nomes buscados. */
  const abrirServidores = (unidade: RamalUnidade, filtro = '') => {
    setBuscaServidor(filtro);
    setUnidadeServidores(unidade);
  };

  const atualizarLinha = (indice: number, campos: Partial<RamalContato>) =>
    setLinhasEditor((linhas) => linhas.map((linha, i) => (i === indice ? { ...linha, ...campos } : linha)));

  const numerosRepetidos = useMemo(() => {
    const contagem = new Map<string, number>();
    linhasEditor.forEach((linha) => {
      const numero = linha.numero.trim();
      if (numero) contagem.set(numero, (contagem.get(numero) || 0) + 1);
    });
    return new Set(Array.from(contagem).filter(([, total]) => total > 1).map(([numero]) => numero));
  }, [linhasEditor]);

  const salvarEditor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editorUnidade || numerosRepetidos.size) return;
    setIsSalvandoEditor(true);
    try {
      const salva = await dataService.salvarRamalUnidade({ id: editorUnidade.id, ramais: linhasEditor });
      setUnidades((lista) => lista.map((item) => (item.id === salva.id ? salva : item)));
      setEditorUnidade(null);
      setAviso({
        tipo: 'sucesso',
        texto: salva.ramais.length
          ? `${salva.ramais.length} ${salva.ramais.length === 1 ? 'ramal salvo' : 'ramais salvos'} para ${salva.nome}.`
          : `Ramais de ${salva.nome} removidos.`,
      });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível salvar os ramais.' });
    } finally {
      setIsSalvandoEditor(false);
    }
  };

  const salvarNovaUnidade = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!novaUnidade.nome.trim()) return;
    setIsSalvandoNova(true);
    try {
      const salva = await dataService.salvarRamalUnidade({
        nome: novaUnidade.nome.trim(),
        tipo: novaUnidade.tipo,
        categoria: novaUnidade.categoria,
        ramal: novaUnidade.ramal,
        ativo: true,
      });
      setUnidades((lista) => [...lista, salva]);
      setIsNovaOpen(false);
      setNovaUnidade({ nome: '', tipo: 'unidade_escolar', categoria: 'Escolas Municipais', ramal: '' });
      setAviso({ tipo: 'sucesso', texto: `${salva.nome} adicionada à lista.` });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível adicionar a unidade.' });
    } finally {
      setIsSalvandoNova(false);
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltroTipo('todos');
    setSomenteComRamal(false);
    buscaRef.current?.focus();
  };

  // Cada filtro tem sua cor (a mesma dos cards de estatística): ativo = preenchido, inativo = contador tingido.
  const abasTipo: { valor: FiltroTipo; rotulo: string; total: number; icone: typeof Phone; ativo: string; contadorAtivo: string; contador: string }[] = [
    {
      valor: 'todos', rotulo: 'Todos', total: unidades.length, icone: LayoutGrid,
      ativo: 'border-transparent bg-gradient-to-b from-[#1f4f8f] to-[#102755] text-white shadow-[0_6px_16px_-6px_rgba(16,39,85,.65)] dark:from-sky-500 dark:to-sky-700',
      contadorAtivo: 'bg-white text-[#102755] dark:text-sky-800',
      contador: 'bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300',
    },
    {
      valor: 'unidade_escolar', rotulo: 'Escolas', total: totalEscolas, icone: School,
      ativo: 'border-transparent bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_6px_16px_-6px_rgba(4,120,87,.65)]',
      contadorAtivo: 'bg-white text-emerald-700',
      contador: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      valor: 'departamento', rotulo: 'Deptos', total: totalDepartamentos, icone: Building2,
      ativo: 'border-transparent bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[0_6px_16px_-6px_rgba(67,56,202,.65)]',
      contadorAtivo: 'bg-white text-indigo-700',
      contador: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    },
  ];

  const estatisticas = [
    { rotulo: 'Unidades na lista', valor: unidades.length, icone: Phone, cor: 'text-[#005a9c] bg-[#e6f1fb] dark:bg-sky-500/10 dark:text-sky-300' },
    { rotulo: 'Unidades escolares', valor: totalEscolas, icone: School, cor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300' },
    { rotulo: 'Departamentos SMEDU', valor: totalDepartamentos, icone: Building2, cor: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-300' },
  ];

  return (
    <div className="space-y-5 min-w-0">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 sm:pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-950 p-1.5 text-emerald-400">
              <Phone className="h-5 w-5" />
            </span>
            <h2 className="truncate text-lg font-bold text-slate-100 sm:text-xl">Ramais das Unidades</h2>
          </div>
          <p className="mt-1 hidden text-xs text-slate-400 sm:block">
            Contato das unidades escolares e dos departamentos da Secretaria Municipal de Educação
          </p>
          {/* No celular, um resumo de uma linha substitui os indicadores. */}
          <p className="mt-1 text-[11px] text-[#627fa5] tabular-nums sm:hidden dark:text-slate-400">
            {isLoading ? 'Carregando…' : `${totalEscolas} escolas · ${totalDepartamentos} departamentos · ${percentualComRamal}% com ramal`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Button variant="outline" size="sm" onClick={carregar} isLoading={isLoading} aria-label="Atualizar" title="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          {podeEditar && (
            <Button variant="primary" size="sm" onClick={() => setIsNovaOpen(true)} aria-label="Nova unidade" title="Nova unidade">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova unidade</span>
            </Button>
          )}
        </div>
      </div>

      {/* Indicadores (telas maiores) */}
      <div className="hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
        {estatisticas.map(({ rotulo, valor, icone: Icone, cor }) => (
          <Card key={rotulo} className="p-4">
            <div className="flex items-center gap-3">
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', cor)}>
                <Icone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-2xl font-extrabold leading-none text-[#102755] tabular-nums dark:text-slate-100">
                  {isLoading ? '—' : valor}
                </div>
                <div className="mt-1 text-[11px] font-medium leading-tight text-[#627fa5] dark:text-slate-400">{rotulo}</div>
              </div>
            </div>
          </Card>
        ))}
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-2xl font-extrabold leading-none text-[#102755] tabular-nums dark:text-slate-100">
              {isLoading ? '—' : `${percentualComRamal}%`}
            </div>
            <div className="text-[11px] font-semibold text-[#627fa5] tabular-nums dark:text-slate-400">
              {totalComRamal}/{unidades.length}
            </div>
          </div>
          <div className="mt-1 text-[11px] font-medium text-[#627fa5] dark:text-slate-400">Com ramal cadastrado</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eef7] dark:bg-slate-800" role="progressbar" aria-valuenow={percentualComRamal} aria-valuemin={0} aria-valuemax={100} aria-label="Unidades com ramal cadastrado">
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${percentualComRamal}%` }} />
          </div>
        </Card>
      </div>

      {/* Busca e filtros: fixa no topo ao rolar, para buscar de novo sem voltar ao início. */}
      <div ref={inicioBuscaRef} aria-hidden="true" />
      <div className={cn(
        'sticky -mx-4 border-b border-[#dce4f0] px-4 backdrop-blur dark:border-slate-800',
        'sm:static sm:mx-0 sm:rounded-xl sm:border sm:bg-white sm:p-4 sm:shadow-[0_8px_22px_-14px_rgba(18,44,82,.22)] sm:backdrop-blur-none sm:dark:bg-[#121826]',
        // Digitando no celular: cobre a barra superior e fica compacta, sobrando espaço para os resultados.
        modoFoco
          ? 'top-0 z-[45] bg-[#f4f8fd] py-2 shadow-[0_8px_18px_-12px_rgba(18,44,82,.45)] dark:bg-[#0b0f19]'
          : 'top-[76px] z-20 bg-[#f4f8fd]/95 py-3 dark:bg-[#0b0f19]/95'
      )}>
        {/* Onde buscar */}
        <div className={cn('grid grid-cols-2 gap-1 rounded-xl border border-[#dce4f0] bg-white p-1 sm:inline-grid sm:w-auto dark:border-slate-800 dark:bg-[#101625]', modoFoco ? 'mb-2' : 'mb-2.5')} role="radiogroup" aria-label="Buscar por">
          {([
            { valor: 'unidades', rotulo: 'Unidades', icone: School, dica: 'Nome da escola, departamento ou ramal' },
            { valor: 'servidores', rotulo: 'Servidores', icone: UserSearch, dica: 'Nome da pessoa lotada' },
          ] as const).map(({ valor, rotulo, icone: Icone, dica }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={modoBusca === valor}
              onClick={() => trocarModoBusca(valor)}
              title={dica}
              // Com o teclado aberto, o botão não pode tirar o foco do campo (fecharia o teclado).
              onMouseDown={(event) => { if (modoFoco) event.preventDefault(); }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg px-4 font-bold transition-colors',
                modoFoco ? 'min-h-8 text-xs' : 'min-h-10 text-sm',
                modoBusca === valor
                  ? 'bg-[#005a9c] text-white shadow-sm'
                  : 'text-[#4b6485] hover:bg-[#f2f7fd] hover:text-[#102755] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              )}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Input
              ref={buscaRef}
              type="search"
              placeholder={modoBusca === 'unidades' ? 'Escola, depto. ou ramal' : 'Nome do servidor'}
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setBusca('');
                // "Pesquisar" no teclado do celular: fecha o teclado e mostra os resultados.
                if (event.key === 'Enter') { event.preventDefault(); fecharTeclado(); }
              }}
              onFocus={() => setBuscaFocada(true)}
              onBlur={() => setBuscaFocada(false)}
              icon={modoBusca === 'unidades' ? <Search className="w-4 h-4" /> : <UserSearch className="w-4 h-4" />}
              className="pr-16 text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              aria-label={modoBusca === 'unidades' ? 'Buscar escola, departamento ou ramal' : 'Buscar pelo nome do servidor'}
              autoComplete="off"
              enterKeyHint="search"
            />
            {busca ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { setBusca(''); buscaRef.current?.focus(); }}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-[#d8e3f2] bg-[#f4f7fc] px-1.5 font-mono text-[10px] text-[#627fa5] sm:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">/</kbd>
            )}
          </div>

          {/* Filtros: uma única linha rolável no celular */}
          <div className="-mx-4 -my-2 flex items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtros">
            {abasTipo.map((aba) => {
              const ativo = filtroTipo === aba.valor;
              const Icone = aba.icone;
              return (
                <button
                  key={aba.valor}
                  type="button"
                  aria-pressed={ativo}
                  onMouseDown={(event) => { if (modoFoco) event.preventDefault(); }}
                  onClick={() => setFiltroTipo(aba.valor)}
                  className={cn(
                    'flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border py-1 pl-2.5 pr-1.5 text-xs font-bold transition-all duration-200 active:scale-[.97]',
                    ativo
                      ? aba.ativo
                      : 'border-[#dce4f0] bg-white text-[#4b6485] shadow-[0_1px_2px_rgba(16,39,85,.06),0_2px_6px_-2px_rgba(16,39,85,.08)] hover:-translate-y-px hover:border-[#b9d3ee] hover:text-[#102755] hover:shadow-[0_4px_12px_-4px_rgba(16,39,85,.18)] dark:border-slate-800 dark:bg-[#101625] dark:text-slate-300 dark:shadow-none dark:hover:border-slate-700'
                  )}
                >
                  <Icone className={cn('h-3.5 w-3.5', ativo ? 'opacity-90' : 'opacity-60')} />
                  {aba.rotulo}
                  <span className={cn('min-w-[1.6rem] rounded-lg px-1.5 py-0.5 text-center text-[11px] font-extrabold tabular-nums', ativo ? `${aba.contadorAtivo} shadow-sm` : aba.contador)}>
                    {aba.total}
                  </span>
                </button>
              );
            })}
            <span className="mx-0.5 h-6 w-px shrink-0 bg-[#dce4f0] dark:bg-slate-800" aria-hidden="true" />
            <button
              type="button"
              aria-pressed={somenteComRamal}
              onMouseDown={(event) => { if (modoFoco) event.preventDefault(); }}
              onClick={() => setSomenteComRamal((atual) => !atual)}
              className={cn(
                'flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition-all duration-200 active:scale-[.97]',
                somenteComRamal
                  ? 'border-transparent bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 shadow-[0_6px_16px_-6px_rgba(217,119,6,.7)]'
                  : 'border-dashed border-[#c9d6e8] bg-white text-[#4b6485] shadow-[0_1px_2px_rgba(16,39,85,.06)] hover:-translate-y-px hover:border-amber-400 hover:text-amber-700 hover:shadow-[0_4px_12px_-4px_rgba(217,119,6,.3)] dark:border-slate-700 dark:bg-[#101625] dark:text-slate-300 dark:hover:text-amber-300'
              )}
            >
              <span className={cn('grid h-4 w-4 place-items-center rounded-full', somenteComRamal ? 'bg-white/70' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300')}>
                {somenteComRamal ? <Check className="h-3 w-3" strokeWidth={3} /> : <Phone className="h-2.5 w-2.5" />}
              </span>
              Com ramal
            </button>
          </div>
        </div>

        {buscaServidorCurta && (
          <p className="mt-2 text-[11px] text-[#627fa5] dark:text-slate-400">Digite ao menos {MIN_LETRAS_SERVIDOR} letras do nome do servidor.</p>
        )}

        {grupos.length > 1 && (
          <nav className="mt-3 hidden gap-1.5 overflow-x-auto [scrollbar-width:none] sm:flex [&::-webkit-scrollbar]:hidden" aria-label="Ir para categoria">
            {grupos.map((grupo) => (
              <a
                key={grupo.categoria}
                href={`#categoria-${normalizar(grupo.categoria).replace(/\s+/g, '-')}`}
                className="group flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e1e9f4] bg-white py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#4b6485] shadow-[0_1px_2px_rgba(16,39,85,.05)] transition-all hover:-translate-y-px hover:border-[#9fc9ed] hover:text-[#005a9c] hover:shadow-[0_4px_10px_-4px_rgba(0,90,156,.25)] dark:border-slate-800 dark:bg-[#101625] dark:text-slate-400 dark:shadow-none dark:hover:border-sky-500/50 dark:hover:text-sky-300"
              >
                {grupo.categoria}
                <span className="rounded-md bg-[#eef4fb] px-1.5 text-[10px] font-extrabold tabular-nums text-[#005a9c] transition-colors group-hover:bg-[#005a9c] group-hover:text-white dark:bg-slate-800 dark:text-sky-300 dark:group-hover:bg-sky-500 dark:group-hover:text-white">{grupo.itens.length}</span>
              </a>
            ))}
          </nav>
        )}
      </div>

      {/* Conteúdo. Tocar na lista fecha o teclado; a altura mínima permite levar os resultados até o topo. */}
      <div onTouchStart={() => { if (modoFoco) fecharTeclado(); }} className={cn(modoFoco && 'min-h-[100dvh]')}>
      {erro ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#102755] dark:text-slate-100">Não foi possível carregar os ramais</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#627fa5] dark:text-slate-400">{erro}</p>
          </div>
          <Button variant="outline" size="sm" onClick={carregar}><RefreshCw className="w-3.5 h-3.5" /> Tentar novamente</Button>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-2 lg:grid-cols-2" aria-busy="true" aria-label="Carregando ramais">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-xl border border-[#e3eaf4] bg-white dark:border-slate-800 dark:bg-[#121826]" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eef4fb] text-[#627fa5] dark:bg-slate-800 dark:text-slate-400">
            <Search className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#102755] dark:text-slate-100">Nenhuma unidade encontrada</p>
            <p className="mt-1 text-xs text-[#627fa5] dark:text-slate-400">
              {busca ? <>Nada corresponde a “{busca}” com os filtros atuais.</> : 'Nenhuma unidade corresponde aos filtros atuais.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={limparFiltros}><X className="w-3.5 h-3.5" /> Limpar filtros</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <section
              key={grupo.categoria}
              id={`categoria-${normalizar(grupo.categoria).replace(/\s+/g, '-')}`}
              className="scroll-mt-40"
              aria-labelledby={`titulo-${normalizar(grupo.categoria).replace(/\s+/g, '-')}`}
            >
              <div className="mb-2 flex items-center gap-2 px-1">
                <h3 id={`titulo-${normalizar(grupo.categoria).replace(/\s+/g, '-')}`} className="text-[11px] font-extrabold uppercase tracking-wider text-[#4b6485] dark:text-slate-400">
                  {grupo.categoria}
                </h3>
                <span className="rounded-full bg-[#e1e9f4] px-1.5 text-[10px] font-bold text-[#4b6485] tabular-nums dark:bg-slate-800 dark:text-slate-400">
                  {grupo.itens.length}
                </span>
                <span className="h-px flex-1 bg-[#e1e9f4] dark:bg-slate-800" />
              </div>

              <ul className="grid gap-2 lg:grid-cols-2">
                {grupo.itens.map((unidade) => {
                  const Icone = iconeDaUnidade(unidade);
                  const totalServidores = servidoresDaUnidade(unidade).length;
                  const editando = editandoId === unidade.id;
                  const variosRamais = unidade.ramais.length > 1;
                  const encontrados = servidoresEncontrados.get(unidade.id) || [];
                  return (
                    <li
                      key={unidade.id}
                      className={cn(
                        'group flex min-h-[68px] gap-3 rounded-xl border bg-white px-3 py-2.5 transition-all dark:bg-[#121826]',
                        variosRamais ? 'items-start' : 'items-center',
                        editando
                          ? 'border-[#005a9c] ring-2 ring-[#005a9c]/15 dark:border-sky-500 dark:ring-sky-500/20'
                          : 'border-[#e3eaf4] hover:border-[#b9d4ee] hover:shadow-[0_8px_18px_-14px_rgba(18,44,82,.35)] dark:border-slate-800 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => abrirServidores(unidade)}
                          className="group/nome -m-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-lg p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005a9c]/40"
                          title={`Ver servidores de ${unidade.nome}`}
                        >
                          <span
                            className={cn(
                              'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
                              unidade.tipo === 'departamento'
                                ? 'bg-indigo-50 text-indigo-600 group-hover/nome:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300'
                                : 'bg-emerald-50 text-emerald-600 group-hover/nome:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300'
                            )}
                            aria-hidden="true"
                          >
                            <Icone className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold leading-snug text-[#102755] decoration-[#005a9c]/40 underline-offset-2 group-hover/nome:underline dark:text-slate-100">
                              <Destaque texto={unidade.nome} termos={termosUnidade} />
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#627fa5] dark:text-slate-400">
                              <Users className="h-3 w-3" />
                              {totalServidores ? (
                                <>{totalServidores} {totalServidores === 1 ? 'servidor' : 'servidores'}<span className="hidden sm:inline"> {totalServidores === 1 ? 'lotado' : 'lotados'}</span></>
                              ) : (
                                <>Sem servidores<span className="hidden sm:inline"> lotados</span></>
                              )}
                              <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover/nome:opacity-100" />
                            </span>
                          </span>
                        </button>
                        {encontrados.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
                            {encontrados.slice(0, 3).map((servidor) => (
                              <button
                                key={servidor.id}
                                type="button"
                                onClick={() => abrirServidores(unidade, servidor.nome)}
                                className="flex max-w-full items-center gap-1.5 rounded-2xl border border-amber-300/70 bg-amber-50 py-0.5 pl-0.5 pr-2.5 text-left text-[11px] leading-tight font-semibold text-[#102755] transition-colors hover:border-amber-400 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-slate-100 dark:hover:bg-amber-400/20"
                                title={`${servidor.nome} · ${servidor.cargo} · matrícula ${servidor.matricula}`}
                              >
                                <UserAvatar nome={servidor.nome} className="h-5 w-5 text-[8px] ring-0" />
                                <span className="min-w-0 py-0.5"><Destaque texto={servidor.nome} termos={termos} /></span>
                              </button>
                            ))}
                            {encontrados.length > 3 && (
                              <button
                                type="button"
                                onClick={() => abrirServidores(unidade, busca)}
                                className="rounded-full border border-dashed border-amber-300/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/10"
                              >
                                +{encontrados.length - 3} {encontrados.length - 3 === 1 ? 'servidor' : 'servidores'}
                              </button>
                            )}
                          </div>
                        )}
                        {variosRamais && (
                          <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
                            {unidade.ramais.map((contato, indice) => (
                              <RamalPill
                                key={`${contato.numero}-${indice}`}
                                contato={contato}
                                termos={termosUnidade}
                                compacto
                                copiado={copiadoId === `${unidade.id}-${indice}`}
                                onCopiar={() => copiarRamal(unidade, contato, indice)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {editando ? (
                        <form
                          className="flex shrink-0 items-center gap-1"
                          onSubmit={(event) => { event.preventDefault(); salvarRamal(unidade); }}
                        >
                          <input
                            autoFocus
                            value={ramalEditado}
                            onChange={(event) => setRamalEditado(event.target.value.replace(/[^\d\s/-]/g, '').slice(0, 20))}
                            onKeyDown={(event) => { if (event.key === 'Escape') setEditandoId(null); }}
                            inputMode="numeric"
                            placeholder="Ramal"
                            aria-label={`Ramal de ${unidade.nome}`}
                            className="h-9 w-24 rounded-lg border border-[#b9d4ee] bg-white px-2 text-center font-mono text-sm font-bold text-[#102755] focus:border-[#005a9c] focus:outline-none focus:ring-2 focus:ring-[#005a9c]/20 dark:border-slate-700 dark:bg-[#0d1220] dark:text-slate-100"
                          />
                          <button
                            type="submit"
                            disabled={salvandoId === unidade.id}
                            className="grid h-9 w-9 place-items-center rounded-lg bg-[#005a9c] text-white hover:bg-[#004b83] disabled:opacity-60"
                            aria-label="Salvar ramal"
                            title="Salvar (Enter)"
                          >
                            {salvandoId === unidade.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-[#627fa5] hover:bg-[#eef4fb] dark:text-slate-400 dark:hover:bg-slate-800"
                            aria-label="Cancelar edição"
                            title="Cancelar (Esc)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          {variosRamais ? null : unidade.ramais.length ? (
                            <RamalPill
                              contato={unidade.ramais[0]}
                              termos={termosUnidade}
                              copiado={copiadoId === `${unidade.id}-0`}
                              onCopiar={() => copiarRamal(unidade, unidade.ramais[0], 0)}
                            />
                          ) : podeEditar ? (
                            <button
                              type="button"
                              onClick={() => iniciarEdicao(unidade)}
                              className="flex items-center gap-1.5 rounded-lg border border-dashed border-[#c7d6ea] px-3 py-2 text-[11px] font-semibold text-[#627fa5] transition-colors hover:border-[#005a9c] hover:text-[#005a9c] dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-400 dark:hover:text-sky-300"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="sm:hidden">Ramal</span>
                              <span className="hidden sm:inline">{unidade.tipo === 'departamento' ? 'Adicionar ramais' : 'Adicionar ramal'}</span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-lg px-1 py-2 text-[11px] font-medium text-[#8aa0bd] sm:border sm:border-dashed sm:border-[#d8e3f2] sm:px-3 dark:text-slate-500 sm:dark:border-slate-800" title="Sem ramal">
                              <PhoneOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sem ramal</span>
                            </span>
                          )}
                          {podeEditar && unidade.ramais.length > 0 && (
                            <button
                              type="button"
                              onClick={() => iniciarEdicao(unidade)}
                              className="grid h-9 w-9 place-items-center rounded-lg text-[#8aa0bd] opacity-100 transition-opacity hover:bg-[#eef4fb] hover:text-[#005a9c] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                              aria-label={unidade.tipo === 'departamento' ? `Editar ramais de ${unidade.nome}` : `Editar ramal de ${unidade.nome}`}
                              title={unidade.tipo === 'departamento' ? 'Editar ramais' : 'Editar ramal'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-center text-[11px] text-[#8aa0bd] dark:text-slate-500">
            {totalServidoresEncontrados > 0 && (
              <>{totalServidoresEncontrados} {totalServidoresEncontrados === 1 ? 'servidor encontrado' : 'servidores encontrados'} · </>
            )}
            Exibindo {filtradas.length} de {unidades.length} unidades · clique no nome para ver os servidores, no ramal para copiar{podeEditar ? ', no lápis para editar' : ''}
          </p>
        </div>
      )}
      </div>

      {/* Aviso flutuante */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
        {aviso && (
          <div
            className={cn(
              'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-lg',
              aviso.tipo === 'sucesso' ? 'bg-[#102755]' : 'bg-rose-600'
            )}
          >
            {aviso.tipo === 'sucesso' ? <Check className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4" />}
            {aviso.texto}
          </div>
        )}
      </div>

      {/* Servidores lotados na unidade */}
      <Modal
        isOpen={!!unidadeServidores}
        onClose={() => setUnidadeServidores(null)}
        title={unidadeServidores?.nome || ''}
        description={(() => {
          const total = servidoresDaUnidade(unidadeServidores).length;
          return total ? `${total} ${total === 1 ? 'servidor lotado' : 'servidores lotados'}` : 'Nenhum servidor lotado';
        })()}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {unidadeServidores && unidadeServidores.ramais.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {unidadeServidores.ramais.map((contato, indice) => (
                <RamalPill
                  key={`${contato.numero}-${indice}`}
                  contato={contato}
                  termos={[]}
                  compacto
                  copiado={copiadoId === `${unidadeServidores.id}-${indice}`}
                  onCopiar={() => copiarRamal(unidadeServidores, contato, indice)}
                />
              ))}
            </div>
          )}

          {(servidoresDaUnidade(unidadeServidores).length > 6 || buscaServidor) && (
            <Input
              placeholder="Filtrar por nome, matrícula ou cargo..."
              value={buscaServidor}
              onChange={(event) => setBuscaServidor(event.target.value)}
              icon={<Search className="w-4 h-4" />}
              aria-label="Filtrar servidores"
              autoComplete="off"
              autoFocus
            />
          )}

          {servidoresDaUnidade(unidadeServidores).length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#d8e3f2] py-10 text-center dark:border-slate-800">
              <Users className="h-6 w-6 text-[#8aa0bd]" />
              <p className="text-sm font-semibold text-[#102755] dark:text-slate-100">Nenhum servidor lotado</p>
              <p className="max-w-xs text-xs text-[#627fa5] dark:text-slate-400">
                Não há servidores ativos com esta lotação no quadro funcional.
              </p>
            </div>
          ) : servidoresDoModal.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#627fa5] dark:text-slate-400">Nenhum servidor corresponde a “{buscaServidor}”.</p>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-[#edf2f8] overflow-y-auto overflow-x-hidden pr-1 dark:divide-slate-800">
              {servidoresDoModal.map((servidor) => (
                <li key={servidor.id} className="flex items-center gap-3 py-2.5">
                  <UserAvatar nome={servidor.nome} className="h-9 w-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#102755] dark:text-slate-100" title={servidor.nome}>
                      <Destaque texto={servidor.nome} termos={termosServidor} />
                    </p>
                    <p className="truncate text-[11px] text-[#627fa5] dark:text-slate-400" title={servidor.cargo}>
                      <Destaque texto={servidor.cargo} termos={termosServidor} />
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#f2f7fd] px-2 py-1 font-mono text-[11px] font-bold text-[#005a9c] tabular-nums dark:bg-sky-500/10 dark:text-sky-300">
                    <Destaque texto={servidor.matricula} termos={termosServidor} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {termosServidor.length > 0 && servidoresDoModal.length > 0 && (
            <p className="text-center text-[11px] text-[#8aa0bd] dark:text-slate-500">
              {servidoresDoModal.length} de {servidoresDaUnidade(unidadeServidores).length} servidores ·{' '}
              <button type="button" onClick={() => setBuscaServidor('')} className="font-semibold text-[#005a9c] hover:underline dark:text-sky-300">
                Ver todos
              </button>
            </p>
          )}
        </div>
      </Modal>

      {/* Ramais do departamento */}
      <Modal
        isOpen={!!editorUnidade}
        onClose={() => setEditorUnidade(null)}
        title="Ramais do departamento"
        description={editorUnidade?.nome}
        maxWidth="lg"
      >
        <form onSubmit={salvarEditor} className="space-y-4">
          <div className="hidden grid-cols-[7rem_minmax(0,1fr)_2.5rem] gap-2 px-1 text-[11px] font-semibold text-[#627fa5] sm:grid dark:text-slate-400">
            <span>Ramal</span>
            <span>Descrição (opcional)</span>
            <span />
          </div>
          <ul className="space-y-2">
            {linhasEditor.map((linha, indice) => {
              const repetido = numerosRepetidos.has(linha.numero.trim());
              return (
                <li key={indice} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-start gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_2.5rem]">
                  <input
                    autoFocus={indice === linhasEditor.length - 1}
                    value={linha.numero}
                    onChange={(event) => atualizarLinha(indice, { numero: event.target.value.replace(/[^\d\s/-]/g, '').slice(0, 20) })}
                    inputMode="numeric"
                    placeholder="Ex.: 2905"
                    aria-label={`Número do ramal ${indice + 1}`}
                    aria-invalid={repetido}
                    className={cn(
                      'h-11 w-full rounded-lg border bg-white px-3 text-center font-mono text-sm font-bold text-[#102755] focus:outline-none focus:ring-2 dark:bg-[#0d1220] dark:text-slate-100',
                      repetido
                        ? 'border-rose-400 focus:ring-rose-500/30'
                        : 'border-[#cfdcec] focus:border-[#005a9c] focus:ring-[#005a9c]/20 dark:border-slate-700'
                    )}
                  />
                  <input
                    value={linha.descricao || ''}
                    onChange={(event) => atualizarLinha(indice, { descricao: event.target.value.slice(0, 40) })}
                    placeholder="Ex.: Direção, Secretaria"
                    aria-label={`Descrição do ramal ${indice + 1}`}
                    className="h-11 w-full rounded-lg border border-[#cfdcec] bg-white px-3 text-sm text-[#102755] placeholder:text-[#9db0c8] focus:border-[#005a9c] focus:outline-none focus:ring-2 focus:ring-[#005a9c]/20 dark:border-slate-700 dark:bg-[#0d1220] dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLinhasEditor((linhas) => (linhas.length === 1 ? [{ numero: '', descricao: '' }] : linhas.filter((_, i) => i !== indice)))}
                    className="grid h-11 w-10 place-items-center rounded-lg text-[#8aa0bd] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                    aria-label={`Remover ramal ${indice + 1}`}
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {repetido && <p className="col-span-3 -mt-1 px-1 text-[11px] text-rose-500">Este ramal já está na lista.</p>}
                </li>
              );
            })}
          </ul>

          {linhasEditor.length < MAX_RAMAIS_DEPARTAMENTO && (
            <button
              type="button"
              onClick={() => setLinhasEditor((linhas) => [...linhas, { numero: '', descricao: '' }])}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#c7d6ea] py-2.5 text-xs font-semibold text-[#005a9c] transition-colors hover:border-[#005a9c] hover:bg-[#f2f7fd] dark:border-slate-700 dark:text-sky-300 dark:hover:border-sky-400 dark:hover:bg-sky-500/10"
            >
              <Plus className="h-4 w-4" /> Adicionar outro ramal
            </button>
          )}

          <p className="text-[11px] text-[#627fa5] dark:text-slate-400">
            O primeiro ramal da lista é o principal. Linhas sem número são ignoradas ao salvar.
          </p>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditorUnidade(null)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isSalvandoEditor} disabled={numerosRepetidos.size > 0}>
              <Save className="w-4 h-4" /> Salvar ramais
            </Button>
          </div>
        </form>
      </Modal>

      {/* Nova unidade */}
      <Modal
        isOpen={isNovaOpen}
        onClose={() => setIsNovaOpen(false)}
        title="Nova unidade"
        description="Adicione uma unidade escolar ou um departamento à lista de ramais."
        maxWidth="md"
      >
        <form onSubmit={salvarNovaUnidade} className="space-y-4">
          <Input
            label="Nome *"
            value={novaUnidade.nome}
            onChange={(event) => setNovaUnidade({ ...novaUnidade, nome: event.target.value })}
            placeholder="Ex.: E. M. NOVA ESPERANÇA"
            required
            autoFocus
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={novaUnidade.tipo}
              onChange={(event) => {
                const tipo = event.target.value as RamalUnidadeTipo;
                setNovaUnidade({ ...novaUnidade, tipo, categoria: CATEGORIAS_POR_TIPO[tipo][0] });
              }}
              options={[
                { value: 'unidade_escolar', label: 'Unidade escolar' },
                { value: 'departamento', label: 'Departamento SMEDU' },
              ]}
            />
            <Select
              label="Categoria"
              value={novaUnidade.categoria}
              onChange={(event) => setNovaUnidade({ ...novaUnidade, categoria: event.target.value })}
              options={CATEGORIAS_POR_TIPO[novaUnidade.tipo].map((categoria) => ({ value: categoria, label: categoria }))}
              disabled={novaUnidade.tipo === 'departamento'}
            />
          </div>
          <Input
            label="Ramal"
            value={novaUnidade.ramal}
            onChange={(event) => setNovaUnidade({ ...novaUnidade, ramal: event.target.value.replace(/[^\d\s/-]/g, '').slice(0, 20) })}
            placeholder="Ex.: 2045"
            inputMode="numeric"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsNovaOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isSalvandoNova}><Plus className="w-4 h-4" /> Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
