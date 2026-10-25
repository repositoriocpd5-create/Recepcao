import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, Check, Download, Eye, FileDown, ImagePlus, Layers, Palette, Pencil, Plus, Printer, QrCode,
  RefreshCw, RotateCcw, Save, Search, Sparkles, Type, TypeOutline, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Cracha, CrachaModelo, CrachaStatus } from '@/types';
import { dataService } from '@/services/dataService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { CrachaArte } from './CrachaArte';
import { baixarArquivo, gerarPdfCrachas, prepararLogo, resolverLogo, svgDoCracha, svgParaPng } from './exportacao';
import {
  DadosCracha, FONTES, MODELO_PADRAO, PALETAS, codigoDoCracha, legendaDoCracha, mesclarModelo, partesDaLegenda, proximoNumeroLivre,
} from './modelo';

const situacaoLabel: Record<CrachaStatus, string> = {
  disponivel: 'Disponível', em_uso: 'Em uso', extraviado: 'Extraviado', danificado: 'Danificado', inativo: 'Inativo',
};

const situacaoBadge: Record<CrachaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  disponivel: 'success', em_uso: 'warning', extraviado: 'danger', danificado: 'danger', inativo: 'neutral',
};

const MAX_LOTE = 60;
const LOGO_PADRAO_URL = '/assets/brasao_itaguai.png';

type Aba = 'inventario' | 'criar';

const Passo: React.FC<{ n: number; icone: React.ReactNode; titulo: string; dica?: string; children: React.ReactNode }> = ({ n, icone, titulo, dica, children }) => (
  <section className="rounded-2xl border border-[#dce4f0] bg-white p-4 shadow-[0_10px_30px_-24px_rgba(16,48,96,.5)] dark:border-slate-800 dark:bg-[#121826]">
    <header className="mb-3 flex items-start gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f1fb] text-[#005a9c] dark:bg-sky-500/15 dark:text-sky-300" aria-hidden="true">
        {icone}
        <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#102755] text-[10px] font-extrabold text-white">{n}</span>
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-extrabold text-[#0d2240] dark:text-slate-100">{titulo}</h3>
        {dica && <p className="text-xs text-[#5f7391] dark:text-slate-400">{dica}</p>}
      </div>
    </header>
    <div className="space-y-3">{children}</div>
  </section>
);

const CampoCor: React.FC<{ rotulo: string; valor: string; onChange: (v: string) => void }> = ({ rotulo, valor, onChange }) => (
  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#dce4f0] px-3 dark:border-slate-700">
    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-black/10 shadow-inner" style={{ background: valor }}>
      <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} aria-label={rotulo} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-bold text-[#0d2240] dark:text-slate-100">{rotulo}</span>
      <span className="block font-mono text-[11px] uppercase text-[#6b7f9b] dark:text-slate-400">{valor}</span>
    </span>
  </label>
);

const Tamanho: React.FC<{ rotulo: string; valor: number; onChange: (v: number) => void }> = ({ rotulo, valor, onChange }) => (
  <div className="rounded-xl border border-[#dce4f0] px-3 py-2 dark:border-slate-700">
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-bold text-[#0d2240] dark:text-slate-100">{rotulo}</label>
      <span className="flex items-center gap-1">
        <output className="w-12 text-right font-mono text-xs font-bold tabular-nums text-[#005a9c] dark:text-sky-300">{valor}%</output>
        <button type="button" onClick={() => onChange(100)} disabled={valor === 100} aria-label={`Restaurar tamanho de ${rotulo}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#6b7f9b] hover:bg-[#eef5fe] disabled:opacity-30 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" /></button>
      </span>
    </div>
    <input type="range" min={70} max={140} step={5} value={valor} onChange={(e) => onChange(Number(e.target.value))} aria-label={rotulo} className="h-8 w-full cursor-pointer accent-[#005a9c]" />
  </div>
);

export const CrachasPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [crachas, setCrachas] = useState<Cracha[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [aba, setAba] = useState<Aba>('inventario');
  const [editing, setEditing] = useState<Cracha | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [descricao, setDescricao] = useState('');
  const [situacao, setSituacao] = useState<CrachaStatus>('disponivel');

  // Modelo e gerador
  const [modelo, setModelo] = useState<CrachaModelo>(MODELO_PADRAO);
  const [modeloSalvo, setModeloSalvo] = useState<string>(JSON.stringify(MODELO_PADRAO));
  const [inicio, setInicio] = useState(1);
  const [quantidade, setQuantidade] = useState(1);
  const [inicioEditado, setInicioEditado] = useState(false);
  const [lado, setLado] = useState<'frente' | 'verso'>('frente');
  const [comVerso, setComVerso] = useState(true);
  const [ocupado, setOcupado] = useState<'salvar' | 'pdf' | 'criar' | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const inputLogo = useRef<HTMLInputElement>(null);

  // Visualização de um crachá do inventário
  const [verCracha, setVerCracha] = useState<Cracha | null>(null);

  const carregar = async () => {
    setLoading(true);
    try { setCrachas(await dataService.getCrachas()); } finally { setLoading(false); }
  };
  useEffect(() => { void carregar(); }, []);
  useEffect(() => {
    void dataService.getCrachaModelo().then((m) => {
      const completo = mesclarModelo(m);
      setModelo(completo);
      setModeloSalvo(JSON.stringify(completo));
    });
  }, []);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 5000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const livre = useMemo(() => proximoNumeroLivre(crachas, modelo), [crachas, modelo]);
  useEffect(() => { if (!inicioEditado) setInicio(livre); }, [livre, inicioEditado]);

  const alterado = JSON.stringify(modelo) !== modeloSalvo;
  const mudar = <K extends keyof CrachaModelo>(campo: K, valor: CrachaModelo[K]) => setModelo((m) => ({ ...m, [campo]: valor }));

  const lote = useMemo(() => {
    const qtd = Math.min(MAX_LOTE, Math.max(1, Math.floor(quantidade) || 1));
    const ini = Math.max(1, Math.floor(inicio) || 1);
    return Array.from({ length: qtd }, (_, i): DadosCracha & { legenda: string } => {
      const n = ini + i;
      return { rotulo: modelo.rotulo.trim().toUpperCase() || 'VISITANTE', numero: String(n), codigo: codigoDoCracha(modelo, n), legenda: legendaDoCracha(modelo, n) };
    });
  }, [inicio, quantidade, modelo]);
  const codigosExistentes = useMemo(() => new Set(crachas.map((c) => c.numero.toUpperCase())), [crachas]);
  const jaExistem = lote.filter((d) => codigosExistentes.has(d.codigo));
  const novos = lote.filter((d) => !codigosExistentes.has(d.codigo));
  const codigoLongo = lote.some((d) => d.codigo.length > 20);

  const logoPrevia = modelo.logo ?? LOGO_PADRAO_URL;

  // --- Ações ---------------------------------------------------------------
  const salvarModelo = async () => {
    setOcupado('salvar');
    try {
      await dataService.salvarCrachaModelo(modelo);
      setModeloSalvo(JSON.stringify(modelo));
      setAviso({ tipo: 'sucesso', texto: 'Modelo do crachá salvo. Vale para todos os novos crachás.' });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível salvar o modelo.' });
    } finally { setOcupado(null); }
  };

  const baixarPdf = async (dados: DadosCracha[], nome: string, verso = comVerso) => {
    const pdf = await gerarPdfCrachas(modelo, dados, verso);
    pdf.save(nome);
  };

  const apenasPdf = async () => {
    setOcupado('pdf');
    try {
      await baixarPdf(lote, `crachas-${modelo.rotulo.toLowerCase()}-${lote[0].numero}-a-${lote[lote.length - 1].numero}.pdf`);
      setAviso({ tipo: 'sucesso', texto: `PDF com ${lote.length} ${lote.length === 1 ? 'crachá gerado' : 'crachás gerado'} (A4, 54 × 86 mm).` });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível gerar o PDF.' });
    } finally { setOcupado(null); }
  };

  const cadastrarEBaixar = async () => {
    setOcupado('criar');
    try {
      const atuais = await dataService.getCrachas();
      const existentes = new Set(atuais.map((c) => c.numero.toUpperCase()));
      let criados = 0;
      for (const d of lote) {
        if (existentes.has(d.codigo)) continue;
        await dataService.salvarCracha({ numero: d.codigo, descricao: legendaDoCracha(modelo, Number(d.numero)), situacao: 'disponivel', ativo: true });
        criados += 1;
      }
      if (alterado) { await dataService.salvarCrachaModelo(modelo); setModeloSalvo(JSON.stringify(modelo)); }
      await baixarPdf(lote, `crachas-${modelo.rotulo.toLowerCase()}-${lote[0].numero}-a-${lote[lote.length - 1].numero}.pdf`);
      await carregar();
      setInicioEditado(false);
      setAviso({ tipo: 'sucesso', texto: `${criados} ${criados === 1 ? 'crachá cadastrado' : 'crachás cadastrados'} no inventário${criados < lote.length ? ` (${lote.length - criados} já existiam)` : ''} e PDF baixado.` });
    } catch (err) {
      setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível cadastrar os crachás.' });
      await carregar();
    } finally { setOcupado(null); }
  };

  const trocarLogo = async (arquivo?: File) => {
    if (!arquivo) return;
    try { mudar('logo', await prepararLogo(arquivo)); }
    catch (err) { setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível usar esta imagem.' }); }
    if (inputLogo.current) inputLogo.current.value = '';
  };

  // --- Inventário ----------------------------------------------------------
  const abrirCadastro = (cracha?: Cracha) => {
    setEditing(cracha || null);
    setNumero(cracha?.numero || '');
    setDescricao(cracha ? cracha.descricao || '' : legendaDoCracha(modelo, livre));
    setSituacao(cracha?.situacao || 'disponivel');
    setIsModalOpen(true);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const atuais = editing ? crachas : await dataService.getCrachas();
    const legendaAtual = descricao.trim();
    const emUso = atuais.some((item) => item.id !== editing?.id && (item.descricao || '').trim().toUpperCase() === legendaAtual.toUpperCase());
    const legenda = !editing && (!legendaAtual || emUso) ? legendaDoCracha(modelo, proximoNumeroLivre(atuais, modelo)) : legendaAtual;
    await dataService.salvarCracha({ id: editing?.id, numero, descricao: legenda, situacao, ativo: situacao !== 'inativo' });
    setIsModalOpen(false);
    await carregar();
  };

  const filtrados = crachas.filter((item) => item.numero.toLowerCase().includes(search.toLowerCase()) || item.descricao?.toLowerCase().includes(search.toLowerCase()));

  const dadosDoInventario = (c: Cracha): DadosCracha => {
    const p = partesDaLegenda(c.descricao, modelo);
    return { rotulo: p.rotulo, numero: p.numero, codigo: c.numero };
  };

  const baixarPng = async (c: Cracha, ladoPng: 'frente' | 'verso') => {
    try {
      const logo = await resolverLogo(modelo);
      baixarArquivo(await svgParaPng(svgDoCracha(ladoPng, modelo, dadosDoInventario(c), logo), 1280), `cracha-${(c.descricao || c.numero).toLowerCase().replace(/\s+/g, '-')}-${ladoPng}.png`);
    } catch (err) { setAviso({ tipo: 'erro', texto: err instanceof Error ? err.message : 'Não foi possível gerar a imagem.' }); }
  };

  const abas: { valor: Aba; rotulo: string; icone: React.ReactNode }[] = [
    { valor: 'inventario', rotulo: 'Inventário', icone: <Layers className="h-4 w-4" /> },
    { valor: 'criar', rotulo: 'Criar e personalizar', icone: <Sparkles className="h-4 w-4" /> },
  ];

  const exemplo = lote[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><span className="rounded-xl bg-[#edf5fc] p-2 text-[#005a9c]"><BadgeCheck className="h-5 w-5" /></span><h2 className="text-xl font-bold text-[#152238] dark:text-slate-100">Crachás</h2></div>
          <p className="mt-1 text-xs text-[#627289] dark:text-slate-400">Inventário de credenciais físicas da recepção{isAdmin ? ' e criação de novos crachás com código de barras.' : '.'}</p>
        </div>
        {isAdmin && aba === 'inventario' && <Button size="sm" onClick={() => abrirCadastro()}><Plus className="h-4 w-4" />Novo crachá</Button>}
      </div>

      {isAdmin && (
        <div role="tablist" aria-label="Seções de crachás" className="flex gap-1.5 rounded-2xl bg-[#eef3fa] p-1.5 dark:bg-slate-800/60 sm:w-fit">
          {abas.map((a) => (
            <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor} onClick={() => setAba(a.valor)}
              className={cn('flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none',
                aba === a.valor ? 'bg-white text-[#005a9c] shadow dark:bg-[#121826] dark:text-sky-300' : 'text-[#5f7391] hover:text-[#005a9c] dark:text-slate-400')}>
              {a.icone}{a.rotulo}
            </button>
          ))}
        </div>
      )}

      {aviso && (
        <p role="status" className={cn('flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg', aviso.tipo === 'sucesso' ? 'bg-[#102755]' : 'bg-rose-600')}>
          {aviso.tipo === 'sucesso' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />} {aviso.texto}
        </p>
      )}

      {aba === 'inventario' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(['disponivel', 'em_uso', 'extraviado', 'danificado'] as CrachaStatus[]).map((status) => <Card key={status} className="p-4"><div className="text-xs text-[#627289] dark:text-slate-400">{situacaoLabel[status]}</div><div className="mt-1 text-2xl font-bold text-[#152238] dark:text-slate-100">{crachas.filter((item) => item.situacao === status).length}</div></Card>)}
          </div>

          <Card>
            <CardHeader><div><CardTitle>Inventário de crachás</CardTitle><CardDescription>O identificador é o valor lido no código de barras; a descrição é a legenda impressa no crachá.</CardDescription></div><Button variant="outline" size="sm" onClick={carregar} isLoading={loading}><RefreshCw className="h-3.5 w-3.5" />Atualizar</Button></CardHeader>
            <div className="mb-4 max-w-md"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número ou descrição" icon={<Search className="h-4 w-4" />} /></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="px-3 py-3">Identificador</th><th className="px-3 py-3">Descrição</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3 text-right">Ação</th></tr></thead><tbody>{filtrados.map((cracha) => (
              <tr key={cracha.id}>
                <td className="px-3 py-3 font-mono font-semibold text-[#152238] dark:text-slate-100">{cracha.numero}</td>
                <td className="px-3 py-3 text-[#627289] dark:text-slate-400">{cracha.descricao || '—'}</td>
                <td className="px-3 py-3"><Badge variant={situacaoBadge[cracha.situacao]}>{situacaoLabel[cracha.situacao]}</Badge></td>
                <td className="whitespace-nowrap px-3 py-3 text-right">{isAdmin && <>
                  <Button variant="ghost" size="sm" onClick={() => setVerCracha(cracha)} aria-label={`Ver crachá ${cracha.descricao || cracha.numero}`}><Eye className="h-3.5 w-3.5" />Ver</Button>
                  <Button variant="ghost" size="sm" onClick={() => abrirCadastro(cracha)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                </>}</td>
              </tr>
            ))}</tbody></table>{!loading && filtrados.length === 0 && <div className="py-10 text-center text-sm text-[#627289]">Nenhum crachá cadastrado.</div>}</div>
          </Card>
        </>
      )}

      {isAdmin && aba === 'criar' && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            <Passo n={1} icone={<QrCode className="h-5 w-5" />} titulo="Quais crachás criar?" dica="O código de barras termina sempre no número do crachá.">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Palavra da faixa" value={modelo.rotulo} onChange={(e) => mudar('rotulo', e.target.value.toUpperCase())} placeholder="VISITANTE" maxLength={16} />
                <Input label="Começar no nº" type="number" min={1} value={inicio} onChange={(e) => { setInicio(Number(e.target.value)); setInicioEditado(true); }} inputMode="numeric" />
                <Input label={`Quantidade (até ${MAX_LOTE})`} type="number" min={1} max={MAX_LOTE} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} inputMode="numeric" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Início do código (prefixo)" value={modelo.prefixo} onChange={(e) => mudar('prefixo', e.target.value.replace(/\D/g, '').slice(0, 14))} inputMode="numeric" placeholder="89631245" />
                <Select label="Dígitos do número" value={String(modelo.digitosNumero)} onChange={(e) => mudar('digitosNumero', Number(e.target.value))}
                  options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n} dígitos (ex.: ${String(11).padStart(n, '0')})` }))} />
              </div>
              <div className="rounded-xl bg-[#f4f8fd] p-3 dark:bg-slate-800/50" aria-live="polite">
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#6b7f9b] dark:text-slate-400">Prévia dos códigos</p>
                <ul className="space-y-1 font-mono text-[13px] text-[#10233f] dark:text-slate-100">
                  {[lote[0], ...(lote.length > 2 ? [null] : []), ...(lote.length > 1 ? [lote[lote.length - 1]] : [])].map((d, i) => d
                    ? <li key={d.codigo} className="flex flex-wrap items-center gap-x-3"><span className="w-28 shrink-0 font-sans font-bold text-[#005a9c] dark:text-sky-300">{d.legenda}</span><span>{d.codigo.slice(0, -String(d.numero).length)}<strong className="rounded bg-amber-200/70 px-0.5 text-[#0d2240] dark:bg-amber-400/25 dark:text-amber-100">{d.codigo.slice(-String(d.numero).length)}</strong></span></li>
                    : <li key={`gap${i}`} className="pl-1 text-[#8a9bb2]">⋮</li>)}
                </ul>
                {jaExistem.length > 0 && <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{jaExistem.length} {jaExistem.length === 1 ? 'código já existe' : 'códigos já existem'} no inventário e não {jaExistem.length === 1 ? 'será duplicado' : 'serão duplicados'}.</p>}
                {codigoLongo && <p className="mt-2 text-xs font-semibold text-rose-600">O código ficou longo demais (máximo 20 dígitos). Reduza o prefixo.</p>}
              </div>
            </Passo>

            <Passo n={2} icone={<ImagePlus className="h-5 w-5" />} titulo="Logo" dica="Troque o brasão por outra imagem (PNG com fundo transparente fica melhor).">
              <div className="flex items-center gap-4">
                <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-dashed border-[#b9cfe9] bg-[#f4f8fd] p-2 dark:border-slate-600 dark:bg-slate-800/50"><img src={logoPrevia} alt="Logo atual do crachá" className="max-h-full max-w-full object-contain" /></span>
                <div className="flex flex-wrap gap-2">
                  <input ref={inputLogo} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => void trocarLogo(e.target.files?.[0])} />
                  <Button type="button" variant="secondary" size="sm" onClick={() => inputLogo.current?.click()}><ImagePlus className="h-4 w-4" />{modelo.logo ? 'Trocar logo' : 'Enviar outra logo'}</Button>
                  {modelo.logo && <Button type="button" variant="ghost" size="sm" onClick={() => mudar('logo', null)}><RotateCcw className="h-4 w-4" />Voltar ao brasão</Button>}
                </div>
              </div>
            </Passo>

            <Passo n={3} icone={<Palette className="h-5 w-5" />} titulo="Cores" dica="Escolha uma combinação pronta ou ajuste as duas cores.">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Combinações de cores">
                {PALETAS.map((p) => {
                  const ativa = modelo.corPrimaria.toLowerCase() === p.primaria && modelo.corSecundaria.toLowerCase() === p.secundaria;
                  return (
                    <button key={p.nome} type="button" aria-pressed={ativa} title={p.nome} onClick={() => setModelo((m) => ({ ...m, corPrimaria: p.primaria, corSecundaria: p.secundaria }))}
                      className={cn('group flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition', ativa ? 'border-[#0b63ce] bg-[#eef5fe] dark:bg-sky-500/10' : 'border-transparent hover:border-[#cfe0f5]')}>
                      <span className="relative h-10 w-full overflow-hidden rounded-lg shadow-inner" style={{ background: `linear-gradient(135deg, ${p.primaria} 55%, ${p.secundaria} 55%)` }}>
                        {ativa && <Check className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white p-0.5 text-[#0b63ce]" />}
                      </span>
                      <span className="text-[11px] font-bold leading-tight text-[#3b4d68] dark:text-slate-300">{p.nome}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CampoCor rotulo="Cor principal (faixa e títulos)" valor={modelo.corPrimaria} onChange={(v) => mudar('corPrimaria', v)} />
                <CampoCor rotulo="Cor de destaque (ondas)" valor={modelo.corSecundaria} onChange={(v) => mudar('corSecundaria', v)} />
              </div>
            </Passo>

            <Passo n={4} icone={<Type className="h-5 w-5" />} titulo="Textos" dica="Aparecem na frente e no verso do crachá.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Linha 1 do órgão" value={modelo.linha1} onChange={(e) => mudar('linha1', e.target.value)} maxLength={40} />
                <Input label="Linha 2 do órgão (destaque)" value={modelo.linha2} onChange={(e) => mudar('linha2', e.target.value)} maxLength={34} />
                <Input label="Texto sob o QR Code (verso)" value={modelo.textoApresente} onChange={(e) => mudar('textoApresente', e.target.value)} maxLength={60} />
                <Input label="Aviso de devolução (verso)" value={modelo.textoDevolva} onChange={(e) => mudar('textoDevolva', e.target.value)} maxLength={70} />
              </div>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#dce4f0] px-3 dark:border-slate-700">
                <span><span className="block text-sm font-bold text-[#0d2240] dark:text-slate-100">Mostrar “Nº” na faixa</span><span className="block text-xs text-[#5f7391] dark:text-slate-400">Ajuda a achar o crachá certo de relance.</span></span>
                <input type="checkbox" role="switch" checked={modelo.mostrarNumero} onChange={(e) => mudar('mostrarNumero', e.target.checked)} className="peer sr-only" />
                <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 dark:bg-slate-600 dark:peer-checked:bg-emerald-500" />
              </label>
            </Passo>

            <Passo n={5} icone={<TypeOutline className="h-5 w-5" />} titulo="Fontes e tamanhos" dica="Tipo de letra e tamanho dos textos, da faixa e do número do código.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Fonte dos textos" value={modelo.fonteTexto} onChange={(e) => mudar('fonteTexto', e.target.value)} options={Object.entries(FONTES).map(([valor, f]) => ({ value: valor, label: f.nome }))} />
                <Select label="Fonte da faixa (VISITANTE)" value={modelo.fonteFaixa} onChange={(e) => mudar('fonteFaixa', e.target.value)} options={Object.entries(FONTES).map(([valor, f]) => ({ value: valor, label: f.nome }))} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Tamanho rotulo="Textos" valor={modelo.tamTexto} onChange={(v) => mudar('tamTexto', v)} />
                <Tamanho rotulo="Faixa" valor={modelo.tamFaixa} onChange={(v) => mudar('tamFaixa', v)} />
                <Tamanho rotulo="Número do código" valor={modelo.tamCodigo} onChange={(v) => mudar('tamCodigo', v)} />
              </div>
              <p className="text-[11px] text-[#6b7f9b] dark:text-slate-400">As letras usam as fontes do computador que gera o PDF. Textos longos são comprimidos automaticamente para caber no crachá.</p>
            </Passo>
          </div>

          {/* Prévia fixa */}
          <aside className="space-y-3 xl:sticky xl:top-4" aria-label="Prévia do crachá">
            <div className="rounded-3xl border border-[#dce4f0] bg-[radial-gradient(circle_at_30%_20%,#ffffff,#e8f0fa)] p-4 shadow-[0_20px_40px_-28px_rgba(16,48,96,.6)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_30%_20%,#1a2336,#0f1422)]">
              <div role="tablist" aria-label="Lado do crachá" className="mx-auto mb-4 grid w-52 grid-cols-2 gap-1 rounded-xl bg-white/80 p-1 dark:bg-slate-800/70">
                {(['frente', 'verso'] as const).map((l) => (
                  <button key={l} type="button" role="tab" aria-selected={lado === l} onClick={() => setLado(l)}
                    className={cn('min-h-9 rounded-lg text-[13px] font-bold capitalize transition', lado === l ? 'bg-[#102755] text-white' : 'text-[#5f7391] dark:text-slate-300')}>{l}</button>
                ))}
              </div>
              <div className="mx-auto w-full max-w-[300px] drop-shadow-[0_22px_28px_rgba(10,30,70,.28)]">
                <CrachaArte lado={lado} modelo={modelo} dados={exemplo} logo={logoPrevia} idBase="previa" />
              </div>
              <p className="mt-3 text-center text-xs text-[#5f7391] dark:text-slate-400">{lado === 'frente' ? 'Código de barras (Code 128) lido pelo leitor da recepção.' : 'QR Code com o mesmo código, para câmeras e celulares.'}</p>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[#dce4f0] bg-white px-3 text-sm font-semibold text-[#3b4d68] dark:border-slate-800 dark:bg-[#121826] dark:text-slate-300">
              <input type="checkbox" checked={comVerso} onChange={(e) => setComVerso(e.target.checked)} className="h-4 w-4 accent-[#005a9c]" /> Incluir o verso no PDF (frente e verso)
            </label>

            <div className="grid gap-2">
              <Button size="lg" onClick={() => void cadastrarEBaixar()} isLoading={ocupado === 'criar'} disabled={!!ocupado || codigoLongo || !modelo.prefixo}>
                <FileDown className="h-5 w-5" />Cadastrar {novos.length} {novos.length === 1 ? 'crachá' : 'crachás'} e baixar PDF
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => void apenasPdf()} isLoading={ocupado === 'pdf'} disabled={!!ocupado || codigoLongo}><Printer className="h-4 w-4" />Só o PDF</Button>
                <Button variant="secondary" onClick={() => void salvarModelo()} isLoading={ocupado === 'salvar'} disabled={!!ocupado || !alterado}><Save className="h-4 w-4" />Salvar modelo</Button>
              </div>
              <p className="text-center text-[11px] font-semibold text-[#6b7f9b] dark:text-slate-400">{alterado ? '● Modelo com alterações não salvas' : 'Modelo salvo'} · PDF A4, 9 crachás de 54 × 86 mm por folha</p>
            </div>
          </aside>
        </div>
      )}

      <Modal isOpen={!!verCracha} onClose={() => setVerCracha(null)} title={verCracha?.descricao || 'Crachá'} description={verCracha ? `Código ${verCracha.numero}` : undefined} maxWidth="3xl">
        {verCracha && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(['frente', 'verso'] as const).map((l) => (
                <figure key={l} className="space-y-2">
                  <div className="mx-auto max-w-[260px] drop-shadow-[0_16px_22px_rgba(10,30,70,.25)]"><CrachaArte lado={l} modelo={modelo} dados={dadosDoInventario(verCracha)} logo={logoPrevia} idBase={`ver-${l}`} /></div>
                  <figcaption className="flex items-center justify-between gap-2 text-xs font-bold capitalize text-[#5f7391] dark:text-slate-400">{l}<Button variant="ghost" size="sm" onClick={() => void baixarPng(verCracha, l)}><Download className="h-3.5 w-3.5" />PNG</Button></figcaption>
                </figure>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#dce4f0] pt-3 dark:border-slate-800">
              <Button variant="outline" onClick={() => setVerCracha(null)}><X className="h-4 w-4" />Fechar</Button>
              <Button onClick={() => void baixarPdf([dadosDoInventario(verCracha)], `cracha-${(verCracha.descricao || verCracha.numero).toLowerCase().replace(/\s+/g, '-')}.pdf`, true)}><Printer className="h-4 w-4" />Baixar PDF para imprimir</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar crachá' : 'Cadastrar crachá'} description="Credenciais extraviadas ou danificadas não podem ser atribuídas.">
        <form onSubmit={salvar} className="space-y-4"><Input label="Código de barras / identificador *" value={numero} onChange={(event) => setNumero(event.target.value)} placeholder="Ex.: 7892840819507" required /><div><Input label="Legenda impressa no crachá" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: VISITANTE 1" />{!editing && <p className="mt-1.5 text-[11px] text-[#627289] dark:text-slate-400">Preenchida automaticamente com o próximo número livre. Pode ser alterada. Para gerar vários crachás com código padronizado, use “Criar e personalizar”.</p>}</div><Select label="Situação" value={situacao} onChange={(event) => setSituacao(event.target.value as CrachaStatus)} options={(Object.keys(situacaoLabel) as CrachaStatus[]).map((value) => ({ value, label: situacaoLabel[value] }))} /><div className="flex justify-end gap-3 border-t border-[#dce4f0] pt-3 dark:border-slate-800"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form>
      </Modal>
    </div>
  );
};
