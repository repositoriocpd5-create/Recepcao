# Leitor de crachá pela câmera

## Escopo

Adicionar leitura de código de barras por câmera em dois pontos da `RecepcaoPage`: campo `Crachá temporário / código de barras` da entrada e campo de código da Devolução rápida. Os códigos atuais são identificadores alfanuméricos (`CR-014`), portanto a leitura habilita Code 39 e Code 128.

## Arquitetura

- Adicionar `@zxing/browser` e criar `BarcodeCameraScanner`, componente reutilizável de modal com vídeo local (`autoPlay`, `muted` e `playsInline`), máscara de enquadramento, botão de cancelar e mensagens de erro. O reader recebe `POSSIBLE_FORMATS` com apenas `CODE_39` e `CODE_128`.
- Solicitar `getUserMedia` com preferência pela câmera traseira e processar frames no dispositivo. Não há upload de imagem/vídeo nem alteração de dados, APIs ou Supabase.
- Antes de preencher, normaliza o valor com `trim().toUpperCase()` e só aceita 1–64 caracteres `[A-Z0-9-]`; valores fora desse padrão geram erro e permitem nova leitura. O scanner para o stream e a rotina de decodificação no sucesso, cancelamento, erro, fechamento e desmontagem. Uma guarda de montagem/cancelamento interrompe inicializações tardias e para todas as `MediaStreamTrack`s e o controle do ZXing. Permite nova tentativa após falha.

## Integração

- Na entrada, o botão de câmera preenche `formCracha`, fecha o scanner e invoca `validarCrachaParaEntrada`; o registro de entrada continua dependente da confirmação existente.
- Na devolução, o botão preenche `returnBarcodeInput`, fecha o scanner e mantém o usuário no modal para confirmar `Registrar devolução`; não chama o handler de saída sozinho.
- Digitação manual e leitores USB não sofrem alterações.

## UX, segurança e acessibilidade

- O botão tem área mínima de 44 px e nome acessível. Antes de abrir, verifica `isSecureContext`, `navigator.mediaDevices` e `getUserMedia`; em incompatibilidade, exibe mensagem e mantém a digitação manual disponível.
- Permissão negada, câmera ausente, HTTPS inseguro, código inválido e falha de leitura mostram mensagens acionáveis. A câmera requer HTTPS em produção; localhost continua permitido pelo navegador.
- Modal segue o padrão mobile atual e tem foco/atalho de fechamento. O vídeo possui instruções acessíveis, sem região ao vivo ruidosa.

## Validação

- Executar `npm run build`.
- Conferir manualmente câmera traseira, cancelamento e limpeza de stream em Android/iPhone físico via HTTPS, além de fluxos de código válido, inválido, permissão negada, entrada e devolução. Em desktop sem câmera, a digitação e leitor USB devem continuar funcionais.
