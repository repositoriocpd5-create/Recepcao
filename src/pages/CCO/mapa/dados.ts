import { importanciaDe } from '@/services/ccoService';
import { LOCALIZACOES_UNIDADES } from '@/services/localizacoesUnidades';
import { CcoOcorrencia, RamalUnidade } from '@/types';

/**
 * Sede da SMEDU: ponto de partida das rotas de vistoria.
 * Coordenada aproximada do Centro de Itaguaí — ajuste aqui se o endereço da sede for outro.
 */
export const SEDE = { nome: 'SMEDU - Sede', lat: -22.8652, lng: -43.7781 };

/** Ocorrência aberta há mais que isso sem solução = prazo vencido. */
export const PRAZO_DIAS = 3;
export const MAX_ROTA = 10;

export type Criticidade = 'critica' | 'vencida' | 'atencao' | 'atendimento' | 'ok';

export const CRITICIDADES: Record<Criticidade, { rotulo: string; cor: string; etiqueta: string }> = {
  critica: { rotulo: 'Crítica', cor: '#dc2626', etiqueta: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30' },
  vencida: { rotulo: 'Prazo vencido', cor: '#ea580c', etiqueta: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30' },
  atencao: { rotulo: 'Atenção', cor: '#f59e0b', etiqueta: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30' },
  atendimento: { rotulo: 'Em atendimento', cor: '#2563eb', etiqueta: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30' },
  ok: { rotulo: 'Sem pendências', cor: '#16a34a', etiqueta: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/30' },
};

export interface UnidadeMapa {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  bairro: string | null;
  endereco: string | null;
  mapaUrl: string | null;
  abertas: CcoOcorrencia[];
  urgentes: number;
  vencidas: number;
  emAtendimento: number;
  criticidade: Criticidade;
  /** Maior = atender antes. */
  prioridade: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;
const venceu = (oc: CcoOcorrencia) => Date.now() - new Date(oc.created_at).getTime() > PRAZO_DIAS * DIA_MS;

/** Junta unidades (com coordenadas) e ocorrências em aberto, e calcula criticidade e prioridade. */
export function montarUnidades(unidades: RamalUnidade[], ocorrencias: CcoOcorrencia[]): { comLocal: UnidadeMapa[]; semLocal: RamalUnidade[] } {
  const abertasPorUnidade = new Map<string, CcoOcorrencia[]>();
  ocorrencias
    .filter((oc) => oc.situacao !== 'concluida')
    .forEach((oc) => abertasPorUnidade.set(oc.unidade_id, [...(abertasPorUnidade.get(oc.unidade_id) || []), oc]));

  const comLocal: UnidadeMapa[] = [];
  const semLocal: RamalUnidade[] = [];
  unidades
    .filter((u) => u.tipo === 'unidade_escolar' && u.ativo !== false)
    .forEach((u) => {
      const padrao = LOCALIZACOES_UNIDADES[u.nome];
      const lat = u.latitude ?? padrao?.lat;
      const lng = u.longitude ?? padrao?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        semLocal.push(u);
        return;
      }
      const abertas = abertasPorUnidade.get(u.id) || [];
      const urgentes = abertas.filter((oc) => importanciaDe(oc).nivel === 'alta').length;
      const vencidas = abertas.filter(venceu).length;
      const emAtendimento = abertas.filter((oc) => oc.situacao === 'em_atendimento').length;
      const criticidade: Criticidade =
        urgentes ? 'critica'
          : vencidas ? 'vencida'
            : abertas.length && emAtendimento === abertas.length ? 'atendimento'
              : abertas.length ? 'atencao'
                : 'ok';
      const maisAntiga = abertas.reduce((min, oc) => Math.min(min, new Date(oc.created_at).getTime()), Date.now());
      const prioridade = { critica: 4000, vencida: 3000, atencao: 2000, atendimento: 1000, ok: 0 }[criticidade]
        + urgentes * 100 + vencidas * 50 + abertas.length * 10 + Math.min(9, Math.floor((Date.now() - maisAntiga) / DIA_MS));
      comLocal.push({
        id: u.id,
        nome: u.nome,
        lat,
        lng,
        bairro: u.bairro ?? padrao?.bairro ?? null,
        endereco: u.endereco ?? padrao?.endereco ?? null,
        mapaUrl: u.mapa_url ?? padrao?.mapa_url ?? null,
        abertas,
        urgentes,
        vencidas,
        emAtendimento,
        criticidade,
        prioridade,
      });
    });
  comLocal.sort((a, b) => b.prioridade - a.prioridade || a.nome.localeCompare(b.nome, 'pt-BR'));
  return { comLocal, semLocal };
}

/** "2 urgentes", "1 vencida", "4 pendências", "Sem pendências". */
export const resumoUnidade = (u: UnidadeMapa) => {
  if (u.urgentes) return `${u.urgentes} urgente${u.urgentes > 1 ? 's' : ''}`;
  if (u.vencidas) return `${u.vencidas} vencida${u.vencidas > 1 ? 's' : ''}`;
  if (u.criticidade === 'atendimento') return `${u.emAtendimento} em atendimento`;
  if (u.abertas.length) return `${u.abertas.length} pendência${u.abertas.length > 1 ? 's' : ''}`;
  return 'Sem pendências';
};

/** Distância em linha reta (km). */
export const distanciaKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
};

/** Ordem de visita a partir da sede: sempre a unidade mais próxima ainda não visitada. */
export function ordenarRota(paradas: UnidadeMapa[]): { ordem: UnidadeMapa[]; km: number } {
  const restantes = [...paradas];
  const ordem: UnidadeMapa[] = [];
  let atual: { lat: number; lng: number } = SEDE;
  let km = 0;
  while (restantes.length) {
    let melhor = 0;
    restantes.forEach((p, i) => { if (distanciaKm(atual, p) < distanciaKm(atual, restantes[melhor])) melhor = i; });
    const [proxima] = restantes.splice(melhor, 1);
    km += distanciaKm(atual, proxima);
    ordem.push(proxima);
    atual = proxima;
  }
  return { ordem, km };
}

export interface RotaPorRuas {
  ordem: UnidadeMapa[];
  /** Trajeto pelas ruas, em [lat, lng]. */
  trajeto: [number, number][];
  km: number;
  minutos: number;
}

/**
 * Rota de carro pelas ruas (OSRM, dados do OpenStreetMap): escolhe a melhor ordem de visita
 * saindo da sede e devolve o trajeto, a distância e o tempo estimado.
 */
export async function buscarRotaPorRuas(paradas: UnidadeMapa[], sinal?: AbortSignal): Promise<RotaPorRuas> {
  const pontos = [SEDE, ...paradas].map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url = `https://router.project-osrm.org/trip/v1/driving/${pontos}?source=first&roundtrip=false&geometries=geojson&overview=full`;
  const resposta = await fetch(url, { signal: sinal });
  if (!resposta.ok) throw new Error('Serviço de rotas indisponível.');
  const dados = await resposta.json();
  if (dados.code !== 'Ok' || !dados.trips?.length) throw new Error('Não foi possível calcular a rota pelas ruas.');
  // waypoints na ordem enviada; waypoint_index = posição na viagem (0 = sede).
  const ordem = (dados.waypoints as { waypoint_index: number }[])
    .slice(1)
    .map((w, i) => ({ unidade: paradas[i], posicao: w.waypoint_index }))
    .sort((a, b) => a.posicao - b.posicao)
    .map((x) => x.unidade);
  const viagem = dados.trips[0];
  return {
    ordem,
    trajeto: (viagem.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    km: viagem.distance / 1000,
    minutos: Math.round(viagem.duration / 60),
  };
}

/** "Como chegar" no Google Maps, da sede até uma unidade. */
export const comoChegar = (u: UnidadeMapa) =>
  `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${SEDE.lat},${SEDE.lng}&destination=${u.lat},${u.lng}`;

/** Rota no Google Maps (carro), saindo da sede e terminando na última unidade. */
export const linkGoogleMaps = (ordem: UnidadeMapa[]) => {
  if (!ordem.length) return '';
  const ponto = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
  const destino = ordem[ordem.length - 1];
  const paradas = ordem.slice(0, -1).map(ponto).join('|');
  return `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${ponto(SEDE)}&destination=${ponto(destino)}${paradas ? `&waypoints=${encodeURIComponent(paradas)}` : ''}`;
};

/** Planilha (CSV para Excel) das unidades exibidas. */
export function exportarCsv(unidades: UnidadeMapa[]) {
  const celula = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [
    ['Unidade', 'Bairro', 'Criticidade', 'Pendências', 'Urgentes', 'Prazos vencidos', 'Em atendimento', 'Latitude', 'Longitude', 'Link do mapa'],
    ...unidades.map((u) => [u.nome, u.bairro, CRITICIDADES[u.criticidade].rotulo, u.abertas.length, u.urgentes, u.vencidas, u.emAtendimento, u.lat, u.lng, u.mapaUrl]),
  ];
  const conteudo = '﻿' + linhas.map((l) => l.map(celula).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `mapa-rede-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
