# Centralização do relógio mobile

Em viewports abaixo de 768 px, o invólucro do `ReceptionClock` receberá `self-center`, centralizando o cartão no eixo horizontal mesmo dentro do cabeçalho em coluna. Em 768 px ou mais, mantém a posição atual à direita no cabeçalho. Não há alteração de dimensões, dados, temporização ou fluxos.

Validação: conferir o relógio centralizado a 320 px, 375 px e 480 px, sem impacto no cabeçalho desktop, e executar `npm run build`.
