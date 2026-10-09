import React, { useEffect, useState } from 'react';
import { BadgeCheck, Plus, Pencil, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Cracha, CrachaStatus } from '@/types';
import { dataService } from '@/services/dataService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

const situacaoLabel: Record<CrachaStatus, string> = {
  disponivel: 'Disponível', em_uso: 'Em uso', extraviado: 'Extraviado', danificado: 'Danificado', inativo: 'Inativo',
};

const situacaoBadge: Record<CrachaStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  disponivel: 'success', em_uso: 'warning', extraviado: 'danger', danificado: 'danger', inativo: 'neutral',
};

export const CrachasPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [crachas, setCrachas] = useState<Cracha[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Cracha | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [descricao, setDescricao] = useState('');
  const [situacao, setSituacao] = useState<CrachaStatus>('disponivel');

  const carregar = async () => {
    setLoading(true);
    try { setCrachas(await dataService.getCrachas()); } finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, []);

  const abrirCadastro = (cracha?: Cracha) => {
    setEditing(cracha || null);
    setNumero(cracha?.numero || '');
    setDescricao(cracha?.descricao || '');
    setSituacao(cracha?.situacao || 'disponivel');
    setIsModalOpen(true);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    await dataService.salvarCracha({ id: editing?.id, numero, descricao, situacao, ativo: situacao !== 'inativo' });
    setIsModalOpen(false);
    await carregar();
  };

  const filtrados = crachas.filter((item) => item.numero.toLowerCase().includes(search.toLowerCase()) || item.descricao?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="p-2 rounded-xl bg-[#edf5fc] text-[#005a9c]"><BadgeCheck className="w-5 h-5" /></span><h2 className="text-xl font-bold text-[#152238] dark:text-slate-100">Crachás</h2></div>
          <p className="text-xs text-[#627289] dark:text-slate-400 mt-1">Inventário de credenciais físicas da recepção.</p>
        </div>
        {isAdmin && <Button size="sm" onClick={() => abrirCadastro()}><Plus className="w-4 h-4" />Novo crachá</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['disponivel', 'em_uso', 'extraviado', 'danificado'] as CrachaStatus[]).map((status) => <Card key={status} className="p-4"><div className="text-xs text-[#627289] dark:text-slate-400">{situacaoLabel[status]}</div><div className="text-2xl font-bold text-[#152238] dark:text-slate-100 mt-1">{crachas.filter((item) => item.situacao === status).length}</div></Card>)}
      </div>

      <Card>
        <CardHeader><div><CardTitle>Inventário de crachás</CardTitle><CardDescription>O identificador é o valor lido no código de barras; a descrição é a legenda impressa no crachá.</CardDescription></div><Button variant="outline" size="sm" onClick={carregar} isLoading={loading}><RefreshCw className="w-3.5 h-3.5" />Atualizar</Button></CardHeader>
        <div className="mb-4 max-w-md"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número ou descrição" icon={<Search className="w-4 h-4" />} /></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-3 px-3">Identificador</th><th className="py-3 px-3">Descrição</th><th className="py-3 px-3">Situação</th><th className="py-3 px-3 text-right">Ação</th></tr></thead><tbody>{filtrados.map((cracha) => <tr key={cracha.id}><td className="py-3 px-3 font-mono font-semibold text-[#152238] dark:text-slate-100">{cracha.numero}</td><td className="py-3 px-3 text-[#627289] dark:text-slate-400">{cracha.descricao || '—'}</td><td className="py-3 px-3"><Badge variant={situacaoBadge[cracha.situacao]}>{situacaoLabel[cracha.situacao]}</Badge></td><td className="py-3 px-3 text-right">{isAdmin && <Button variant="ghost" size="sm" onClick={() => abrirCadastro(cracha)}><Pencil className="w-3.5 h-3.5" />Editar</Button>}</td></tr>)}</tbody></table>{!loading && filtrados.length === 0 && <div className="py-10 text-center text-sm text-[#627289]">Nenhum crachá cadastrado.</div>}</div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Editar crachá' : 'Cadastrar crachá'} description="Credenciais extraviadas ou danificadas não podem ser atribuídas.">
        <form onSubmit={salvar} className="space-y-4"><Input label="Código de barras / identificador *" value={numero} onChange={(event) => setNumero(event.target.value)} placeholder="Ex.: 7892840819507" required /><Input label="Legenda impressa no crachá" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: VISITANTE 1" /><Select label="Situação" value={situacao} onChange={(event) => setSituacao(event.target.value as CrachaStatus)} options={(Object.keys(situacaoLabel) as CrachaStatus[]).map((value) => ({ value, label: situacaoLabel[value] }))} /><div className="flex justify-end gap-3 pt-3 border-t border-[#dce4f0] dark:border-slate-800"><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form>
      </Modal>
    </div>
  );
};
