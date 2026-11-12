import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, RefreshCw, School, Search, Trash2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { dataService } from '@/services/dataService';
import { CATEGORIAS_POR_TIPO, ORDEM_CATEGORIAS } from '@/services/ramaisUnidades';
import { RamalUnidade, RamalUnidadeTipo } from '@/types';
import { cn } from '@/lib/utils';

type Filtro = 'todos' | RamalUnidadeTipo;

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const FORM_VAZIO = { nome: '', tipo: 'unidade_escolar' as RamalUnidadeTipo, categoria: 'Escolas Municipais', lotacao: '' };

/** Cadastro das unidades escolares e departamentos exibidos na tela de Ramais. */
export const GestaoUnidades: React.FC<{ onAviso: (msg: string, tipo: 'sucesso' | 'erro') => void }> = ({ onAviso }) => {
  const [unidades, setUnidades] = useState<RamalUnidade[]>([]);
  const [lotacoes, setLotacoes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const [editando, setEditando] = useState<RamalUnidade | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formErro, setFormErro] = useState('');
  const [isSalvando, setIsSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<RamalUnidade | null>(null);
  const [isRemovendo, setIsRemovendo] = useState(false);

  const carregar = async () => {
    setIsLoading(true);
    setErro(null);
    const [lista, servidores] = await Promise.allSettled([dataService.getRamaisUnidades(), dataService.getServidores()]);
    if (lista.status === 'fulfilled') setUnidades(lista.value);
    else setErro(lista.reason instanceof Error ? lista.reason.message : 'Não foi possível carregar as unidades.');
    if (servidores.status === 'fulfilled') {
      const distintas = new Set(servidores.value.map((s) => s.lotacao?.trim()).filter((l): l is string => !!l));
      setLotacoes(Array.from(distintas).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const termos = useMemo(() => normalizar(busca).split(' ').filter(Boolean), [busca]);
  const filtradas = useMemo(() => {
    const ordem = (categoria: string) => {
      const indice = ORDEM_CATEGORIAS.indexOf(categoria);
      return indice < 0 ? ORDEM_CATEGORIAS.length : indice;
    };
    return unidades
      .filter((u) => filtro === 'todos' || u.tipo === filtro)
      .filter((u) => {
        if (!termos.length) return true;
        const alvo = normalizar(`${u.nome} ${u.lotacao || ''} ${u.categoria}`);
        return termos.every((t) => alvo.includes(t));
      })
      .sort((a, b) => ordem(a.categoria) - ordem(b.categoria) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [unidades, filtro, termos]);

  const abrirNova = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setFormErro('');
    setIsFormOpen(true);
  };

  const abrirEdicao = (unidade: RamalUnidade) => {
    setEditando(unidade);
    setForm({ nome: unidade.nome, tipo: unidade.tipo, categoria: unidade.categoria, lotacao: unidade.lotacao || '' });
    setFormErro('');
    setIsFormOpen(true);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = form.nome.trim().replace(/\s+/g, ' ');
    if (!nome) {
      setFormErro('Informe o nome da unidade.');
      return;
    }
    const repetida = unidades.find((u) => u.id !== editando?.id && normalizar(u.nome) === normalizar(nome));
    if (repetida) {
      setFormErro(`Já existe uma unidade com este nome: ${repetida.nome}.`);
      return;
    }
    setIsSalvando(true);
    setFormErro('');
    try {
      const salva = await dataService.salvarRamalUnidade({
        ...(editando ? { id: editando.id } : { ativo: true }),
        nome,
        tipo: form.tipo,
        categoria: form.categoria,
        lotacao: form.lotacao.trim() || null,
      });
      setUnidades((lista) => (editando ? lista.map((u) => (u.id === salva.id ? salva : u)) : [...lista, salva]));
      setIsFormOpen(false);
      onAviso(editando ? `Unidade "${salva.nome}" atualizada.` : `Unidade "${salva.nome}" adicionada.`, 'sucesso');
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível salvar a unidade.';
      setFormErro(/duplicate|unique/i.test(mensagem) ? 'Já existe uma unidade com este nome, possivelmente removida da lista. Use outro nome ou peça ao suporte para reativá-la.' : mensagem);
    } finally {
      setIsSalvando(false);
    }
  };

  const confirmarRemocao = async () => {
    if (!removendo) return;
    setIsRemovendo(true);
    try {
      await dataService.salvarRamalUnidade({ id: removendo.id, ativo: false });
      setUnidades((lista) => lista.filter((u) => u.id !== removendo.id));
      onAviso(`Unidade "${removendo.nome}" removida da lista de ramais.`, 'sucesso');
      setRemovendo(null);
    } catch (err) {
      onAviso(err instanceof Error ? err.message : 'Não foi possível remover a unidade.', 'erro');
    } finally {
      setIsRemovendo(false);
    }
  };

  const totalEscolas = unidades.filter((u) => u.tipo === 'unidade_escolar').length;
  const abas: { valor: Filtro; rotulo: string; total: number }[] = [
    { valor: 'todos', rotulo: 'Todas', total: unidades.length },
    { valor: 'unidade_escolar', rotulo: 'Escolas', total: totalEscolas },
    { valor: 'departamento', rotulo: 'Departamentos', total: unidades.length - totalEscolas },
  ];

  return (
    <Card className="overflow-hidden border-slate-800">
      <CardHeader>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <School className="h-4 w-4 text-emerald-400" />
              Unidades escolares e departamentos
            </CardTitle>
            <CardDescription>Nomes exibidos na tela de Ramais. Os ramais são editados na própria tela de Ramais.</CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={carregar} isLoading={isLoading} aria-label="Atualizar lista">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="primary" size="sm" onClick={abrirNova}>
              <Plus className="h-4 w-4" /> Nova unidade
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            placeholder="Buscar unidade..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            icon={<Search className="h-4 w-4" />}
            aria-label="Buscar unidade"
            autoComplete="off"
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-800" aria-label="Limpar busca">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {abas.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              aria-pressed={filtro === aba.valor}
              onClick={() => setFiltro(aba.valor)}
              className={cn(
                'flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
                filtro === aba.valor
                  ? 'border-[#102755] bg-[#102755] text-white dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-100'
                  : 'border-[#dce4f0] text-[#4b6485] hover:border-[#9fc9ed] dark:border-slate-800 dark:text-slate-400'
              )}
            >
              {aba.rotulo}
              <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', filtro === aba.valor ? 'bg-white/20' : 'bg-[#e1e9f4] dark:bg-slate-800')}>{aba.total}</span>
            </button>
          ))}
        </div>
      </div>

      {erro ? (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">{erro}</p>
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-[#eef3f9] dark:bg-slate-800/60" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">Nenhuma unidade encontrada{busca ? ` para "${busca}"` : ''}.</p>
      ) : (
        <ul className="max-h-[480px] divide-y divide-[#e8eef7] overflow-y-auto rounded-lg border border-[#e3eaf4] dark:divide-slate-800 dark:border-slate-800">
          {filtradas.map((unidade) => (
            <li key={unidade.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                unidade.tipo === 'departamento' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
              )} aria-hidden="true">
                {unidade.tipo === 'departamento' ? <Building2 className="h-4 w-4" /> : <School className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-100" title={unidade.nome}>{unidade.nome}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {unidade.categoria}
                  {unidade.lotacao && unidade.lotacao !== unidade.nome && <> · Lotação: {unidade.lotacao}</>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => abrirEdicao(unidade)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-sky-300" aria-label={`Editar ${unidade.nome}`} title="Editar">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRemovendo(unidade)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label={`Remover ${unidade.nome}`} title="Remover da lista">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Cadastro / edição */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editando ? 'Editar unidade' : 'Nova unidade'}
        description={editando ? editando.nome : 'Adicione uma unidade escolar ou um departamento à lista de ramais.'}
        maxWidth="md"
      >
        <form onSubmit={salvar} className="space-y-4">
          <Input
            label="Nome *"
            value={form.nome}
            onChange={(event) => setForm({ ...form, nome: event.target.value })}
            placeholder="Ex.: E. M. NOVA ESPERANÇA"
            autoFocus
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={(event) => {
                const tipo = event.target.value as RamalUnidadeTipo;
                setForm({ ...form, tipo, categoria: CATEGORIAS_POR_TIPO[tipo].includes(form.categoria) ? form.categoria : CATEGORIAS_POR_TIPO[tipo][0] });
              }}
              options={[
                { value: 'unidade_escolar', label: 'Unidade escolar' },
                { value: 'departamento', label: 'Departamento SMEDU' },
              ]}
            />
            <Select
              label="Categoria"
              value={form.categoria}
              onChange={(event) => setForm({ ...form, categoria: event.target.value })}
              options={CATEGORIAS_POR_TIPO[form.tipo].map((categoria) => ({ value: categoria, label: categoria }))}
              disabled={form.tipo === 'departamento'}
            />
          </div>
          <div>
            <Input
              label="Lotação no quadro de servidores"
              value={form.lotacao}
              onChange={(event) => setForm({ ...form, lotacao: event.target.value })}
              placeholder="Selecione ou digite a lotação"
              list="gestao-unidades-lotacoes"
              autoComplete="off"
            />
            <datalist id="gestao-unidades-lotacoes">
              {lotacoes.map((lotacao) => <option key={lotacao} value={lotacao} />)}
            </datalist>
            <p className="mt-1 text-[11px] text-slate-400">
              Liga a unidade aos servidores lotados nela. Mudar só o nome não altera esse vínculo.
            </p>
          </div>
          {formErro && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{formErro}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isSalvando}>{editando ? 'Salvar alterações' : 'Adicionar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Remoção */}
      <Modal
        isOpen={!!removendo}
        onClose={() => setRemovendo(null)}
        title="Remover unidade da lista?"
        description={removendo?.nome}
        maxWidth="sm"
      >
        <p className="text-sm text-slate-300">
          A unidade deixa de aparecer na tela de Ramais. Os dados ficam guardados no banco e podem ser recuperados pelo suporte.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setRemovendo(null)}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={confirmarRemocao} isLoading={isRemovendo}><Trash2 className="h-4 w-4" /> Remover</Button>
        </div>
      </Modal>
    </Card>
  );
};
