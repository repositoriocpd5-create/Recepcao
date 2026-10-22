import { UserProfile } from '@/types';

/** Módulos do sistema: Recepção (portaria da SMEDU) e CCO (Central Controle Operacional). */
export type Modulo = 'recepcao' | 'cco';

/** Como o usuário enxerga o CCO: a unidade vê só as próprias ocorrências; equipe e admin, as das unidades autorizadas. */
export type PerfilCco = 'unidade' | 'equipe' | 'admin';

type Usuario = Pick<UserProfile, 'role' | 'acesso_cco'> | null | undefined;

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

/** Tela inicial depois do login. */
export const rotaInicial = (user: Usuario) => (acessaRecepcao(user) ? '/recepcao' : acessaCco(user) ? '/cco' : '/login');

export const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  recepcionista: 'Recepcionista',
  atendente: 'Atendente',
  unidade_escolar: 'Unidade escolar',
  cco: 'Equipe CCO',
};
