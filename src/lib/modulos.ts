import { UserProfile } from '@/types';

/** Módulos do sistema: Recepção (portaria da SMEDU) e CCO (Central Controle Operacional). */
export type Modulo = 'recepcao' | 'cco';

/** Como o usuário enxerga o CCO: a unidade vê só as próprias ocorrências; equipe e admin, as das unidades autorizadas. */
export type PerfilCco = 'unidade' | 'equipe' | 'admin';

type Usuario = (Pick<UserProfile, 'role' | 'acesso_cco'> & { id?: string }) | null | undefined;

/** Papéis que só existem no CCO (não entram na Recepção). */
const PAPEIS_SO_CCO = ['unidade_escolar', 'cco', 'cco_admin', 'cpd_os', 'agenda_mkt'];

export const acessaRecepcao = (user: Usuario) => Boolean(user && !PAPEIS_SO_CCO.includes(user.role));

export const perfilCco = (user: Usuario): PerfilCco | null => {
  if (!user) return null;
  // Administrador do CCO: os mesmos poderes do administrador, mas só dentro do CCO.
  if (user.role === 'admin' || user.role === 'cco_admin') return 'admin';
  if (user.role === 'unidade_escolar') return 'unidade';
  if (user.role === 'cco' || user.acesso_cco) return 'equipe';
  return null;
};

export const acessaCco = (user: Usuario) => perfilCco(user) !== null;

/** Quem acessa os dois módulos vê o seletor Recepção ↔ CCO. */
export const acessaDoisModulos = (user: Usuario) => acessaRecepcao(user) && acessaCco(user);

/** Sistemas externos do CPD (chaves do seletor). Endereços vêm do .env; o administrador acessa todos. */
export interface SistemaExterno { id: 'cpd_os' | 'agenda_mkt'; rotulo: string; url: string; descricao: string }

export const SISTEMAS_EXTERNOS: SistemaExterno[] = [
  { id: 'cpd_os', rotulo: 'CPD_OS', url: import.meta.env.VITE_CPD_OS_URL ?? '', descricao: 'Ordens de serviço do CPD.' },
  { id: 'agenda_mkt', rotulo: 'AgendaMKT', url: import.meta.env.VITE_AGENDA_MKT_URL ?? '', descricao: 'Agenda de marketing.' },
];

export const sistemasExternosDoUsuario = (user: Usuario): SistemaExterno[] =>
  !user ? [] : SISTEMAS_EXTERNOS.filter((s) => user.role === 'admin' || user.role === s.id);

/** Quantos destinos o usuário tem (Recepção, CCO e sistemas externos): com 2 ou mais, vê o seletor. */
export const totalDestinos = (user: Usuario) =>
  Number(acessaRecepcao(user)) + Number(acessaCco(user)) + sistemasExternosDoUsuario(user).length;

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
  if (acessaRecepcao(user)) return '/recepcao';
  if (acessaCco(user)) return '/cco';
  return sistemasExternosDoUsuario(user).length ? '/sistemas' : '/login';
};

export const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  recepcionista: 'Recepcionista',
  atendente: 'Atendente',
  unidade_escolar: 'Unidade escolar',
  cco: 'Equipe CCO',
  cco_admin: 'Administrador do CCO',
  cpd_os: 'CPD_OS',
  agenda_mkt: 'AgendaMKT',
};
