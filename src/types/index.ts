/** unidade_escolar, cco e cco_admin são papéis só do módulo CCO (Central Controle Operacional). */
export type UserRole = 'admin' | 'recepcionista' | 'gestor' | 'atendente' | 'unidade_escolar' | 'cco' | 'cco_admin';

export type PessoaTipo = 'servidor' | 'visitante';

export type ServidorStatus = 'ativo' | 'afastado' | 'ferias' | 'inativo';

export type MovimentacaoStatus = 'no_predio' | 'finalizado' | 'recusado' | 'pendente_autorizacao';

export type AutorizacaoStatus = 'dispensada' | 'pendente' | 'autorizado' | 'recusado';

export type AgendamentoStatus = 'agendado' | 'confirmado' | 'cancelado' | 'concluido';

export type CrachaStatus = 'disponivel' | 'em_uso' | 'extraviado' | 'danificado' | 'inativo';

export interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  cargo: string;
  role: UserRole;
  ativo: boolean;
  /** Matrícula aceita no login no lugar do e-mail (fica no Supabase Auth). */
  matricula?: string | null;
  /** Unidade escolar do usuário (papel unidade_escolar). */
  unidade_id?: string | null;
  /** Operador da recepção que também integra a equipe do CCO. */
  acesso_cco?: boolean;
  /** Unidades que a equipe CCO acompanha; vazio = todas. */
  cco_unidades?: string[] | null;
  ultimo_acesso?: string;
  created_at?: string;
}

export interface Departamento {
  id: string;
  nome: string;
  sigla: string;
  descricao?: string;
  responsavel?: string;
  ramal?: string;
  localizacao?: string;
  ativo: boolean;
  created_at?: string;
}

export interface Setor {
  id: string;
  departamento_id: string;
  nome: string;
  sigla: string;
  responsavel?: string;
  ramal?: string;
  sala?: string;
  requer_autorizacao: boolean;
  ativo: boolean;
  departamento?: Departamento;
}

export type RamalUnidadeTipo = 'unidade_escolar' | 'departamento';

/** Um ramal da unidade, com uma descrição opcional (ex.: Direção, Secretaria). */
export interface RamalContato {
  numero: string;
  descricao?: string | null;
}

/** Unidade escolar ou departamento da SMEDU com os ramais de contato. */
export interface RamalUnidade {
  id: string;
  tipo: RamalUnidadeTipo;
  categoria: string;
  nome: string;
  /** Lotação correspondente no quadro de servidores. */
  lotacao?: string | null;
  /** Ramal principal (o primeiro da lista), mantido para compatibilidade. */
  ramal?: string | null;
  /** Todos os ramais; departamentos podem ter mais de um. */
  ramais: RamalContato[];
  ativo: boolean;
  /** Localização (Mapa Operacional da Rede). */
  latitude?: number | null;
  longitude?: number | null;
  bairro?: string | null;
  endereco?: string | null;
  mapa_url?: string | null;
  foto_url?: string | null;
  /** Diretor(a) da escola ou responsável pelo departamento. */
  diretor?: string | null;
  /** Vice-diretor(a) ou substituto(a) do responsável. */
  vice_diretor?: string | null;
  /** Servidor do Quadro da SMEDU vinculado como diretor(a) / vice. */
  diretor_servidor_id?: string | null;
  vice_servidor_id?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  observacoes?: string | null;
}

export interface LocalizacaoUnidade {
  lat: number;
  lng: number;
  bairro: string | null;
  endereco: string | null;
  mapa_url: string | null;
  foto_url?: string | null;
  cep?: string | null;
}

export interface ServidorSetorVinculo {
  servidor_id: string;
  setor_id: string;
  /** Responsável cuja visita exige autorização prévia da portaria. */
  requer_autorizacao?: boolean;
}

export interface Servidor {
  id: string;
  matricula: string;
  nome: string;
  cpf?: string;
  cargo: string;
  lotacao?: string;
  departamento_id: string;
  setor_id?: string;
  email?: string;
  telefone?: string;
  ramal?: string;
  foto_url?: string;
  status: ServidorStatus;
  departamento?: Departamento;
  setor?: Setor;
}

export interface Visitante {
  id: string;
  cpf: string;
  nome: string;
  rg?: string;
  orgao_emissor?: string;
  telefone?: string;
  email?: string;
  empresa_orgao?: string;
  foto_url?: string;
  /** Caminho da foto no bucket privado visitantes-fotos. */
  foto_path?: string | null;
  digital_cadastrada_em?: string | null;
  /** Consentimento específico para dado biométrico (LGPD, art. 11). */
  biometria_consentida_em?: string | null;
  observacoes?: string;
  ativo: boolean;
  created_at?: string;
}

export interface Movimentacao {
  id: string;
  tipo_pessoa: PessoaTipo;
  servidor_id?: string;
  visitante_id?: string;
  departamento_destino_id: string;
  setor_destino_id: string;
  servidor_destino_id?: string;
  cracha_numero?: string;
  motivo: string;
  data_hora_entrada: string;
  data_hora_saida?: string | null;
  status: MovimentacaoStatus;
  autorizacao_status: AutorizacaoStatus;
  autorizador_id?: string;
  autorizacao_observacao?: string;
  recepcionista_entrada_id?: string;
  recepcionista_saida_id?: string;
  observacoes?: string;
  servidor?: Servidor;
  visitante?: Visitante;
  departamento_destino?: Departamento;
  setor_destino?: Setor;
  servidor_destino?: Servidor;
  destinos?: DestinoVisita[];
}

export interface DestinoVisita {
  id?: string;
  departamento_destino_id: string;
  setor_destino_id: string;
  servidor_destino_id?: string;
  ordem?: number;
  departamento_destino?: Departamento;
  setor_destino?: Setor;
  servidor_destino?: Servidor;
}

export interface Autorizacao {
  id: string;
  movimentacao_id?: string;
  servidor_solicitado_id: string;
  status: AutorizacaoStatus;
  resposta_observacao?: string;
  respondido_em?: string;
  solicitado_por?: string;
  created_at?: string;
  movimentacao?: Movimentacao;
  servidor_solicitado?: Servidor;
}

export interface Agendamento {
  id: string;
  tipo_pessoa: PessoaTipo;
  visitante_id?: string;
  servidor_visitante_id?: string;
  departamento_id: string;
  setor_id: string;
  servidor_destino_id?: string;
  data_hora_prevista: string;
  motivo: string;
  status: AgendamentoStatus;
  observacoes?: string;
  criado_por?: string;
  visitante?: Visitante;
  departamento?: Departamento;
  setor?: Setor;
  servidor_destino?: Servidor;
}

export interface Cracha {
  id: string;
  numero: string;
  situacao: CrachaStatus;
  descricao?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Aparência e numeração dos crachás impressos (editável pelo administrador). */
export interface CrachaModelo {
  /** Imagem da logo em data URL; vazio = brasão padrão. */
  logo: string | null;
  linha1: string;
  linha2: string;
  /** Palavra em destaque na faixa (ex.: VISITANTE). */
  rotulo: string;
  corPrimaria: string;
  corSecundaria: string;
  /** O código de barras é prefixo + número (com zeros à esquerda): termina sempre no número do crachá. */
  prefixo: string;
  digitosNumero: number;
  mostrarNumero: boolean;
  /** Chaves de FONTES (ver pages/Crachas/modelo.ts) e tamanhos em % do padrão. */
  fonteTexto: string;
  fonteFaixa: string;
  tamTexto: number;
  tamFaixa: number;
  tamCodigo: number;
  textoApresente: string;
  textoDevolva: string;
}

export interface AtribuicaoCracha {
  id: string;
  cracha_id: string;
  movimentacao_id?: string;
  entregue_em: string;
  devolvido_em?: string;
  observacoes?: string;
  cracha?: Cracha;
  movimentacao?: Movimentacao;
}

export interface AuditoriaLog {
  id: string;
  usuario_id?: string;
  usuario_email?: string;
  acao: string;
  tabela?: string;
  registro_id?: string;
  detalhes: Record<string, any>;
  ip_origem?: string;
  created_at: string;
}

export interface ConsultaServidorResultado {
  encontrado: boolean;
  servidor?: Servidor;
  no_predio?: boolean;
  movimentacao_atual?: Movimentacao;
}

export interface ConsultaVisitanteResultado {
  encontrado: boolean;
  visitante?: Visitante;
  no_predio?: boolean;
  movimentacao_atual?: Movimentacao;
  historico_recente?: Array<{
    id: string;
    data_hora_entrada: string;
    data_hora_saida?: string;
    motivo: string;
    departamento: string;
    setor: string;
  }>;
}

export interface RegistroEntradaInput {
  tipo_pessoa: PessoaTipo;
  pessoa_id: string;
  departamento_destino_id: string;
  setor_destino_id: string;
  servidor_destino_id?: string;
  cracha_numero?: string;
  motivo: string;
  requer_autorizacao?: boolean;
  observacoes?: string;
  destinos?: DestinoVisita[];
}

// ─── CCO — Central Controle Operacional ───

export type CcoSituacao = 'registrada' | 'em_analise' | 'em_atendimento' | 'concluida';

/** Ocorrência comum ou relato de problema em câmera(s). */
export type CcoTipoRegistro = 'ocorrencia' | 'camera';

export interface CcoOcorrencia {
  id: string;
  protocolo: string;
  unidade_id: string;
  unidade_nome: string;
  /** Quando aconteceu (informado pela unidade), separado do momento do cadastro. */
  data_ocorrencia: string;
  hora_inicio: string;
  hora_fim?: string | null;
  em_andamento: boolean;
  termina_dia_seguinte: boolean;
  descricao: string;
  /** Registros antigos não têm o campo: tratar ausência como 'ocorrencia'. */
  tipo_registro?: CcoTipoRegistro;
  cameras?: string[] | null;
  tipo_problema?: string | null;
  /** Onde aconteceu (registro de ocorrência). */
  locais?: string[] | null;
  /** Visita presencial agendada pelo CCO (AAAA-MM-DD / HH:MM:SS). */
  visita_data?: string | null;
  visita_hora?: string | null;
  foto_path?: string | null;
  /** Quando o administrador abriu a ocorrência pela primeira vez; até lá a unidade pode editar. */
  visualizada_em?: string | null;
  visualizada_por?: string | null;
  visualizada_por_nome?: string | null;
  /** Análise de gravidade (IA ou palavras-chave); vazia até a análise terminar. */
  ia_grave?: boolean | null;
  ia_categoria?: string | null;
  ia_motivo?: string | null;
  ia_origem?: 'ia' | 'palavras' | null;
  ia_analisada_em?: string | null;
  situacao: CcoSituacao;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  criado_por?: string | null;
  criado_por_nome?: string | null;
  criado_por_email?: string | null;
  client_request_id: string;
  created_at: string;
  updated_at: string;
}

export type CcoHistoricoTipo = 'registro' | 'situacao' | 'responsavel' | 'observacao' | 'termino' | 'andamento' | 'solucao' | 'reabertura' | 'edicao';

export interface CcoHistorico {
  id: string;
  ocorrencia_id: string;
  tipo: CcoHistoricoTipo;
  situacao_anterior?: CcoSituacao | null;
  situacao_nova?: CcoSituacao | null;
  descricao?: string | null;
  autor_id?: string | null;
  autor_nome?: string | null;
  created_at: string;
}

export interface CcoNovaOcorrencia {
  client_request_id: string;
  unidade_id: string;
  data_ocorrencia: string;
  hora_inicio: string;
  hora_fim: string | null;
  em_andamento: boolean;
  termina_dia_seguinte: boolean;
  descricao: string;
  tipo_registro: CcoTipoRegistro;
  cameras: string[] | null;
  tipo_problema: string | null;
  locais?: string[] | null;
  foto?: Blob | null;
}

/** Alteração feita pela unidade antes de o administrador visualizar. */
export interface CcoEdicao extends Omit<CcoNovaOcorrencia, 'client_request_id' | 'unidade_id' | 'foto'> {
  /** false: mantém a foto atual; true: troca por `foto` (ou remove, se null). */
  alterar_foto: boolean;
  foto?: Blob | null;
}

export interface CcoAtualizacao {
  situacao?: CcoSituacao;
  responsavel_id?: string | null;
  observacao?: string;
  /** Agenda (ou reagenda) a visita presencial: data AAAA-MM-DD e hora opcional HH:MM. */
  visita?: { data: string; hora: string | null };
  /** Cancela a visita presencial agendada. */
  remover_visita?: boolean;
}
