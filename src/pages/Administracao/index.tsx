import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  Users,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Crown,
  UserCog,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Briefcase,
  Building2,
  Camera,
  Search,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { dataService } from '@/services/dataService';
import { DEMO_USERS } from '@/services/mockData';
import { RamalUnidade, UserProfile, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { GestaoUnidades } from '@/components/admin/GestaoUnidades';

const STORAGE_KEY_USERS = 'sme_admin_users';

function loadUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) return JSON.parse(raw) as UserProfile[];
  } catch {}
  return DEMO_USERS.map((u) => ({ ...u }));
}

function saveUsers(users: UserProfile[]) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; variant: 'info' | 'warning' | 'success' | 'neutral'; icon: React.ReactNode; descricao: string }
> = {
  admin: {
    label: 'ADMIN',
    variant: 'info',
    icon: <Crown className="w-3.5 h-3.5" />,
    descricao: 'Acesso total ao sistema, incluindo configurações e painel de administração',
  },
  gestor: {
    label: 'GESTOR',
    variant: 'warning',
    icon: <Shield className="w-3.5 h-3.5" />,
    descricao: 'Visualização de relatórios, autorização de entradas e gestão predial',
  },
  recepcionista: {
    label: 'RECEPCIONISTA',
    variant: 'success',
    icon: <UserCog className="w-3.5 h-3.5" />,
    descricao: 'Registro de entradas e saídas, atendimento no balcão de recepção',
  },
  atendente: {
    label: 'ATENDENTE',
    variant: 'neutral',
    icon: <Users className="w-3.5 h-3.5" />,
    descricao: 'Consulta de informações e atendimento básico',
  },
  unidade_escolar: {
    label: 'UNIDADE ESCOLAR',
    variant: 'neutral',
    icon: <Building2 className="w-3.5 h-3.5" />,
    descricao: 'CCO: registra e acompanha as ocorrências da própria escola',
  },
  cco: {
    label: 'EQUIPE CCO',
    variant: 'info',
    icon: <Camera className="w-3.5 h-3.5" />,
    descricao: 'CCO: acompanha e atende as ocorrências das unidades autorizadas',
  },
};

const ROLES_OPTIONS: UserRole[] = ['admin', 'gestor', 'recepcionista', 'atendente', 'unidade_escolar', 'cco'];
/** Papéis da recepção que podem, além disso, integrar a equipe do CCO. */
const ROLES_RECEPCAO_COM_CCO: UserRole[] = ['gestor', 'recepcionista', 'atendente'];

export const AdministracaoPage: React.FC = () => {
  const { user, switchDemoRole, updateUserProfile, isSupabaseLive } = useAuth();
  const [usuarios, setUsuarios] = useState<UserProfile[]>(() => (isSupabaseLive ? [] : loadUsers()));
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(isSupabaseLive);
  const [isSaving, setIsSaving] = useState(false);

  const carregarUsuarios = async () => {
    setCarregandoUsuarios(true);
    try {
      const lista = await dataService.getUsuariosSistema();
      setUsuarios(lista);
      if (!isSupabaseLive) saveUsers(lista);
    } catch (err: any) {
      exibirToast(err.message || 'Não foi possível carregar os usuários.', 'erro');
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  useEffect(() => {
    void carregarUsuarios();
  }, []);

  // Modal de Novo / Editar usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('recepcionista');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formSenha, setFormSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [formErro, setFormErro] = useState('');
  // CCO: unidade do usuário escolar, acesso da equipe e unidades acompanhadas.
  const [formUnidade, setFormUnidade] = useState('');
  const [formAcessoCco, setFormAcessoCco] = useState(false);
  const [formCcoRestrito, setFormCcoRestrito] = useState(false);
  const [formCcoUnidades, setFormCcoUnidades] = useState<string[]>([]);
  const [buscaUnidade, setBuscaUnidade] = useState('');
  const [unidadesEscolares, setUnidadesEscolares] = useState<RamalUnidade[]>([]);

  useEffect(() => {
    dataService.getRamaisUnidades()
      .then((lista) => setUnidadesEscolares(lista.filter((u) => u.tipo === 'unidade_escolar').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
      .catch(() => setUnidadesEscolares([]));
  }, []);

  const nomeUnidade = (id?: string | null) => unidadesEscolares.find((u) => u.id === id)?.nome;
  const equipeCcoNoForm = formRole === 'cco' || (ROLES_RECEPCAO_COM_CCO.includes(formRole) && formAcessoCco);

  // Toast
  const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' } | null>(null);

  function exibirToast(msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }


  function abrirNovoUsuario() {
    setEditingUser(null);
    setFormNome('');
    setFormEmail('');
    setFormMatricula('');
    setFormCargo('');
    setFormRole('recepcionista');
    setFormAtivo(true);
    setFormSenha('');
    setFormErro('');
    setFormUnidade('');
    setFormAcessoCco(false);
    setFormCcoRestrito(false);
    setFormCcoUnidades([]);
    setBuscaUnidade('');
    setIsModalOpen(true);
  }

  function abrirEdicaoUsuario(u: UserProfile) {
    setEditingUser(u);
    setFormNome(u.nome_completo);
    setFormEmail(u.email);
    setFormMatricula(u.matricula || '');
    setFormCargo(u.cargo);
    setFormRole(u.role);
    setFormAtivo(u.ativo);
    setFormSenha('');
    setFormErro('');
    setFormUnidade(u.unidade_id || '');
    setFormAcessoCco(Boolean(u.acesso_cco));
    setFormCcoRestrito(Boolean(u.cco_unidades?.length));
    setFormCcoUnidades(u.cco_unidades || []);
    setBuscaUnidade('');
    setIsModalOpen(true);
  }

  async function handleSalvarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setFormErro('');
    if (!formNome.trim() || !formEmail.trim() || !formCargo.trim()) {
      setFormErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!editingUser && !formSenha.trim()) {
      setFormErro('Defina uma senha para o novo usuário.');
      return;
    }
    if (formSenha && formSenha.length < 8) {
      setFormErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      setFormErro('Informe um e-mail institucional válido.');
      return;
    }
    const matricula = formMatricula.trim();
    if (matricula && !/^\d{3,10}$/.test(matricula)) {
      setFormErro('A matrícula deve ter só números (de 3 a 10 dígitos).');
      return;
    }
    if (matricula && usuarios.some((u) => u.matricula === matricula && u.id !== editingUser?.id)) {
      setFormErro('Esta matrícula já é usada por outro operador.');
      return;
    }
    const emailDuplicado = usuarios.some(
      (u) => u.email.toLowerCase() === formEmail.trim().toLowerCase() && u.id !== editingUser?.id
    );
    if (emailDuplicado) {
      setFormErro('Este e-mail já está cadastrado no sistema.');
      return;
    }
    if (formRole === 'unidade_escolar' && !formUnidade) {
      setFormErro('Selecione a unidade escolar deste usuário.');
      return;
    }
    if (equipeCcoNoForm && formCcoRestrito && formCcoUnidades.length === 0) {
      setFormErro('Selecione ao menos uma unidade que este usuário acompanha no CCO, ou marque "Todas as unidades".');
      return;
    }
    if (editingUser && editingUser.id === user?.id && (formRole !== 'admin' || !formAtivo)) {
      setFormErro('Você não pode remover o próprio acesso de administrador nem desativar a própria conta.');
      return;
    }

    const dados = {
      nome_completo: formNome.trim(),
      email: formEmail.trim().toLowerCase(),
      cargo: formCargo.trim(),
      role: formRole,
      ativo: formAtivo,
      // Sem a lista de matrículas carregada (undefined), um campo vazio não apaga a matrícula salva.
      matricula: matricula || (editingUser && editingUser.matricula === undefined ? undefined : null),
      unidade_id: formRole === 'unidade_escolar' ? formUnidade : null,
      acesso_cco: ROLES_RECEPCAO_COM_CCO.includes(formRole) && formAcessoCco,
      cco_unidades: equipeCcoNoForm && formCcoRestrito ? formCcoUnidades : null,
    };

    setIsSaving(true);
    let userSalvo: UserProfile;
    try {
      userSalvo = editingUser
        ? await dataService.salvarUsuarioSistema({ ...editingUser, ...dados }, formSenha || undefined)
        : await dataService.criarUsuarioSistema(dados, formSenha);
    } catch (err: any) {
      const papelNovo = formRole === 'unidade_escolar' || formRole === 'cco';
      setFormErro(papelNovo && /papel \(role\) inválido/i.test(err.message || '')
        ? 'O Supabase ainda não conhece os papéis do CCO: publique a nova versão da função "admin-manage-user" e aplique as migrações do CCO.'
        : err.message || 'Não foi possível salvar o usuário.');
      return;
    } finally {
      setIsSaving(false);
    }

    const updated = editingUser
      ? usuarios.map((u) => (u.id === editingUser.id ? userSalvo : u))
      : [...usuarios, userSalvo];
    if (!isSupabaseLive) saveUsers(updated);
    setUsuarios(updated);
    setIsModalOpen(false);
    // A versão antiga da função admin-manage-user não conhece a matrícula e a ignora.
    if (isSupabaseLive && (dados.unidade_id || dados.acesso_cco || dados.cco_unidades) && userSalvo.unidade_id === undefined && userSalvo.acesso_cco === undefined) {
      exibirToast('Dados salvos, mas o vínculo com o CCO não foi gravado: publique a nova versão da função "admin-manage-user" e aplique as migrações do CCO.', 'erro');
    } else if (isSupabaseLive && dados.matricula && userSalvo.matricula === undefined) {
      exibirToast('Dados salvos, mas a matrícula não foi gravada: publique a nova versão da função "admin-manage-user" no Supabase.', 'erro');
    } else exibirToast(editingUser ? `Usuário "${userSalvo.nome_completo}" atualizado com sucesso!` : `Usuário "${userSalvo.nome_completo}" cadastrado no Supabase com acesso liberado!`);

    // Sincroniza a sessão ativa caso o operador editado seja o usuário logado
    if (user && user.id === userSalvo.id) {
      updateUserProfile(userSalvo);
    }

    dataService.registrarLogAuditoria({
      usuario_email: user?.email || userSalvo.email,
      acao: editingUser ? 'ATUALIZAR_USUARIO' : 'CRIAR_USUARIO',
      tabela: 'profiles',
      registro_id: userSalvo.id,
      detalhes: {
        nome_completo: userSalvo.nome_completo,
        email: userSalvo.email,
        matricula: userSalvo.matricula ?? null,
        cargo: userSalvo.cargo,
        role: userSalvo.role,
        ativo: userSalvo.ativo,
        unidade: nomeUnidade(userSalvo.unidade_id) ?? null,
        acesso_cco: userSalvo.acesso_cco ?? false,
        cco_unidades: userSalvo.cco_unidades?.length ?? 'todas',
        senha_alterada: Boolean(editingUser && formSenha),
      },
    });
  }

  async function handleExcluirUsuario(u: UserProfile) {
    if (u.id === user?.id) {
      exibirToast('Você não pode remover o seu próprio usuário.', 'erro');
      return;
    }
    if (!confirm(`Remover o usuário "${u.nome_completo}"? O acesso dele ao sistema será apagado do Supabase e não pode ser desfeito.`)) return;
    try {
      await dataService.excluirUsuarioSistema(u.id);
    } catch (err: any) {
      exibirToast(err.message || 'Não foi possível remover o usuário.', 'erro');
      return;
    }
    const updated = usuarios.filter((x) => x.id !== u.id);
    if (!isSupabaseLive) saveUsers(updated);
    setUsuarios(updated);

    dataService.registrarLogAuditoria({
      usuario_email: user?.email || 'admin@sme.gov.br',
      acao: 'EXCLUIR_USUARIO',
      tabela: 'profiles',
      registro_id: u.id,
      detalhes: { nome: u.nome_completo, email: u.email },
    });

    exibirToast(`Usuário "${u.nome_completo}" removido.`);
  }

  async function handleToggleAtivo(u: UserProfile) {
    if (u.id === user?.id) {
      exibirToast('Você não pode desativar a sua própria conta.', 'erro');
      return;
    }
    let userModificado: UserProfile;
    try {
      userModificado = await dataService.salvarUsuarioSistema({ ...u, ativo: !u.ativo });
    } catch (err: any) {
      exibirToast(err.message || 'Não foi possível alterar a situação do usuário.', 'erro');
      return;
    }
    const updated = usuarios.map((x) => (x.id === u.id ? userModificado : x));
    if (!isSupabaseLive) saveUsers(updated);
    setUsuarios(updated);

    exibirToast(`Usuário "${u.nome_completo}" ${userModificado.ativo ? 'ativado' : 'desativado'}.`);
  }

  const totalAtivos = usuarios.filter((u) => u.ativo).length;
  const totalAdmins = usuarios.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Painel de Administração do Sistema</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">Controle de operadores, permissões e unidades escolares do sistema</p>
        </div>
      </div>

      {/* ─── GESTÃO DE USUÁRIOS DO SISTEMA ─── */}
      <Card className="border-slate-800 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Operadores Homologados & Controle de Acesso
              </CardTitle>
              <CardDescription>
                Perfis de usuários configurados para validação das regras RLS e permissões
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              {/* Métricas rápidas */}
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  {totalAtivos} ativos
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 font-semibold">
                  <Crown className="w-3 h-3" />
                  {totalAdmins} admin{totalAdmins !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Botão Adicionar */}
              <button
                type="button"
                onClick={abrirNovoUsuario}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0d6efd] to-[#0647c4] text-white text-xs font-bold shadow-[0_4px_16px_-4px_rgba(13,110,253,.6)] hover:shadow-[0_6px_22px_-4px_rgba(13,110,253,.75)] hover:-translate-y-0.5 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Novo Usuário
              </button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Nome do Operador</th>
                <th className="py-3 px-4">E-mail / Matrícula</th>
                <th className="py-3 px-4">Cargo Declarado</th>
                <th className="py-3 px-4">Papel (Role)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {carregandoUsuarios && usuarios.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Carregando usuários do Supabase...</td></tr>
              )}
              {usuarios.map((u) => {
                const rc = ROLE_CONFIG[u.role];
                const isCurrentUser = user?.role === u.role;
                return (
                  <tr key={u.id} className={cn('hover:bg-slate-800/20 transition-colors', !u.ativo && 'opacity-50')}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-7 h-7 rounded-lg grid place-items-center text-xs font-extrabold shrink-0',
                          u.role === 'admin' ? 'bg-blue-950 text-blue-300 border border-blue-500/30' :
                          u.role === 'gestor' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        )}>
                          {u.nome_completo.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-100">{u.nome_completo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {u.email}
                      {u.matricula && <span className="mt-0.5 block text-[10px] text-slate-500">Matrícula {u.matricula}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.cargo}
                      {u.role === 'unidade_escolar' && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Building2 className="h-3 w-3" />{nomeUnidade(u.unidade_id) || 'Sem unidade vinculada'}</span>
                      )}
                      {(u.role === 'cco' || u.acesso_cco) && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Camera className="h-3 w-3" />CCO · {u.cco_unidades?.length ? `${u.cco_unidades.length} unidade(s)` : 'todas as unidades'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border',
                        u.role === 'admin'
                          ? 'bg-blue-950/60 text-blue-300 border-blue-500/30'
                          : u.role === 'gestor'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                          : u.role === 'recepcionista'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      )}>
                        {rc.icon}
                        {rc.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(u)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors',
                          u.ativo
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.ativo ? 'bg-emerald-400' : 'bg-slate-500')} />
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => switchDemoRole(u.role)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all',
                            isCurrentUser
                              ? 'bg-[#0d6efd] text-white border-[#0d6efd] shadow-xs'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-slate-100'
                          )}
                        >
                          {isCurrentUser ? 'Ativo Atualmente' : 'Simular Perfil'}
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoUsuario(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-300 hover:bg-sky-950/40 border border-transparent hover:border-sky-500/30 transition-colors"
                          title="Editar usuário"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirUsuario(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-colors"
                          title="Remover usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legenda de Roles */}
        <div className="px-4 py-3 border-t border-slate-800/60 bg-[#0d1120]/40">
          <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">Legenda dos papéis (Roles):</p>
          <div className="flex flex-wrap gap-3">
            {ROLES_OPTIONS.map((role) => {
              const rc = ROLE_CONFIG[role];
              return (
                <div key={role} className="flex items-start gap-1.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0',
                    role === 'admin' ? 'bg-blue-950/60 text-blue-300 border-blue-500/30' :
                    role === 'gestor' ? 'bg-amber-950/60 text-amber-300 border-amber-500/30' :
                    role === 'recepcionista' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  )}>
                    {rc.icon} {rc.label}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">{rc.descricao}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ─── UNIDADES ESCOLARES E DEPARTAMENTOS (tela de Ramais) ─── */}
      <GestaoUnidades onAviso={exibirToast} />

      {/* ─── MODAL DE ADICIONAR / EDITAR USUÁRIO ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuário do Sistema' : 'Adicionar Novo Usuário'}
        description={editingUser ? 'Atualize os dados e o papel deste operador' : 'Configure os dados e o papel (role) do novo operador'}
        icon={<UserPlus className="w-6 h-6" />}
      >
        <form onSubmit={handleSalvarUsuario} className="space-y-5 px-5 pb-6 pt-4 sm:px-7">
          {formErro && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formErro}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome Completo *"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
            <Input
              label="Cargo / Função *"
              value={formCargo}
              onChange={(e) => setFormCargo(e.target.value)}
              placeholder="Ex: Recepcionista Chefe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <Input
              label="E-mail Institucional *"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Ex: joao.silva@sme.gov.br"
              type="email"
              required
            />
            <Input
              label="Matrícula"
              value={formMatricula}
              onChange={(e) => setFormMatricula(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 36006"
              inputMode="numeric"
              maxLength={10}
              autoComplete="off"
            />
          </div>
          <p className="-mt-3 text-[11px] text-[#627fa5] dark:text-slate-400">O operador pode entrar com o e-mail ou com a matrícula.</p>

          {(
            <div className="relative">
              <Input
                label={editingUser ? 'Nova senha (opcional)' : 'Senha de Acesso *'}
                value={formSenha}
                onChange={(e) => setFormSenha(e.target.value)}
                type={showSenha ? 'text' : 'password'}
                placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : 'Mínimo 8 caracteres'}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Seleção de Role */}
          <div>
            <label className="block text-xs font-semibold text-[#37475e] dark:text-slate-300 mb-2">
              Papel (Role) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES_OPTIONS.map((role) => {
                const rc = ROLE_CONFIG[role];
                const ativo = formRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormRole(role)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all',
                      ativo
                        ? role === 'admin'
                          ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/40'
                          : role === 'gestor'
                          ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/40'
                          : role === 'recepcionista'
                          ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40'
                          : 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                        : 'border-[#dce6f3] bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-600'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg grid place-items-center shrink-0',
                      ativo
                        ? role === 'admin' ? 'bg-blue-500 text-white'
                          : role === 'gestor' ? 'bg-amber-500 text-white'
                          : role === 'recepcionista' ? 'bg-emerald-500 text-white'
                          : 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {rc.icon}
                    </div>
                    <div>
                      <p className={cn(
                        'text-[10px] font-extrabold uppercase tracking-wider',
                        ativo ? 'text-[#0d1f45] dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                      )}>
                        {rc.label}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{rc.descricao}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CCO — Central Controle Operacional */}
          {formRole === 'unidade_escolar' && (
            <div>
              <label htmlFor="form-unidade" className="block text-xs font-semibold text-[#37475e] dark:text-slate-300 mb-1.5">Unidade escolar *</label>
              <select
                id="form-unidade"
                value={formUnidade}
                onChange={(e) => setFormUnidade(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-[#cfdbea] bg-white px-3 text-sm text-[#10233f] focus:outline-none focus:ring-2 focus:ring-[#0877c9]/40 dark:border-slate-700 dark:bg-[#121826] dark:text-slate-100"
              >
                <option value="">Selecione a unidade…</option>
                {unidadesEscolares.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-[#627fa5] dark:text-slate-400">O usuário entra direto no CCO e só vê as ocorrências desta unidade. O nome da escola e o responsável são preenchidos automaticamente.</p>
            </div>
          )}

          {ROLES_RECEPCAO_COM_CCO.includes(formRole) && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#dce6f3] p-3 dark:border-slate-800">
              <input type="checkbox" checked={formAcessoCco} onChange={(e) => setFormAcessoCco(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0b63ce]" />
              <span>
                <span className="block text-xs font-bold text-[#0d1f45] dark:text-slate-100">Também integra a equipe do CCO</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">Acessa a Recepção e o painel de ocorrências do CCO, com o seletor entre os dois módulos.</span>
              </span>
            </label>
          )}

          {equipeCcoNoForm && (
            <fieldset className="rounded-xl border-2 border-[#dce6f3] p-3 dark:border-slate-800">
              <legend className="px-1 text-xs font-bold text-[#0d1f45] dark:text-slate-100">Unidades acompanhadas no CCO</legend>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: false, r: 'Todas as unidades' }, { v: true, r: 'Somente as selecionadas' }].map(({ v, r }) => (
                  <label key={r} className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold', formCcoRestrito === v ? 'border-[#0b63ce] bg-[#eaf3ff] text-[#0b4fa3] dark:bg-sky-500/10 dark:text-sky-200' : 'border-[#dce6f3] text-slate-600 dark:border-slate-700 dark:text-slate-300')}>
                    <input type="radio" name="form-cco-restrito" checked={formCcoRestrito === v} onChange={() => setFormCcoRestrito(v)} className="accent-[#0b63ce]" />
                    {r}
                  </label>
                ))}
              </div>
              {formCcoRestrito && (
                <div className="mt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={buscaUnidade}
                      onChange={(e) => setBuscaUnidade(e.target.value)}
                      placeholder="Buscar unidade"
                      aria-label="Buscar unidade"
                      className="w-full min-h-10 rounded-lg border border-[#cfdbea] bg-white pl-8 pr-3 text-xs dark:border-slate-700 dark:bg-[#121826] dark:text-slate-100"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">{formCcoUnidades.length} selecionada(s)</p>
                  <ul className="mt-1 max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-[#e3ebf5] p-1 dark:border-slate-800">
                    {unidadesEscolares
                      .filter((u) => u.nome.toLowerCase().includes(buscaUnidade.trim().toLowerCase()))
                      .map((u) => (
                        <li key={u.id}>
                          <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-[#10233f] hover:bg-[#f2f7fd] dark:text-slate-200 dark:hover:bg-slate-800">
                            <input
                              type="checkbox"
                              checked={formCcoUnidades.includes(u.id)}
                              onChange={(e) => setFormCcoUnidades((atual) => (e.target.checked ? [...atual, u.id] : atual.filter((id) => id !== u.id)))}
                              className="accent-[#0b63ce]"
                            />
                            {u.nome}
                          </label>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </fieldset>
          )}

          {/* Toggle Ativo */}
          <div
            onClick={() => setFormAtivo(!formAtivo)}
            className={cn(
              'flex items-center justify-between gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
              formAtivo
                ? 'border-emerald-300/80 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-950/20'
                : 'border-slate-300/60 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
            )}
          >
            <div>
              <p className="text-xs font-bold text-[#0d1f45] dark:text-slate-100">Conta Ativa</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {formAtivo ? 'Este operador pode acessar o sistema normalmente.' : 'Conta suspensa — o operador não conseguirá fazer login.'}
              </p>
            </div>
            <div className={cn(
              'w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0',
              formAtivo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            )}>
              <div className={cn(
                'w-5 h-5 bg-white rounded-full shadow transition-transform',
                formAtivo ? 'translate-x-5' : 'translate-x-0'
              )} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 border-t border-[#dce4f0] dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {editingUser ? 'Salvar Alterações' : 'Adicionar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast de Notificação */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border',
            toast.tipo === 'sucesso'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-rose-900 text-white border-rose-700'
          )}
        >
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
            toast.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          )}>
            {toast.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <span className="text-xs font-bold">{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-60 hover:opacity-100 ml-2 font-black"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
