import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CcoOcorrencia } from '@/types';

export type EstadoTempoReal = 'conectando' | 'ao_vivo' | 'reconectando' | 'demonstracao';

const CHAVE_DEMO = 'sme_cco_ocorrencias';

/**
 * Atualizacao instantanea das ocorrencias do CCO.
 * Com Supabase: canal Realtime (websocket) na tabela cco_ocorrencias.
 * Cada mudanca atualiza as listas/mapa; ocorrencias novas chamam onNova; atualizacoes chamam onAtualizada.
 */
export function useTempoRealCco(
  onNova?: (ocorrencia: CcoOcorrencia) => void,
  onAtualizada?: (ocorrencia: CcoOcorrencia) => void,
): EstadoTempoReal {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoTempoReal>(isSupabaseConfigured ? 'conectando' : 'demonstracao');
  const aoReceber = useRef(onNova);
  aoReceber.current = onNova;
  const aoAtualizar = useRef(onAtualizada);
  aoAtualizar.current = onAtualizada;

  useEffect(() => {
    const atualizar = () => void queryClient.invalidateQueries({ queryKey: ['cco'] });

    if (!isSupabaseConfigured) {
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
        } catch { /* conteudo invalido */ }
      };
      window.addEventListener('storage', aoMudar);
      return () => window.removeEventListener('storage', aoMudar);
    }

    const canal = supabase
      .channel('cco-ocorrencias-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cco_ocorrencias' }, (mudanca) => {
        atualizar();
        if (mudanca.eventType === 'INSERT') aoReceber.current?.(mudanca.new as CcoOcorrencia);
        if (mudanca.eventType === 'UPDATE') aoAtualizar.current?.(mudanca.new as CcoOcorrencia);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setEstado('ao_vivo');
          atualizar();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setEstado('reconectando');
        }
      });
    return () => { void supabase.removeChannel(canal); };
  }, [queryClient]);

  return estado;
}

/**
 * Toca um bipe de alerta usando a Web Audio API - sem dependencias externas.
 * tipo 'nova'        = dois bipes agudos (urgencia para admin/equipe)
 * tipo 'atualizacao' = um bipe medio suave (aviso para a unidade escolar)
 */
export function tocarSomAlerta(tipo: 'nova' | 'atualizacao' = 'nova'): void {
  try {
    const ctx = new AudioContext();
    const tocar = (freq: number, inicio: number, duracao: number, ganho = 0.35) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env);
      env.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, ctx.currentTime + inicio);
      env.gain.linearRampToValueAtTime(ganho, ctx.currentTime + inicio + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.05);
    };
    if (tipo === 'nova') {
      tocar(523, 0,    0.18, 0.35);
      tocar(659, 0.22, 0.22, 0.35);
    } else {
      tocar(392, 0, 0.28, 0.25);
    }
    window.setTimeout(() => void ctx.close(), 1500);
  } catch { /* Navegador nao permitiu AudioContext - silencioso. */ }
}

function lerIdsDemo(): string[] {
  try {
    return (JSON.parse(localStorage.getItem(CHAVE_DEMO) || '[]') as CcoOcorrencia[]).map((oc) => oc.id);
  } catch {
    return [];
  }
}
