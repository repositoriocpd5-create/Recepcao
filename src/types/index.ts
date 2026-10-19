export type UserRole = 'admin' | 'recepcionista' | 'gestor' | 'atendente';

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
