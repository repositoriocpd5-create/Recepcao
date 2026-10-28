# Relógio da Recepção

## Objetivo

Adicionar ao cabeçalho da tela **Balcão da Recepção Central** um relógio institucional visualmente fiel à referência fornecida, com data e hora atualizadas em tempo real no fuso de Brasília.

## Experiência e layout

- No desktop (a partir de 768 px), o relógio fica à direita do título da página, em um cartão horizontal de duas áreas, com 352 px de largura e 110 px de altura.
- A área de data ocupa 45% do cartão, usa gradiente `#123b5b → #071f36`, raio esquerdo de 10 px e padding horizontal de 18 px. Mostra `DD` em Alexandria, 42 px/700; o mês abreviado em três letras (`JAN`–`DEZ`) em 17 px/700; e o dia da semana completo em 9 px/600, caixa alta. Os dois círculos de 25 px com setas são puramente decorativos, usam `aria-hidden="true"` e não recebem foco.
- A área de hora ocupa 55%, tem fundo branco, raio direito de 10 px e padding horizontal de 24 px. Exibe `HH:MM` (formato 24 h, sem segundos) em Alexandria, 46 px/500, e a legenda `HORÁRIO DE BRASÍLIA` em 10 px/700, caixa alta. O cartão tem raio externo de 10 px e sombra `0 10px 22px -12px rgba(18,44,82,.35)`.
- O cartão tem bordas arredondadas, sombra discreta, divisor central e tratamentos de foco/contraste consistentes com a interface.
- Entre 640 e 767 px, o relógio ocupa a largura disponível até 352 px. Abaixo de 640 px, ocupa 100% da largura do cabeçalho, preservando a divisão 45/55 e com a hora reduzida apenas até 42 px. O dia da semana muda para a abreviação de três letras (`SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SÁB`, `DOM`) abaixo de 400 px, evitando quebra e truncamento.
- O contêiner recebe `aria-label="Data e hora atuais de Brasília"`; a atualização não usa região ao vivo, para não interromper leitores de tela. O contraste de texto deve ser no mínimo 4,5:1.

## Componente e dados

- Criar um componente isolado `ReceptionClock` em `src/components/recepcao/`.
- O componente usa a API nativa `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` e locale `pt-BR`.
- A leitura é atualizada na montagem e na virada de cada minuto; o temporizador é limpo ao desmontar o componente. Isso mantém o relógio preciso sem atualizações desnecessárias para uma apresentação `HH:MM`.
- Não há persistência, chamada de rede ou interação operacional. Os controles de navegação são estritamente visuais para reproduzir a referência.

## Integração e validação

- Integrar somente à página `RecepcaoPage`, sem alterar fluxos de identificação ou movimentação.
- Validar com `npm run build`, verificação manual no navegador em 1440 px, 768 px e 375 px, e conferência de que a data/hora usa `America/Sao_Paulo`, `pt-BR`, a virada de minuto e a desmontagem não deixam temporizadores ativos. Incluir teste unitário para a formatação de data/hora no fuso de Brasília e para a limpeza do temporizador no unmount, caso a infraestrutura de testes exista; caso contrário, registrar a verificação manual no resultado da entrega.
