import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CRITICIDADES, SEDE, UnidadeMapa } from './dados';

interface Props {
  unidades: UnidadeMapa[];
  selecionada: string | null;
  rota: UnidadeMapa[];
  onSelecionar: (id: string) => void;
}

// Mapa base do OpenStreetMap (sem chave). O tom claro/escuro vem de filtros CSS (index.css).
const TILE_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>';
const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const escapar = (texto: string) => texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Marcador: verde com ✓ sem pendências; cor da criticidade com o número de pendências. */
const iconeUnidade = (u: UnidadeMapa, ativo: boolean, ordemRota?: number) => {
  const cor = CRITICIDADES[u.criticidade].cor;
  const tamanho = u.criticidade === 'ok' ? 26 : 30;
  const pulso = u.criticidade === 'critica' ? `<span class="cco-pulso" style="background:${cor}"></span>` : '';
  const conteudo = u.criticidade === 'ok' ? CHECK : String(u.abertas.length);
  const anel = ativo ? 'box-shadow:0 0 0 4px #fff,0 0 0 7px #0b63ce;' : 'box-shadow:0 0 0 3px #fff,0 4px 10px rgba(16,35,63,.35);';
  const selo = ordemRota ? `<span class="cco-ordem">${ordemRota}</span>` : '';
  return L.divIcon({
    className: 'cco-marcador',
    html: `<span class="cco-bolha" style="width:${tamanho}px;height:${tamanho}px;background:${cor};${anel}">${pulso}<span class="cco-conteudo">${conteudo}</span>${selo}</span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
};

const iconeSede = L.divIcon({
  className: 'cco-marcador',
  html: '<span class="cco-sede"><img src="/assets/brasao_itaguai.png" alt="" />SMEDU · Sede</span>',
  iconSize: [112, 28],
  iconAnchor: [56, 14],
});

/** Mapa (Leaflet + OpenStreetMap/CARTO) com as unidades, a sede e a rota escolhida. */
export const MapaRede: React.FC<Props> = ({ unidades, selecionada, rota, onSelecionar }) => {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camadaMarcadores = useRef<L.LayerGroup | null>(null);
  const camadaRota = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const enquadrou = useRef(false);

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!caixa.current || mapa.current) return;
    const m = L.map(caixa.current, { zoomControl: false, attributionControl: true }).setView([SEDE.lat, SEDE.lng], 12);
    L.control.zoom({ position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(m);
    tiles.current = L.tileLayer(TILE_OSM, { attribution: ATRIBUICAO, maxZoom: 19 }).addTo(m);
    camadaRota.current = L.layerGroup().addTo(m);
    camadaMarcadores.current = L.layerGroup().addTo(m);
    L.marker([SEDE.lat, SEDE.lng], { icon: iconeSede, zIndexOffset: 1000, keyboard: false, title: SEDE.nome }).addTo(m);
    mapa.current = m;

    // Tela cheia / redimensionamento: o Leaflet precisa recalcular o tamanho.
    const redimensionar = new ResizeObserver(() => m.invalidateSize());
    redimensionar.observe(caixa.current);

    return () => {
      redimensionar.disconnect();
      m.remove();
      mapa.current = null;
    };
  }, []);

  // Marcadores.
  useEffect(() => {
    const m = mapa.current;
    const camada = camadaMarcadores.current;
    if (!m || !camada) return;
    camada.clearLayers();
    const ordem = new Map(rota.map((u, i) => [u.id, i + 1]));
    unidades.forEach((u) => {
      const marcador = L.marker([u.lat, u.lng], {
        icon: iconeUnidade(u, u.id === selecionada, ordem.get(u.id)),
        title: u.nome,
        alt: u.nome,
        riseOnHover: true,
        zIndexOffset: u.id === selecionada ? 900 : u.criticidade === 'ok' ? 0 : 500 + u.prioridade / 100,
      });
      marcador.bindTooltip(
        `<strong>${escapar(u.nome)}</strong><br/>${escapar(u.bairro ?? 'Bairro não identificado')} · ${escapar(CRITICIDADES[u.criticidade].rotulo)}${u.abertas.length ? ` · ${u.abertas.length} pendência(s)` : ''}`,
        { direction: 'top', offset: [0, -14] },
      );
      marcador.on('click', () => onSelecionar(u.id));
      marcador.on('keypress', (e: L.LeafletKeyboardEvent) => { if (e.originalEvent.key === 'Enter') onSelecionar(u.id); });
      camada.addLayer(marcador);
    });
    // Primeira carga: enquadra todas as unidades.
    if (!enquadrou.current && unidades.length) {
      m.fitBounds(L.latLngBounds(unidades.map((u) => [u.lat, u.lng] as [number, number]).concat([[SEDE.lat, SEDE.lng]])), { padding: [30, 30] });
      enquadrou.current = true;
    }
  }, [unidades, selecionada, rota, onSelecionar]);

  // Rota: linha tracejada sede → paradas, na ordem de visita.
  useEffect(() => {
    const camada = camadaRota.current;
    if (!camada) return;
    camada.clearLayers();
    if (!rota.length) return;
    const pontos: [number, number][] = [[SEDE.lat, SEDE.lng], ...rota.map((u) => [u.lat, u.lng] as [number, number])];
    L.polyline(pontos, { color: '#0b63ce', weight: 4, opacity: 0.85, dashArray: '8 8' }).addTo(camada);
  }, [rota]);

  // Leva a unidade escolhida para o centro.
  useEffect(() => {
    const u = unidades.find((x) => x.id === selecionada);
    if (u && mapa.current) mapa.current.flyTo([u.lat, u.lng], Math.max(mapa.current.getZoom(), 15), { duration: 0.6 });
  }, [selecionada]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={caixa}
      role="application"
      aria-label="Mapa das unidades escolares. Use os botões de zoom ou a lista de prioridades ao lado."
      className="cco-mapa h-full min-h-[420px] w-full"
    />
  );
};
