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
  Cracha,
  CrachaStatus,
  ServidorSetorVinculo,
  RamalUnidade,
  RamalContato,
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
  DEMO_USERS,
} from './mockData';
import { SERVIDORES_OFICIAIS } from './servidoresOficiais';
import { RAMAIS_UNIDADES_INICIAIS } from './ramaisUnidades';

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
  CRACHAS: 'smedu_crachas',
  SERVIDOR_SETOR_VINCULOS: 'sme_servidor_setor_vinculos',
  USUARIOS: 'sme_admin_users',
  RAMAIS_UNIDADES: 'sme_ramais_unidades',
};

type MovimentacaoAdminUpdate = Pick<
  Movimentacao,
  | 'departamento_destino_id'
  | 'setor_destino_id'
  | 'servidor_destino_id'
  | 'motivo'
  | 'data_hora_entrada'
  | 'data_hora_saida'
  | 'status'
  | 'observacoes'
>;

const MATRICULAS_FICTICIAS_LEGADAS = new Set([
  'SME-100201', 'SME-100452', 'SME-200781', 'SME-200994',
  'SME-300112', 'SME-400553', 'SME-500881',
]);

/** Captura o hostname/IP do terminal para registro de auditoria. */
function getTerminalInfo(): string {
  return window.location.hostname || 'terminal-recepcao';
}

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

/** Remove ramais vazios ou repetidos e apara os textos. */
function limparRamais(ramais: RamalContato[]): RamalContato[] {
  const vistos = new Set<string>();
  return ramais
    .map((r) => ({ numero: r.numero.trim(), descricao: r.descricao?.trim() || null }))
    .filter((r) => r.numero && !vistos.has(r.numero) && vistos.add(r.numero));
}

/** Garante a lista de ramais, inclusive em registros que só têm a coluna ramal. */
function normalizarRamalUnidade(unidade: Partial<RamalUnidade>): RamalUnidade {
  const ramais = Array.isArray(unidade.ramais) && unidade.ramais.length
    ? unidade.ramais
    : unidade.ramal ? [{ numero: unidade.ramal }] : [];
  return { ...unidade, ramais, ramal: ramais[0]?.numero ?? null, ativo: unidade.ativo ?? true } as RamalUnidade;
}

function requireLiveResult<T>(data: T | null, error: { message: string } | null, operation: string): T {
  if (error) throw new Error(`${operation}: ${error.message}`);
  if (data === null) throw new Error(`${operation}: o Supabase não retornou dados.`);
  return data;
}

export function resetTestData(): void {
  localStorage.setItem(STORAGE_KEYS.DEPARTAMENTOS, JSON.stringify(INITIAL_DEPARTAMENTOS));
  localStorage.setItem(STORAGE_KEYS.SETORES, JSON.stringify(INITIAL_SETORES));
  localStorage.setItem(STORAGE_KEYS.SERVIDORES, JSON.stringify(SERVIDORES_OFICIAIS));
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

export const isValidCpf = (value: string): boolean => {
  const cpf = sanitizeNumbers(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, current, index) => total + Number(current) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
};

// ─── Gestão de operadores (Supabase Auth via Edge Function) ───
const ADMIN_USERS_FUNCTION = 'admin-manage-user';

/** Chama a Edge Function de administração de usuários e devolve mensagens claras de erro. */
const invokeAdminUsuarios = async <T = unknown>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(ADMIN_USERS_FUNCTION, { body: { action, payload } });
  if (!error) return data as T;

  // Função inexistente: o navegador bloqueia a chamada (CORS) e o supabase-js só informa "Failed to send a request".
  if (error.name === 'FunctionsFetchError' || /failed to send a request/i.test(error.message)) {
    throw new Error(
      navigator.onLine
        ? `Não foi possível acessar a função "${ADMIN_USERS_FUNCTION}" no Supabase. Ela ainda não foi publicada — publique-a no painel do Supabase (Edge Functions) e tente novamente.`
        : 'Sem conexão com a internet. Verifique a rede e tente novamente.',
    );
  }

  const response = (error as { context?: Response }).context;
  if (response instanceof Response) {
    if (response.status === 404) {
      throw new Error(`A função "${ADMIN_USERS_FUNCTION}" ainda não foi publicada no Supabase. Publique-a para cadastrar usuários (veja o README).`);
    }
    try {
      const body = await response.clone().json();
      if (body?.error) throw new Error(body.error);
    } catch (parsed) {
      if (parsed instanceof Error && parsed.message) throw parsed;
    }
  }
  throw new Error(error.message || 'Não foi possível concluir a operação no Supabase.');
};

const salvarUsuarioLocal = (u: UserProfile) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    const users: UserProfile[] = raw ? JSON.parse(raw) : DEMO_USERS.map((x) => ({ ...x }));
    const existe = users.some((item) => item.id === u.id);
    const atualizados = existe ? users.map((item) => (item.id === u.id ? { ...item, ...u } : item)) : [...users, u];
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(atualizados));
  } catch (err) {
    console.error('Erro ao salvar usuário no localStorage:', err);
  }
};

export const dataService = {
  async validarCredencialQr(token: string): Promise<{
    valida: boolean;
    motivo?: string;
    visitante_id?: string;
    agendamento_id?: string;
    expira_em?: string;
  }> {
    const credential = token.trim();
    if (!credential) throw new Error('Apresente ou informe o código da credencial QR.');
    if (!isSupabaseConfigured) {
      return { valida: false, motivo: 'A validação de QR Code exige conexão com o Supabase configurada.' };
    }
    const { data, error } = await supabase.rpc('rpc_validar_credencial_qr', { p_token: credential });
    return requireLiveResult(data, error, 'Não foi possível validar a credencial QR') as {
      valida: boolean; motivo?: string; visitante_id?: string; agendamento_id?: string; expira_em?: string;
    };
  },

  // 1. Departamentos e Setores
  async getDepartamentos(): Promise<Departamento[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('departamentos').select('*').order('nome');
      return requireLiveResult(data, error, 'Não foi possível carregar departamentos') as Departamento[];
    }
    return getStorage<Departamento[]>(STORAGE_KEYS.DEPARTAMENTOS, INITIAL_DEPARTAMENTOS);
  },

  async getSetores(departamentoId?: string): Promise<Setor[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('setores').select('*, departamento:departamentos(*)').order('nome');
      if (departamentoId) query = query.eq('departamento_id', departamentoId);
      const { data, error } = await query;
      return requireLiveResult(data, error, 'Não foi possível carregar setores') as Setor[];
    }
    const all = getStorage<Setor[]>(STORAGE_KEYS.SETORES, INITIAL_SETORES);
    const deps = await this.getDepartamentos();
    const enriched = all.map((s) => ({
      ...s,
      departamento: deps.find((d) => d.id === s.departamento_id),
    }));
    return departamentoId ? enriched.filter((s) => s.departamento_id === departamentoId) : enriched;
  },

  async getRamaisUnidades(): Promise<RamalUnidade[]> {
    if (isSupabaseConfigured) {
      // select('*') tolera bancos ainda sem a coluna ramais (migração 20261020140000).
      const { data, error } = await supabase.from('ramais_unidades').select('*').eq('ativo', true).order('nome');
      const lista = requireLiveResult(data, error, 'Não foi possível carregar os ramais') as Partial<RamalUnidade>[];
      return lista.map(normalizarRamalUnidade);
    }
    return getStorage<Partial<RamalUnidade>[]>(STORAGE_KEYS.RAMAIS_UNIDADES, RAMAIS_UNIDADES_INICIAIS)
      .map(normalizarRamalUnidade)
      .filter((u) => u.ativo);
  },

  async salvarRamalUnidade(unidade: Partial<RamalUnidade>): Promise<RamalUnidade> {
    const dados: Partial<RamalUnidade> = { ...unidade };
    if (unidade.ramais) {
      dados.ramais = limparRamais(unidade.ramais);
      dados.ramal = dados.ramais[0]?.numero ?? null;
    } else if ('ramal' in unidade) {
      dados.ramal = unidade.ramal?.trim() || null;
      dados.ramais = dados.ramal ? [{ numero: dados.ramal }] : [];
    }

    if (isSupabaseConfigured) {
      const { id, ...campos } = dados;
      const gravar = (valores: Partial<RamalUnidade>) => {
        const query = id
          ? supabase.from('ramais_unidades').update({ ...valores, updated_at: new Date().toISOString() }).eq('id', id)
          : supabase.from('ramais_unidades').insert(valores);
        return query.select('*').single();
      };
      let { data, error } = await gravar(campos);
      const semColuna = !!error && /ramais/.test(error.message) && /column|coluna|schema cache/i.test(error.message);
      // Banco sem a migração 20261020140000: um único ramal ainda cabe na coluna ramal.
      if (semColuna && (dados.ramais?.length ?? 0) <= 1) {
        const { ramais: _ramais, ...semRamais } = campos;
        ({ data, error } = await gravar(semRamais));
      }
      if (error) {
        throw new Error(semColuna
          ? 'O banco ainda não aceita vários ramais. Execute a migração 20261020140000_ramais_multiplos.sql no Supabase.'
          : `Não foi possível salvar o ramal: ${error.message}`);
      }
      return normalizarRamalUnidade(data as Partial<RamalUnidade>);
    }

    const lista = getStorage<Partial<RamalUnidade>[]>(STORAGE_KEYS.RAMAIS_UNIDADES, RAMAIS_UNIDADES_INICIAIS).map(normalizarRamalUnidade);
    if (dados.id) {
      const indice = lista.findIndex((item) => item.id === dados.id);
      if (indice < 0) throw new Error('Unidade não encontrada.');
      lista[indice] = { ...lista[indice], ...dados } as RamalUnidade;
      setStorage(STORAGE_KEYS.RAMAIS_UNIDADES, lista);
      return lista[indice];
    }
    const nova = normalizarRamalUnidade({
      ...dados,
      id: `ru-${Date.now()}`,
      tipo: dados.tipo || 'unidade_escolar',
      categoria: dados.categoria || 'Escolas Municipais',
      nome: dados.nome || '',
      lotacao: dados.lotacao ?? null,
      ativo: true,
    });
    setStorage(STORAGE_KEYS.RAMAIS_UNIDADES, [...lista, nova]);
    return nova;
  },

  async getServidorSetorVinculos(): Promise<ServidorSetorVinculo[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('servidor_setor_vinculos').select('servidor_id, setor_id, requer_autorizacao');
      if (!error) return (data || []) as ServidorSetorVinculo[];
      // Bancos sem a migração 20261017120000 ainda não possuem a coluna requer_autorizacao.
      const legado = await supabase.from('servidor_setor_vinculos').select('servidor_id, setor_id');
      return requireLiveResult(legado.data, legado.error, 'Não foi possível carregar os vínculos de servidores') as ServidorSetorVinculo[];
    }

    const salvos = getStorage<ServidorSetorVinculo[]>(STORAGE_KEYS.SERVIDOR_SETOR_VINCULOS, []);
    if (salvos.length) return salvos;
    const servidores = await this.getServidores();
    return servidores
      .filter((servidor) => servidor.setor_id)
      .map((servidor) => ({ servidor_id: servidor.id, setor_id: servidor.setor_id!, requer_autorizacao: false }));
  },

  async salvarServidorSetorVinculo(vinculo: ServidorSetorVinculo): Promise<ServidorSetorVinculo> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('servidor_setor_vinculos')
        .upsert(vinculo, { onConflict: 'servidor_id,setor_id' })
        .select('servidor_id, setor_id, requer_autorizacao')
        .single();
      return requireLiveResult(data, error, 'Não foi possível salvar o vínculo da pessoa ao setor') as ServidorSetorVinculo;
    }

    const vinculos = await this.getServidorSetorVinculos();
    const indice = vinculos.findIndex((item) => item.servidor_id === vinculo.servidor_id && item.setor_id === vinculo.setor_id);
    if (indice >= 0) vinculos[indice] = vinculo;
    else vinculos.push(vinculo);
    setStorage(STORAGE_KEYS.SERVIDOR_SETOR_VINCULOS, vinculos);
    return vinculo;
  },

  async excluirServidorSetorVinculo(servidorId: string, setorId: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('servidor_setor_vinculos')
        .delete()
        .eq('servidor_id', servidorId)
        .eq('setor_id', setorId)
        .select('servidor_id');
      if (error) throw error;
      if (!data?.length) throw new Error('A remoção foi bloqueada pelas permissões do Supabase.');
      return;
    }

    const vinculos = await this.getServidorSetorVinculos();
    setStorage(STORAGE_KEYS.SERVIDOR_SETOR_VINCULOS, vinculos.filter((item) => item.servidor_id !== servidorId || item.setor_id !== setorId));
  },

  async salvarDepartamento(departamento: Partial<Departamento>): Promise<Departamento> {
    if (isSupabaseConfigured) {
      const query = departamento.id
        ? supabase.from('departamentos').update(departamento).eq('id', departamento.id)
        : supabase.from('departamentos').insert(departamento);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data as Departamento;
    }

    const lista = getStorage<Departamento[]>(STORAGE_KEYS.DEPARTAMENTOS, INITIAL_DEPARTAMENTOS);
    if (departamento.id) {
      const indice = lista.findIndex((item) => item.id === departamento.id);
      if (indice < 0) throw new Error('Departamento não encontrado.');
      lista[indice] = { ...lista[indice], ...departamento } as Departamento;
      setStorage(STORAGE_KEYS.DEPARTAMENTOS, lista);
      return lista[indice];
    }

    const novo: Departamento = {
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nome: departamento.nome || '',
      sigla: departamento.sigla || '',
      descricao: departamento.descricao,
      responsavel: departamento.responsavel,
      ramal: departamento.ramal,
      localizacao: departamento.localizacao,
      ativo: departamento.ativo ?? true,
    };
    lista.push(novo);
    setStorage(STORAGE_KEYS.DEPARTAMENTOS, lista);
    return novo;
  },

  async excluirDepartamento(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('departamentos').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const setores = getStorage<Setor[]>(STORAGE_KEYS.SETORES, INITIAL_SETORES);
    if (setores.some((setor) => setor.departamento_id === id)) {
      throw new Error('Exclua ou realoque os setores vinculados antes de remover o departamento.');
    }
    const lista = getStorage<Departamento[]>(STORAGE_KEYS.DEPARTAMENTOS, INITIAL_DEPARTAMENTOS);
    setStorage(STORAGE_KEYS.DEPARTAMENTOS, lista.filter((item) => item.id !== id));
  },

  async salvarSetor(setor: Partial<Setor>): Promise<Setor> {
    if (isSupabaseConfigured) {
      const query = setor.id
        ? supabase.from('setores').update(setor).eq('id', setor.id)
        : supabase.from('setores').insert(setor);
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data as Setor;
    }

    const lista = getStorage<Setor[]>(STORAGE_KEYS.SETORES, INITIAL_SETORES);
    if (setor.id) {
      const indice = lista.findIndex((item) => item.id === setor.id);
      if (indice < 0) throw new Error('Setor não encontrado.');
      lista[indice] = { ...lista[indice], ...setor } as Setor;
      setStorage(STORAGE_KEYS.SETORES, lista);
      return lista[indice];
    }

    const novo: Setor = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      departamento_id: setor.departamento_id || '',
      nome: setor.nome || '',
      sigla: setor.sigla || '',
      responsavel: setor.responsavel,
      ramal: setor.ramal,
      sala: setor.sala,
      requer_autorizacao: setor.requer_autorizacao ?? false,
      ativo: setor.ativo ?? true,
    };
    lista.push(novo);
    setStorage(STORAGE_KEYS.SETORES, lista);
    return novo;
  },

  async excluirSetor(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('setores').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const lista = getStorage<Setor[]>(STORAGE_KEYS.SETORES, INITIAL_SETORES);
    setStorage(STORAGE_KEYS.SETORES, lista.filter((item) => item.id !== id));
  },

  // 1.1 Crachás físicos
  async getCrachas(): Promise<Cracha[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('crachas').select('*').order('numero');
      return requireLiveResult(data, error, 'Não foi possível carregar crachás') as Cracha[];
    }
    return getStorage<Cracha[]>(STORAGE_KEYS.CRACHAS, []);
  },

  async salvarCracha(cracha: Partial<Cracha>): Promise<Cracha> {
    const payload = {
      numero: (cracha.numero || '').trim().toUpperCase(),
      situacao: cracha.situacao || 'disponivel',
      descricao: cracha.descricao || null,
      ativo: cracha.ativo ?? true,
    };
    if (!payload.numero) throw new Error('Informe o identificador do crachá.');

    if (isSupabaseConfigured) {
      const query = cracha.id
        ? supabase.from('crachas').update(payload).eq('id', cracha.id)
        : supabase.from('crachas').insert(payload);
      const { data, error } = await query.select().single();
      if (error) throw new Error(`Não foi possível salvar crachá: ${error.message}`);
      return data as Cracha;
    }

    const lista = getStorage<Cracha[]>(STORAGE_KEYS.CRACHAS, []);
    const duplicado = lista.find((item) => item.numero === payload.numero && item.id !== cracha.id);
    if (duplicado) throw new Error('Já existe um crachá com este identificador.');
    if (cracha.id) {
      const indice = lista.findIndex((item) => item.id === cracha.id);
      if (indice < 0) throw new Error('Crachá não encontrado.');
      lista[indice] = { ...lista[indice], ...payload, updated_at: new Date().toISOString() } as Cracha;
      setStorage(STORAGE_KEYS.CRACHAS, lista);
      return lista[indice];
    }
    const novo: Cracha = { id: `cr-${crypto.randomUUID()}`, ...payload, created_at: new Date().toISOString() } as Cracha;
    lista.push(novo);
    setStorage(STORAGE_KEYS.CRACHAS, lista);
    return novo;
  },

  async alterarSituacaoCracha(id: string, situacao: CrachaStatus): Promise<Cracha> {
    const lista = await this.getCrachas();
    const cracha = lista.find((item) => item.id === id);
    if (!cracha) throw new Error('Crachá não encontrado.');
    return this.salvarCracha({ ...cracha, situacao, ativo: situacao !== 'inativo' });
  },

  // 2. Servidores
  async getServidores(): Promise<Servidor[]> {
    if (isSupabaseConfigured) {
      // O PostgREST limita cada resposta a 1000 linhas; o quadro tem mais servidores que isso.
      const tamanhoPagina = 1000;
      const todos: Servidor[] = [];
      for (let inicio = 0; ; inicio += tamanhoPagina) {
        const { data, error } = await supabase
          .from('servidores')
          // servidor_setor_vinculos cria uma segunda relação servidores↔setores; a FK precisa ser explícita.
          .select('*, departamento:departamentos(*), setor:setores!servidores_setor_id_fkey(*)')
          .order('nome')
          .order('id')
          .range(inicio, inicio + tamanhoPagina - 1);
        const pagina = requireLiveResult(data, error, 'Não foi possível carregar servidores') as Servidor[];
        todos.push(...pagina);
        if (pagina.length < tamanhoPagina) return todos;
      }
    }
    const deps = await this.getDepartamentos();
    const sets = await this.getSetores();
    const list = getStorage<Servidor[]>(STORAGE_KEYS.SERVIDORES, SERVIDORES_OFICIAIS);
    // Substitui automaticamente os sete registros fictícios preservados em instalações antigas.
    if (list.some((servidor) => MATRICULAS_FICTICIAS_LEGADAS.has(servidor.matricula))) {
      setStorage(STORAGE_KEYS.SERVIDORES, SERVIDORES_OFICIAIS);
      return SERVIDORES_OFICIAIS.map((s) => ({
        ...s,
        departamento: deps.find((d) => d.id === s.departamento_id),
        setor: sets.find((st) => st.id === s.setor_id),
      }));
    }
    return list.map((s) => ({
      ...s,
      departamento: deps.find((d) => d.id === s.departamento_id),
      setor: sets.find((st) => st.id === s.setor_id),
    }));
  },

  /**
   * Completa telefone/e-mail do servidor no balcão. Com Supabase passa pela Edge Function
   * atualizar-contato-servidor (a RLS só deixa admin/gestor editar servidores).
   */
  async atualizarContatoServidor(servidorId: string, contato: { telefone?: string; email?: string }): Promise<Servidor> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.functions.invoke('atualizar-contato-servidor', {
        body: { servidor_id: servidorId, telefone: contato.telefone || '', email: contato.email || '' },
      });
      if (!error) return (data as { servidor: Servidor }).servidor;
      const response = (error as { context?: Response }).context;
      if (response instanceof Response) {
        if (response.status === 404) {
          let mensagem = '';
          try { mensagem = (await response.clone().json())?.error || ''; } catch {}
          throw new Error(mensagem || 'A função "atualizar-contato-servidor" ainda não foi publicada no Supabase.');
        }
        try {
          const body = await response.clone().json();
          if (body?.error) throw new Error(body.error);
        } catch (parsed) {
          if (parsed instanceof Error && parsed.message) throw parsed;
        }
      }
      throw new Error('Não foi possível salvar o contato agora. Verifique se a função "atualizar-contato-servidor" está publicada.');
    }
    return this.salvarServidor({ id: servidorId, ...(contato.telefone ? { telefone: contato.telefone } : {}), ...(contato.email ? { email: contato.email } : {}) });
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

    const list = getStorage<Servidor[]>(STORAGE_KEYS.SERVIDORES, SERVIDORES_OFICIAIS);
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
      lotacao: servidor.lotacao,
      departamento_id: servidor.departamento_id || '',
      setor_id: servidor.setor_id,
      ramal: servidor.ramal,
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
    const resultado = await this.consultarMatriculaExata(limpa, operador);

    // Aceita matrícula digitada com ponto de milhar (38.000 → 38000) quando não há cadastro com o ponto.
    const semPontos = limpa.replace(/\./g, '');
    if (resultado.encontrado || !semPontos || semPontos === limpa) return resultado;
    return this.consultarMatriculaExata(semPontos, operador);
  },

  async consultarMatriculaExata(
    limpa: string,
    operador?: UserProfile | null
  ): Promise<ConsultaServidorResultado> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_consultar_servidor', {
        p_matricula: limpa,
      });
      return requireLiveResult(data, error, 'Não foi possível consultar a matrícula') as ConsultaServidorResultado;
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
      ip_origem: getTerminalInfo(),
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
      return requireLiveResult(data, error, 'Não foi possível carregar visitantes') as Visitante[];
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
      ip_origem: getTerminalInfo(),
    });


    return novoVisitante;
  },

  // 5. Consulta Atômica de Visitante por CPF
  /** Grava a foto do rosto (já em JPEG) no bucket privado e registra o consentimento biométrico. */
  async salvarFotoVisitante(visitanteId: string, foto: Blob, operador?: UserProfile | null): Promise<Visitante> {
    const agora = new Date().toISOString();
    if (isSupabaseConfigured) {
      const caminho = `${visitanteId}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from('visitantes-fotos')
        .upload(caminho, foto, { contentType: 'image/jpeg', upsert: true, cacheControl: '0' });
      if (erroUpload) {
        throw new Error(/bucket/i.test(erroUpload.message)
          ? 'O armazenamento de fotos ainda não existe. Execute a migração 20261020150000_biometria_visitantes.sql no Supabase.'
          : `Não foi possível enviar a foto: ${erroUpload.message}`);
      }
      const { data, error } = await supabase
        .from('visitantes')
        .update({ foto_path: caminho, biometria_consentida_em: agora })
        .eq('id', visitanteId)
        .select()
        .single();
      if (error) throw new Error(`Foto enviada, mas não foi possível vincular ao cadastro: ${error.message}`);
      await this.registrarLogAuditoria({
        usuario_id: operador?.id, usuario_email: operador?.email, acao: 'CADASTRO_FOTO_VISITANTE',
        tabela: 'visitantes', registro_id: visitanteId, detalhes: { consentimento: agora }, ip_origem: getTerminalInfo(),
      });
      return data as Visitante;
    }

    const fotoUrl = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(new Error('Não foi possível ler a foto.'));
      leitor.readAsDataURL(foto);
    });
    const visitantes = getStorage<Visitante[]>(STORAGE_KEYS.VISITANTES, INITIAL_VISITANTES);
    const indice = visitantes.findIndex((v) => v.id === visitanteId);
    if (indice < 0) throw new Error('Visitante não encontrado.');
    visitantes[indice] = { ...visitantes[indice], foto_url: fotoUrl, biometria_consentida_em: agora };
    setStorage(STORAGE_KEYS.VISITANTES, visitantes);
    return visitantes[indice];
  },

  /** URL temporária (assinada) da foto do visitante; null quando não há foto. */
  async getFotoVisitanteUrl(visitante: Pick<Visitante, 'foto_path' | 'foto_url'>): Promise<string | null> {
    if (isSupabaseConfigured && visitante.foto_path) {
      const { data, error } = await supabase.storage.from('visitantes-fotos').createSignedUrl(visitante.foto_path, 60 * 60);
      return error ? null : data.signedUrl;
    }
    return visitante.foto_url || null;
  },

  /** Marca que a digital foi cadastrada no agente biométrico (o template não sai do agente). */
  async registrarDigitalVisitante(visitanteId: string, operador?: UserProfile | null): Promise<void> {
    const agora = new Date().toISOString();
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('visitantes')
        .update({ digital_cadastrada_em: agora, biometria_consentida_em: agora })
        .eq('id', visitanteId);
      if (error) throw new Error(`Digital cadastrada no leitor, mas não foi possível registrar no cadastro: ${error.message}`);
      await this.registrarLogAuditoria({
        usuario_id: operador?.id, usuario_email: operador?.email, acao: 'CADASTRO_DIGITAL_VISITANTE',
        tabela: 'visitantes', registro_id: visitanteId, detalhes: { consentimento: agora }, ip_origem: getTerminalInfo(),
      });
      return;
    }
    const visitantes = getStorage<Visitante[]>(STORAGE_KEYS.VISITANTES, INITIAL_VISITANTES);
    const indice = visitantes.findIndex((v) => v.id === visitanteId);
    if (indice >= 0) {
      visitantes[indice] = { ...visitantes[indice], digital_cadastrada_em: agora, biometria_consentida_em: agora };
      setStorage(STORAGE_KEYS.VISITANTES, visitantes);
    }
  },

  async consultarVisitantePorCpf(
    cpf: string,
    operador?: UserProfile | null
  ): Promise<ConsultaVisitanteResultado> {
    const rawCpf = sanitizeNumbers(cpf);
    if (!isValidCpf(rawCpf)) {
      throw new Error('Informe um CPF válido para realizar a consulta.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_consultar_visitante', {
        p_cpf: rawCpf,
      });
      return requireLiveResult(data, error, 'Não foi possível consultar o CPF') as ConsultaVisitanteResultado;
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
        departamento: m.departamento_destino?.sigla || 'SMEDU',
        setor: m.setor_destino?.sigla || 'Geral',
      }));

    await this.registrarLogAuditoria({
      usuario_email: operador?.email || 'operador@sme.gov.br',
      acao: 'CONSULTA_CPF',
      tabela: 'visitantes',
      registro_id: visitante.id,
      detalhes: { cpf: rawCpf, nome: visitante.nome },
      ip_origem: getTerminalInfo(),
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
          servidor:servidores!movimentacoes_servidor_id_fkey(*),
          visitante:visitantes(*),
          departamento_destino:departamentos(*),
          setor_destino:setores(*),
          servidor_destino:servidores!movimentacoes_servidor_destino_id_fkey(*),
          destinos:movimentacao_destinos(*)
        `)
        .order('data_hora_entrada', { ascending: false });
      return requireLiveResult(data, error, 'Não foi possível carregar movimentações') as Movimentacao[];
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
      destinos: m.destinos?.map((dest) => ({
        ...dest,
        departamento_destino: deps.find((d) => d.id === dest.departamento_destino_id),
        setor_destino: setores.find((st) => st.id === dest.setor_destino_id),
        servidor_destino: dest.servidor_destino_id
          ? servidores.find((s) => s.id === dest.servidor_destino_id)
          : undefined,
      })),
    }));
  },

  async atualizarMovimentacaoAdministrativa(
    movimentacaoId: string,
    atualizacao: MovimentacaoAdminUpdate,
    operador?: UserProfile | null
  ): Promise<Movimentacao> {
    if (operador?.role !== 'admin') {
      throw new Error('Apenas administradores podem editar movimentações.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('movimentacoes')
        .update(atualizacao)
        .eq('id', movimentacaoId)
        .select()
        .single();
      return requireLiveResult(data, error, 'Não foi possível atualizar a movimentação') as Movimentacao;
    }

    const movimentacoes = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const indice = movimentacoes.findIndex((item) => item.id === movimentacaoId);
    if (indice < 0) throw new Error('Movimentação não encontrada.');

    movimentacoes[indice] = { ...movimentacoes[indice], ...atualizacao };
    setStorage(STORAGE_KEYS.MOVIMENTACOES, movimentacoes);
    await this.registrarLogAuditoria({
      usuario_email: operador.email,
      acao: 'EDICAO_ADMINISTRATIVA_MOVIMENTACAO',
      tabela: 'movimentacoes',
      registro_id: movimentacaoId,
      detalhes: atualizacao,
      ip_origem: getTerminalInfo(),
    });
    return movimentacoes[indice];
  },

  async excluirMovimentacaoAdministrativa(
    movimentacaoId: string,
    operador?: UserProfile | null
  ): Promise<void> {
    if (operador?.role !== 'admin') {
      throw new Error('Apenas administradores podem excluir movimentações.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('movimentacoes')
        .delete()
        .eq('id', movimentacaoId)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data?.length) {
        throw new Error('A exclusão foi bloqueada pelas permissões do Supabase. Aplique a migration administrativa no banco remoto.');
      }
      return;
    }

    const movimentacoes = getStorage<Movimentacao[]>(STORAGE_KEYS.MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const movimentacao = movimentacoes.find((item) => item.id === movimentacaoId);
    if (!movimentacao) throw new Error('Movimentação não encontrada.');

    setStorage(STORAGE_KEYS.MOVIMENTACOES, movimentacoes.filter((item) => item.id !== movimentacaoId));
    await this.registrarLogAuditoria({
      usuario_email: operador.email,
      acao: 'EXCLUSAO_ADMINISTRATIVA_MOVIMENTACAO',
      tabela: 'movimentacoes',
      registro_id: movimentacaoId,
      detalhes: { pessoa: movimentacao.servidor_id || movimentacao.visitante_id },
      ip_origem: getTerminalInfo(),
    });
  },

  // 7. Registro Atômico de Entrada
  async registrarEntrada(
    input: RegistroEntradaInput,
    operador?: UserProfile | null
  ): Promise<Movimentacao> {
    if (isSupabaseConfigured) {
      const destinos = input.destinos?.length ? input.destinos : [{
        departamento_destino_id: input.departamento_destino_id,
        setor_destino_id: input.setor_destino_id,
        servidor_destino_id: input.servidor_destino_id,
      }];
      const { data, error } = await supabase.rpc('rpc_registrar_entrada_multidestino_com_cracha', {
        p_tipo_pessoa: input.tipo_pessoa,
        p_pessoa_id: input.pessoa_id,
        p_departamento_destino_id: input.departamento_destino_id,
        p_setor_destino_id: input.setor_destino_id,
        p_servidor_destino_id: input.servidor_destino_id || null,
        p_cracha_numero: input.cracha_numero || null,
        p_motivo: input.motivo,
        p_requer_autorizacao: Boolean(input.requer_autorizacao),
        p_observacoes: input.observacoes || null,
        p_destinos: destinos,
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

    const crachas = getStorage<Cracha[]>(STORAGE_KEYS.CRACHAS, []);
    const cracha = input.cracha_numero ? crachas.find((item) => item.numero === input.cracha_numero) : undefined;
    if (input.cracha_numero && !cracha) {
      throw new Error(`O crachá ${input.cracha_numero} não está cadastrado no inventário.`);
    }
    if (cracha && (!cracha.ativo || cracha.situacao !== 'disponivel')) {
      throw new Error(`O crachá ${cracha.numero} está indisponível para atribuição (${cracha.situacao.replace('_', ' ')}).`);
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
      destinos: input.destinos?.length ? input.destinos : [{
        departamento_destino_id: input.departamento_destino_id,
        setor_destino_id: input.setor_destino_id,
        servidor_destino_id: input.servidor_destino_id,
      }],
    };

    movs.unshift(novaMov);
    if (cracha) cracha.situacao = 'em_uso';
    setStorage(STORAGE_KEYS.MOVIMENTACOES, movs);
    if (cracha) setStorage(STORAGE_KEYS.CRACHAS, crachas);

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
      ip_origem: getTerminalInfo(),
    });


    return novaMov;
  },

  // 8. Registro Atômico de Saída
  async registrarSaida(
    movimentacaoId: string,
    operador?: UserProfile | null,
    observacoes?: string,
    crachaDevolvido = true
  ): Promise<Movimentacao> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_registrar_saida_com_cracha', {
        p_movimentacao_id: movimentacaoId,
        p_cracha_devolvido: crachaDevolvido,
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

    if (mov.cracha_numero && crachaDevolvido) {
      const crachas = getStorage<Cracha[]>(STORAGE_KEYS.CRACHAS, []);
      const cracha = crachas.find((item) => item.numero === mov.cracha_numero);
      if (cracha) {
        cracha.situacao = 'disponivel';
        setStorage(STORAGE_KEYS.CRACHAS, crachas);
      }
    }
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
      ip_origem: getTerminalInfo(),
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
          movimentacao:movimentacoes(*, visitante:visitantes(*), servidor:servidores!movimentacoes_servidor_id_fkey(*))
        `)
        .order('created_at', { ascending: false });
      return requireLiveResult(data, error, 'Não foi possível carregar autorizações') as Autorizacao[];
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
      ip_origem: getTerminalInfo(),
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
          servidor_destino:servidores!agendamentos_servidor_destino_id_fkey(*)
        `)
        .order('data_hora_prevista', { ascending: true });
      return requireLiveResult(data, error, 'Não foi possível carregar agendamentos') as Agendamento[];
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
  /** Trilha de auditoria do período (mais recentes primeiro), limitada a `limite` eventos. */
  async getLogsAuditoria(periodo: { desde?: string; ate?: string; limite?: number } = {}): Promise<AuditoriaLog[]> {
    const limite = periodo.limite ?? 500;
    if (isSupabaseConfigured) {
      let query = supabase
        .from('auditoria_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);
      if (periodo.desde) query = query.gte('created_at', periodo.desde);
      if (periodo.ate) query = query.lte('created_at', periodo.ate);
      const { data, error } = await query;
      return requireLiveResult(data, error, 'Não foi possível carregar logs de auditoria') as AuditoriaLog[];
    }
    return getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA_LOGS)
      .filter((log) => (!periodo.desde || log.created_at >= periodo.desde) && (!periodo.ate || log.created_at <= periodo.ate))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limite);
  },

  async registrarLogAuditoria(log: Partial<AuditoriaLog>): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('auditoria_logs').insert({
        usuario_id: log.usuario_id || null,
        usuario_email: log.usuario_email || null,
        acao: log.acao || 'OPERACAO',
        tabela: log.tabela || null,
        registro_id: log.registro_id || null,
        detalhes: log.detalhes || {},
        ip_origem: log.ip_origem || null,
      });
      if (error) console.warn(`Auditoria: ${error.message}`);
      return;
    }

    const logs = getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA_LOGS);
    const novoLog: AuditoriaLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      usuario_email: log.usuario_email || 'sistema',
      acao: log.acao || 'OPERACAO',
      tabela: log.tabela,
      registro_id: log.registro_id,
      detalhes: log.detalhes || {},
      ip_origem: log.ip_origem,
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

  // 13. Gestão e Sincronização de Operadores / Usuários do Sistema
  async getUsuariosSistema(): Promise<UserProfile[]> {
    if (isSupabaseConfigured) {
      // Com Supabase, a lista oficial é sempre a do banco (nunca a cópia local do navegador).
      const { data, error } = await supabase.from('profiles').select('*').order('nome_completo');
      const perfis = requireLiveResult(data, error, 'Não foi possível carregar os usuários') as UserProfile[];
      // As matrículas de login ficam no Auth; sem a função publicada, a lista sai sem elas.
      try {
        const { matriculas } = await invokeAdminUsuarios<{ matriculas: Record<string, string> }>('list_matriculas', {});
        return perfis.map((perfil) => ({ ...perfil, matricula: matriculas?.[perfil.id] ?? null }));
      } catch {
        return perfis;
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      if (raw) return JSON.parse(raw) as UserProfile[];
    } catch {}
    return DEMO_USERS.map((u) => ({ ...u }));
  },

  /**
   * Cria o operador no Supabase Auth + profiles pela Edge Function admin-manage-user
   * (a service_role fica só no servidor). Sem Supabase, grava no modo demonstração.
   */
  async criarUsuarioSistema(u: Omit<UserProfile, 'id'>, senha: string): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { profile } = await invokeAdminUsuarios<{ profile: UserProfile }>('create_operator', {
        email: u.email, password: senha, nome_completo: u.nome_completo, cargo: u.cargo, role: u.role, ativo: u.ativo,
        matricula: u.matricula || '',
      });
      return profile;
    }
    const novo: UserProfile = { ...u, id: `u-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, created_at: new Date().toISOString() };
    salvarUsuarioLocal(novo);
    return novo;
  },

  /** Atualiza dados, papel, situação e (opcionalmente) senha/e-mail no Auth e no perfil. */
  async salvarUsuarioSistema(u: UserProfile, novaSenha?: string): Promise<UserProfile> {
    if (isSupabaseConfigured) {
      const { profile } = await invokeAdminUsuarios<{ profile: UserProfile }>('update_operator', {
        id: u.id, email: u.email, nome_completo: u.nome_completo, cargo: u.cargo, role: u.role, ativo: u.ativo,
        ...(u.matricula !== undefined ? { matricula: u.matricula || '' } : {}),
        ...(novaSenha ? { password: novaSenha } : {}),
      });
      return profile;
    }
    salvarUsuarioLocal(u);
    return u;
  },

  /** Remove o operador do Auth (o perfil é apagado em cascata). */
  async excluirUsuarioSistema(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      await invokeAdminUsuarios('delete_operator', { id });
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      if (raw) {
        const users = JSON.parse(raw) as UserProfile[];
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(users.filter((item) => item.id !== id)));
      }
    } catch {}
  },
};
