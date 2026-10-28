# Administração de movimentações

## Objetivo

Permitir que administradores ordenem a tabela por seus títulos de coluna e gerenciem registros de movimentação por meio de edição completa e exclusão permanente confirmada.

## Escopo

- Exibir controles de editar e excluir somente ao perfil `admin`.
- Ordenar o resultado já filtrado por qualquer coluna clicável, alternando entre ordem ascendente e descendente.
- Abrir um modal administrativo para editar destino, responsável, motivo, horários de entrada e saída, status e observações.
- Manter pessoa e tipo de pessoa como campos somente leitura.
- Validar que registros `finalizado` tenham horário de saída e que registros sem horário de saída não possam ser finalizados.
- Confirmar a exclusão mostrando a identificação do registro e removê-lo permanentemente.
- Persistir alterações no Supabase e no modo de homologação; o acesso será reforçado por RLS para administradores.

## Experiência

- Cabeçalhos ordenáveis têm aparência de botão, indicador da direção atual e rótulo acessível.
- O modal de edição apresenta os dados da pessoa em leitura e campos organizados em grupos de destino, detalhes e horários/status.
- A exclusão abre confirmação modal; o botão destrutivo só executa após confirmação explícita.
- Após salvar ou excluir, a lista e o contador são atualizados e uma notificação de sucesso é exibida.

## Implementação

- `MovimentacoesPage` mantém o estado de ordenação, o registro em edição/exclusão e os dados auxiliares de departamentos, setores e servidores.
- `dataService` expõe operações administrativas de atualização e exclusão, com atualizações equivalentes no armazenamento local.
- Uma migração concede `UPDATE` e `DELETE` de movimentações apenas ao perfil administrativo, preservando a política limitada para operadores.
- Os testes de build verificam tipagem e geração de produção; a validação manual cobre ordenação, edição, exclusão e proteção de perfil.
