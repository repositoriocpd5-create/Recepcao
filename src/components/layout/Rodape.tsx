import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe2, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { obterMeuIp } from '@/services/ipService';

/** Rodapé azul institucional, com o IP deste acesso. */
export const Rodape: React.FC = () => {
  const ip = useQuery({ queryKey: ['meu-ip'], queryFn: obterMeuIp, staleTime: Infinity, retry: 1 });
  const textoIp = !isSupabaseConfigured
    ? 'indisponível no modo demonstração'
    : ip.isLoading
      ? 'verificando…'
      : ip.data || 'não identificado';

  return (
    <footer className="bg-[linear-gradient(90deg,#043c74_0%,#005a9c_55%,#075fa7_100%)] px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-3 text-white md:pb-3 lg:px-7">
      <div className="flex flex-col gap-1.5 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">
          SMEDU · Secretaria Municipal de Educação de Itaguaí
          <span className="ml-1 whitespace-nowrap font-normal text-white/75">© {new Date().getFullYear()}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90">
          <span className="inline-flex items-center gap-1.5" title="Endereço de rede (IP) deste acesso">
            <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Seu IP: <strong className={ip.data ? 'font-mono font-bold tracking-wide text-white' : 'font-semibold text-white'}>{textoIp}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 text-white/75">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> Acessos registrados conforme a LGPD
          </span>
        </p>
      </div>
    </footer>
  );
};
