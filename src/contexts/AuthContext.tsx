import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEMO_USERS } from '@/services/mockData';
import { dataService } from '@/services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseLive: boolean;
  login: (email: string, password?: string, demoRole?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  updateUserProfile: (updatedProfile: Partial<UserProfile> & { id?: string; role?: UserRole; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sme_authenticated_user';
const ADMIN_USERS_STORAGE_KEY = 'sme_admin_users';

/** Matrícula do quadro funcional: só números (o login aceita ela no lugar do e-mail). */
export const MATRICULA_LOGIN_REGEX = /^\d{3,10}$/;

/** Login por matrícula: a Edge Function confere a senha e devolve só a sessão. */
async function entrarComMatricula(matricula: string, password: string) {
  const { data, error } = await supabase.functions.invoke('login-matricula', { body: { matricula, password } });
  if (error) {
    const response = (error as { context?: Response }).context;
    let mensagem = 'Não foi possível entrar com a matrícula agora. Tente o e-mail ou tente novamente.';
    if (response instanceof Response) {
      try {
        const body = await response.clone().json();
        if (body?.error) mensagem = body.error;
      } catch {}
    }
    throw new Error(mensagem);
  }
  const { data: sessao, error: sessaoError } = await supabase.auth.setSession(data as { access_token: string; refresh_token: string });
  if (sessaoError || !sessao.user) throw sessaoError || new Error('Não foi possível iniciar a sessão.');
  return sessao.user;
}

function getAvailableDemoUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw) as UserProfile[];
      // Listas salvas antes do CCO ganham os perfis de demonstração novos.
      if (Array.isArray(list) && list.length > 0) return [...list, ...DEMO_USERS.filter((d) => !list.some((u) => u.id === d.id))];
    }
  } catch {}
  return DEMO_USERS;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();

            if (profile) {
              const u: UserProfile = {
                id: profile.id,
                email: profile.email,
                nome_completo: profile.nome_completo,
                cargo: profile.cargo || 'Operador',
                role: profile.role,
                ativo: profile.ativo,
                unidade_id: profile.unidade_id ?? null,
                acesso_cco: profile.acesso_cco ?? false,
                cco_unidades: profile.cco_unidades ?? null,
              };
              setUser(u);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
            }
          } else {
            // Um perfil de demonstração não possui token do Supabase e, com RLS
            // ativa, não pode consultar os dados institucionais.
            localStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
          }
        } catch (err) {
          console.warn('Erro ao verificar sessão Supabase:', err);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, password = '', demoRole?: UserRole): Promise<boolean> => {
    setLoading(true);

    if (isSupabaseConfigured && password) {
      try {
        // Aceita o e-mail ou a matrícula do operador.
        const porMatricula = MATRICULA_LOGIN_REGEX.test(email);
        let authUser;
        if (porMatricula) {
          authUser = await entrarComMatricula(email, password);
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          authUser = data.user;
        }
        const data = { user: authUser };

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const u: UserProfile = {
            id: data.user.id,
            email: data.user.email || profile?.email || email,
            nome_completo: profile?.nome_completo || 'Operador SMEDU',
            cargo: profile?.cargo || 'Recepcionista',
            role: profile?.role || 'recepcionista',
            ativo: true,
            unidade_id: profile?.unidade_id ?? null,
            acesso_cco: profile?.acesso_cco ?? false,
            cco_unidades: profile?.cco_unidades ?? null,
          };
          setUser(u);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));

          await dataService.registrarLogAuditoria({
            usuario_email: u.email,
            acao: 'LOGIN',
            tabela: 'profiles',
            registro_id: u.id,
            detalhes: { metodo: porMatricula ? 'supabase_auth_matricula' : 'supabase_auth' },
          });

          setLoading(false);
          return true;
        }
      } catch (err) {
        console.error('Falha no login Supabase:', err);
        setLoading(false);
        throw err;
      }
    }

    if (isSupabaseConfigured) {
      setLoading(false);
      throw new Error('Informe o e-mail ou a matrícula e a senha de um usuário cadastrado no Supabase.');
    }

    // Modo de demonstração / homologação
    const available = getAvailableDemoUsers();
    const selectedDemo =
      available.find((d) => d.email.toLowerCase() === email.toLowerCase()) ||
      available.find((d) => d.role === demoRole) ||
      available[1] ||
      available[0] ||
      DEMO_USERS[1];

    setUser(selectedDemo);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(selectedDemo));

    await dataService.registrarLogAuditoria({
      usuario_email: selectedDemo.email,
      acao: 'LOGIN',
      tabela: 'profiles',
      registro_id: selectedDemo.id,
      detalhes: { role: selectedDemo.role, modo: 'homologacao_teste' },
    });

    setLoading(false);
    return true;
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    if (user) {
      await dataService.registrarLogAuditoria({
        usuario_email: user.email,
        acao: 'LOGOUT',
        tabela: 'profiles',
        registro_id: user.id,
        detalhes: {},
      });
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchDemoRole = (role: UserRole) => {
    const available = getAvailableDemoUsers();
    const target = available.find((u) => u.role === role) || available[0] || DEMO_USERS[0];
    setUser(target);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(target));
  };

  const updateUserProfile = (updatedProfile: Partial<UserProfile> & { id?: string; role?: UserRole; email?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      const isTarget =
        (updatedProfile.id && prev.id === updatedProfile.id) ||
        (updatedProfile.role && prev.role === updatedProfile.role) ||
        (updatedProfile.email && prev.email.toLowerCase() === updatedProfile.email.toLowerCase());

      if (isTarget) {
        const merged: UserProfile = { ...prev, ...updatedProfile };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return prev;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseLive: isSupabaseConfigured,
        login,
        logout,
        switchDemoRole,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
