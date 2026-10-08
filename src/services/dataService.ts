import {
  Departamento,
  Setor,
  Servidor,
  Visitante,
  Movimentacao,
  Autorizacao,
  Agendamento,
  AuditoriaLog,
  ConsultaServidorResultado,
  ConsultaVisitanteResultado,
  RegistroEntradaInput,
  UserProfile,
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  INITIAL_DEPARTAMENTOS,
  INITIAL_SETORES,
  INITIAL_SERVIDORES,
  INITIAL_VISITANTES,
  INITIAL_MOVIMENTACOES,
  INITIAL_AUTORIZACOES,
  INITIAL_AGENDAMENTOS,
  INITIAL_AUDITORIA_LOGS,
} from './mockData';

// Local storage keys para persistência no ambiente de teste/demonstração
const STORAGE_KEYS = {
  DEPARTAMENTOS: 'sme_departamentos',
  SETORES: 'sme_setores',
  SERVIDORES: 'sme_servidores',
  VISITANTES: 'sme_visitantes',
  MOVIMENTACOES: 'sme_movimentacoes',
  AUTORIZACOES: 'sme_autorizacoes',
  AGENDAMENTOS: 'sme_agendamentos',
  AUDITORIA: 'sme_auditoria',
};

function getStorage<T>(key: string, initial: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data) as T;
  } catch {
    return initial;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Falha ao salvar no localStorage', err);
  }
}

export function resetTestData(): void {
  localStorage.setItem(STORAGE_KEYS.DEPARTAMENTOS, JSON.stringify(INITIAL_DEPARTAMENTOS));
  localStorage.setItem(STORAGE_KEYS.SETORES, JSON.stringify(INITIAL_SETORES));
  localStorage.setItem(STORAGE_KEYS.SERVIDORES, JSON.stringify(INITIAL_SERVIDORES));
  localStorage.setItem(STORAGE_KEYS.VISITANTES, JSON.stringify(INITIAL_VISITANTES));
  localStorage.setItem(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify(INITIAL_MOVIMENTACOES));
  localStorage.setItem(STORAGE_KEYS.AUTORIZACOES, JSON.stringify(INITIAL_AUTORIZACOES));
  localStorage.setItem(STORAGE_KEYS.AGENDAMENTOS, JSON.stringify(INITIAL_AGENDAMENTOS));
  localStorage.setItem(STORAGE_KEYS.AUDITORIA, JSON.stringify(INITIAL_AUDITORIA_LOGS));
}

// Helpers para sanitização
export const sanitizeNumbers = (val: string) => val.replace(/\D/g, '');

export const formatCpf = (val: string) => {
  const digits = sanitizeNumbers(val).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const dataService = {
  // 1. Departamentos e Setores
  async getDepartamentos(): Promise<Departamento[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('departamentos').select('*').order('nome');
      if (!error && data) return data as Departamento[];
    }
    return getStorage<Departamento[]>(STORAGE_KEYS.DEPARTAMENTOS, INITIAL_DEPARTAMENTOS);
  },

  async getSetores(departamentoId?: string): Promise<Setor[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('setores').select('*, departamento:departamentos(*)').order('nome');
      if (departamentoId) query = query.eq('departamento_id', departamentoId);
      const { data, error } = await query;
      if (!error && data) return data as Setor[];
    }
    const all = getStorage<Setor[]>(STORAGE_KEYS.SETORES, INITIAL_SETORES);
    const deps = await this.getDepartamentos();
    const enriched = all.map((s) => ({
      ...s,
      departamento: deps.find((d) => d.id === s.departamento_id),
    }));
    return departamentoId ? enriched.filter((s) => s.departamento_id === departamentoId) : enriched;
  },

  // 2. Servidores
  async getServidores(): Promise<Servidor[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('servidores')
        .select('*, departamento:departamentos(*), setor:setores(*)')
        .order('nome');
      if (!error && data) return data as Servidor[];
    }
    const list = getStorage<Servidor[]>(STORAGE_KEYS.SERVIDORES, INITIAL_SERVIDORES);
    const deps = await this.getDepartamentos();
    const sets = await this.getSetores();
    return list.map((s) => ({
      ...s,
      departamento: deps.find((d) => d.id === s.departamento_id),
      setor: sets.find((st) => st.id === s.setor_id),
    }));
  },

  async salvarServidor(servidor: Partial<Servidor>): Promise<Servidor> {
    if (isSupabaseConfigured) {
      if (servidor.id) {
        const { data, error } = await supabase
          .from('servidores')
          .update(servidor)
          .eq('id', servidor.id)
          .select()
          .single();
        if (error) throw error;
        return data as Servidor;
      } else {
        const { data, error } = await supabase
          .from('servidores')
          .insert(servidor)
          .select()
          .single();
        if (error) throw error;
        return data as Servidor;
      }
    }

    const list = getStorage<Servidor[]>(STORAGE_KEYS.SERVIDORES, INITIAL_SERVIDORES);
    if (servidor.id) {
      const idx = list.findIndex((s) => s.id === servidor.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...servidor } as Servidor;
        setStorage(STORAGE_KEYS.SERVIDORES, list);
        return list[idx];
      }
    }
    const novo: Servidor = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      matricula: servidor.matricula || `SME-${Math.floor(100000 + Math.random() * 900000)}`,
      nome: servidor.nome || '',
      cpf: servidor.cpf || '',
      cargo: servidor.cargo || 'Servidor',
      departamento_id: servidor.departamento_id || '',
      setor_id: servidor.setor_id,
      email: servidor.email,
      telefone: servidor.telefone,
      status: servidor.status || 'ativo',
    };
    list.push(novo);
    setStorage(STORAGE_KEYS.SERVIDORES, list);
    return novo;
  },

  // 3. Consulta Atômica de Servidor por Matrícula
  async consultarServidorPorMatricula(
    matricula: string,
    operador?: UserProfile | null
  ): Promise<ConsultaServidorResultado> {
    const limpa = matricula.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_consultar_servidor', {
        p_matricula: limpa,
      });
      if (!error && data) return data as ConsultaServidorResultado;
    }

    // Fallback de homologação / testes
    const servidores = await this.getServidores();
    const servidor = servidores.find((s) => s.matricula.toLowerCase() === limpa);

    if (!servidor) {
      return { encontrado: false };
    }

    const movs = await this.getMovimentacoes();
    const movAberta = movs.find(
      (m) => m.servidor_id === servidor.id && m.status === 'no_predio'
    );

    // Registro de auditoria da consulta (LGPD)
    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'CONSULTA_MATRICULA',
      tabela: 'servidores',
      registro_id: servidor.id,
      detalhes: { matricula: servidor.matricula, nome: servidor.nome },
    });

    return {
      encontrado: true,
      servidor,
      no_predio: Boolean(movAberta),
      movimentacao_atual: movAberta,
    };
  },

  // 4. Visitantes
  async getVisitantes(): Promise<Visitante[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('visitantes').select('*').order('nome');
      if (!error && data) return data as Visitante[];
    }
    return getStorage<Visitante[]>(STORAGE_KEYS.VISITANTES, INITIAL_VISITANTES);
  },

  async cadastrarOuAtualizarVisitante(
    dados: Partial<Visitante>,
    operador?: UserProfile | null
  ): Promise<Visitante> {
    const cpfFormatado = formatCpf(dados.cpf || '');

    if (isSupabaseConfigured) {
      if (dados.id) {
        const { data, error } = await supabase
          .from('visitantes')
          .update({ ...dados, cpf: cpfFormatado })
          .eq('id', dados.id)
          .select()
          .single();
        if (error) throw error;
        return data as Visitante;
      } else {
        const { data, error } = await supabase
          .from('visitantes')
          .insert({ ...dados, cpf: cpfFormatado, ativo: true })
          .select()
          .single();
        if (error) throw error;
        return data as Visitante;
      }
    }

    const visitantes = getStorage<Visitante[]>(STORAGE_KEYS.VISITANTES, INITIAL_VISITANTES);

    if (dados.id) {
      const idx = visitantes.findIndex((v) => v.id === dados.id);
      if (idx >= 0) {
        visitantes[idx] = { ...visitantes[idx], ...dados, cpf: cpfFormatado } as Visitante;
        setStorage(STORAGE_KEYS.VISITANTES, visitantes);
        return visitantes[idx];
      }
    }

    // Checar se já existe por CPF
    const existente = visitantes.find(
      (v) => sanitizeNumbers(v.cpf) === sanitizeNumbers(cpfFormatado)
    );
    if (existente) {
      Object.assign(existente, { ...dados, cpf: cpfFormatado });
      setStorage(STORAGE_KEYS.VISITANTES, visitantes);
      return existente;
    }

    const novoVisitante: Visitante = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      cpf: cpfFormatado,
      nome: dados.nome || '',
      rg: dados.rg,
      orgao_emissor: dados.orgao_emissor,
      telefone: dados.telefone,
      email: dados.email,
      empresa_orgao: dados.empresa_orgao,
      observacoes: dados.observacoes,
      ativo: true,
      created_at: new Date().toISOString(),
    };

    visitantes.unshift(novoVisitante);
    setStorage(STORAGE_KEYS.VISITANTES, visitantes);

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'CADASTRO_VISITANTE',
      tabela: 'visitantes',
      registro_id: novoVisitante.id,
      detalhes: { cpf: novoVisitante.cpf, nome: novoVisitante.nome },
    });

    return novoVisitante;
  },

  // 5. Consulta Atômica de Visitante por CPF
  async consultarVisitantePorCpf(
    cpf: string,
    operador?: UserProfile | null
  ): Promise<ConsultaVisitanteResultado> {
    const rawCpf = sanitizeNumbers(cpf);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_consultar_visitante', {
        p_cpf: rawCpf,
      });
      if (!error && data) return data as ConsultaVisitanteResultado;
    }

    const visitantes = await this.getVisitantes();
    const visitante = visitantes.find((v) => sanitizeNumbers(v.cpf) === rawCpf);

    if (!visitante) {
      return { encontrado: false };
    }

    const movs = await this.getMovimentacoes();
    const movAberta = movs.find(
      (m) => m.visitante_id === visitante.id && m.status === 'no_predio'
    );

    const historico = movs
      .filter((m) => m.visitante_id === visitante.id)
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        data_hora_entrada: m.data_hora_entrada,
        data_hora_saida: m.data_hora_saida || undefined,
        motivo: m.motivo,
        departamento: m.departamento_destino?.sigla || 'SME',
        setor: m.setor_destino?.sigla || 'Geral',
      }));

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'CONSULTA_CPF',
      tabela: 'visitantes',
      registro_id: visitante.id,
      detalhes: { cpf: rawCpf, nome: visitante.nome },
    });

    return {
      encontrado: true,
      visitante,
      no_predio: Boolean(movAberta),
      movimentacao_atual: movAberta,
      historico_recente: historico,
    };
  },

  // 6. Movimentações
  async getMovimentacoes(): Promise<Movimentacao[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          servidor:servidores(*),
          visitante:visitantes(*),
          departamento_destino:departamentos(*),
          setor_destino:setores(*),
          servidor_destino:servidores(*)
        `)
        .order('data_hora_entrada', { ascending: false });
      if (!error && data) return data as Movimentacao[];
    }

    const list = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const servidores = await this.getServidores();
    const visitantes = await this.getVisitantes();
    const deps = await this.getDepartamentos();
    const setores = await this.getSetores();

    return list.map((m) => ({
      ...m,
      servidor: m.servidor_id ? servidores.find((s) => s.id === m.servidor_id) : undefined,
      visitante: m.visitante_id ? visitantes.find((v) => v.id === m.visitante_id) : undefined,
      departamento_destino: deps.find((d) => d.id === m.departamento_destino_id),
      setor_destino: setores.find((st) => st.id === m.setor_destino_id),
      servidor_destino: m.servidor_destino_id
        ? servidores.find((s) => s.id === m.servidor_destino_id)
        : undefined,
    }));
  },

  // 7. Registro Atômico de Entrada
  async registrarEntrada(
    input: RegistroEntradaInput,
    operador?: UserProfile | null
  ): Promise<Movimentacao> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_registrar_entrada', {
        p_tipo_pessoa: input.tipo_pessoa,
        p_pessoa_id: input.pessoa_id,
        p_departamento_destino_id: input.departamento_destino_id,
        p_setor_destino_id: input.setor_destino_id,
        p_servidor_destino_id: input.servidor_destino_id || null,
        p_cracha_numero: input.cracha_numero || null,
        p_motivo: input.motivo,
        p_requer_autorizacao: Boolean(input.requer_autorizacao),
        p_recepcionista_id: operador?.id || null,
        p_observacoes: input.observacoes || null,
      });

      if (error) throw new Error(error.message);
      return data as Movimentacao;
    }

    // Regra atômica: verificar se a pessoa já está no prédio
    const movs = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const jaNoPredio = movs.some((m) => {
      if (m.status !== 'no_predio' && m.status !== 'pendente_autorizacao') return false;
      if (input.tipo_pessoa === 'servidor') return m.servidor_id === input.pessoa_id;
      return m.visitante_id === input.pessoa_id;
    });

    if (jaNoPredio) {
      throw new Error(
        'Atenção: Esta pessoa já possui uma entrada em andamento no prédio sem registro de saída.'
      );
    }

    const movId = `m-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const requerAut = Boolean(input.requer_autorizacao);

    const novaMov: Movimentacao = {
      id: movId,
      tipo_pessoa: input.tipo_pessoa,
      servidor_id: input.tipo_pessoa === 'servidor' ? input.pessoa_id : undefined,
      visitante_id: input.tipo_pessoa === 'visitante' ? input.pessoa_id : undefined,
      departamento_destino_id: input.departamento_destino_id,
      setor_destino_id: input.setor_destino_id,
      servidor_destino_id: input.servidor_destino_id,
      cracha_numero: input.cracha_numero,
      motivo: input.motivo,
      data_hora_entrada: new Date().toISOString(),
      data_hora_saida: null,
      status: requerAut ? 'pendente_autorizacao' : 'no_predio',
      autorizacao_status: requerAut ? 'pendente' : 'dispensada',
      observacoes: input.observacoes,
      recepcionista_entrada_id: operador?.id,
    };

    movs.unshift(novaMov);
    setStorage(STORAGE_KEYS.MOVIMENTACOES, movs);

    // Se requer autorização, cria o registro
    if (requerAut && input.servidor_destino_id) {
      const auts = getStorage<Autorizacao[]>(STORAGE_KEYS.AUTORIZACOES, INITIAL_AUTORIZACOES);
      auts.unshift({
        id: `aut-${Date.now()}`,
        movimentacao_id: movId,
        servidor_solicitado_id: input.servidor_destino_id,
        status: 'pendente',
        resposta_observacao: 'Solicitação aguardando retorno do setor',
        created_at: new Date().toISOString(),
      });
      setStorage(STORAGE_KEYS.AUTORIZACOES, auts);
    }

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'REGISTRO_ENTRADA',
      tabela: 'movimentacoes',
      registro_id: movId,
      detalhes: {
        tipo: input.tipo_pessoa,
        cracha: input.cracha_numero,
        motivo: input.motivo,
      },
    });

    return novaMov;
  },

  // 8. Registro Atômico de Saída
  async registrarSaida(
    movimentacaoId: string,
    operador?: UserProfile | null,
    observacoes?: string
  ): Promise<Movimentacao> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_registrar_saida', {
        p_movimentacao_id: movimentacaoId,
        p_recepcionista_id: operador?.id || null,
        p_observacoes: observacoes || null,
      });

      if (error) throw new Error(error.message);
      return data as Movimentacao;
    }

    const movs = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const mov = movs.find((m) => m.id === movimentacaoId);

    if (!mov) {
      throw new Error('Movimentação não encontrada.');
    }

    if (mov.status === 'finalizado') {
      throw new Error('Esta movimentação já teve saída registrada anteriormente.');
    }

    mov.status = 'finalizado';
    mov.data_hora_saida = new Date().toISOString();
    mov.recepcionista_saida_id = operador?.id;
    if (observacoes) mov.observacoes = `${mov.observacoes || ''} | Saída: ${observacoes}`;

    setStorage(STORAGE_KEYS.MOVIMENTACOES, movs);

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'REGISTRO_SAIDA',
      tabela: 'movimentacoes',
      registro_id: mov.id,
      detalhes: {
        data_hora_saida: mov.data_hora_saida,
        cracha: mov.cracha_numero,
      },
    });

    return mov;
  },

  // 9. Autorizações
  async getAutorizacoes(): Promise<Autorizacao[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('autorizacoes')
        .select(`
          *,
          servidor_solicitado:servidores(*),
          movimentacao:movimentacoes(*, visitante:visitantes(*), servidor:servidores(*))
        `)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Autorizacao[];
    }

    const auts = getStorage<Autorizacao[]>(STORAGE_KEYS.AUTORIZACOES, INITIAL_AUTORIZACOES);
    const movs = await this.getMovimentacoes();
    const servs = await this.getServidores();

    return auts.map((a) => ({
      ...a,
      movimentacao: movs.find((m) => m.id === a.movimentacao_id),
      servidor_solicitado: servs.find((s) => s.id === a.servidor_solicitado_id),
    }));
  },

  async responderAutorizacao(
    autorizacaoId: string,
    aprovado: boolean,
    motivoResposta: string,
    operador?: UserProfile | null
  ): Promise<void> {
    const statusFinal = aprovado ? 'autorizado' : 'recusado';

    const auts = getStorage<Autorizacao[]>(STORAGE_KEYS.AUTORIZACOES, INITIAL_AUTORIZACOES);
    const aut = auts.find((a) => a.id === autorizacaoId);

    if (aut) {
      aut.status = statusFinal;
      aut.resposta_observacao = motivoResposta;
      aut.respondido_em = new Date().toISOString();
      setStorage(STORAGE_KEYS.AUTORIZACOES, auts);

      // Sincronizar movimentação
      if (aut.movimentacao_id) {
        const movs = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
        const mov = movs.find((m) => m.id === aut.movimentacao_id);
        if (mov) {
          mov.autorizacao_status = statusFinal;
          mov.status = aprovado ? 'no_predio' : 'recusado';
          mov.autorizacao_observacao = motivoResposta;
          setStorage(STORAGE_KEYS.MOVIMENTACOES, movs);
        }
      }
    }

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'RESPOSTA_AUTORIZACAO',
      tabela: 'autorizacoes',
      registro_id: autorizacaoId,
      detalhes: { aprovado, motivo: motivoResposta },
    });
  },

  // 10. Agendamentos
  async getAgendamentos(): Promise<Agendamento[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          visitante:visitantes(*),
          departamento:departamentos(*),
          setor:setores(*),
          servidor_destino:servidores(*)
        `)
        .order('data_hora_prevista', { ascending: true });
      if (!error && data) return data as Agendamento[];
    }

    const ags = getStorage<Agendamento[]>(STORAGE_KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
    const vis = await this.getVisitantes();
    const deps = await this.getDepartamentos();
    const sets = await this.getSetores();
    const servs = await this.getServidores();

    return ags.map((a) => ({
      ...a,
      visitante: vis.find((v) => v.id === a.visitante_id),
      departamento: deps.find((d) => d.id === a.departamento_id),
      setor: sets.find((s) => s.id === a.setor_id),
      servidor_destino: servs.find((s) => s.id === a.servidor_destino_id),
    }));
  },

  async criarAgendamento(agendamento: Partial<Agendamento>): Promise<Agendamento> {
    const list = getStorage<Agendamento[]>(STORAGE_KEYS.AGENDAMENTOS, INITIAL_AGENDAMENTOS);
    const novo: Agendamento = {
      id: `ag-${Date.now()}`,
      tipo_pessoa: agendamento.tipo_pessoa || 'visitante',
      visitante_id: agendamento.visitante_id,
      servidor_visitante_id: agendamento.servidor_visitante_id,
      departamento_id: agendamento.departamento_id || '',
      setor_id: agendamento.setor_id || '',
      servidor_destino_id: agendamento.servidor_destino_id,
      data_hora_prevista: agendamento.data_hora_prevista || new Date().toISOString(),
      motivo: agendamento.motivo || 'Atendimento agendado',
      status: 'agendado',
      observacoes: agendamento.observacoes,
    };
    list.push(novo);
    setStorage(STORAGE_KEYS.AGENDAMENTOS, list);
    return novo;
  },

  // 11. Auditoria
  async getLogsAuditoria(): Promise<AuditoriaLog[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('auditoria_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) return data as AuditoriaLog[];
    }
    return getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA_LOGS);
  },

  async registrarLogAuditoria(log: Partial<AuditoriaLog>): Promise<void> {
    const logs = getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA_LOGS);
    const novoLog: AuditoriaLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      usuario_email: log.usuario_email || 'sistema',
      acao: log.acao || 'OPERACAO',
      tabela: log.tabela,
      registro_id: log.registro_id,
      detalhes: log.detalhes || {},
      ip_origem: log.ip_origem || '192.168.1.100 (Recepção)',
      created_at: new Date().toISOString(),
    };
    logs.unshift(novoLog);
    if (logs.length > 500) logs.pop();
    setStorage(STORAGE_KEYS.AUDITORIA, logs);
  },

  // 12. Estatísticas do Dashboard
  async getDashboardStats() {
    const movs = await this.getMovimentacoes();
    const auts = await this.getAutorizacoes();
    const ags = await this.getAgendamentos();

    const hoje = new Date().toISOString().slice(0, 10);
    const movsHoje = movs.filter((m) => m.data_hora_entrada.slice(0, 10) === hoje);

    const noPredio = movs.filter((m) => m.status === 'no_predio');
    const visitantesHoje = movsHoje.filter((m) => m.tipo_pessoa === 'visitante');
    const servidoresHoje = movsHoje.filter((m) => m.tipo_pessoa === 'servidor');
    const saidasHoje = movsHoje.filter((m) => m.status === 'finalizado');
    const autorizacoesPendentes = auts.filter((a) => a.status === 'pendente');

    // Distribuição por departamento
    const porDepMap: Record<string, number> = {};
    for (const m of movsHoje) {
      const sigla = m.departamento_destino?.sigla || 'Outros';
      porDepMap[sigla] = (porDepMap[sigla] || 0) + 1;
    }
    const fluxoPorDepartamento = Object.entries(porDepMap).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      totalNoPredio: noPredio.length,
      entradasHoje: movsHoje.length,
      visitantesHoje: visitantesHoje.length,
      servidoresHoje: servidoresHoje.length,
      saidasHoje: saidasHoje.length,
      autorizacoesPendentes: autorizacoesPendentes.length,
      agendamentosHoje: ags.length,
      fluxoPorDepartamento,
      ultimasMovimentacoes: movs.slice(0, 8),
    };
  },
};
