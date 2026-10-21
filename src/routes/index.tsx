import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
    return <Navigate to="/recepcao" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/recepcao" replace />} />
        <Route path="recepcao" element={<RecepcaoPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="movimentacoes" element={<MovimentacoesPage />} />
        <Route path="ramais" element={<RamaisPage />} />
        <Route path="visitantes" element={<VisitantesPage />} />
        <Route path="servidores" element={<ServidoresPage />} />
        <Route path="autorizacoes" element={<AutorizacoesPage />} />
        {/* Agendamentos e Relatórios: somente administradores */}
        <Route path="agendamentos" element={<ProtectedRoute requiredRole="admin"><AgendamentosPage /></ProtectedRoute>} />
        <Route path="relatorios" element={<ProtectedRoute requiredRole="admin"><RelatoriosPage /></ProtectedRoute>} />
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

      <Route path="*" element={<Navigate to="/recepcao" replace />} />
    </Routes>
  );
};
