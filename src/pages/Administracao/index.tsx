import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck,
  Database,
  Users,
  Server,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { resetTestData } from '@/services/dataService';
import { DEMO_USERS } from '@/services/mockData';

export const AdministracaoPage: React.FC = () => {
  const { user, isSupabaseLive, switchDemoRole } = useAuth();
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetData = () => {
    if (confirm('Atenção: Isso redefinirá todas as movimentações, visitantes e autorizações para os dados iniciais do seed. Continuar?')) {
      resetTestData();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

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
          <p className="text-xs text-slate-400 mt-1">
            Diagnóstico de infraestrutura, controle de operadores, políticas de segurança e ambiente
          </p>
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

      {/* Diagnóstico da Stack Técnica: Supabase + Netlify + GitHub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supabase Status */}
        <Card className="border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Banco de Dados & Backend</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-100">
              {isSupabaseLive ? 'Supabase PostgreSQL' : 'Ambiente Homologação Local'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isSupabaseLive
                ? 'Conexão ativa com PostgreSQL, RLS e RPC atômico'
                : 'Simulação transacional em memória / LocalStorage'}
            </p>
            <div className="mt-3">
              <Badge variant={isSupabaseLive ? 'success' : 'warning'}>
                {isSupabaseLive ? 'Supabase Conectado' : 'Modo Demonstração / Testes'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* GitHub & CI/CD */}
        <Card className="border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Controle de Versão</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-100">GitHub Repository</div>
            <p className="text-xs text-slate-400 mt-1">
              Branch: <span className="font-mono text-blue-400">main</span> • Migrações versionadas
            </p>
            <div className="mt-3">
              <Badge variant="info">Deploy por Commit Configurado</Badge>
            </div>
          </div>
        </Card>

        {/* Netlify Hosting */}
        <Card className="border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Hospedagem Frontend</span>
            <Lock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-100">Netlify SPA</div>
            <p className="text-xs text-slate-400 mt-1">
              Build: <span className="font-mono text-emerald-400">npm run build</span> • Dist: dist
            </p>
            <div className="mt-3">
              <Badge variant="success">netlify.toml Presente</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Operadores Fictícios e Perfis do Sistema */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Operadores Homologados & Controle de Acesso</CardTitle>
            <CardDescription>
              Perfis de usuários configurados para validação das regras RLS e permissões
            </CardDescription>
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
                <th className="py-3 px-4 text-right">Troca de Perfil (Teste)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {DEMO_USERS.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 font-semibold text-slate-100">{u.nome_completo}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                  <td className="py-3 px-4 text-slate-400">{u.cargo}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        u.role === 'admin' ? 'info' : u.role === 'gestor' ? 'warning' : 'success'
                      }
                    >
                      {u.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant={user?.role === u.role ? 'success' : 'outline'}
                      onClick={() => switchDemoRole(u.role)}
                    >
                      {user?.role === u.role ? 'Ativo Atualmente' : 'Simular este Perfil'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Guia de Configuração de Variáveis de Ambiente */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <CardTitle>Configuração para Conectar ao Supabase Definitivo</CardTitle>
          </div>
          <CardDescription>
            Instruções para apontar esta aplicação para um projeto ativo no Supabase
          </CardDescription>
        </CardHeader>

        <div className="space-y-3 text-xs text-slate-300">
          <p>
            Para conectar o sistema a um projeto real no Supabase, crie o arquivo{' '}
            <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">.env</code>{' '}
            na raiz com as variáveis públicas do seu dashboard Supabase:
          </p>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto">
            {`VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
          </pre>

          <p className="text-slate-400">
            As migrações SQL já estão estruturadas em{' '}
            <code className="text-emerald-400 font-mono">supabase/migrations/</code> com tabelas,
            índices, constraints e funções atômicas (<code className="font-mono">rpc_registrar_entrada</code>,{' '}
            <code className="font-mono">rpc_registrar_saida</code>) prontas para execução via Supabase CLI ou SQL Editor.
          </p>
        </div>
      </Card>
    </div>
  );
};
