import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ShieldAlert, Download, RefreshCw, Filter, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { dataService } from '@/services/dataService';
import { AuditoriaLog } from '@/types';
import { formatDateTime } from '@/lib/utils';

export const RelatoriosPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [acaoFilter, setAcaoFilter] = useState('todas');

  const carregarLogs = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getLogsAuditoria();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs();
  }, []);

  const exportarCsv = () => {
    const headers = ['Data/Hora', 'Ação', 'Operador', 'Tabela', 'IP Origem', 'Detalhes'];
    const rows = logs.map((l) => [
      formatDateTime(l.created_at),
      l.acao,
      l.usuario_email || 'sistema',
      l.tabela || '-',
      l.ip_origem || '-',
      JSON.stringify(l.detalhes),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_sme_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtrados = logs.filter((l) => {
    const matchesAcao = acaoFilter === 'todas' || l.acao === acaoFilter;
    const termo = searchTerm.toLowerCase();
    const matchesSearch =
      l.acao.toLowerCase().includes(termo) ||
      (l.usuario_email && l.usuario_email.toLowerCase().includes(termo)) ||
      JSON.stringify(l.detalhes).toLowerCase().includes(termo);
    return matchesAcao && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">Relatórios & Auditoria de Segurança</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Trilha de auditoria em conformidade com a LGPD e registro de consultas a CPF/Matrícula
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={carregarLogs} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </Button>
          <Button variant="primary" size="sm" onClick={exportarCsv}>
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Pesquisar por operador, CPF consultado, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />

          <div className="flex items-center gap-1 bg-[#101625] p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'CONSULTA_CPF', label: 'Consulta CPF' },
              { id: 'CONSULTA_MATRICULA', label: 'Consulta Matrícula' },
              { id: 'REGISTRO_ENTRADA', label: 'Entradas' },
              { id: 'REGISTRO_SAIDA', label: 'Saídas' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAcaoFilter(f.id)}
                className={`py-1.5 px-2.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  acaoFilter === f.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabela de Logs de Auditoria */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <span>Trilha de Auditoria Auditável</span>
              <Badge variant="neutral">{filtrados.length} eventos</Badge>
            </CardTitle>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>Imutabilidade e Rastreabilidade</span>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151c2d] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Ação Auditada</th>
                <th className="py-3 px-4">Operador Responsável</th>
                <th className="py-3 px-4">Terminal / IP</th>
                <th className="py-3 px-4">Detalhes do Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtrados.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-sans text-xs font-semibold ${
                        log.acao.includes('CONSULTA')
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30'
                          : log.acao.includes('ENTRADA')
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : log.acao.includes('SAIDA')
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.acao}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-sans">
                    {log.usuario_email || 'sistema'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">
                    {log.ip_origem || '192.168.10.25 (Portaria)'}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-md truncate" title={JSON.stringify(log.detalhes)}>
                    {JSON.stringify(log.detalhes)}
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
