import { Servidor } from '@/types';

/**
 * O arquivo com o quadro funcional é mantido fora do repositório por conter
 * dados pessoais. Sem ele, a aplicação continua operacional e os servidores
 * podem ser cadastrados pela tela administrativa.
 */
export const SERVIDORES_OFICIAIS: Servidor[] = [];
