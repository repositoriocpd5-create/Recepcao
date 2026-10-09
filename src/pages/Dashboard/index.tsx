import React, { useEffect, useState } from 'react';
import {
  Users,
  Briefcase,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { dataService } from '@/services/dataService';
import { formatTime, formatDateTime } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDashboard = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Painel Geral de Controle da SMEDU</h2>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de fluxo, ocupação predial e conformidade em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregarDashboard} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Indicadores</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total no Prédio */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-[#121c2c] to-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Presentes Agora</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.totalNoPredio ?? 0}
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Ocupação ativa do prédio</span>
            </p>
          </div>
        </Card>

        {/* Visitantes Hoje */}
        <Card className="border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Visitantes Hoje</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.visitantesHoje ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Atendimentos externos
            </p>
          </div>
        </Card>

        {/* Servidores Registrados Hoje */}
        <Card className="border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Servidores em Trânsito</span>
            <div className="p-2 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.servidoresHoje ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Acessos de funcionários
            </p>
          </div>
        </Card>

        {/* Autorizações Pendentes */}
        <Card className="border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Autorizações Pendentes</span>
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.autorizacoesPendentes ?? 0}
            </div>
            <p className="text-[11px] text-amber-400 mt-1 font-medium">
              Aguardando liberação de setor
            </p>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Departamento */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Fluxo por Departamento (Hoje)</CardTitle>
              <CardDescription>Volume de acessos direcionados aos órgãos e departamentos</CardDescription>
            </div>
          </CardHeader>
          <div className="h-64 w-full pt-4">
            {stats?.fluxoPorDepartamento?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fluxoPorDepartamento}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Acessos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum fluxo registrado para os departamentos hoje.
              </div>
            )}
          </div>
        </Card>

        {/* Resumo de Proporção Servidor / Visitante */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Proporção de Atendimentos</CardTitle>
              <CardDescription>Relação entre público visitante e servidores municipais</CardDescription>
            </div>
          </CardHeader>
          <div className="h-64 w-full flex items-center justify-center pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Visitantes', value: stats?.visitantesHoje || 1 },
                    { name: 'Servidores', value: stats?.servidoresHoje || 1 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-300 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Visitantes ({stats?.visitantesHoje ?? 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Servidores ({stats?.servidoresHoje ?? 0})</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Histórico Recente */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Últimas Movimentações Registradas</CardTitle>
            <CardDescription>Registro cronológico de entradas e saídas no sistema</CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Pessoa</th>
                <th className="py-2.5 px-4">Crachá</th>
                <th className="py-2.5 px-4">Destino</th>
                <th className="py-2.5 px-4">Horário Entrada</th>
                <th className="py-2.5 px-4">Horário Saída</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats?.ultimasMovimentacoes?.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-800/20">
                  <td className="py-2.5 px-4 font-semibold text-slate-200">
                    {m.servidor?.nome || m.visitante?.nome || 'Não identificado'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-emerald-400">{m.cracha_numero || '-'}</td>
                  <td className="py-2.5 px-4 text-slate-300">
                    {m.departamento_destino?.sigla} - {m.setor_destino?.sigla}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono">
                    {formatDateTime(m.data_hora_entrada)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono">
                    {m.data_hora_saida ? formatDateTime(m.data_hora_saida) : 'Em andamento'}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant={m.status === 'no_predio' ? 'success' : 'neutral'}>
                      {m.status === 'no_predio' ? 'No Prédio' : 'Finalizado'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
