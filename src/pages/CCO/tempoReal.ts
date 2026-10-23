import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CcoOcorrencia } from '@/types';

export type EstadoTempoReal = 'conectando' | 'ao_vivo' | 'reconectando' | 'demonstracao';

const CHAVE_DEMO = 'sme_cco_ocorrencias';

/**
 * Atualização instantânea das ocorrências do CCO.
 * Com Supabase: canal Realtime (websocket) na tabela cco_ocorrencias — o RLS vale também aqui,
 * então cada perfil só recebe as unidades que pode ver. Sem Supabase: avisos entre abas do navegador.
 * Cada mudança atualiza as listas/mapa; ocorrências novas chamam `onNova`.
 */
export function useTempoRealCco(onNova?: (ocorrencia: CcoOcorrencia) => void): EstadoTempoReal {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoTempoReal>(isSupabaseConfigured ? 'conectando' : 'demonstracao');
  const aoReceber = useRef(onNova);
  aoReceber.current = onNova;

  useEffect(() => {
    const atualizar = () => void queryClient.invalidateQueries({ queryKey: ['cco'] });

    if (!isSupabaseConfigured) {
      // Modo demonstração: outra aba gravou no localStorage.
      const conhecidas = new Set<string>(lerIdsDemo());
      const aoMudar = (e: StorageEvent) => {
        if (e.key !== CHAVE_DEMO || !e.newValue) return;
        atualizar();
        try {
          (JSON.parse(e.newValue) as CcoOcorrencia[]).forEach((oc) => {
            if (!conhecidas.has(oc.id)) {
              conhecidas.add(oc.id);
              aoReceber.current?.(oc);
            }
          });
        } catch { /* conteúdo inválido */ }
      };
      window.addEventListener('storage', aoMudar);
      return () => window.removeEventListener('storage', aoMudar);
    }

    const canal = supabase
      .channel(`cco-ocorrencias-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cco_ocorrencias' }, (mudanca) => {
        atualizar();
        if (mudanca.eventType === 'INSERT') aoReceber.current?.(mudanca.new as CcoOcorrencia);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setEstado('ao_vivo');
          atualizar(); // o que chegou enquanto a conexão caiu
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setEstado('reconectando');
        }
      });
    return () => { void supabase.removeChannel(canal); };
  }, [queryClient]);

  return estado;
}

function lerIdsDemo(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(CHAVE_DEMO) || '[]') as CcoOcorrencia[]).map((oc) => oc.id);
  } catch {
    return [];
  }
}
