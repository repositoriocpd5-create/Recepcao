import { Departamento, Setor } from '@/types';

/**
 * A estrutura institucional é fornecida em arquivo separado do código-fonte.
 * O pacote distribuído não contém esse arquivo; estes valores permitem que a
 * aplicação inicie normalmente até que a base seja importada.
 */
export const estruturaImportadaDepartamento: Departamento = {
  id: 'estrutura-importada',
  nome: 'Estrutura Institucional',
  sigla: 'SMEDU',
  descricao: 'Aguardando importação da estrutura institucional.',
  localizacao: 'SMEDU',
  ativo: true,
};

export const estruturaImportadaSetores: Setor[] = [];
export const pessoasPorSetor = new Map<string, string[]>();
