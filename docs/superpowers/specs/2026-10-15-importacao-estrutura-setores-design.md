# Importação da estrutura de setores

## Fonte e normalização

`recepção1.json` contém 135 registros em 18 valores únicos de `Nome do Setores Vinculados`, mas possui um cabeçalho `Planilha1` malformado. O script recupera o array `BASE` por balanceamento de colchetes, faz parse de cada objeto JSON completo individualmente e lê as chaves por nome, independente da ordem ou de campos extras. Descarta linhas com nome/setor vazio, aplica `trim` e colapsa espaços. Cada ocorrência válida é preservada como vínculo; duplicatas exatas de nome+setor são removidas. A execução falha sem alterar dados se não encontrar os valores de referência independentes: 135 itens brutos e 18 setores únicos.

## Estrutura criada

- Substituir a estrutura de departamentos e setores atualmente exibida por um único departamento: **Estrutura Importada**.
- Criar um setor para cada valor único de `Nome do Setores Vinculados`.
- Criar uma tabela de vínculos de importação (`setor_vinculos_importados`) em migração Supabase, com `id`, `setor_id` (FK para `setores` com `ON DELETE CASCADE`), `nome_normalizado`, `origem` e timestamps; impor unicidade em `(setor_id, nome_normalizado)`, índice por `setor_id` e RLS de leitura para usuários autenticados/escrita para admin. Associar cada nome ao setor nela, preservando a estrutura oficial sem alterar o cadastro de servidores, permissões ou movimentações. A página apresenta quantidade e nomes desses vínculos.
- A sigla é gerada de forma determinística e única a partir do nome do setor; autorização prévia, ramal e sala ficam em branco/falso quando ausentes da fonte.

## Implementação

- Criar um módulo de normalização e conjunto de dados derivado da fonte, além de uma migração idempotente que insere/atualiza a estrutura importada e seus vínculos. As tabelas existentes já possuem `ativo`; departamentos/setores anteriores são **arquivados** (`ativo = false`) em vez de apagados, preservando referências históricas em movimentações, autorizações e servidores. `dataService.getDepartamentos/getSetores` passa a filtrar registros ativos em ambos os modos de dados. A migração nunca reaplica a importação automaticamente após alterações administrativas.
- Ajustar `DepartamentosPage` para consultar a estrutura importada e mostrar contagem/nomes das pessoas vinculadas em cada setor.
- Ações administrativas persistem nos dados reais: criação/edição/remoção usa os serviços atuais após a importação. A interface não reimporta dados a cada renderização.

## Validação

- Confirmar 1 departamento, 18 setores e 135 itens brutos antes da deduplicação; a importação falha se esses valores de referência não forem atingidos. Registrar também total de vínculos válidos únicos, descartados e duplicados pelo script.
- Conferir ausência de duplicatas, responsividade da lista de nomes e persistência de uma edição administrativa após recarregar.
- Rodar `npm run build`.
