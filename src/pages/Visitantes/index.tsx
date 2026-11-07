import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, UserPlus, Edit2, Shield, RefreshCw, FileDown, Phone, Building2, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { dataService, formatCpf } from '@/services/dataService';
import { generateInstitutionalPdf } from '@/services/pdfService';
import { Visitante } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const VisitantesPage: React.FC = () => {
  const { user } = useAuth();
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de edição / cadastro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const carregarVisitantes = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getVisitantes();
      setVisitantes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarVisitantes();
  }, []);

  const abrirModalNovo = () => {
    setEditId(null);
    setNome('');
    setCpf('');
    setRg('');
    setTelefone('');
    setEmail('');
    setEmpresa('');
    setObservacoes('');
    setIsModalOpen(true);
  };

  const abrirModalEditar = (v: Visitante) => {
    setEditId(v.id);
    setNome(v.nome);
    setCpf(v.cpf);
    setRg(v.rg || '');
    setTelefone(v.telefone || '');
    setEmail(v.email || '');
    setEmpresa(v.empresa_orgao || '');
    setObservacoes(v.observacoes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dataService.cadastrarOuAtualizarVisitante(
        {
          id: editId || undefined,
          nome,
          cpf,
          rg,
          telefone,
          email,
          empresa_orgao: empresa,
          observacoes,
        },
        user
      );
      setIsModalOpen(false);
      await carregarVisitantes();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtrados = visitantes.filter((v) => {
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return true;
    const digitos = termo.replace(/\D/g, '');
    return (
      v.nome.toLowerCase().includes(termo) ||
      v.cpf.includes(termo) ||
      (digitos.length >= 3 && v.cpf.replace(/\D/g, '').includes(digitos))
    );
  });

  const telefoneLink = (telefone?: string) => {
    const digitos = (telefone || '').replace(/\D/g, '');
    return digitos.length >= 8 ? `tel:${digitos}` : null;
  };

  const handleGerarPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateInstitutionalPdf({
        title: 'Cadastro Geral de Visitantes',
        subtitle: `Visitantes listados: ${filtrados.length} · Emitido em ${new Date().toLocaleString('pt-BR')}`,
        columns: ['Nome', 'CPF', 'RG / Documento', 'Telefone', 'Empresa / Vínculo', 'Observações'],
        rows: filtrados.map((item) => [item.nome, item.cpf, item.rg || '—', item.telefone || '—', item.empresa_orgao || 'Cidadão', item.observacoes || '—']),
        filename: 'cadastro-de-visitantes',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Cadastro Geral de Visitantes</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de cidadãos, responsáveis, fornecedores e representantes credenciados
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={handleGerarPdf} isLoading={isGeneratingPdf} className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0" aria-label="Gerar PDF" title="Gerar PDF">
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gerar PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={carregarVisitantes} isLoading={isLoading} className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0" aria-label="Atualizar lista" title="Atualizar lista">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={abrirModalNovo} className="min-h-11 flex-1 sm:min-h-0 sm:flex-none">
            <UserPlus className="w-4 h-4" />
            <span>Novo Visitante</span>
          </Button>
        </div>
      </div>

      {/* Busca */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="search"
                enterKeyHint="search"
                placeholder="Buscar nome ou CPF"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                aria-label="Pesquisar visitante por nome ou CPF"
                className="pr-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-800/40 hover:text-slate-100" aria-label="Limpar pesquisa">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 pr-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Proteção de Dados LGPD</span>
          </div>
        </div>
      </Card>

      {/* Tabela de Visitantes */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span>Visitantes Cadastrados</span>
            <Badge variant="neutral">{filtrados.length}</Badge>
          </CardTitle>
        </CardHeader>

        {filtrados.length === 0 ? (
          <div className="py-10 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#edf5ff] text-[#5f9df2] dark:bg-slate-800"><Users className="h-6 w-6" /></span>
            <p className="text-sm font-semibold text-slate-200">
              {isLoading ? 'Carregando visitantes...' : searchTerm ? `Nenhum visitante encontrado para “${searchTerm}”.` : 'Nenhum visitante cadastrado ainda.'}
            </p>
            {!isLoading && (
              <Button variant="outline" size="sm" className="mt-4" onClick={searchTerm ? () => setSearchTerm('') : abrirModalNovo}>
                {searchTerm ? <><X className="w-3.5 h-3.5" />Limpar pesquisa</> : <><UserPlus className="w-3.5 h-3.5" />Cadastrar visitante</>}
              </Button>
            )}
          </div>
        ) : (
        <>
        {/* Celular: um cartão por visitante (toque para editar) */}
        <ul className="space-y-2.5 md:hidden">
          {filtrados.map((v) => {
            const tel = telefoneLink(v.telefone);
            return (
              <li key={v.id} className="rounded-2xl border border-[#dce6f3] bg-white shadow-[0_6px_16px_-12px_rgba(18,44,82,.35)] dark:border-slate-800 dark:bg-[#101625]">
                <button type="button" onClick={() => abrirModalEditar(v)} className="flex w-full items-start gap-3 p-3.5 text-left" aria-label={`Editar ${v.nome}`}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f8ee] text-sm font-extrabold text-[#16a34a] dark:bg-emerald-950/60 dark:text-emerald-300">{v.nome.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold leading-snug text-slate-100">{v.nome}</span>
                    <span className="mt-0.5 block font-mono text-xs font-semibold text-emerald-400">{v.cpf}{v.rg ? <span className="font-sans font-normal text-slate-400"> · RG {v.rg}</span> : null}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{v.empresa_orgao || 'Cidadão / Particular'}</span></span>
                    {v.observacoes && (
                      <span className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{v.observacoes}</span>
                      </span>
                    )}
                  </span>
                  <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
                {v.telefone && (
                  <div className="flex items-center justify-between gap-2 border-t border-[#e3eaf4] px-3.5 py-2 dark:border-slate-800">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-300"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{v.telefone}</span></span>
                    {tel && <a href={tel} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#edf5ff] px-3 text-xs font-bold text-[#0b5ed7] dark:bg-slate-800 dark:text-sky-300"><Phone className="h-3.5 w-3.5" />Ligar</a>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Computador: tabela completa */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Nome do Visitante</th>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">RG / Doc</th>
                <th className="py-3 px-4">Telefone</th>
                <th className="py-3 px-4">Empresa / Vínculo</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtrados.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-100">{v.nome}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-medium">{v.cpf}</td>
                  <td className="py-3 px-4 text-slate-400">{v.rg || '-'}</td>
                  <td className="py-3 px-4 text-slate-300">{v.telefone || '-'}</td>
                  <td className="py-3 px-4 text-slate-200">{v.empresa_orgao || 'Cidadão'}</td>
                  <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{v.observacoes || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirModalEditar(v)}
                      className="text-slate-400 hover:text-emerald-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </Card>

      {/* Modal Cadastro/Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editId ? 'Editar Visitante' : 'Novo Visitante'}
        description="Preencha os dados do visitante para registro oficial"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome Completo *"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CPF *"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              required
            />
            <Input
              label="RG / Documento Oficial"
              value={rg}
              onChange={(e) => setRg(e.target.value)}
              placeholder="Ex: 29.887.654-2 SSP/SP"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Telefone / Celular *"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(21) 99999-9999"
              type="tel"
              inputMode="tel"
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
            />
          </div>

          <Input
            label="Empresa / Vínculo Institucional"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Ex: Editora Aprenda, Pai de Aluno, Técnico..."
          />

          <Input
            label="Observações Adicionais"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Informações relevantes sobre restrições ou acessibilidade"
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Visitante
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
