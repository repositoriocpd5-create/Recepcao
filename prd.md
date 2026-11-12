# PRD — Sistema SMEDU: Recepção e Central Controle Operacional (CCO)

## Visão do produto

Sistema web da Secretaria Municipal de Educação de Itaguaí (SMEDU) com dois módulos:

- **Recepção:** registra e rastreia o acesso presencial de servidores, visitantes e prestadores à sede da SMEDU — identificação, destino, autorização, crachás, saída e auditoria.
- **CCO — Central Controle Operacional:** as unidades escolares registram ocorrências e relatam problemas nas câmeras de monitoramento; a equipe do CCO acompanha, atende e finaliza cada registro, com histórico visível para a escola.

Quem acessa os dois módulos troca entre eles pelo seletor **Recepção / CCO** no topo; quem acessa só um cai direto nele após o login.

## Objetivos

- Reduzir o tempo de atendimento no balcão da Recepção.
- Garantir rastreabilidade de entradas, saídas, permanência e responsáveis procurados.
- Impedir reutilização de crachás vinculados a entradas abertas.
- Dar às escolas um canal único e simples para comunicar ocorrências e falhas de câmera.
- Priorizar casos graves (roubo, violência, abuso, briga etc.) e orientar a preservação das imagens.
- Produzir relatórios e um log do sistema confiáveis (LGPD).

## Perfis de usuário

| Perfil (papel) | Módulos | Permissões principais |
| --- | --- | --- |
| Recepcionista (`recepcionista`) | Recepção | Identificar pessoas, registrar entradas e saídas, cadastrar visitantes e consultar dados. |
| Atendente (`atendente`) | Recepção | Consulta de informações e atendimento básico. |
| Gestor (`gestor`) | Recepção | Indicadores, relatórios, autorizações e cadastros permitidos. |
| Administrador (`admin`) | Recepção e CCO | Todas as permissões: usuários e unidades, log do sistema, exclusão e reabertura no CCO. |
| Unidade escolar (`unidade_escolar`) | CCO | Registra e acompanha as ocorrências **da própria escola**; edita enquanto o administrador não visualizou. |
| Equipe CCO (`cco`, ou recepção com `acesso_cco`) | CCO | Acompanha e atende as ocorrências das unidades autorizadas (`cco_unidades`; vazio = todas). |
| Administrador do CCO (`cco_admin`) | Só CCO | Poderes de administrador **dentro do CCO** (todas as unidades, exclusão, reabertura, log do CCO). Não acessa a Recepção nem a gestão de usuários. Ex.: Paulo Sergio Souza Santos. |

O papel e a unidade de cada e-mail institucional vêm da tabela `acessos_por_email`, aplicada automaticamente ao perfil. Dirigentes fazem o **primeiro acesso** pelo próprio e-mail: recebem um código (SMTP do sistema) e criam a senha.

## Fluxos principais — Recepção

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

## Fluxos principais — CCO

### Novo registro (unidade escolar)

1. Em **Novo registro**, escolher **Registrar uma ocorrência** ou **Relatar problema em câmera(s)**.
2. Câmeras: marcar uma ou mais em **Câmera(s) com problema** (lista sugerida ou **Outra câmera**) e escolher o **Tipo de problema**; em **Outro**, o novo tipo é digitado e passa a compor a lista.
3. **Quando aconteceu:** data (não futura), horário inicial e final em 24 h (lista de horas/minutos ou digitação), duração calculada. A chave **Ocorrência/Problema em andamento** dispensa o horário final; término após a meia-noite é confirmado como "dia seguinte".
4. Descrição (10 a 4.000 caracteres) e foto opcional (JPG, PNG ou WEBP, até 10 MB; reduzida a 1920 px e sem localização).
5. **Enviar ocorrência / Enviar relato** gera o protocolo `CCO-AAAA-NNNNNN`. O envio é idempotente (`client_request_id`): repetir após falha não duplica.

### Edição pela unidade

A unidade edita o registro (botão **Editar**) enquanto o administrador **não visualizou** e a situação continua **Registrada**. A primeira abertura pelo administrador grava `visualizada_em` e bloqueia a edição; o banco confere a regra no momento de salvar. Cada edição entra no histórico e na auditoria (antes/depois).

### Atendimento (equipe CCO e administradores)

1. **Painel de ocorrências:** indicadores por situação, busca, unidade, período, filtros segmentados de **Situação** e (admin) **Importância**, ordenação, atualização automática a cada minuto.
2. Administrador: tabela completa com **Importância**, **Unidade e direção** (dirigente da escola), **Registrado por** (nome, cargo, há quanto tempo), tipo, resumo, situação, responsável e status **Nova/Visualizada**.
3. No detalhe (sem barra de rolagem em telas de notebook): **Registrar andamento** (o que foi feito, situação após o andamento, responsável), **Finalizar ocorrência** (exige a solução aplicada) e, só administrador, **Reabrir** (com motivo) e **Excluir** (com motivo; cópia na auditoria).
4. **Sininho:** mostra as ocorrências ainda não abertas pelo administrador e a unidade de origem; casos graves primeiro.
5. **Gerar PDF:** relatório da lista exibida, com brasão de Itaguaí, filtros e totais no cabeçalho e **15 casos por página**; colunas de situação, status, importância e (admin) direção.

### Situações

| Situação | Significado |
| --- | --- |
| Registrada | Recebida pelo CCO, aguardando análise. |
| Em análise | A equipe do CCO está verificando as imagens. |
| Em atendimento | Providências em andamento. |
| Solucionada | Ocorrência solucionada pelo CCO (novos andamentos bloqueados; só o administrador reabre). |

### Importância e casos graves

- **Alta:** caso grave — análise da IA (Google Gemini, Edge Function `cco-analisar-ocorrencia`) ou, como reserva, palavras-chave (roubo, furto, invasão, violência, briga, abuso, ameaça, arma, drogas, vandalismo…).
- **Média:** fato ainda em andamento ou problema em câmera.
- **Baixa:** demais registros.

Caso grave exibe ao administrador e à equipe o alerta para **extrair as imagens das câmeras do período e guardar uma cópia na nuvem**.

## Requisitos funcionais

- Recepção: cadastro e consulta de visitantes, servidores, departamentos, setores, agendamentos e crachás; consulta por matrícula/CPF; inventário de crachás (disponível, em uso, extraviado, danificado); leitura de código de barras; histórico e permanência; integração preparada para QR Code e biometria.
- CCO: registro de ocorrência e de problema em câmera, edição pela unidade, painel da equipe, atendimento com histórico, sininho, análise de gravidade, relatório em PDF, Central de Ajuda com busca, guias passo a passo e dúvidas frequentes por perfil.
- **Log do sistema** (administrador; o administrador do CCO vê só eventos `CCO_*`): todas as ações registradas, com filtros, período, operador e exportação CSV.
- Geração de PDF institucional com cabeçalho e brasão.
- Manual de uso (Recepção) e Central de Ajuda (CCO) acessíveis pelo menu.

## Requisitos não funcionais

- Interface responsiva (computador e celular) com modo claro e escuro consistentes; foco visível, navegação por teclado e respeito a "reduzir movimento".
- Operações de entrada/saída transacionais no Supabase; regras do CCO garantidas no banco (gatilhos, RPCs `security definer` e constraints).
- RLS: cada unidade vê só os próprios registros; papéis do CCO não acessam dados da Recepção.
- Fotos do CCO em bucket privado (`cco-fotos`), abertas por link temporário (30 min).
- Chaves secretas (Gemini, SMTP, service role) apenas no servidor — nunca no código do navegador.
- Logs de auditoria para ações sensíveis; fallback local (modo demonstração) apenas para homologação.

## Modelo de dados

- Recepção: `servidores`, `visitantes`, `movimentacoes`, `crachas`, `atribuicoes_cracha`, `departamentos`, `setores`, `autorizacoes`, `agendamentos`, `ramais_unidades`.
- Acesso: `profiles` (papel, unidade, `acesso_cco`, `cco_unidades`), `acessos_por_email` (papel, unidade, responsável e cargo por e-mail), `primeiro_acesso_tentativas`.
- CCO: `cco_ocorrencias` (protocolo, unidade, data/horários, em andamento, dia seguinte, descrição, foto, `tipo_registro`, `cameras`, `tipo_problema`, situação, responsável, autoria, `visualizada_em/por`, campos `ia_*` da análise) e `cco_ocorrencia_historico` (registro, situação, responsável, andamento, solução, reabertura, término, edição).
- `auditoria_logs`: usuário, ação, tabela, registro, detalhes e IP.

## Implantação (Supabase)

Migrações do CCO, nesta ordem (no SQL Editor, cada arquivo em uma execução):

1. `20261022190000_cco_problema_camera.sql`
2. `20261022200000_cco_edicao_pela_unidade.sql`
3. `20261022210000_cco_alerta_ia.sql`
4. `20261022215900_cco_administrador_papel.sql` (sozinha: cria o valor de enum `cco_admin`)
5. `20261022220000_cco_administrador.sql`
6. `20261023000000_cco_painel_admin.sql`

Edge Functions: `cco-analisar-ocorrencia` (segredo `GEMINI_API_KEY`; opcional `GEMINI_MODEL`), `admin-manage-user` (republicar após incluir o papel `cco_admin`), `primeiro-acesso`, `login-matricula`, `atualizar-contato-servidor`.

## Critérios de aceite

- Recepção: não permitir entrada sem departamento e setor; a leitura do crachá no formulário só valida a credencial; não atribuir crachá em uso; a devolução por código encerra a movimentação e libera o crachá; a busca de responsável respeita a lotação.
- CCO: data futura e horário final anterior ao inicial (sem "dia seguinte") são recusados; relato de câmera exige ao menos uma câmera e o tipo de problema; o mesmo envio repetido não duplica.
- A unidade só edita antes da visualização pelo administrador e enquanto a situação for Registrada.
- Finalizar exige a solução aplicada; ocorrência solucionada não recebe andamentos; só o administrador reabre e exclui, sempre com motivo.
- Caso grave mostra o alerta de preservação das imagens; o sininho lista as ocorrências não visualizadas com a unidade de origem.
- O PDF do CCO tem 15 casos por página (a última pode ter menos), brasão e cabeçalho institucional.
- O administrador do CCO não acessa a Recepção nem a gestão de usuários.
- PDFs exibem brasão e cabeçalho institucional.
