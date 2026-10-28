import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CRITICIDADES, SEDE, UnidadeMapa } from './dados';

interface Props {
  unidades: UnidadeMapa[];
  selecionada: string | null;
  rota: UnidadeMapa[];
  /** Trajeto pelas ruas; sem ele, a rota aparece em linha reta tracejada. */
  trajeto?: [number, number][] | null;
  /** Posição do usuário (quando a rota sai de onde ele está). */
  minhaPosicao?: { lat: number; lng: number } | null;
  /** Unidades com ocorrência que acabou de chegar (anel animado no marcador). */
  destaques?: string[];
  onSelecionar: (id: string) => void;
}

// Mapa base do OpenStreetMap (sem chave). O tom claro/escuro vem de filtros CSS (index.css).
const TILE_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO = '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>';
const CHECK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const svg = (corpo: string) =>
  `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
const ICONE_TELA_CHEIA = svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>');
const ICONE_SAIR_TELA_CHEIA = svg('<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>');
const ICONE_ENQUADRAR = svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>');

const escapar =(texto: string) => texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Marcador: verde com ✓ sem pendências; cor da criticidade com o número de pendências. */
const iconeUnidade = (u: UnidadeMapa, ativo: boolean, ordemRota?: number, nova = false) => {
  const cor = CRITICIDADES[u.criticidade].cor;
  const tamanho = u.criticidade === 'ok' ? 26 : 30;
  const pulso = u.criticidade === 'critica' ? `<span class="cco-pulso" style="background:${cor}"></span>` : '';
  const conteudo = u.criticidade === 'ok' ? CHECK : String(u.abertas.length);
  const anel = ativo ? 'box-shadow:0 0 0 4px #fff,0 0 0 7px #0b63ce;' : 'box-shadow:0 0 0 3px #fff,0 4px 10px rgba(16,35,63,.35);';
  const selo = ordemRota ? `<span class="cco-ordem">${ordemRota}</span>` : '';
  const aviso = nova ? '<span class="cco-nova" aria-hidden="true"></span>' : '';
  return L.divIcon({
    className: 'cco-marcador',
    html: `<span class="cco-bolha" style="width:${tamanho}px;height:${tamanho}px;background:${cor};${anel}">${pulso}${aviso}<span class="cco-conteudo">${conteudo}</span>${selo}</span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
};

const iconeSede = L.divIcon({
  className: 'cco-marcador',
  // Etiqueta acima do ponto (com seta), para não cobrir o marcador do CESMI, que fica no mesmo prédio.
  html: '<span class="cco-sede"><img src="/assets/brasao_itaguai.png" alt="" />SMEDU · Sede</span>',
  iconSize: [112, 28],
  iconAnchor: [56, 50],
});

/** Mapa (Leaflet + OpenStreetMap/CARTO) com as unidades, a sede e a rota escolhida. */
export const MapaRede: React.FC<Props> = ({ unidades, selecionada, rota, trajeto, minhaPosicao, destaques = [], onSelecionar }) => {
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camadaMarcadores = useRef<L.LayerGroup | null>(null);
  const camadaRota = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const enquadrou = useRef(false);
  const unidadesAtuais = useRef(unidades);
  unidadesAtuais.current = unidades;

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!caixa.current || mapa.current) return;
    const m = L.map(caixa.current, { zoomControl: false, attributionControl: true }).setView([SEDE.lat, SEDE.lng], 12);
    L.control.zoom({ position: 'topright', zoomInTitle: 'Aproximar', zoomOutTitle: 'Afastar' }).addTo(m);

    // Abaixo do zoom: enquadrar todas as unidades e tela cheia só do mapa.
    const area = caixa.current.parentElement ?? caixa.current;
    let botaoTelaCheia: HTMLAnchorElement | null = null;
    const atualizarBotao = () => {
      if (!botaoTelaCheia) return;
      const cheia = document.fullscreenElement === area;
      botaoTelaCheia.innerHTML = cheia ? ICONE_SAIR_TELA_CHEIA : ICONE_TELA_CHEIA;
      botaoTelaCheia.title = cheia ? 'Sair da tela cheia (Esc)' : 'Tela cheia do mapa';
      botaoTelaCheia.setAttribute('aria-label', botaoTelaCheia.title);
      botaoTelaCheia.setAttribute('aria-pressed', String(cheia));
    };
    const Ferramentas = L.Control.extend({
      onAdd() {
        const barra = L.DomUtil.create('div', 'leaflet-bar cco-ferramentas');
        const criar = (html: string, titulo: string, acao: () => void) => {
          const botao = L.DomUtil.create('a', '', barra) as HTMLAnchorElement;
          botao.href = '#';
          botao.role = 'button';
          botao.innerHTML = html;
          botao.title = titulo;
          botao.setAttribute('aria-label', titulo);
          L.DomEvent.on(botao, 'click', (e) => {
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);
            acao();
          });
          return botao;
        };
        criar(ICONE_ENQUADRAR, 'Ver todas as unidades', () => {
          const pontos = unidadesAtuais.current.map((u) => [u.lat, u.lng] as [number, number]);
          m.fitBounds(L.latLngBounds(pontos.concat([[SEDE.lat, SEDE.lng]])), { padding: [30, 30] });
        });
        botaoTelaCheia = criar(ICONE_TELA_CHEIA, 'Tela cheia do mapa', () => {
          if (document.fullscreenElement === area) void document.exitFullscreen();
          else void area.requestFullscreen?.();
        });
        atualizarBotao();
        return barra;
      },
    });
    new Ferramentas({ position: 'topright' }).addTo(m);
    document.addEventListener('fullscreenchange', atualizarBotao);

    tiles.current = L.tileLayer(TILE_OSM, { attribution: ATRIBUICAO, maxZoom: 19, className: 'cco-tiles-mapa' }).addTo(m);
    // Satélite (Esri): confere visualmente o prédio de cada escola.
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagens &copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
    });
    L.control.layers({ Mapa: tiles.current, 'Satélite': satelite }, undefined, { position: 'topright', collapsed: false }).addTo(m);
    camadaRota.current = L.layerGroup().addTo(m);
    camadaMarcadores.current = L.layerGroup().addTo(m);
    L.marker([SEDE.lat, SEDE.lng], { icon: iconeSede, zIndexOffset: 1000, keyboard: false, title: SEDE.nome })
      .bindTooltip(`<strong>${SEDE.nome}</strong><br/>${SEDE.endereco}`, { direction: "top", offset: [0, -50] })
      .addTo(m);
    mapa.current = m;

    // Tela cheia / redimensionamento: o Leaflet precisa recalcular o tamanho.
    const redimensionar = new ResizeObserver(() => m.invalidateSize());
    redimensionar.observe(caixa.current);

    return () => {
      document.removeEventListener('fullscreenchange', atualizarBotao);
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
        icon: iconeUnidade(u, u.id === selecionada, ordem.get(u.id), destaques.includes(u.id)),
        title: u.nome,
        alt: u.nome,
        riseOnHover: true,
        zIndexOffset: u.id === selecionada ? 900 : u.criticidade === 'ok' ? 0 : 500 + u.prioridade / 100,
      });
      marcador.bindTooltip(
        `<strong>${escapar(u.nome)}</strong><br/>${escapar(u.bairro ?? 'Itaguaí')} · ${escapar(CRITICIDADES[u.criticidade].rotulo)}${u.abertas.length ? ` · ${u.abertas.length} pendência(s)` : ''}`,
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
  }, [unidades, selecionada, rota, destaques, onSelecionar]);

  // Rota: linha tracejada sede → paradas, na ordem de visita.
  useEffect(() => {
    const camada = camadaRota.current;
    if (!camada) return;
    camada.clearLayers();
    if (!rota.length) return;
    if (trajeto?.length) {
      // Contorno branco por baixo para a linha aparecer sobre qualquer fundo.
      L.polyline(trajeto, { color: '#ffffff', weight: 8, opacity: 0.9 }).addTo(camada);
      L.polyline(trajeto, { color: '#0b63ce', weight: 5, opacity: 0.95 }).addTo(camada);
      return;
    }
    const origem = minhaPosicao ?? SEDE;
    const pontos: [number, number][] = [[origem.lat, origem.lng], ...rota.map((u) => [u.lat, u.lng] as [number, number])];
    L.polyline(pontos, { color: '#0b63ce', weight: 4, opacity: 0.6, dashArray: '8 8' }).addTo(camada);
  }, [rota, trajeto, minhaPosicao]);

  // "Você está aqui": ponto azul pulsante na posição do usuário.
  const marcadorEu = useRef<L.Marker | null>(null);
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcadorEu.current?.remove();
    marcadorEu.current = null;
    if (!minhaPosicao) return;
    marcadorEu.current = L.marker([minhaPosicao.lat, minhaPosicao.lng], {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#0b63ce;border:3px solid #fff;box-shadow:0 0 0 6px rgba(11,99,206,.25),0 2px 6px rgba(0,0,0,.4)"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      zIndexOffset: 900,
      keyboard: false,
      title: 'Você está aqui',
    }).bindTooltip('Você está aqui', { direction: 'top', offset: [0, -10] }).addTo(m);
    return () => { marcadorEu.current?.remove(); marcadorEu.current = null; };
  }, [minhaPosicao]);

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
