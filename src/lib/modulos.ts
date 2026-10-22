import { UserProfile } from '@/types';

/** Módulos do sistema: Recepção (portaria da SMEDU) e CCO (Central Controle Operacional). */
export type Modulo = 'recepcao' | 'cco';

/** Como o usuário enxerga o CCO: a unidade vê só as próprias ocorrências; equipe e admin, as das unidades autorizadas. */
export type PerfilCco = 'unidade' | 'equipe' | 'admin';

type Usuario = (Pick<UserProfile, 'role' | 'acesso_cco'> & { id?: string }) | null | undefined;

export const acessaRecepcao = (user: Usuario) =>
  Boolean(user && user.role !== 'unidade_escolar' && user.role !== 'cco');

export const perfilCco = (user: Usuario): PerfilCco | null => {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'unidade_escolar') return 'unidade';
  if (user.role === 'cco' || user.acesso_cco) return 'equipe';
  return null;
};

export const acessaCco = (user: Usuario) => perfilCco(user) !== null;

/** Quem acessa os dois módulos vê o seletor Recepção ↔ CCO. */
export const acessaDoisModulos = (user: Usuario) => acessaRecepcao(user) && acessaCco(user);

export const moduloDaRota = (pathname: string): Modulo => (pathname === '/cco' || pathname.startsWith('/cco/') ? 'cco' : 'recepcao');

// Último módulo usado (por usuário, neste aparelho): quem acessa os dois volta para onde parou.
const chaveModulo = (id: string) => `smedu-ultimo-modulo:${id}`;

export const lembrarModulo = (user: Usuario, modulo: Modulo) => {
  if (!user?.id) return;
  try { localStorage.setItem(chaveModulo(user.id), modulo); } catch {}
};

export const ultimoModulo = (user: Usuario): Modulo | null => {
  if (!user?.id) return null;
  try {
    const salvo = localStorage.getItem(chaveModulo(user.id));
    return salvo === 'recepcao' || salvo === 'cco' ? salvo : null;
  } catch {
    return null;
  }
};

export const ROTA_DO_MODULO: Record<Modulo, string> = { recepcao: '/recepcao', cco: '/cco' };

/**
 * Para onde cada pessoa vai depois do login (ou ao abrir "/"):
 * só Recepção → /recepcao; só CCO (escola ou equipe) → /cco;
 * os dois → último módulo usado ou, na primeira vez, a tela de escolha.
 */
export const rotaInicial = (user: Usuario) => {
  if (acessaDoisModulos(user)) {
    const ultimo = ultimoModulo(user);
    return ultimo ? ROTA_DO_MODULO[ultimo] : '/escolher-modulo';
  }
  return acessaRecepcao(user) ? '/recepcao' : acessaCco(user) ? '/cco' : '/login';
};

export const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  recepcionista: 'Recepcionista',
  atendente: 'Atendente',
  unidade_escolar: 'Unidade escolar',
  cco: 'Equipe CCO',
};
