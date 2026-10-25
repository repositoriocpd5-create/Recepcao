import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  ImageOff,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  School,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { dataService } from '@/services/dataService';
import { CATEGORIAS_POR_TIPO, ORDEM_CATEGORIAS } from '@/services/ramaisUnidades';
import { LOCALIZACOES_UNIDADES } from '@/services/localizacoesUnidades';
import { RamalContato, RamalUnidade, RamalUnidadeTipo, Servidor } from '@/types';
import { ComboServidor, OpcaoServidor, ehDirigenteEscolar, lotadoNaUnidade } from './ComboServidor';
import { cn } from '@/lib/utils';

type Aba = 'todas' | 'unidade_escolar' | 'departamento' | 'inativas';

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const MAX_RAMAIS = 10;

interface Formulario {
  nome: string;
  tipo: RamalUnidadeTipo;
  categoria: string;
  lotacao: string;
  diretor: string;
  vice_diretor: string;
  diretor_servidor_id: string | null;
  vice_servidor_id: string | null;
  ramais: RamalContato[];
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cep: string;
  latitude: string;
  longitude: string;
  mapa_url: string;
  foto_url: string;
  observacoes: string;
  ativo: boolean;
}

const FORM_NOVO: Formulario = {
  nome: '', tipo: 'unidade_escolar', categoria: 'Escolas Municipais', lotacao: '', diretor: '', vice_diretor: '', diretor_servidor_id: null, vice_servidor_id: null,
  ramais: [{ numero: '', descricao: '' }], telefone: '', email: '', endereco: '', bairro: '', cep: '',
  latitude: '', longitude: '', mapa_url: '', foto_url: '', observacoes: '', ativo: true,
};

/** Preenche o formulário; a localização padrão (planilha de mapas) entra quando a unidade ainda não tem a sua gravada. */
function formularioDe(u: RamalUnidade): Formulario {
  const padrao = LOCALIZACOES_UNIDADES[u.nome];
  const num = (v: number | null | undefined, p?: number) => String(v ?? p ?? '');
  return {
    nome: u.nome,
    tipo: u.tipo,
    categoria: u.categoria,
    lotacao: u.lotacao ?? '',
    diretor: u.diretor ?? '',
    vice_diretor: u.vice_diretor ?? '',
    diretor_servidor_id: u.diretor_servidor_id ?? null,
    vice_servidor_id: u.vice_servidor_id ?? null,
    ramais: u.ramais.length ? u.ramais.map((r) => ({ numero: r.numero, descricao: r.descricao ?? '' })) : [{ numero: '', descricao: '' }],
    telefone: u.telefone ?? '',
    email: u.email ?? '',
    endereco: u.endereco ?? padrao?.endereco ?? '',
    bairro: u.bairro ?? padrao?.bairro ?? '',
    cep: u.cep ?? '',
    latitude: num(u.latitude, padrao?.lat),
    longitude: num(u.longitude, padrao?.lng),
    mapa_url: u.mapa_url ?? padrao?.mapa_url ?? '',
    foto_url: u.foto_url ?? padrao?.foto_url ?? '',
    observacoes: u.observacoes ?? '',
    ativo: u.ativo,
  };
}

const coordenada = (texto: string, limite: number): number | null | 'erro' => {
  const t = texto.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && Math.abs(n) <= limite ? n : 'erro';
};

/** Quanto do cadastro está preenchido (direção, ramal, e-mail, endereço e localização). */
function completude(u: RamalUnidade) {
  const padrao = LOCALIZACOES_UNIDADES[u.nome];
  const itens = [
    !!u.diretor?.trim(),
    u.ramais.length > 0,
    !!u.email?.trim(),
    !!(u.endereco || padrao?.endereco),
    (u.latitude ?? padrao?.lat) != null,
  ];
  return Math.round((itens.filter(Boolean).length / itens.length) * 100);
}

const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#6b7f9b] dark:text-slate-400">{children}</p>
);

const Secao: React.FC<{ icone: React.ReactNode; titulo: string; dica?: string; children: React.ReactNode }> = ({ icone, titulo, dica, children }) => (
  <section className="rounded-2xl border border-[#e2eaf4] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(16,48,96,.5)] dark:border-slate-800 dark:bg-[#121826]">
    <header className="mb-3 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300" aria-hidden="true">{icone}</span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-extrabold text-[#0d2240] dark:text-slate-100">{titulo}</h3>
        {dica && <p className="text-xs text-[#5f7391] dark:text-slate-400">{dica}</p>}
      </div>
    </header>
    <div className="space-y-3">{children}</div>
  </section>
);

/** Dirigentes escolares do quadro lotados na unidade (cargo DIRIGENTE ESCOLAR). */
const dirigentesDa = (servidores: Servidor[], u: Pick<RamalUnidade, 'nome' | 'lotacao' | 'tipo'>) =>
  u.tipo !== 'unidade_escolar' ? [] : servidores.filter((s) => ehDirigenteEscolar(s) && lotadoNaUnidade(s, u.lotacao, u.nome));

export const UnidadesPage: React.FC = () => {
  const [unidades, setUnidades] = useState<RamalUnidade[]>([]);
  const [lotacoes, setLotacoes] = useState<string[]>([]);
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [autoDiretor, setAutoDiretor] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('todas');
  const [categoria, setCategoria] = useState('');
  const [soSemDiretor, setSoSemDiretor] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Editor
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<RamalUnidade | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_NOVO);
  const [original, setOriginal] = useState<string>('');
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [fotoComErro, setFotoComErro] = useState(false);
  const primeiroCampo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const [lista, servidores] = await Promise.allSettled([dataService.getUnidadesCadastro(), dataService.getServidores()]);
    if (lista.status === 'fulfilled') setUnidades(lista.value);
    else setErro(lista.reason instanceof Error ? lista.reason.message : 'Não foi possível carregar as unidades.');
    if (servidores.status === 'fulfilled') {
      setServidores(servidores.value.filter((s) => s.status !== 'inativo'));
      const distintas = new Set(servidores.value.map((s) => s.lotacao?.trim()).filter((l): l is string => !!l));
      setLotacoes([...distintas].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    }
    setCarregando(false);
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 4000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const opcoes = useMemo<OpcaoServidor[]>(() => servidores.map((servidor) => {
    const aqui = lotadoNaUnidade(servidor, form.lotacao, form.nome);
    const dirigente = form.tipo === 'unidade_escolar' && ehDirigenteEscolar(servidor);
    return { servidor, prioridade: aqui && dirigente ? 3 : aqui ? 2 : dirigente ? 1 : 0 };
  }), [servidores, form.lotacao, form.nome, form.tipo]);

  // Escolas sem diretor cujo Dirigente Escolar já consta no quadro (um único servidor lotado na escola).
  const sugestoesLote = useMemo(() => unidades
    .filter((u) => u.ativo && u.tipo === 'unidade_escolar' && !u.diretor?.trim())
    .map((u) => ({ unidade: u, dirigentes: dirigentesDa(servidores, u) }))
    .filter((x) => x.dirigentes.length === 1), [unidades, servidores]);
  const [vinculando, setVinculando] = useState(false);

  const vincularEmLote = async () => {
    setVinculando(true);
    let feitos = 0;
    try {
      for (const { unidade, dirigentes } of sugestoesLote) {
        const salva = await dataService.salvarRamalUnidade({ id: unidade.id, diretor: dirigentes[0].nome, diretor_servidor_id: dirigentes[0].id });
        setUnidades((lista) => lista.map((u) => (u.id === salva.id ? salva : u)));
        feitos += 1;
      }
      setAviso({ tipo: 'sucesso', texto: `${feitos} ${feitos === 1 ? 'escola vinculada' : 'escolas vinculadas'} ao respectivo Dirigente Escolar.` });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: `${feitos} vinculadas antes de parar: ${err instanceof Error ? err.message : 'erro ao salvar.'}` });
    } finally { setVinculando(false); }
  };

  const ativas = useMemo(() => unidades.filter((u) => u.ativo), [unidades]);
  const resumo = useMemo(() => ({
    total: ativas.length,
    escolas: ativas.filter((u) => u.tipo === 'unidade_escolar').length,
    departamentos: ativas.filter((u) => u.tipo === 'departamento').length,
    semDiretor: ativas.filter((u) => !u.diretor?.trim()).length,
    inativas: unidades.length - ativas.length,
  }), [unidades, ativas]);

  const termos = useMemo(() => normalizar(busca).split(' ').filter(Boolean), [busca]);
  const filtradas = useMemo(() => {
    const ordem = (c: string) => { const i = ORDEM_CATEGORIAS.indexOf(c); return i < 0 ? ORDEM_CATEGORIAS.length : i; };
    return unidades
      .filter((u) => (aba === 'inativas' ? !u.ativo : u.ativo && (aba === 'todas' || u.tipo === aba)))
      .filter((u) => !categoria || u.categoria === categoria)
      .filter((u) => !soSemDiretor || !u.diretor?.trim())
      .filter((u) => {
        if (!termos.length) return true;
        const alvo = normalizar(`${u.nome} ${u.diretor ?? ''} ${u.vice_diretor ?? ''} ${u.bairro ?? ''} ${u.categoria} ${u.email ?? ''} ${u.ramais.map((r) => r.numero).join(' ')}`);
        return termos.every((t) => alvo.includes(t));
      })
      .sort((a, b) => ordem(a.categoria) - ordem(b.categoria) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [unidades, aba, categoria, soSemDiretor, termos]);

  const categorias = useMemo(() => ORDEM_CATEGORIAS.filter((c) => unidades.some((u) => u.categoria === c)), [unidades]);
  const filtrosAtivos = Boolean(busca || categoria || soSemDiretor);

  // --- Editor -----------------------------------------------------------
  const abrir = (u: RamalUnidade | null) => {
    let f = u ? formularioDe(u) : FORM_NOVO;
    let auto = '';
    if (u && !f.diretor.trim()) {
      const dirigentes = dirigentesDa(servidores, u);
      if (dirigentes.length === 1) {
        f = { ...f, diretor: dirigentes[0].nome, diretor_servidor_id: dirigentes[0].id };
        auto = dirigentes[0].nome;
      }
    }
    setAutoDiretor(auto);
    setEditando(u);
    setForm(f);
    setOriginal(JSON.stringify(u ? formularioDe(u) : f));
    setErroForm('');
    setConfirmarSaida(false);
    setFotoComErro(false);
    setAberto(true);
  };
  const alterado = aberto && JSON.stringify(form) !== original;
  const fechar = useCallback((forcar = false) => {
    if (!forcar && alterado) { setConfirmarSaida(true); return; }
    setAberto(false);
    setConfirmarSaida(false);
  }, [alterado]);

  useEffect(() => {
    if (!aberto) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    const foco = window.setTimeout(() => primeiroCampo.current?.focus(), 250);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', aoTeclar); window.clearTimeout(foco); };
  }, [aberto, fechar]);

  const mudar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setForm((f) => ({ ...f, [campo]: valor }));
  const mudarRamal = (i: number, parte: Partial<RamalContato>) =>
    setForm((f) => ({ ...f, ramais: f.ramais.map((r, j) => (j === i ? { ...r, ...parte } : r)) }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim().replace(/\s+/g, ' ');
    if (!nome) { setErroForm('Informe o nome da unidade.'); return; }
    const repetida = unidades.find((u) => u.id !== editando?.id && normalizar(u.nome) === normalizar(nome));
    if (repetida) { setErroForm(`Já existe uma unidade com este nome: ${repetida.nome}.`); return; }
    const lat = coordenada(form.latitude, 90);
    const lng = coordenada(form.longitude, 180);
    if (lat === 'erro' || lng === 'erro') { setErroForm('Latitude e longitude devem ser números válidos (ex.: -22,8677 e -43,7754).'); return; }
    if ((lat === null) !== (lng === null)) { setErroForm('Informe latitude e longitude juntas, ou deixe as duas em branco.'); return; }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setErroForm('O e-mail informado não parece válido.'); return; }
    const vazio = (t: string) => t.trim() || null;
    setSalvando(true);
    setErroForm('');
    try {
      const salva = await dataService.salvarRamalUnidade({
        ...(editando ? { id: editando.id } : {}),
        nome,
        tipo: form.tipo,
        categoria: form.categoria,
        lotacao: vazio(form.lotacao),
        diretor: vazio(form.diretor),
        vice_diretor: vazio(form.vice_diretor),
        diretor_servidor_id: form.diretor.trim() ? form.diretor_servidor_id : null,
        vice_servidor_id: form.vice_diretor.trim() ? form.vice_servidor_id : null,
        ramais: form.ramais.filter((r) => r.numero.trim()),
        telefone: vazio(form.telefone),
        email: vazio(form.email),
        endereco: vazio(form.endereco),
        bairro: vazio(form.bairro),
        cep: vazio(form.cep),
        latitude: lat,
        longitude: lng,
        mapa_url: vazio(form.mapa_url),
        foto_url: vazio(form.foto_url),
        observacoes: vazio(form.observacoes),
        ativo: form.ativo,
      });
      setUnidades((lista) => (editando ? lista.map((u) => (u.id === salva.id ? salva : u)) : [...lista, salva]));
      setAviso({ tipo: 'sucesso', texto: editando ? `"${salva.nome}" atualizada.` : `"${salva.nome}" adicionada.` });
      fechar(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar a unidade.';
      setErroForm(/duplicate|unique/i.test(msg) ? 'Já existe uma unidade com este nome.' : msg);
    } finally {
      setSalvando(false);
    }
  };

  const ehEscola = form.tipo === 'unidade_escolar';
  const rotuloDirecao = ehEscola ? 'Diretor(a)' : 'Responsável (chefia)';
  const rotuloVice = ehEscola ? 'Vice-diretor(a)' : 'Substituto(a) / adjunto(a)';
  const nomeMudou = !!editando && normalizar(form.nome) !== normalizar(editando.nome);
  const latNum = coordenada(form.latitude, 90);
  const lngNum = coordenada(form.longitude, 180);
  const linkMapa = typeof latNum === 'number' && typeof lngNum === 'number' ? `https://www.google.com/maps?q=${latNum},${lngNum}` : '';

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-[#0b63ce] dark:text-sky-300">Administração</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0d2240] dark:text-slate-50 sm:text-[28px]">Cadastro de unidades</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-[#5f7391] dark:text-slate-400">
            Edite os dados das escolas e dos departamentos: nomes, diretores, ramais, contatos e localização. As alterações valem para Ramais, Recepção e CCO.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void carregar()} isLoading={carregando} aria-label="Atualizar lista"><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => abrir(null)}><Plus className="h-4 w-4" /> Nova unidade</Button>
        </div>
      </header>

      {aviso && (
        <p role="status" className={cn('flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg', aviso.tipo === 'sucesso' ? 'bg-[#102755]' : 'bg-rose-600')}>
          {aviso.tipo === 'sucesso' ? <Check className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4" />} {aviso.texto}
        </p>
      )}

      {sugestoesLote.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 dark:border-emerald-400/30 dark:bg-emerald-500/10 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm text-emerald-900 dark:text-emerald-100">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span><strong>{sugestoesLote.length} {sugestoesLote.length === 1 ? 'escola sem diretor tem' : 'escolas sem diretor têm'}</strong> um Dirigente Escolar lotado no Quadro de Servidores. Vincule de uma vez.</span>
          </p>
          <Button onClick={() => void vincularEmLote()} isLoading={vinculando} className="shrink-0">Vincular dirigentes</Button>
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icone: Building2, valor: resumo.total, rotulo: 'Cadastros ativos', tom: 'text-[#005a9c] bg-[#e6f1fb] dark:bg-sky-500/15 dark:text-sky-300' },
          { icone: School, valor: resumo.escolas, rotulo: 'Escolas e creches', tom: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300' },
          { icone: Building2, valor: resumo.departamentos, rotulo: 'Departamentos', tom: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-300' },
          { icone: UserRound, valor: resumo.semDiretor, rotulo: 'Sem diretor informado', tom: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300', filtro: true },
        ].map(({ icone: Icone, valor, rotulo, tom, filtro }) => {
          const conteudo = (
            <>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tom)} aria-hidden="true"><Icone className="h-5 w-5" /></span>
              <span className="min-w-0 text-left">
                <span className="block text-2xl font-extrabold leading-none tabular-nums text-[#0d2240] dark:text-slate-50">{valor}</span>
                <span className="mt-1 block text-xs font-semibold text-[#5f7391] dark:text-slate-400">{rotulo}</span>
              </span>
            </>
          );
          const base = 'flex items-center gap-3 rounded-2xl border border-[#e2eaf4] bg-white p-3.5 shadow-[0_10px_30px_-24px_rgba(16,48,96,.5)] dark:border-slate-800 dark:bg-[#121826]';
          return filtro ? (
            <button key={rotulo} type="button" aria-pressed={soSemDiretor} onClick={() => { setAba('todas'); setSoSemDiretor((v) => !v); }}
              className={cn(base, 'transition hover:border-[#9fc9ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce]', soSemDiretor && 'border-amber-400 ring-2 ring-amber-300/50')}>{conteudo}</button>
          ) : <div key={rotulo} className={base}>{conteudo}</div>;
        })}
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-2xl border border-[#e2eaf4] bg-white p-3 dark:border-slate-800 dark:bg-[#121826] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Input placeholder="Buscar por unidade, diretor, bairro, ramal ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} icon={<Search className="h-4 w-4" />} aria-label="Buscar unidade" autoComplete="off" />
            {busca && (
              <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-800/10"><X className="h-4 w-4" /></button>
            )}
          </div>
          <div className="lg:w-64">
            <Select aria-label="Filtrar por categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={[{ value: '', label: 'Todas as categorias' }, ...categorias.map((c) => ({ value: c, label: c }))]} className="min-h-11" />
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Tipo de cadastro">
          {([
            ['todas', 'Todas', resumo.total],
            ['unidade_escolar', 'Escolas', resumo.escolas],
            ['departamento', 'Departamentos', resumo.departamentos],
            ['inativas', 'Inativas', resumo.inativas],
          ] as [Aba, string, number][]).map(([valor, rotulo, total]) => (
            <button key={valor} type="button" role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)}
              className={cn('flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors',
                aba === valor ? 'border-[#102755] bg-[#102755] text-white dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-100' : 'border-[#dce4f0] text-[#4b6485] hover:border-[#9fc9ed] dark:border-slate-800 dark:text-slate-400')}>
              {rotulo}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', aba === valor ? 'bg-white/20' : 'bg-[#e1e9f4] dark:bg-slate-800')}>{total}</span>
            </button>
          ))}
          {filtrosAtivos && (
            <button type="button" onClick={() => { setBusca(''); setCategoria(''); setSoSemDiretor(false); }} className="ml-1 flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-[#0b63ce] hover:bg-[#eef5fe] dark:text-sky-300">
              <X className="h-4 w-4" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {erro ? (
        <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">{erro}</p>
      ) : carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-[#eef3f9] dark:bg-slate-800/60" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfdbea] px-4 py-12 text-center dark:border-slate-700">
          <p className="text-sm font-semibold text-[#3b4d68] dark:text-slate-300">Nenhuma unidade encontrada{busca ? ` para "${busca}"` : ''}.</p>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-[#5f7391] dark:text-slate-400" aria-live="polite">{filtradas.length} {filtradas.length === 1 ? 'cadastro' : 'cadastros'}</p>
          <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {filtradas.map((u) => {
              const pct = completude(u);
              const depto = u.tipo === 'departamento';
              return (
                <li key={u.id}>
                  <button type="button" onClick={() => abrir(u)} aria-label={`Editar ${u.nome}`}
                    className={cn('group flex h-full w-full flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-[0_10px_30px_-24px_rgba(16,48,96,.5)] transition hover:-translate-y-0.5 hover:border-[#9fc9ed] hover:shadow-[0_18px_34px_-22px_rgba(16,48,96,.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b63ce] dark:bg-[#121826]',
                      u.ativo ? 'border-[#e2eaf4] dark:border-slate-800' : 'border-dashed border-[#cfdbea] opacity-80 dark:border-slate-700')}>
                    <div className="flex items-start gap-3">
                      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', depto ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300')} aria-hidden="true">
                        {depto ? <Building2 className="h-5 w-5" /> : <School className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-[14px] font-extrabold leading-snug text-[#0d2240] dark:text-slate-100">{u.nome}</h2>
                        <p className="mt-0.5 truncate text-xs text-[#5f7391] dark:text-slate-400">{u.categoria}{u.bairro ? ` · ${u.bairro}` : ''}</p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9aaac0] transition group-hover:translate-x-0.5 group-hover:text-[#0b63ce]" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5 text-[13px]">
                      <p className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-[#6b7f9b]" aria-hidden="true" />
                        {u.diretor?.trim()
                          ? <span className="truncate font-semibold text-[#10233f] dark:text-slate-100">{u.diretor}</span>
                          : <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{depto ? 'Responsável' : 'Diretor'} não informado</span>}
                      </p>
                      <p className="flex items-center gap-2 text-[#3b4d68] dark:text-slate-300">
                        <Phone className="h-4 w-4 shrink-0 text-[#6b7f9b]" aria-hidden="true" />
                        <span className="truncate">{u.ramais.length ? u.ramais.map((r) => r.numero).join(' · ') : <span className="text-[#8a9bb2]">Sem ramal</span>}</span>
                      </p>
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e6edf6] dark:bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Cadastro preenchido">
                        <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums text-[#5f7391] dark:text-slate-400">{pct}%</span>
                      {!u.ativo && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">Inativa</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Editor lateral (gaveta no celular) */}
      {aberto && createPortal(
        <div className="fixed inset-0 z-[1200]">
          <button type="button" tabIndex={-1} aria-label="Fechar edição" onClick={() => fechar()} className="absolute inset-0 bg-[#06142b]/55 backdrop-blur-[2px]" />
          <form
            onSubmit={salvar}
            role="dialog"
            aria-modal="true"
            aria-label={editando ? `Editar ${editando.nome}` : 'Nova unidade'}
            className="absolute bottom-0 left-0 right-0 flex max-h-[94dvh] flex-col overflow-hidden rounded-t-3xl bg-[#f4f8fd] shadow-[0_-24px_60px_-12px_rgba(8,43,87,.5)] dark:bg-[#0f1422] sm:left-auto sm:top-0 sm:max-h-none sm:w-[600px] sm:rounded-none sm:rounded-l-3xl"
          >
            <header className="shrink-0 border-b border-[#e2eaf4] bg-white px-4 pb-3 pt-2.5 dark:border-slate-800 dark:bg-[#121826] sm:px-6 sm:pt-4">
              <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-[#c4d4e8] dark:bg-slate-600 sm:hidden" aria-hidden="true" />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0b63ce] dark:text-sky-300">{editando ? 'Editar cadastro' : 'Novo cadastro'}</p>
                  <h2 className="line-clamp-2 text-lg font-extrabold leading-snug text-[#0d2240] dark:text-slate-50">{editando ? editando.nome : 'Nova unidade ou departamento'}</h2>
                </div>
                <button type="button" onClick={() => fechar()} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#5f7391] hover:bg-[#e6f0fc] dark:text-slate-300 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <Secao icone={<Building2 className="h-5 w-5" />} titulo="Identificação" dica="Nome e classificação exibidos em todo o sistema.">
                <Input label="Nome *" value={form.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: E. M. NOVA ESPERANÇA" required />
                {nomeMudou && (
                  <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Ocorrências e acessos já registrados continuam ligados a esta unidade; o novo nome vale daqui para frente.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Tipo" value={form.tipo} onChange={(e) => { const tipo = e.target.value as RamalUnidadeTipo; setForm((f) => ({ ...f, tipo, categoria: CATEGORIAS_POR_TIPO[tipo].includes(f.categoria) ? f.categoria : CATEGORIAS_POR_TIPO[tipo][0] })); }}
                    options={[{ value: 'unidade_escolar', label: 'Unidade escolar' }, { value: 'departamento', label: 'Departamento SMEDU' }]} />
                  <Select label="Categoria" value={form.categoria} onChange={(e) => mudar('categoria', e.target.value)} disabled={!ehEscola}
                    options={CATEGORIAS_POR_TIPO[form.tipo].map((c) => ({ value: c, label: c }))} />
                </div>
                <div>
                  <Input label="Lotação no quadro de servidores" value={form.lotacao} onChange={(e) => mudar('lotacao', e.target.value)} list="unidades-lotacoes" placeholder="Selecione ou digite" autoComplete="off" />
                  <datalist id="unidades-lotacoes">{lotacoes.map((l) => <option key={l} value={l} />)}</datalist>
                  <p className="mt-1 text-[11px] text-[#6b7f9b] dark:text-slate-400">Liga a unidade aos servidores lotados nela.</p>
                </div>
              </Secao>

              <Secao icone={<UserRound className="h-5 w-5" />} titulo={ehEscola ? 'Direção' : 'Responsáveis'} dica={ehEscola ? 'Quem responde pela escola.' : 'Quem chefia o departamento.'}>
                <ComboServidor label={rotuloDirecao} nome={form.diretor} servidorId={form.diretor_servidor_id} opcoes={opcoes} carregando={carregando}
                  onChange={(nome, id) => { setForm((f) => ({ ...f, diretor: nome, diretor_servidor_id: id })); setAutoDiretor(''); }} />
                {autoDiretor && form.diretor === autoDiretor && (
                  <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Dirigente Escolar desta unidade no Quadro de Servidores. Salve para confirmar o vínculo.
                  </p>
                )}
                <ComboServidor label={rotuloVice} nome={form.vice_diretor} servidorId={form.vice_servidor_id} opcoes={opcoes} carregando={carregando}
                  onChange={(nome, id) => setForm((f) => ({ ...f, vice_diretor: nome, vice_servidor_id: id }))} />
              </Secao>

              <Secao icone={<Phone className="h-5 w-5" />} titulo="Contatos" dica="Ramais internos, telefone externo e e-mail.">
                <div className="space-y-2">
                  <Rotulo>Ramais</Rotulo>
                  {form.ramais.map((r, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28 shrink-0"><Input aria-label={`Ramal ${i + 1}`} value={r.numero} onChange={(e) => mudarRamal(i, { numero: e.target.value })} placeholder="Nº" inputMode="numeric" /></div>
                      <div className="min-w-0 flex-1"><Input aria-label={`Descrição do ramal ${i + 1}`} value={r.descricao ?? ''} onChange={(e) => mudarRamal(i, { descricao: e.target.value })} placeholder="Descrição (Direção, Secretaria…)" /></div>
                      <button type="button" aria-label={`Remover ramal ${i + 1}`} disabled={form.ramais.length === 1 && !r.numero && !r.descricao}
                        onClick={() => setForm((f) => ({ ...f, ramais: f.ramais.length > 1 ? f.ramais.filter((_, j) => j !== i) : [{ numero: '', descricao: '' }] }))}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#8a9bb2] hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-30"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {form.ramais.length < MAX_RAMAIS && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, ramais: [...f.ramais, { numero: '', descricao: '' }] }))} className="flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-[#0b63ce] hover:underline dark:text-sky-300"><Plus className="h-4 w-4" /> Adicionar ramal</button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Telefone externo" value={form.telefone} onChange={(e) => mudar('telefone', e.target.value)} placeholder="(21) 0000-0000" inputMode="tel" />
                  <Input label="E-mail" type="email" value={form.email} onChange={(e) => mudar('email', e.target.value)} placeholder="unidade@itaguai.rj.gov.br" autoComplete="off" />
                </div>
              </Secao>

              <Secao icone={<MapPin className="h-5 w-5" />} titulo="Endereço e localização" dica="Usados no Mapa Operacional da Rede.">
                <Input label="Endereço" value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} placeholder="Rua, número" />
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <Input label="Bairro" value={form.bairro} onChange={(e) => mudar('bairro', e.target.value)} />
                  <Input label="CEP" value={form.cep} onChange={(e) => mudar('cep', e.target.value)} placeholder="00000-000" inputMode="numeric" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Latitude" value={form.latitude} onChange={(e) => mudar('latitude', e.target.value)} placeholder="-22,8677" inputMode="decimal" />
                  <Input label="Longitude" value={form.longitude} onChange={(e) => mudar('longitude', e.target.value)} placeholder="-43,7754" inputMode="decimal" />
                </div>
                {linkMapa && (
                  <a href={linkMapa} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-[#0b63ce] hover:underline dark:text-sky-300"><ExternalLink className="h-4 w-4" aria-hidden="true" /> Conferir este ponto no Google Maps</a>
                )}
                <Input label="Link do Google Maps" value={form.mapa_url} onChange={(e) => mudar('mapa_url', e.target.value)} placeholder="https://maps.app.goo.gl/…" inputMode="url" />
                <div className="space-y-2">
                  <Input label="Foto da fachada (endereço da imagem)" value={form.foto_url} onChange={(e) => { mudar('foto_url', e.target.value); setFotoComErro(false); }} placeholder="https://…" inputMode="url" />
                  {form.foto_url.trim() && (
                    fotoComErro ? (
                      <p className="flex items-center gap-2 rounded-lg bg-[#eef3f9] px-3 py-3 text-xs text-[#5f7391] dark:bg-slate-800/60 dark:text-slate-400"><ImageOff className="h-4 w-4" aria-hidden="true" /> Não foi possível carregar esta imagem.</p>
                    ) : (
                      <img src={form.foto_url.trim()} alt="Prévia da fachada" loading="lazy" referrerPolicy="no-referrer" onError={() => setFotoComErro(true)} className="h-40 w-full rounded-xl border border-[#e2eaf4] object-cover dark:border-slate-800" />
                    )
                  )}
                </div>
              </Secao>

              <Secao icone={<Check className="h-5 w-5" />} titulo="Situação e observações">
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#e2eaf4] px-3 dark:border-slate-800">
                  <span>
                    <span className="block text-sm font-bold text-[#0d2240] dark:text-slate-100">Cadastro ativo</span>
                    <span className="block text-xs text-[#5f7391] dark:text-slate-400">Desligado, a unidade some de Ramais, Recepção e CCO (os dados ficam guardados).</span>
                  </span>
                  <input type="checkbox" role="switch" checked={form.ativo} onChange={(e) => mudar('ativo', e.target.checked)} className="peer sr-only" />
                  <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 dark:bg-slate-600" />
                </label>
                <div className="space-y-1.5">
                  <label htmlFor="unidade-obs" className="block text-xs font-medium text-slate-300">Observações</label>
                  <textarea id="unidade-obs" rows={3} value={form.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} placeholder="Horário de funcionamento, referências, avisos…"
                    className="w-full rounded-lg border border-slate-700/80 bg-[#121826] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </Secao>
            </div>

            <footer className="shrink-0 border-t border-[#e2eaf4] bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 dark:border-slate-800 dark:bg-[#121826] sm:px-6">
              {erroForm && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{erroForm}</p>}
              {confirmarSaida ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#0d2240] dark:text-slate-100">Descartar as alterações?</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setConfirmarSaida(false)}>Continuar editando</Button>
                    <Button type="button" variant="danger" onClick={() => fechar(true)}>Descartar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#6b7f9b] dark:text-slate-400">{alterado ? '● Alterações não salvas' : 'Sem alterações'}</span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => fechar()}>Cancelar</Button>
                    <Button type="submit" isLoading={salvando} disabled={!alterado && !!editando}>{editando ? 'Salvar alterações' : 'Adicionar'}</Button>
                  </div>
                </div>
              )}
            </footer>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
};
