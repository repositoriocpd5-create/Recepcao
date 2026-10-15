# PRD — Sistema de Recepção e Controle de Acesso SMEDU

## Visão do produto

Sistema web para registrar e rastrear o acesso presencial de servidores, visitantes e prestadores à Secretaria Municipal de Educação de Itaguaí (SMEDU). Centraliza identificação, destino, autorização, uso de crachás, saída e auditoria.

## Objetivos

- Reduzir o tempo de atendimento no balcão.
- Garantir rastreabilidade de entradas, saídas, permanência e responsáveis procurados.
- Impedir reutilização de crachás vinculados a entradas abertas.
- Produzir relatórios institucionais confiáveis.

## Perfis de usuário

| Perfil | Permissões principais |
| --- | --- |
| Recepcionista | Identificar pessoas, registrar entradas e saídas, cadastrar visitantes e consultar dados. |
| Gestor | Consultar indicadores, relatórios e cadastros permitidos. |
| Administrador | Todas as permissões de gestão, incluindo departamentos, setores e parâmetros administrativos. |

## Fluxos principais

### Entrada

1. Selecionar Servidor ou Visitante e informar matrícula ou CPF.
2. Confirmar a pessoa identificada e abrir **Entrada em Andamento**.
3. Ler/digitar o código do crachá temporário.
4. Selecionar obrigatoriamente departamento e setor de destino.
5. Opcionalmente buscar o responsável, limitado aos servidores daquele departamento e setor.
6. Informar motivo/observações e confirmar o registro atômico.

### Saída e devolução

1. Abrir **Devolução rápida** e ler o código de barras do crachá.
2. Localizar a movimentação aberta, encerrar a saída e liberar o crachá na mesma operação.
3. Exibir confirmação sem novo campo de leitura até o operador concluir o modal.

### Autorizações

Setores restritos criam uma entrada pendente. A aprovação ou recusa deve ser registrada com usuário, data e observação.

## Requisitos funcionais

- Cadastro e consulta de visitantes, servidores, departamentos, setores, agendamentos e crachás.
- Consulta de servidor por matrícula e de visitante por CPF.
- Inventário de crachás com estados disponível, em uso, extraviado e danificado.
- Leitura de código de barras para atribuição e devolução de crachá.
- Histórico por pessoa e movimentações com cálculo de permanência.
- Geração de PDF institucional com cabeçalho e brasão.
- Integração preparada para QR Code e biometria digital.
- Manual de uso acessível pelo menu lateral.

## Requisitos não funcionais

- Interface responsiva com modo claro e escuro consistentes.
- Operações de entrada/saída transacionais no Supabase.
- RLS e logs de auditoria para ações sensíveis.
- Persistência no Supabase; fallback local apenas para homologação.

## Modelo de dados

- `servidores`: matrícula, nome, cargo, lotação, departamento, setor e ramal.
- `visitantes`: CPF, identificação, contatos e organização.
- `movimentacoes`: pessoa, destino, responsável, crachá, horários, status e autorização.
- `crachas`, `atribuicoes_cracha`, `departamentos`, `setores`, `autorizacoes`, `agendamentos` e `auditoria_logs`.

## Critérios de aceite

- Não permitir entrada sem departamento e setor.
- A leitura de crachá dentro do formulário apenas valida a credencial, sem submeter a entrada.
- Não permitir atribuição de crachá em uso.
- A devolução por código encerra a movimentação e disponibiliza o crachá.
- A busca de responsável retorna somente servidores da lotação selecionada.
- PDFs exibem brasão e cabeçalho institucional.
