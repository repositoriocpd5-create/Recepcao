import React from 'react';
import { BookOpen, BadgeCheck, ScanLine, Users, Building2, FileText, ShieldCheck, CircleHelp } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

const etapas = [
  { icon: Users, title: '1. Identifique a pessoa', text: 'Na tela Recepção, selecione Servidor ou Visitante. Informe matrícula ou CPF e confirme os dados exibidos.' },
  { icon: ScanLine, title: '2. Registre a entrada', text: 'No modal Entrada em Andamento, leia o crachá, escolha Departamento e Setor de destino e, se necessário, procure o responsável daquela lotação.' },
  { icon: BadgeCheck, title: '3. Controle o crachá', text: 'Um crachá só pode ser vinculado se estiver disponível. Na devolução, use Devolução rápida para ler o código e encerrar a entrada automaticamente.' },
];

const recursos = [
  ['Movimentações', 'Consulte entradas, saídas, permanência e o histórico individual de visitantes.'],
  ['Visitantes', 'Cadastre ou edite dados cadastrais e consulte visitas anteriores.'],
  ['Servidores', 'Pesquise por matrícula, nome ou lotação. Administradores e gestores podem manter o quadro funcional.'],
  ['Autorizações', 'Acompanhe acessos pendentes em setores que exigem aprovação.'],
  ['Crachás', 'Cadastre credenciais, acompanhe disponibilidade e registre devoluções por código de barras.'],
  ['Relatórios e PDF', 'Gere relatórios institucionais nas telas de Recepção, Movimentações e Visitantes.'],
];

export const ManualPage: React.FC = () => (
  <div className="max-w-6xl mx-auto space-y-6 pb-8">
    <section className="rounded-2xl border border-[#cfe0f3] bg-gradient-to-br from-white via-[#f5f9ff] to-[#eaf4ff] p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e1f0ff] text-[#0068b4] dark:bg-blue-950/60 dark:text-blue-300"><BookOpen className="w-6 h-6" /></span>
        <div><h1 className="text-2xl font-bold text-[#152238] dark:text-slate-100">Manual de uso</h1><p className="mt-1 text-sm text-[#627289] dark:text-slate-400">Guia rápido do Sistema de Recepção e Controle de Acesso da SMEDU.</p></div>
      </div>
    </section>

    <Card>
      <CardHeader><CardTitle>Fluxo principal de atendimento</CardTitle></CardHeader>
      <div className="grid gap-4 md:grid-cols-3">
        {etapas.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-[#dce4f0] bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30"><Icon className="mb-3 w-6 h-6 text-[#0877c9] dark:text-blue-300" /><h2 className="font-bold text-[#152238] dark:text-slate-100">{title}</h2><p className="mt-1 text-sm leading-6 text-[#627289] dark:text-slate-400">{text}</p></article>)}
      </div>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Recursos do sistema</CardTitle></CardHeader><div className="divide-y divide-[#e4ebf4] dark:divide-slate-800">{recursos.map(([titulo, texto]) => <div key={titulo} className="py-3 first:pt-0 last:pb-0"><h2 className="font-semibold text-[#152238] dark:text-slate-100">{titulo}</h2><p className="mt-1 text-sm text-[#627289] dark:text-slate-400">{texto}</p></div>)}</div></Card>
      <div className="space-y-6">
        <Card><CardHeader><CardTitle><Building2 className="w-4 h-4 text-[#0877c9]" /> Destino e responsável</CardTitle></CardHeader><p className="text-sm leading-6 text-[#627289] dark:text-slate-400">Departamento e setor são obrigatórios para cada entrada. Após selecioná-los, a busca de responsável oferece somente servidores vinculados àquela lotação. Se não houver responsável definido, mantenha a opção de atendimento no balcão.</p></Card>
        <Card><CardHeader><CardTitle><ShieldCheck className="w-4 h-4 text-[#16a34a]" /> Perfis de acesso</CardTitle></CardHeader><p className="text-sm leading-6 text-[#627289] dark:text-slate-400">Recepcionista opera atendimentos. Gestor acompanha indicadores e cadastros permitidos. Administrador também gerencia departamentos, setores e parâmetros administrativos.</p></Card>
      </div>
    </div>

    <Card className="border-[#fde68a] bg-[#fffdf5] dark:border-amber-500/30 dark:bg-amber-950/20"><CardHeader><CardTitle><CircleHelp className="w-4 h-4 text-[#d97706]" /> Boas práticas</CardTitle></CardHeader><ul className="list-disc space-y-2 pl-5 text-sm text-[#805d18] dark:text-amber-100/80"><li>Confirme nome e identificação antes de atribuir um crachá.</li><li>Não reutilize crachá marcado como “Em uso”; faça a devolução primeiro.</li><li>Registre observações relevantes, pertences declarados e motivos de acesso.</li><li>Use os relatórios em PDF para entrega institucional e auditoria.</li></ul></Card>
    <p className="flex items-center gap-2 text-xs text-[#627289] dark:text-slate-500"><FileText className="w-3.5 h-3.5" /> Documento de produto completo disponível no arquivo <code>prd.md</code> do repositório.</p>
  </div>
);
