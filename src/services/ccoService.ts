/**
 * CCO — Central Controle Operacional.
 * Ocorrências do monitoramento das câmeras das unidades escolares.
 *
 * Com Supabase: tabela cco_ocorrencias (RLS por unidade), histórico em cco_ocorrencia_historico,
 * fotos no bucket privado cco-fotos (URL assinada). Protocolo, autoria e auditoria são gravados
 * pelo banco. Sem Supabase (modo demonstração), tudo fica no localStorage deste navegador.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { perfilCco } from '@/lib/modulos';
import { dataService } from '@/services/dataService';
import { RAMAIS_UNIDADES_INICIAIS } from '@/services/ramaisUnidades';
import { DEMO_USERS } from '@/services/mockData';
import { ResultadoGravidade, classificarPorPalavras } from '@/lib/gravidadeCco';
import { SugestaoSituacao, sugerirSituacaoPorPalavras } from '@/lib/sugestaoSituacao';
import {
  CcoAtualizacao,
  CcoEdicao,
  CcoHistorico,
  CcoNovaOcorrencia,
  CcoOcorrencia,
  CcoSituacao,
  RamalUnidade,
  UserProfile,
} from '@/types';

const BUCKET = 'cco-fotos';
const CHAVES = {
  OCORRENCIAS: 'sme_cco_ocorrencias',
  HISTORICO: 'sme_cco_historico',
  FOTOS: 'sme_cco_fotos',
};

// ─── Problema em câmera ───
/** Sugestões da lista de câmeras; a unidade também pode digitar outra. */
export const CAMERAS_SUGERIDAS = [
  'Portão principal',
  'Portão de serviço',
  'Pátio',
  'Corredor',
  'Quadra',
  'Estacionamento',
  'Refeitório',
  'Secretaria',
];

// ─── Local da ocorrência ───
/** Sugestões de onde a ocorrência aconteceu; a unidade também pode digitar outro local. */
export const LOCAIS_SUGERIDOS = [
  'Portão principal',
  'Entrada / recepção',
  'Pátio',
  'Sala de aula',
  'Corredor',
  'Banheiro',
  'Quadra',
  'Refeitório / cozinha',
  'Secretaria',
  'Estacionamento',
  'Muro / área externa',
];

export const TIPOS_PROBLEMA_CAMERA = [
  'Sem imagem',
  'Imagem com falha ou chuviscada',
  'Câmera desligada ou offline',
  'Câmera fora de posição',
  'Câmera danificada',
  'Gravação indisponível',
  'Outro',
];

// ─── Foto ───
export const FOTO_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_TAMANHO_MAXIMO = 10 * 1024 * 1024;
export const FOTO_DESCRICAO_LIMITES = 'JPG, PNG ou WEBP · até 10 MB';
const FOTO_LADO_MAXIMO = 1920;

/** Confere tipo e tamanho; devolve a mensagem de erro ou null. */
export function validarFoto(arquivo: File): string | null {
  if (!FOTO_TIPOS_ACEITOS.includes(arquivo.type)) return 'Formato não aceito. Envie uma foto JPG, PNG ou WEBP.';
  if (arquivo.size > FOTO_TAMANHO_MAXIMO) return 'A foto passa de 10 MB. Escolha outra ou tire uma nova foto.';
  return null;
}

/**
 * Reduz a foto para no máximo 1920 px e regrava em JPEG. Além de deixar o envio rápido no celular,
 * descarta os metadados da câmera (inclusive a localização GPS).
 */
export async function prepararFoto(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível ler a foto. Tente outra imagem.'));
      img.src = url;
    });
    const escala = Math.min(1, FOTO_LADO_MAXIMO / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(imagem.naturalWidth * escala);
    canvas.height = Math.round(imagem.naturalHeight * escala);
    const contexto = canvas.getContext('2d');
    if (!contexto) return arquivo;
    contexto.fillStyle = '#fff';
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob || arquivo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Datas (horário de Brasília) ───
const FUSO = 'America/Sao_Paulo';

/** Hoje em Brasília, no formato AAAA-MM-DD. */
export const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());

/** Hora atual em Brasília, no formato HH:MM. */
export const agoraBrasilia = () =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());

export const formatarData = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
};

export const formatarHora = (hora?: string | null) => (hora ? hora.slice(0, 5) : '');

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(iso))
    .replace(',', ' às');

/** "08:10 – 09:30", "22:40 – 01:15 (dia seguinte)" ou "desde 08:10 · em andamento". */
export const descreverHorario = (oc: Pick<CcoOcorrencia, 'hora_inicio' | 'hora_fim' | 'em_andamento' | 'termina_dia_seguinte'>) => {
  if (oc.em_andamento || !oc.hora_fim) return `desde ${formatarHora(oc.hora_inicio)} · em andamento`;
  return `${formatarHora(oc.hora_inicio)} – ${formatarHora(oc.hora_fim)}${oc.termina_dia_seguinte ? ' (dia seguinte)' : ''}`;
};

export const novoIdentificador = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

// ─── Situações ───
export const SITUACOES: Record<CcoSituacao, { rotulo: string; descricao: string }> = {
  registrada: { rotulo: 'Registrada', descricao: 'Recebida pelo CCO, aguardando análise.' },
  em_analise: { rotulo: 'Em análise', descricao: 'A equipe do CCO está verificando as imagens.' },
  em_atendimento: { rotulo: 'Em atendimento', descricao: 'Providências em andamento.' },
  concluida: { rotulo: 'Solucionada', descricao: 'Ocorrência solucionada pelo CCO.' },
};
export const ORDEM_SITUACOES: CcoSituacao[] = ['registrada', 'em_analise', 'em_atendimento', 'concluida'];

/**
 * Texto do evento de situação montado pelos rótulos atuais (o banco grava 'concluida' e
 * os registros antigos dizem "Concluída"; na tela vale sempre "Solucionada").
 */
export const descreverEvento = (evento: Pick<CcoHistorico, 'tipo' | 'descricao' | 'situacao_anterior' | 'situacao_nova'>) => {
  if (evento.tipo !== 'situacao' || !evento.situacao_nova) return evento.descricao || '';
  if (evento.situacao_nova === 'concluida') return 'Ocorrência finalizada como Solucionada.';
  if (evento.situacao_anterior === 'concluida') return `Ocorrência reaberta: situação ${SITUACOES[evento.situacao_nova].rotulo}.`;
  const de = evento.situacao_anterior ? SITUACOES[evento.situacao_anterior].rotulo : null;
  return de ? `Situação alterada de ${de} para ${SITUACOES[evento.situacao_nova].rotulo}.` : `Situação: ${SITUACOES[evento.situacao_nova].rotulo}.`;
};

// ─── Erros com mensagem clara ───
const mensagemErro = (error: { message?: string; code?: string } | null, padrao: string) => {
  const msg = error?.message || '';
  if (/cco_ocorrencias|cco_ocorrencia_historico|cco_atualizar|cco_informar/.test(msg) && /does not exist|schema cache|Could not find/i.test(msg)) {
    return 'O módulo CCO ainda não foi instalado no banco. Aplique as migrações 20261022120000 e 20261022120100 no Supabase.';
  }
  if (/bucket not found/i.test(msg)) return 'O armazenamento de fotos do CCO ainda não existe. Aplique a migração 20261022120100 no Supabase.';
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Sem conexão com o servidor. Verifique a internet e tente novamente — seus dados continuam no formulário.';
  if (error?.code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Seu usuário não tem permissão para esta ação no CCO.';
  return msg ? `${padrao}: ${msg}` : padrao;
};

// ─── Modo demonstração ───
function ler<T>(chave: string, inicial: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto) return JSON.parse(bruto) as T;
  } catch {}
  return inicial;
}

function gravar<T>(chave: string, valor: T) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    throw new Error('O armazenamento deste navegador está cheio. No modo demonstração, limpe os dados de teste e tente novamente.');
  }
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const unidadeDemo = (nome: string) => RAMAIS_UNIDADES_INICIAIS.find((u) => u.nome === nome)!;

/** Exemplos para o modo demonstração não abrir vazio. */
function exemplosDemo(): { ocorrencias: CcoOcorrencia[]; historico: CcoHistorico[] } {
  const escola = unidadeDemo('E. M. ALEXANDRE IGNÁCIO');
  const outra = unidadeDemo('E. M. AMAURI FERREIRA');
  const dia = (deslocamento: number) => {
    const d = new Date(`${hojeBrasilia()}T12:00:00`);
    d.setDate(d.getDate() - deslocamento);
    return d.toISOString().slice(0, 10);
  };
  const base = (n: number, parcial: Partial<CcoOcorrencia>): CcoOcorrencia => ({
    id: `cco-demo-${n}`,
    protocolo: `CCO-2026-${String(n).padStart(6, '0')}`,
    unidade_id: escola.id,
    unidade_nome: escola.nome,
    data_ocorrencia: dia(0),
    hora_inicio: '08:00',
    hora_fim: null,
    em_andamento: false,
    termina_dia_seguinte: false,
    descricao: '',
    foto_path: null,
    situacao: 'registrada',
    responsavel_id: null,
    responsavel_nome: null,
    criado_por: 'u-demo-unidade',
    criado_por_nome: 'Luciana Ferreira',
    criado_por_email: 'unidade@sme.gov.br',
    client_request_id: `demo-${n}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...parcial,
  });
  const ocorrencias = [
    base(1, {
      data_ocorrencia: dia(3), hora_inicio: '22:40', hora_fim: '01:15', termina_dia_seguinte: true,
      descricao: 'Movimentação de duas pessoas junto ao muro dos fundos, próximo à quadra. A câmera 04 (quadra) registrou a tentativa de pular o muro; ninguém entrou no prédio.',
      situacao: 'concluida', responsavel_id: 'u-demo-cco', responsavel_nome: 'Marcos Vinícius Rocha',
      created_at: `${dia(2)}T07:12:00-03:00`, updated_at: `${dia(2)}T10:30:00-03:00`,
    }),
    base(2, {
      data_ocorrencia: dia(1), hora_inicio: '13:20', hora_fim: '13:45',
      descricao: 'Câmera do portão principal (câmera 01) com imagem escura durante a saída dos alunos do turno da tarde.',
      situacao: 'em_atendimento', responsavel_id: 'u-demo-cco', responsavel_nome: 'Marcos Vinícius Rocha',
      created_at: `${dia(1)}T14:02:00-03:00`, updated_at: `${dia(1)}T15:10:00-03:00`,
    }),
    base(3, {
      unidade_id: outra.id, unidade_nome: outra.nome, criado_por: 'u-demo-unidade-2', criado_por_nome: 'Paulo Henrique Souza',
      criado_por_email: 'amauri@sme.gov.br', data_ocorrencia: dia(0), hora_inicio: '07:05', em_andamento: true,
      descricao: 'Portão lateral do estacionamento aberto desde a chegada da equipe; câmera 02 mostra o cadeado rompido.',
      created_at: `${dia(0)}T07:20:00-03:00`, updated_at: `${dia(0)}T07:20:00-03:00`,
    }),
  ];
  const evento = (n: number, oc: CcoOcorrencia, parcial: Partial<CcoHistorico>): CcoHistorico => ({
    id: `cco-hist-demo-${n}`, ocorrencia_id: oc.id, tipo: 'registro', autor_id: oc.criado_por, autor_nome: oc.criado_por_nome,
    created_at: oc.created_at, ...parcial,
  });
  const historico = [
    evento(1, ocorrencias[0], { situacao_nova: 'registrada', descricao: 'Ocorrência registrada pela unidade.' }),
    evento(2, ocorrencias[0], { tipo: 'responsavel', descricao: 'Responsável definido: Marcos Vinícius Rocha.', autor_id: 'u-demo-cco', autor_nome: 'Marcos Vinícius Rocha', created_at: `${dia(2)}T08:01:00-03:00` }),
    evento(3, ocorrencias[0], { tipo: 'observacao', descricao: 'Imagens conferidas. Guarda Municipal acionada; ronda reforçada no período noturno.', autor_id: 'u-demo-cco', autor_nome: 'Marcos Vinícius Rocha', created_at: `${dia(2)}T09:15:00-03:00` }),
    evento(4, ocorrencias[0], { tipo: 'situacao', situacao_anterior: 'registrada', situacao_nova: 'concluida', descricao: 'Situação alterada de Registrada para Concluída.', autor_id: 'u-demo-cco', autor_nome: 'Marcos Vinícius Rocha', created_at: `${dia(2)}T10:30:00-03:00` }),
    evento(5, ocorrencias[1], { situacao_nova: 'registrada', descricao: 'Ocorrência registrada pela unidade.' }),
    evento(6, ocorrencias[1], { tipo: 'situacao', situacao_anterior: 'registrada', situacao_nova: 'em_atendimento', descricao: 'Situação alterada de Registrada para Em atendimento.', autor_id: 'u-demo-cco', autor_nome: 'Marcos Vinícius Rocha', created_at: `${dia(1)}T15:10:00-03:00` }),
    evento(7, ocorrencias[2], { situacao_nova: 'registrada', descricao: 'Ocorrência registrada pela unidade.' }),
  ];
  return { ocorrencias, historico };
}

function ocorrenciasDemo(): CcoOcorrencia[] {
  const salvas = ler<CcoOcorrencia[] | null>(CHAVES.OCORRENCIAS, null);
  if (salvas) return salvas;
  const { ocorrencias, historico } = exemplosDemo();
  gravar(CHAVES.OCORRENCIAS, ocorrencias);
  gravar(CHAVES.HISTORICO, historico);
  return ocorrencias;
}

const historicoDemo = () => {
  ocorrenciasDemo();
  return ler<CcoHistorico[]>(CHAVES.HISTORICO, []);
};

/** Mesma regra da função cco_pode_ver_unidade do banco. */
function podeVerUnidade(user: UserProfile, unidadeId: string) {
  const perfil = perfilCco(user);
  if (perfil === 'admin') return true;
  if (perfil === 'unidade') return user.unidade_id === unidadeId;
  if (perfil === 'equipe') return !user.cco_unidades?.length || user.cco_unidades.includes(unidadeId);
  return false;
}

function adicionarHistoricoDemo(evento: Omit<CcoHistorico, 'id' | 'created_at'>) {
  const historico = historicoDemo();
  historico.push({ ...evento, id: `cco-hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString() });
  gravar(CHAVES.HISTORICO, historico);
}

// ─── API ───
const textoParaAnalise = (oc: Pick<CcoOcorrencia, 'descricao' | 'tipo_registro' | 'cameras' | 'tipo_problema'>) =>
  [
    oc.tipo_registro === 'camera' ? `Relato de problema em câmera(s): ${(oc.cameras || []).join(', ')} — ${oc.tipo_problema || ''}` : '',
    oc.descricao,
  ].join('\n');

/** Gravidade a mostrar: a análise gravada ou, enquanto ela não chega, as palavras-chave. */
export function gravidadeDe(oc: CcoOcorrencia): ResultadoGravidade & { origem: 'ia' | 'palavras'; provisoria: boolean } {
  if (oc.ia_analisada_em && typeof oc.ia_grave === 'boolean') {
    // A lista atual de palavras confirma o alerta mesmo em análises antigas (critérios novos).
    if (!oc.ia_grave) {
      const palavras = classificarPorPalavras(textoParaAnalise(oc));
      if (palavras.grave) return { ...palavras, origem: 'palavras', provisoria: false };
    }
    return { grave: oc.ia_grave, categoria: oc.ia_categoria ?? null, motivo: oc.ia_motivo ?? null, origem: oc.ia_origem ?? 'palavras', provisoria: false };
  }
  return { ...classificarPorPalavras(textoParaAnalise(oc)), origem: 'palavras', provisoria: true };
}

// ─── Importância (painel do administrador) ───

export type Importancia = 'alta' | 'media' | 'baixa';

export const IMPORTANCIAS: Record<Importancia, { rotulo: string; ordem: number }> = {
  alta: { rotulo: 'Alta', ordem: 0 },
  media: { rotulo: 'Média', ordem: 1 },
  baixa: { rotulo: 'Baixa', ordem: 2 },
};

/**
 * Alta: caso grave (IA ou palavras-chave). Média: ainda em andamento ou câmera com falha
 * (a unidade fica sem monitoramento). Baixa: as demais. Devolve também o motivo, para a tela.
 */
export function importanciaDe(oc: CcoOcorrencia): { nivel: Importancia; motivo: string } {
  const gravidade = gravidadeDe(oc);
  if (gravidade.grave) return { nivel: 'alta', motivo: `Caso grave${gravidade.categoria ? `: ${gravidade.categoria}` : ''}` };
  if (oc.situacao !== 'concluida' && oc.em_andamento) return { nivel: 'media', motivo: 'Ainda em andamento' };
  if (oc.tipo_registro === 'camera') return { nivel: 'media', motivo: `Câmera com falha${oc.tipo_problema ? `: ${oc.tipo_problema}` : ''}` };
  return { nivel: 'baixa', motivo: 'Sem sinais de gravidade' };
}

/** Quem dirige cada unidade e o cargo de quem registra (colunas do painel do administrador). */
export interface PessoasDasUnidades {
  direcao: Record<string, { nome: string; cargo: string | null }>;
  cargos: Record<string, string | null>;
}

const ehDirecao = (cargo?: string | null) => Boolean(cargo && /diret|dirigent/i.test(cargo));

/** Por que a unidade não pode editar a ocorrência (ou null, se pode). */
export function motivoSemEdicao(user: UserProfile, oc: CcoOcorrencia): string | null {
  if (perfilCco(user) !== 'unidade' || oc.unidade_id !== user.unidade_id) return 'Somente a unidade escolar edita a própria ocorrência.';
  if (oc.visualizada_em) return 'O administrador já visualizou esta ocorrência. Ela não pode mais ser editada.';
  if (oc.situacao !== 'registrada') return 'O CCO já iniciou o atendimento. A ocorrência não pode mais ser editada.';
  return null;
}

export const podeEditar = (user: UserProfile, oc: CcoOcorrencia) => motivoSemEdicao(user, oc) === null;

export const ccoService = {
  async getUnidade(id?: string | null): Promise<RamalUnidade | null> {
    if (!id) return null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('ramais_unidades').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(mensagemErro(error, 'Não foi possível carregar a unidade'));
      return (data as RamalUnidade) || null;
    }
    return (await dataService.getRamaisUnidades()).find((u) => u.id === id) || null;
  },

  /** Ocorrências que o usuário pode ver (o banco aplica a mesma regra por RLS). */
  async listarOcorrencias(user: UserProfile): Promise<CcoOcorrencia[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('cco_ocorrencias')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw new Error(mensagemErro(error, 'Não foi possível carregar as ocorrências'));
      return data as CcoOcorrencia[];
    }
    await esperar(150);
    return ocorrenciasDemo()
      .filter((oc) => podeVerUnidade(user, oc.unidade_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async obterOcorrencia(user: UserProfile, id: string): Promise<CcoOcorrencia | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('cco_ocorrencias').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(mensagemErro(error, 'Não foi possível abrir a ocorrência'));
      return (data as CcoOcorrencia) || null;
    }
    const oc = ocorrenciasDemo().find((item) => item.id === id);
    return oc && podeVerUnidade(user, oc.unidade_id) ? oc : null;
  },

  async listarHistorico(ocorrenciaId: string): Promise<CcoHistorico[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('cco_ocorrencia_historico')
        .select('*')
        .eq('ocorrencia_id', ocorrenciaId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível carregar o histórico'));
      return data as CcoHistorico[];
    }
    return historicoDemo()
      .filter((h) => h.ocorrencia_id === ocorrenciaId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  /**
   * Registra a ocorrência. O client_request_id torna o envio idempotente: se a conexão cair
   * depois de gravar e o usuário tentar de novo, devolve o registro já existente.
   */
  async registrarOcorrencia(user: UserProfile, dados: CcoNovaOcorrencia): Promise<CcoOcorrencia> {
    const { foto, ...campos } = dados;
    if (isSupabaseConfigured) {
      const existente = await supabase.from('cco_ocorrencias').select('*').eq('client_request_id', dados.client_request_id).maybeSingle();
      if (existente.data) return existente.data as CcoOcorrencia;

      let foto_path: string | null = null;
      if (foto) {
        foto_path = `${dados.unidade_id}/${dados.client_request_id}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(foto_path, foto, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (error) throw new Error(mensagemErro(error, 'Não foi possível enviar a foto'));
      }
      // Sem locais, não envia a coluna (compatível com o banco antes da migração 20261023160000).
      const { locais, ...semLocais } = campos;
      const { data, error } = await supabase
        .from('cco_ocorrencias')
        .insert({ ...semLocais, ...(locais?.length ? { locais } : {}), descricao: campos.descricao.trim(), foto_path })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') {
          const repetido = await supabase.from('cco_ocorrencias').select('*').eq('client_request_id', dados.client_request_id).maybeSingle();
          if (repetido.data) return repetido.data as CcoOcorrencia;
        }
        throw new Error(mensagemErro(error, 'Não foi possível registrar a ocorrência'));
      }
      void this.analisarGravidade((data as CcoOcorrencia).id).catch(() => {});
      return data as CcoOcorrencia;
    }

    // Modo demonstração
    if (perfilCco(user) !== 'unidade' || user.unidade_id !== dados.unidade_id) {
      throw new Error('Seu usuário não tem permissão para esta ação no CCO.');
    }
    await esperar(700);
    const lista = ocorrenciasDemo();
    const repetida = lista.find((oc) => oc.client_request_id === dados.client_request_id);
    if (repetida) return repetida;

    const unidade = await this.getUnidade(dados.unidade_id);
    const sequencia = lista.reduce((maior, oc) => Math.max(maior, Number(oc.protocolo.slice(-6)) || 0), 0) + 1;
    const agora = new Date().toISOString();
    const id = `cco-${Date.now()}`;
    let foto_path: string | null = null;
    if (foto) {
      foto_path = `${dados.unidade_id}/${dados.client_request_id}.jpg`;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(new Error('Não foi possível ler a foto.'));
        leitor.readAsDataURL(foto);
      });
      gravar(CHAVES.FOTOS, { ...ler<Record<string, string>>(CHAVES.FOTOS, {}), [foto_path]: dataUrl });
    }
    const nova: CcoOcorrencia = {
      ...campos,
      id,
      descricao: campos.descricao.trim(),
      protocolo: `CCO-${hojeBrasilia().slice(0, 4)}-${String(sequencia).padStart(6, '0')}`,
      unidade_nome: unidade?.nome || 'Unidade escolar',
      foto_path,
      situacao: 'registrada',
      responsavel_id: null,
      responsavel_nome: null,
      criado_por: user.id,
      criado_por_nome: user.nome_completo,
      criado_por_email: user.email,
      created_at: agora,
      updated_at: agora,
    };
    gravar(CHAVES.OCORRENCIAS, [nova, ...lista]);
    adicionarHistoricoDemo({ ocorrencia_id: id, tipo: 'registro', situacao_nova: 'registrada', descricao: 'Ocorrência registrada pela unidade.', autor_id: user.id, autor_nome: user.nome_completo });
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao: 'CCO_REGISTRO',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: {
        protocolo: nova.protocolo, unidade: nova.unidade_nome, data_ocorrencia: nova.data_ocorrencia,
        hora_inicio: nova.hora_inicio, hora_fim: nova.hora_fim, em_andamento: nova.em_andamento,
        termina_dia_seguinte: nova.termina_dia_seguinte, com_foto: Boolean(foto_path),
        tipo_registro: nova.tipo_registro, cameras: nova.cameras, tipo_problema: nova.tipo_problema,
      },
    });
    void this.analisarGravidade(id).catch(() => {});
    return nova;
  },

  /** Equipe CCO: situação, responsável e observação (cada mudança entra no histórico e na auditoria). */
  async atualizarOcorrencia(user: UserProfile, id: string, alteracao: CcoAtualizacao): Promise<CcoOcorrencia> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('cco_atualizar_ocorrencia', {
        p_id: id,
        p_situacao: alteracao.situacao ?? null,
        p_responsavel_id: alteracao.responsavel_id || null,
        p_remover_responsavel: alteracao.responsavel_id === null,
        p_observacao: alteracao.observacao?.trim() || null,
        // Parâmetros da visita só quando usados (compatível com o banco antes da migração 20261023160000).
        ...(alteracao.visita ? { p_visita_data: alteracao.visita.data, p_visita_hora: alteracao.visita.hora || null } : {}),
        ...(alteracao.remover_visita ? { p_remover_visita: true } : {}),
      });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível atualizar a ocorrência'));
      return data as CcoOcorrencia;
    }

    const perfil = perfilCco(user);
    if (perfil !== 'admin' && perfil !== 'equipe') throw new Error('Apenas a equipe do CCO atualiza ocorrências.');
    await esperar(400);
    const lista = ocorrenciasDemo();
    const indice = lista.findIndex((oc) => oc.id === id);
    if (indice < 0 || !podeVerUnidade(user, lista[indice].unidade_id)) throw new Error('Ocorrência não encontrada.');
    const oc = { ...lista[indice] };
    const alteracoes: Record<string, unknown> = {};
    const autor = { autor_id: user.id, autor_nome: user.nome_completo, ocorrencia_id: id };
    const observacao = alteracao.observacao?.trim();

    // Mesmas regras da função cco_atualizar_ocorrencia do banco.
    const finalizando = alteracao.situacao === 'concluida' && oc.situacao !== 'concluida';
    const reabrindo = oc.situacao === 'concluida' && Boolean(alteracao.situacao) && alteracao.situacao !== 'concluida';
    const visitaNova = alteracao.visita;
    const horaVisitaAtual = oc.visita_hora?.slice(0, 5) || null;
    const mudouVisita = (Boolean(alteracao.remover_visita) && Boolean(oc.visita_data))
      || (Boolean(visitaNova) && (visitaNova!.data !== oc.visita_data || (visitaNova!.hora || null) !== horaVisitaAtual));
    if (oc.situacao === 'concluida' && !reabrindo && (observacao || alteracao.responsavel_id !== undefined || mudouVisita)) {
      throw new Error('Ocorrência finalizada: reabra para registrar novos andamentos.');
    }
    if (reabrindo && perfil !== 'admin') throw new Error('Somente o administrador reabre uma ocorrência finalizada.');
    if (finalizando && (!observacao || observacao.length < 5)) throw new Error('Descreva a solução para finalizar a ocorrência.');
    if (reabrindo && (!observacao || observacao.length < 5)) throw new Error('Informe o motivo da reabertura.');
    if (visitaNova && mudouVisita && visitaNova.data < hojeBrasilia()) throw new Error('A data da visita não pode estar no passado.');
    let acao = 'CCO_ATUALIZACAO';
    let tipoTexto: 'andamento' | 'solucao' | 'reabertura' = 'andamento';

    if (alteracao.situacao && alteracao.situacao !== oc.situacao) {
      adicionarHistoricoDemo({ ...autor, tipo: 'situacao', situacao_anterior: oc.situacao, situacao_nova: alteracao.situacao, descricao: `Situação alterada de ${SITUACOES[oc.situacao].rotulo} para ${SITUACOES[alteracao.situacao].rotulo}.` });
      alteracoes.situacao = { de: oc.situacao, para: alteracao.situacao };
      oc.situacao = alteracao.situacao;
      if (finalizando) { acao = 'CCO_FINALIZACAO'; tipoTexto = 'solucao'; }
      if (reabrindo) { acao = 'CCO_REABERTURA'; tipoTexto = 'reabertura'; }
    }
    if (alteracao.responsavel_id === null && oc.responsavel_id) {
      adicionarHistoricoDemo({ ...autor, tipo: 'responsavel', descricao: `Responsável removido (${oc.responsavel_nome}).` });
      alteracoes.responsavel = { de: oc.responsavel_nome, para: null };
      oc.responsavel_id = null;
      oc.responsavel_nome = null;
    } else if (alteracao.responsavel_id && alteracao.responsavel_id !== oc.responsavel_id) {
      const responsavel = (await this.listarEquipe()).find((u) => u.id === alteracao.responsavel_id);
      if (!responsavel) throw new Error('O responsável precisa ser da equipe do CCO.');
      adicionarHistoricoDemo({ ...autor, tipo: 'responsavel', descricao: `Responsável definido: ${responsavel.nome_completo}.` });
      alteracoes.responsavel = { de: oc.responsavel_nome, para: responsavel.nome_completo };
      oc.responsavel_id = responsavel.id;
      oc.responsavel_nome = responsavel.nome_completo;
    }
    if (mudouVisita) {
      const quando = (d: string, h: string | null) => `${d.split('-').reverse().join('/')}${h ? ` às ${h}` : ''}`;
      const descricao = alteracao.remover_visita
        ? `Visita presencial à unidade cancelada (estava agendada para ${quando(oc.visita_data!, horaVisitaAtual)}).`
        : `Visita presencial à unidade ${oc.visita_data ? 'reagendada' : 'agendada'} para ${quando(visitaNova!.data, visitaNova!.hora)}. A equipe do CCO irá à unidade verificar as imagens no local.`;
      adicionarHistoricoDemo({ ...autor, tipo: 'andamento', descricao });
      alteracoes.visita = { de: oc.visita_data || null, para: alteracao.remover_visita ? null : visitaNova!.data };
      oc.visita_data = alteracao.remover_visita ? null : visitaNova!.data;
      oc.visita_hora = alteracao.remover_visita ? null : visitaNova!.hora ? `${visitaNova!.hora}:00` : null;
    }
    if (observacao) {
      adicionarHistoricoDemo({ ...autor, tipo: tipoTexto, descricao: observacao });
      alteracoes[tipoTexto] = observacao;
    }
    if (!Object.keys(alteracoes).length) return oc;

    oc.updated_at = new Date().toISOString();
    lista[indice] = oc;
    gravar(CHAVES.OCORRENCIAS, lista);
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao,
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: { protocolo: oc.protocolo, unidade: oc.unidade_nome, ...alteracoes },
    });
    return oc;
  },

  /** Informa o horário final de uma ocorrência que estava em andamento. */
  async informarTermino(user: UserProfile, id: string, horaFim: string, diaSeguinte: boolean): Promise<CcoOcorrencia> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('cco_informar_termino', { p_id: id, p_hora_fim: horaFim, p_dia_seguinte: diaSeguinte });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível informar o horário final'));
      return data as CcoOcorrencia;
    }
    await esperar(400);
    const lista = ocorrenciasDemo();
    const indice = lista.findIndex((oc) => oc.id === id);
    if (indice < 0 || !podeVerUnidade(user, lista[indice].unidade_id)) throw new Error('Ocorrência não encontrada.');
    const oc = { ...lista[indice], em_andamento: false, hora_fim: horaFim, termina_dia_seguinte: diaSeguinte, updated_at: new Date().toISOString() };
    lista[indice] = oc;
    gravar(CHAVES.OCORRENCIAS, lista);
    adicionarHistoricoDemo({ ocorrencia_id: id, tipo: 'termino', descricao: `Horário final informado: ${horaFim}${diaSeguinte ? ' (dia seguinte)' : ''}.`, autor_id: user.id, autor_nome: user.nome_completo });
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao: 'CCO_TERMINO',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: { protocolo: oc.protocolo, unidade: oc.unidade_nome, hora_fim: horaFim, termina_dia_seguinte: diaSeguinte },
    });
    return oc;
  },

  /**
   * Exclui a ocorrência (somente administrador). O banco guarda uma cópia com o motivo na
   * auditoria (CCO_EXCLUSAO) antes de apagar; a foto é removida do Storage em seguida.
   */
  async excluirOcorrencia(user: UserProfile, id: string, motivo: string): Promise<void> {
    const texto = motivo.trim();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('cco_excluir_ocorrencia', { p_id: id, p_motivo: texto });
      if (error) {
        if (/cco_excluir_ocorrencia/.test(error.message) && /Could not find|does not exist|schema cache/i.test(error.message)) {
          throw new Error('A exclusão ainda não foi instalada no banco. Aplique a migração 20261022160000_cco_exclusao.sql no Supabase.');
        }
        throw new Error(mensagemErro(error, 'Não foi possível excluir a ocorrência'));
      }
      // A ocorrência já foi apagada; se a foto falhar, sobra só o arquivo (sem acesso pela tela).
      if (typeof data === 'string' && data) await supabase.storage.from(BUCKET).remove([data]);
      return;
    }

    if (perfilCco(user) !== 'admin') throw new Error('Somente o administrador pode excluir ocorrências.');
    if (texto.length < 5) throw new Error('Informe o motivo da exclusão.');
    await esperar(400);
    const lista = ocorrenciasDemo();
    const oc = lista.find((item) => item.id === id);
    if (!oc) throw new Error('Ocorrência não encontrada.');
    const historico = historicoDemo();
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao: 'CCO_EXCLUSAO',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: {
        protocolo: oc.protocolo,
        unidade: oc.unidade_nome,
        motivo: texto,
        ocorrencia: { ...oc },
        historico: historico.filter((h) => h.ocorrencia_id === id),
      },
    });
    gravar(CHAVES.OCORRENCIAS, lista.filter((item) => item.id !== id));
    gravar(CHAVES.HISTORICO, historico.filter((h) => h.ocorrencia_id !== id));
    if (oc.foto_path) {
      const fotos = ler<Record<string, string>>(CHAVES.FOTOS, {});
      delete fotos[oc.foto_path];
      gravar(CHAVES.FOTOS, fotos);
    }
  },

  /** URL temporária da foto (bucket privado). */
  /**
   * Pede a análise de gravidade (IA no servidor; palavras-chave no modo demonstração).
   * Não bloqueia quem chamou: se falhar, a tela usa as palavras-chave.
   */
  async analisarGravidade(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.functions.invoke('cco-analisar-ocorrencia', { body: { id } });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível analisar a ocorrência'));
      return;
    }
    const lista = ocorrenciasDemo();
    const oc = lista.find((item) => item.id === id);
    if (!oc) return;
    const resultado = classificarPorPalavras(textoParaAnalise(oc));
    gravar(CHAVES.OCORRENCIAS, lista.map((item) => (item.id === id
      ? { ...item, ia_grave: resultado.grave, ia_categoria: resultado.categoria, ia_motivo: resultado.motivo, ia_origem: 'palavras' as const, ia_analisada_em: new Date().toISOString() }
      : item)));
    await dataService.registrarLogAuditoria({
      usuario_email: 'sistema',
      acao: 'CCO_ANALISE_IA',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: { protocolo: oc.protocolo, unidade: oc.unidade_nome, grave: resultado.grave, categoria: resultado.categoria, origem: 'palavras-chave' },
    });
  },

  /**
   * Sugestão de situação para o andamento (JEV → Gemini → palavras-chave, na Edge Function).
   * Se a função falhar ou no modo demonstração, usa a regra de palavras-chave aqui mesmo.
   */
  async sugerirSituacao(oc: CcoOcorrencia, texto: string): Promise<SugestaoSituacao> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('cco-sugerir-situacao', { body: { id: oc.id, texto } });
        if (!error && data && 'origem' in data) return data as SugestaoSituacao;
      } catch { /* cai para a regra local */ }
    }
    return sugerirSituacaoPorPalavras(texto, oc.situacao);
  },

  /** O administrador abriu a ocorrência: a partir daqui a unidade não edita mais. */
  async marcarVisualizada(user: UserProfile, id: string): Promise<void> {
    if (perfilCco(user) !== 'admin') return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('cco_marcar_visualizada', { p_id: id });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível registrar a visualização'));
      return;
    }
    const lista = ocorrenciasDemo();
    const oc = lista.find((item) => item.id === id);
    if (!oc || oc.visualizada_em) return;
    gravar(CHAVES.OCORRENCIAS, lista.map((item) => (item.id === id
      ? { ...item, visualizada_em: new Date().toISOString(), visualizada_por: user.id, visualizada_por_nome: user.nome_completo }
      : item)));
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao: 'CCO_VISUALIZACAO',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: { protocolo: oc.protocolo, unidade: oc.unidade_nome },
    });
  },

  async editarOcorrencia(user: UserProfile, id: string, dados: CcoEdicao): Promise<CcoOcorrencia> {
    const { foto, alterar_foto, ...campos } = dados;
    const atual = await this.obterOcorrencia(user, id);
    if (!atual) throw new Error('Ocorrência não encontrada.');
    const bloqueio = motivoSemEdicao(user, atual);
    if (bloqueio) throw new Error(bloqueio);

    // Foto nova em caminho novo: a anterior continua no Storage (só o administrador apaga fotos).
    let foto_path: string | null = alterar_foto ? null : atual.foto_path ?? null;
    if (alterar_foto && foto) foto_path = `${atual.unidade_id}/${id}-${Date.now()}.jpg`;

    if (isSupabaseConfigured) {
      if (alterar_foto && foto && foto_path) {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(foto_path, foto, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (error) throw new Error(mensagemErro(error, 'Não foi possível enviar a foto'));
      }
      const { data, error } = await supabase.rpc('cco_editar_ocorrencia', {
        p_id: id,
        p_data_ocorrencia: campos.data_ocorrencia,
        p_hora_inicio: campos.hora_inicio,
        p_hora_fim: campos.hora_fim,
        p_em_andamento: campos.em_andamento,
        p_termina_dia_seguinte: campos.termina_dia_seguinte,
        p_descricao: campos.descricao.trim(),
        p_tipo_registro: campos.tipo_registro,
        p_cameras: campos.cameras,
        p_tipo_problema: campos.tipo_problema,
        p_alterar_foto: alterar_foto,
        p_foto_path: foto_path,
        // Locais só quando há algo a gravar ou a limpar (compatível com o banco antes da migração).
        ...(campos.tipo_registro !== 'camera' && (campos.locais?.length || atual.locais?.length) ? { p_locais: campos.locais ?? [] } : {}),
      });
      if (error) throw new Error(mensagemErro(error, 'Não foi possível salvar as alterações'));
      void this.analisarGravidade(id).catch(() => {});
      return data as CcoOcorrencia;
    }

    // Modo demonstração
    await esperar(500);
    if (alterar_foto && foto && foto_path) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(new Error('Não foi possível ler a foto.'));
        leitor.readAsDataURL(foto);
      });
      gravar(CHAVES.FOTOS, { ...ler<Record<string, string>>(CHAVES.FOTOS, {}), [foto_path]: dataUrl });
    }
    const editada: CcoOcorrencia = {
      ...atual,
      ...campos,
      descricao: campos.descricao.trim(),
      hora_fim: campos.em_andamento ? null : campos.hora_fim,
      cameras: campos.tipo_registro === 'camera' ? campos.cameras : null,
      tipo_problema: campos.tipo_registro === 'camera' ? campos.tipo_problema : null,
      locais: campos.tipo_registro === 'camera' || !campos.locais?.length ? null : campos.locais,
      foto_path,
      updated_at: new Date().toISOString(),
    };
    gravar(CHAVES.OCORRENCIAS, ocorrenciasDemo().map((item) => (item.id === id ? editada : item)));
    adicionarHistoricoDemo({ ocorrencia_id: id, tipo: 'edicao', descricao: 'Ocorrência editada pela unidade.', autor_id: user.id, autor_nome: user.nome_completo });
    await dataService.registrarLogAuditoria({
      usuario_email: user.email,
      acao: 'CCO_EDICAO',
      tabela: 'cco_ocorrencias',
      registro_id: id,
      detalhes: { protocolo: atual.protocolo, unidade: atual.unidade_nome, antes: atual, depois: { ...editada } },
    });
    void this.analisarGravidade(id).catch(() => {});
    return editada;
  },

  async urlFoto(caminho?: string | null): Promise<string | null> {
    if (!caminho) return null;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 60 * 30);
      if (error) throw new Error(mensagemErro(error, 'Não foi possível abrir a foto'));
      return data.signedUrl;
    }
    return ler<Record<string, string>>(CHAVES.FOTOS, {})[caminho] || null;
  },

  /**
   * Direção de cada unidade e cargo de quem registrou. Fonte: acessos por e-mail (cadastro oficial
   * das escolas) e, na falta, os perfis com cargo de direção. Só o administrador enxerga essas tabelas.
   */
  async listarPessoasDasUnidades(): Promise<PessoasDasUnidades> {
    const resultado: PessoasDasUnidades = { direcao: {}, cargos: {} };
    let perfis: Pick<UserProfile, 'id' | 'nome_completo' | 'cargo' | 'unidade_id' | 'role'>[] = [];

    if (isSupabaseConfigured) {
      const [acessos, perfisLive] = await Promise.all([
        supabase.from('acessos_por_email').select('unidade_id, responsavel, cargo').eq('role', 'unidade_escolar'),
        supabase.from('profiles').select('id, nome_completo, cargo, unidade_id, role').eq('role', 'unidade_escolar'),
      ]);
      perfis = (perfisLive.data || []) as typeof perfis;
      // 1º: quem tem cargo de direção; 2º: o responsável do e-mail institucional da escola.
      const linhas = (acessos.data || []) as { unidade_id: string | null; responsavel: string | null; cargo: string | null }[];
      [...linhas.filter((l) => ehDirecao(l.cargo)), ...linhas.filter((l) => !l.cargo)].forEach((l) => {
        if (l.unidade_id && l.responsavel && !resultado.direcao[l.unidade_id]) {
          resultado.direcao[l.unidade_id] = { nome: l.responsavel, cargo: l.cargo || 'Direção' };
        }
      });
    } else {
      const usuarios = await dataService.getUsuariosSistema();
      perfis = [...usuarios, ...DEMO_USERS.filter((d) => !usuarios.some((u) => u.id === d.id))];
    }

    perfis.forEach((p) => {
      resultado.cargos[p.id] = p.cargo ?? null;
      if (p.role === 'unidade_escolar' && p.unidade_id && ehDirecao(p.cargo) && !resultado.direcao[p.unidade_id]) {
        resultado.direcao[p.unidade_id] = { nome: p.nome_completo, cargo: p.cargo ?? 'Direção' };
      }
    });
    return resultado;
  },

  /** Pessoas que podem ser responsáveis por um atendimento. */
  async listarEquipe(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .or('role.in.(admin,cco,cco_admin),acesso_cco.eq.true')
        .order('nome_completo');
      if (error) throw new Error(mensagemErro(error, 'Não foi possível carregar a equipe do CCO'));
      return data as UserProfile[];
    }
    const usuarios = await dataService.getUsuariosSistema();
    const todos = [...usuarios, ...DEMO_USERS.filter((d) => !usuarios.some((u) => u.id === d.id))];
    return todos.filter((u) => u.ativo && (perfilCco(u) === 'admin' || perfilCco(u) === 'equipe'));
  },
};
