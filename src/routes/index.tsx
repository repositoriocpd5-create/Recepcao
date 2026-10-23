import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { LoginPage } from '@/pages/Login';
import { RecepcaoPage } from '@/pages/Recepcao';
import { DashboardPage } from '@/pages/Dashboard';
import { MovimentacoesPage } from '@/pages/Movimentacoes';
import { VisitantesPage } from '@/pages/Visitantes';
import { ServidoresPage } from '@/pages/Servidores';
import { AutorizacoesPage } from '@/pages/Autorizacoes';
import { AgendamentosPage } from '@/pages/Agendamentos';
import { RelatoriosPage } from '@/pages/Relatorios';
import { DepartamentosPage } from '@/pages/Departamentos';
import { SetoresPage } from '@/pages/Setores';
import { AdministracaoPage } from '@/pages/Administracao';
import { CrachasPage } from '@/pages/Crachas';
import { ManualPage } from '@/pages/Manual';
import { RamaisPage } from '@/pages/Ramais';
import { CcoAjudaPage, CcoInicioPage, CcoOcorrenciasPage } from '@/pages/CCO';
import { EscolherModuloPage } from '@/pages/EscolherModulo';
import { PrimeiroAcessoPage } from '@/pages/PrimeiroAcesso';
import { Modulo, acessaCco, acessaRecepcao, rotaInicial } from '@/lib/modulos';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen mensagem="Verificando sua sessão" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/** Recepção e CCO: cada perfil só entra no módulo que pode acessar. */
const ExigeModulo: React.FC<{ modulo: Modulo }> = ({ modulo }) => {
  const { user } = useAuth();
  const permitido = modulo === 'cco' ? acessaCco(user) : acessaRecepcao(user);
  return permitido ? <Outlet /> : <Navigate to={rotaInicial(user)} replace />;
};

/** "/" e pós-login: cada perfil vai direto ao seu módulo, com a tela de carregamento no lugar do branco. */
const RotaInicial: React.FC = () => {
  const { user } = useAuth();
  const destino = rotaInicial(user);
  return (
    <>
      <LoadingScreen mensagem={destino === '/cco' ? 'Abrindo a Central Controle Operacional' : 'Abrindo o sistema'} marca={destino === '/cco' ? 'CCO' : 'RECEPÇÃO'} />
      <Navigate to={destino} replace />
    </>
  );
};

/** Log do sistema: tudo o que foi registrado (Recepção e CCO), somente para o administrador. */
const LogDoSistema: React.FC = () => (
  <RelatoriosPage
    titulo="Log do sistema"
    descricao="Tudo o que acontece no sistema, da Recepção e do CCO: quem fez o quê, quando e de onde."
  />
);

/** Log no CCO: o administrador geral vê tudo; o administrador do CCO, só os eventos do CCO. */
const LogDoCco: React.FC = () => {
  const { user } = useAuth();
  return user?.role === 'cco_admin' ? (
    <RelatoriosPage
      titulo="Log do sistema"
      descricao="Tudo o que acontece no CCO: quem fez o quê, quando e de onde."
      somenteCco
    />
  ) : (
    <LogDoSistema />
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />

      <Route path="/" element={<ProtectedRoute><RotaInicial /></ProtectedRoute>} />
      <Route path="/escolher-modulo" element={<ProtectedRoute><EscolherModuloPage /></ProtectedRoute>} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<ExigeModulo modulo="recepcao" />}>
          <Route path="/recepcao" element={<RecepcaoPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="movimentacoes" element={<MovimentacoesPage />} />
          <Route path="ramais" element={<RamaisPage />} />
          <Route path="visitantes" element={<VisitantesPage />} />
          <Route path="servidores" element={<ServidoresPage />} />
          <Route path="autorizacoes" element={<AutorizacoesPage />} />
          {/* Agendamentos e Relatórios: somente administradores */}
          <Route path="agendamentos" element={<ProtectedRoute requiredRole="admin"><AgendamentosPage /></ProtectedRoute>} />
          {/* "Relatórios & Auditoria" virou "Log do sistema": o endereço antigo continua funcionando. */}
          <Route path="relatorios" element={<Navigate to="/log-do-sistema" replace />} />
          <Route path="log-do-sistema" element={<ProtectedRoute requiredRole="admin"><LogDoSistema /></ProtectedRoute>} />
          <Route path="departamentos" element={<DepartamentosPage />} />
          <Route path="setores" element={<SetoresPage />} />
          <Route path="crachas" element={<CrachasPage />} />
          <Route path="manual" element={<ManualPage />} />
          <Route
            path="administracao"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdministracaoPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/cco" element={<ExigeModulo modulo="cco" />}>
          <Route index element={<CcoInicioPage />} />
          <Route path="ocorrencias" element={<CcoOcorrenciasPage />} />
          <Route path="ajuda" element={<CcoAjudaPage />} />
          <Route path="log" element={<ProtectedRoute requiredRole="cco_admin"><LogDoCco /></ProtectedRoute>} />
          {/* Mesmas telas da administração, sem sair do módulo CCO. */}
          <Route path="usuarios" element={<ProtectedRoute requiredRole="admin"><AdministracaoPage /></ProtectedRoute>} />
          <Route path="relatorios" element={<Navigate to="/cco/log" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
