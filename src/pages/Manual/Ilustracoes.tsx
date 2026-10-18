import React from 'react';
import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  User,
  Users,
  Barcode,
  ClipboardCheck,
  UserCog,
} from 'lucide-react';
import type { IconeId, IlustracaoId } from './conteudo';

export const ICONES: Record<IconeId, React.ComponentType<{ className?: string }>> = {
  entrada: LogIn,
  saida: LogOut,
  pessoas: Users,
  autorizacao: ClipboardCheck,
  historico: History,
  agenda: CalendarDays,
  cracha: BadgeCheck,
  relatorio: FileText,
  estrutura: Building2,
  admin: ShieldCheck,
  painel: LayoutDashboard,
  servidor: UserCog,
};

/** Código de barras desenhado, sem imagem externa. */
const CodigoDeBarras: React.FC<{ numero?: string }> = ({ numero = '123456789012' }) => {
  const larguras = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 2];
  let x = 0;
  return (
    <div className="inline-flex flex-col items-center rounded-lg border border-[#dce6f3] bg-white px-3 pb-1 pt-2 dark:border-slate-700 dark:bg-slate-100">
      <svg width="104" height="30" viewBox="0 0 104 30" aria-hidden className="text-[#0d1f45]">
        {larguras.map((largura, indice) => {
          const barra = indice % 2 === 0 ? <rect key={indice} x={x} y={0} width={largura * 1.6} height={30} fill="currentColor" /> : null;
          x += largura * 1.6 + 0.4;
          return barra;
        })}
      </svg>
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#37475e]">{numero}</span>
    </div>
  );
};

const ChipStatus: React.FC<{ tom: 'sucesso' | 'aviso'; children: React.ReactNode }> = ({ tom, children }) => (
  <span
    className={
      tom === 'sucesso'
        ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#bfe8cd] bg-[#eefbf2] px-3 py-1.5 text-xs font-semibold text-[#15803d] dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300'
        : 'inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300'
    }
  >
    {tom === 'sucesso' ? <CheckCircle2 className="h-4 w-4 fill-[#16a34a] text-white dark:text-emerald-950" /> : <ArrowLeftRight className="h-4 w-4" />}
    {children}
  </span>
);

const OpcaoIdentificacao: React.FC<{ icone: React.ReactNode; titulo: string; campo: string }> = ({ icone, titulo, campo }) => (
  <div className="flex min-w-[9.5rem] items-center gap-3 rounded-xl border border-[#dce6f3] bg-white px-4 py-3 shadow-[0_6px_16px_-14px_rgba(18,44,82,.5)] dark:border-slate-700 dark:bg-slate-900">
    <span className="text-[#0b5ed7] dark:text-sky-300">{icone}</span>
    <span>
      <span className="block text-sm font-bold text-[#0d1f45] dark:text-slate-100">{titulo}</span>
      <span className="block text-xs text-[#627289] dark:text-slate-400">{campo}</span>
    </span>
  </div>
);

export const Ilustracao: React.FC<{ id: IlustracaoId }> = ({ id }) => {
  switch (id) {
    case 'identificacao':
      return (
        <div className="flex flex-wrap gap-3" role="img" aria-label="Servidor usa matrícula; visitante usa CPF">
          <OpcaoIdentificacao icone={<User className="h-6 w-6" />} titulo="Servidor" campo="Matrícula" />
          <OpcaoIdentificacao icone={<Users className="h-6 w-6" />} titulo="Visitante" campo="CPF" />
        </div>
      );
    case 'cracha':
      return (
        <div className="flex flex-wrap items-center gap-3" role="img" aria-label="Crachá com código de barras e situação Disponível">
          <CodigoDeBarras />
          <ChipStatus tom="sucesso">Disponível</ChipStatus>
        </div>
      );
    case 'autorizacao':
      return (
        <div className="flex flex-wrap items-center gap-3" role="img" aria-label="Responsável em vermelho exige autorização">
          <span className="inline-flex items-center gap-6 rounded-xl border border-[#dce6f3] bg-white px-4 py-2.5 text-sm font-bold text-[#dc2626] dark:border-slate-700 dark:bg-slate-900">
            RODRIGO SLEIMAN <ChevronDown className="h-4 w-4" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0d6efd] to-[#0647c4] px-3 py-2 text-xs font-semibold text-white">
            <ShieldCheck className="h-4 w-4" /> Confirmar autorização
          </span>
        </div>
      );
    case 'devolucao':
      return (
        <div className="flex flex-wrap items-center gap-3" role="img" aria-label="Botão Devolução rápida e leitura do crachá">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#005a9c] px-4 py-2.5 text-sm font-semibold text-white">
            <Barcode className="h-4 w-4" /> Devolução rápida
          </span>
          <CodigoDeBarras />
        </div>
      );
    default:
      return null;
  }
};

/** Livro aberto do painel de abertura (decorativo). */
export const LivroAberto: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 320 200" className={className} aria-hidden>
    <defs>
      <linearGradient id="manual-capa" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#bcd8fb" />
        <stop offset="1" stopColor="#8fbaf3" />
      </linearGradient>
      <linearGradient id="manual-pagina" x1="0" x2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e7f1fd" />
      </linearGradient>
    </defs>
    <ellipse cx="160" cy="186" rx="130" ry="9" fill="#cfe2fa" opacity=".7" />
    <path d="M18 52 L160 70 L302 52 L302 176 L160 190 L18 176 Z" fill="url(#manual-capa)" />
    <path d="M30 30 C80 22 128 30 158 52 L158 178 C128 158 80 152 30 158 Z" fill="url(#manual-pagina)" stroke="#c9ddf6" />
    <path d="M290 30 C240 22 192 30 162 52 L162 178 C192 158 240 152 290 158 Z" fill="url(#manual-pagina)" stroke="#c9ddf6" />
    {[0, 1, 2, 3, 4, 5].map((linha) => (
      <g key={linha} stroke="#c4daf5" strokeWidth="5" strokeLinecap="round">
        <path d={`M50 ${62 + linha * 16} C80 ${57 + linha * 16} 112 ${60 + linha * 16} 140 ${72 + linha * 16}`} fill="none" />
        <path d={`M270 ${62 + linha * 16} C240 ${57 + linha * 16} 208 ${60 + linha * 16} 180 ${72 + linha * 16}`} fill="none" />
      </g>
    ))}
    <path d="M160 52 L160 182" stroke="#a9c9f2" strokeWidth="3" />
  </svg>
);

