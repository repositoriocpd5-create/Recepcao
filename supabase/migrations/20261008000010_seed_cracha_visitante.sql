-- Credencial temporária inicial mostrada no inventário de homologação.
-- `numero` é o conteúdo impresso no código de barras; `descricao` é a legenda do crachá.
INSERT INTO public.crachas (numero, descricao, situacao, ativo)
VALUES ('7892840819507', 'VISITANTE 1', 'disponivel', true)
ON CONFLICT (numero) DO UPDATE
SET descricao = EXCLUDED.descricao,
    situacao = CASE
      WHEN public.crachas.situacao = 'inativo' THEN EXCLUDED.situacao
      ELSE public.crachas.situacao
    END,
    ativo = true,
    updated_at = now();
