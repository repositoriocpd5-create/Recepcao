import servidoresImportados from '../../servidores.json';
import { Servidor } from '@/types';

type RegistroServidorOficial = {
  Matrícula: number;
  Nome: string;
  'Cargo efetivo': string | null;
  Lotação: string | null;
};

/** Quadro funcional oficial fornecido pela SMEDU, consolidado pela matrícula. */
const servidoresPorMatricula = new Map<string, Servidor>();

for (const servidor of servidoresImportados as RegistroServidorOficial[]) {
  const matricula = String(servidor.Matrícula);
  servidoresPorMatricula.set(matricula, {
    id: `servidor-${matricula}`,
    matricula,
    nome: servidor.Nome,
    cargo: servidor['Cargo efetivo'] || 'Não informado',
    lotacao: servidor.Lotação || undefined,
    // O arquivo de origem não traz o departamento/setor administrativo.
    departamento_id: '',
    status: 'ativo',
  });
}

export const SERVIDORES_OFICIAIS = Array.from(servidoresPorMatricula.values()).sort((a, b) =>
  a.nome.localeCompare(b.nome, 'pt-BR'),
);
