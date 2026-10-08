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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sme_authenticated_user';

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
              };
              setUser(u);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
            }
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const u: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            nome_completo: profile?.nome_completo || 'Operador SME',
            cargo: profile?.cargo || 'Recepcionista',
            role: profile?.role || 'recepcionista',
            ativo: true,
          };
          setUser(u);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));

          await dataService.registrarLogAuditoria({
            usuario_email: u.email,
            acao: 'LOGIN',
            tabela: 'profiles',
            registro_id: u.id,
            detalhes: { metodo: 'supabase_auth' },
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

    // Modo de demonstração / homologação
    const selectedDemo =
      DEMO_USERS.find((d) => d.email.toLowerCase() === email.toLowerCase()) ||
      DEMO_USERS.find((d) => d.role === demoRole) ||
      DEMO_USERS[1]; // recepcionista por padrão

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
    const target = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setUser(target);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(target));
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
