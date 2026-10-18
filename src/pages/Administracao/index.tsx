import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  Users,
  RefreshCw,
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { resetTestData, dataService } from '@/services/dataService';
import { DEMO_USERS } from '@/services/mockData';
import { UserProfile, UserRole } from '@/types';
import { cn } from '@/lib/utils';

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
};

const ROLES_OPTIONS: UserRole[] = ['admin', 'gestor', 'recepcionista', 'atendente'];

function gerarId() {
  return `u-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const AdministracaoPage: React.FC = () => {
  const { user, switchDemoRole, updateUserProfile } = useAuth();
  const [resetSuccess, setResetSuccess] = useState(false);
  const [usuarios, setUsuarios] = useState<UserProfile[]>(loadUsers);

  useEffect(() => {
    let ativo = true;
    dataService.getUsuariosSistema().then((res) => {
      if (ativo && res && res.length > 0) {
        setUsuarios(res);
        saveUsers(res);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Modal de Novo / Editar usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('recepcionista');
  const [formAtivo, setFormAtivo] = useState(true);
  const [formSenha, setFormSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [formErro, setFormErro] = useState('');

  // Toast
  const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' } | null>(null);

  function exibirToast(msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  const handleResetData = () => {
    if (confirm('Atenção: Isso redefinirá todas as movimentações, visitantes e autorizações para os dados iniciais do seed. Continuar?')) {
      resetTestData();
      setResetSuccess(true);
      setTimeout(() => { window.location.reload(); }, 1000);
    }
  };

  function abrirNovoUsuario() {
    setEditingUser(null);
    setFormNome('');
    setFormEmail('');
    setFormCargo('');
    setFormRole('recepcionista');
    setFormAtivo(true);
    setFormSenha('');
    setFormErro('');
    setIsModalOpen(true);
  }

  function abrirEdicaoUsuario(u: UserProfile) {
    setEditingUser(u);
    setFormNome(u.nome_completo);
    setFormEmail(u.email);
    setFormCargo(u.cargo);
    setFormRole(u.role);
    setFormAtivo(u.ativo);
    setFormSenha('');
    setFormErro('');
    setIsModalOpen(true);
  }

  function handleSalvarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim() || !formCargo.trim()) {
      setFormErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!editingUser && !formSenha.trim()) {
      setFormErro('Defina uma senha para o novo usuário.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail)) {
      setFormErro('Informe um e-mail institucional válido.');
      return;
    }
    const emailDuplicado = usuarios.some(
      (u) => u.email.toLowerCase() === formEmail.toLowerCase() && u.id !== editingUser?.id
    );
    if (emailDuplicado) {
      setFormErro('Este e-mail já está cadastrado no sistema.');
      return;
    }

    let userSalvo: UserProfile;
    let updated: UserProfile[];

    if (editingUser) {
      userSalvo = {
        ...editingUser,
        nome_completo: formNome.trim(),
        email: formEmail.trim(),
        cargo: formCargo.trim(),
        role: formRole,
        ativo: formAtivo,
      };
      updated = usuarios.map((u) => (u.id === editingUser.id ? userSalvo : u));
      exibirToast(`Usuário "${formNome}" atualizado com sucesso!`);
    } else {
      userSalvo = {
        id: gerarId(),
        nome_completo: formNome.trim(),
        email: formEmail.trim(),
        cargo: formCargo.trim(),
        role: formRole,
        ativo: formAtivo,
        created_at: new Date().toISOString(),
      };
      updated = [...usuarios, userSalvo];
      exibirToast(`Usuário "${formNome}" adicionado com sucesso!`);
    }

    saveUsers(updated);
    setUsuarios(updated);
    setIsModalOpen(false);

    // Persiste no backend / Supabase
    dataService.salvarUsuarioSistema(userSalvo);

    // Sincroniza a sessão ativa caso o operador editado seja o usuário logado
    if (user && (user.id === userSalvo.id || user.role === userSalvo.role || user.email.toLowerCase() === (editingUser?.email || '').toLowerCase())) {
      updateUserProfile(userSalvo);
    }

    // Registra log de auditoria da alteração
    dataService.registrarLogAuditoria({
      usuario_email: user?.email || userSalvo.email,
      acao: editingUser ? 'ATUALIZAR_USUARIO' : 'CRIAR_USUARIO',
      tabela: 'profiles',
      registro_id: userSalvo.id,
      detalhes: {
        nome_completo: userSalvo.nome_completo,
        email: userSalvo.email,
        cargo: userSalvo.cargo,
        role: userSalvo.role,
        ativo: userSalvo.ativo,
      },
    });
  }

  function handleExcluirUsuario(u: UserProfile) {
    if (u.id === user?.id) {
      exibirToast('Você não pode remover o seu próprio usuário.', 'erro');
      return;
    }
    if (!confirm(`Remover o usuário "${u.nome_completo}"? Esta ação não pode ser desfeita.`)) return;
    const updated = usuarios.filter((x) => x.id !== u.id);
    saveUsers(updated);
    setUsuarios(updated);
    dataService.excluirUsuarioSistema(u.id);

    dataService.registrarLogAuditoria({
      usuario_email: user?.email || 'admin@sme.gov.br',
      acao: 'EXCLUIR_USUARIO',
      tabela: 'profiles',
      registro_id: u.id,
      detalhes: { nome: u.nome_completo, email: u.email },
    });

    exibirToast(`Usuário "${u.nome_completo}" removido.`);
  }

  function handleToggleAtivo(u: UserProfile) {
    const userModificado: UserProfile = { ...u, ativo: !u.ativo };
    const updated = usuarios.map((x) => (x.id === u.id ? userModificado : x));
    saveUsers(updated);
    setUsuarios(updated);
    dataService.salvarUsuarioSistema(userModificado);

    if (user && (user.id === u.id || user.role === u.role)) {
      updateUserProfile(userModificado);
    }

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
          <p className="text-xs text-slate-400 mt-1">Controle de operadores, papéis e permissões do sistema</p>
        </div>

        <Button variant="danger" size="sm" onClick={handleResetData}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restaurar Base de Testes (Seed)</span>
        </Button>
      </div>

      {resetSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Dados de teste restaurados com sucesso para o estado original! Reiniciando...</span>
        </div>
      )}

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
                <th className="py-3 px-4">E-mail Institucional</th>
                <th className="py-3 px-4">Cargo Declarado</th>
                <th className="py-3 px-4">Papel (Role)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
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
                    <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 text-slate-400">{u.cargo}</td>
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

          <Input
            label="E-mail Institucional *"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="Ex: joao.silva@sme.gov.br"
            type="email"
            required
          />

          {!editingUser && (
            <div className="relative">
              <Input
                label="Senha de Acesso *"
                value={formSenha}
                onChange={(e) => setFormSenha(e.target.value)}
                type={showSenha ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
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
            <Button type="submit" variant="primary">
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
