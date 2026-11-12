# Interface mobile da Recepção

## Objetivo

Adaptar a aplicação existente para smartphones, reproduzindo a organização da referência `SMART.png`: cabeçalho institucional compacto, selo de homologação, relógio premium, cartões de identificação empilhados, painel de presenças e navegação inferior fixa. Desktop (>=1024 px) preserva o layout atual.

## Pontos de alteração

- `Navbar`: cria a versão mobile com menu hambúrguer, brasão, marca em duas linhas, perfil e selo central `Modo Homologação Ativo` quando `isSupabaseLive === false`; durante carregamento não exibe selo. Desktop mantém o indicador atual.
- `AppLayout`: remove a barra móvel redundante, mantém o drawer existente e reserva espaço inferior para a navegação mobile.
- Novo `MobileBottomNav`: disponível abaixo de 768 px, com Recepção, Visitantes, Servidores, Crachás e Mais. O item Mais abre um painel com as demais rotas permitidas pelo perfil.
- `ReceptionClock`: ocupa toda a largura no mobile, antes do título, mantendo o cartão bipartido e a atualização no fuso de Brasília.
- `RecepcaoPage`: reorganiza somente a apresentação até 767 px, usando as ações e estados existentes para Servidor, Visitante, Atualizar e Devolução rápida.
- `Modal` e campos da Recepção: recebem espaçamento, rolagem e alvos de toque adequados a mobile, sem alteração de lógica ou validações.

## Layout e comportamento

- Faixas: 320–479 px smartphone; 480–767 px smartphone amplo; 768–1023 px tablet com cabeçalho/tablet e sidebar existente; 1024 px+ desktop. Drawer e barra inferior existem somente abaixo de 768 px.
- Cores de referência: azul `#075AA6`, azul escuro `#082B57`, ação `#087EF5`, verde `#00A65A`, retorno `#ED2855`, fundo `#F4F9FF`, borda `#D7E6F6`, texto `#102D58`.
- Cartões têm raio de 16–20 px, sombras discretas e transições de até 250 ms. Controles táteis têm pelo menos 44 px.
- A sequência da Recepção em até 767 px é: relógio, título/subtítulo, cartão Servidor, cartão Visitante, cartão Presentes no Prédio (contador e ações Atualizar/Devolução rápida), listagem ou estado vazio. Cada cartão usa o mesmo `onClick` e estado da versão atual; o botão de devolução abre o mesmo modal.
- A barra inferior é fixa, respeita `env(safe-area-inset-bottom)` e o conteúdo recebe padding para não ser coberto. O drawer móvel fecha com backdrop, Esc, seleção de rota e toque externo. Usa `role="dialog"`, foco inicial no primeiro link, foco contido e restauração do foco no botão de menu ao fechar.
- O menu Mais lista, nesta ordem, Movimentações, Autorizações, Agendamentos, Dashboard, Relatórios & Auditoria, Departamentos & Setores, Administração (somente admin) e Manual de Uso; se não houver item permitido, não abre e o botão fica indisponível. Os links preservam rotas existentes, deep links e não modificam estado de modal ou serviços.
- Dados de pessoas no prédio e todas as ações continuam a usar os estados e serviços atuais. O cartão de devolução rápida abre o modal já existente.

## Acessibilidade e validação

- Ícones funcionais recebem nomes acessíveis; foco visível, contraste AA e `prefers-reduced-motion` são preservados.
- Sem rolagem horizontal em 320, 360, 375, 480, 768 e 1024 px.
- Validar em Chrome/Edge, nos viewports 320, 360, 375, 480, 768 e 1024 px: sem rolagem horizontal, safe area inferior, conteúdo não encoberto, relógio responsivo, cartão Servidor abre identificação por matrícula, Visitante abre CPF, Atualizar recarrega dados e Devolução abre o modal. Validar drawer com mouse, teclado (Tab/Esc) e foco restaurado; validar menu Mais para perfil admin e recepcionista; validar modal rolável com teclado virtual simulado. Rodar `npm run build` e testar desktop em 1024 px.
