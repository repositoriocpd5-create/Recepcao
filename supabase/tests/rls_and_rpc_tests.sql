-- ==============================================================================
-- Testes Automatizados de Integridade e RLS no PostgreSQL (pgTAP ou Script SQL)
-- ==============================================================================

BEGIN;

-- Teste 1: Impedir entrada duplicada de mesma pessoa no prédio
DO $$
DECLARE
  v_res JSONB;
  v_vis_id UUID := 'v1000000-0000-0000-0000-000000000001';
  v_dep_id UUID := 'd1000000-0000-0000-0000-000000000003';
  v_set_id UUID := 's1000000-0000-0000-0000-000000000005';
  v_error_caught BOOLEAN := false;
BEGIN
  -- Como v1000000-0000-0000-0000-000000000001 já está com status 'no_predio', deve lançar exceção
  BEGIN
    PERFORM public.rpc_registrar_entrada(
      'visitante',
      v_vis_id,
      v_dep_id,
      v_set_id,
      NULL,
      'CR-999',
      'Tentativa de entrada duplicada'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'TESTE FALHOU: A função rpc_registrar_entrada permitiu entrada duplicada!';
  ELSE
    RAISE NOTICE 'TESTE PASSOU: Entrada duplicada bloqueada com sucesso.';
  END IF;
END $$;

-- Teste 2: Verificar unicidade de CPF em visitantes
DO $$
DECLARE
  v_err BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.visitantes (cpf, nome)
    VALUES ('123.456.789-01', 'Clone Não Autorizado');
  EXCEPTION WHEN unique_violation THEN
    v_err := true;
  END;

  IF NOT v_err THEN
    RAISE EXCEPTION 'TESTE FALHOU: Constraint de unicidade de CPF em visitantes não funcionou!';
  ELSE
    RAISE NOTICE 'TESTE PASSOU: Unicidade de CPF garantida.';
  END IF;
END $$;

-- Teste 3: Registro de saída atômico
DO $$
DECLARE
  v_mov_id UUID := 'm1000000-0000-0000-0000-000000000001';
  v_res JSONB;
BEGIN
  v_res := public.rpc_registrar_saida(v_mov_id, NULL, 'Saída para teste');
  IF (v_res->>'status') <> 'finalizado' THEN
    RAISE EXCEPTION 'TESTE FALHOU: Status após saída deveria ser "finalizado"';
  ELSE
    RAISE NOTICE 'TESTE PASSOU: Registro de saída atômico executado com sucesso.';
  END IF;
END $$;

-- Reverter alterações de teste para não alterar o banco definitivo
ROLLBACK;
