-- Atribuição e devolução de crachás no mesmo contexto transacional da movimentação.

CREATE OR REPLACE FUNCTION public.rpc_registrar_entrada_com_cracha(
  p_tipo_pessoa pessoa_tipo,
  p_pessoa_id UUID,
  p_departamento_destino_id UUID,
  p_setor_destino_id UUID,
  p_servidor_destino_id UUID DEFAULT NULL,
  p_cracha_numero VARCHAR DEFAULT NULL,
  p_motivo TEXT DEFAULT 'Atendimento',
  p_requer_autorizacao BOOLEAN DEFAULT false,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cracha public.crachas%ROWTYPE;
  v_resultado JSONB;
  v_movimentacao_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para registrar entrada';
  END IF;

  IF p_cracha_numero IS NOT NULL AND btrim(p_cracha_numero) <> '' THEN
    SELECT * INTO v_cracha
    FROM public.crachas
    WHERE numero = upper(btrim(p_cracha_numero))
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Crachá % não cadastrado', p_cracha_numero;
    END IF;
    IF NOT v_cracha.ativo OR v_cracha.situacao <> 'disponivel' THEN
      RAISE EXCEPTION 'Crachá % não está disponível para atribuição', v_cracha.numero;
    END IF;
  END IF;

  v_resultado := public.rpc_registrar_entrada(
    p_tipo_pessoa, p_pessoa_id, p_departamento_destino_id, p_setor_destino_id,
    p_servidor_destino_id, NULLIF(upper(btrim(p_cracha_numero)), ''), p_motivo,
    p_requer_autorizacao, auth.uid(), p_observacoes
  );
  v_movimentacao_id := (v_resultado ->> 'id')::uuid;

  IF v_cracha.id IS NOT NULL THEN
    UPDATE public.crachas SET situacao = 'em_uso', updated_at = now() WHERE id = v_cracha.id;
    INSERT INTO public.atribuicoes_cracha (cracha_id, movimentacao_id, observacoes)
    VALUES (v_cracha.id, v_movimentacao_id, 'Atribuição na entrada');

    INSERT INTO public.auditoria_logs (acao, tabela, registro_id, detalhes)
    VALUES ('ATRIBUICAO_CRACHA', 'crachas', v_cracha.id, jsonb_build_object('movimentacao_id', v_movimentacao_id));
  END IF;

  RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_registrar_saida_com_cracha(
  p_movimentacao_id UUID,
  p_cracha_devolvido BOOLEAN DEFAULT true,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_atribuicao public.atribuicoes_cracha%ROWTYPE;
  v_resultado JSONB;
  v_tem_atribuicao BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para registrar saída';
  END IF;

  SELECT * INTO v_atribuicao
  FROM public.atribuicoes_cracha
  WHERE movimentacao_id = p_movimentacao_id AND devolvido_em IS NULL
  FOR UPDATE;
  v_tem_atribuicao := FOUND;

  v_resultado := public.rpc_registrar_saida(p_movimentacao_id, auth.uid(), p_observacoes);

  IF v_tem_atribuicao THEN
    IF p_cracha_devolvido THEN
      UPDATE public.atribuicoes_cracha SET devolvido_em = now(), observacoes = COALESCE(p_observacoes, observacoes)
      WHERE id = v_atribuicao.id;
      UPDATE public.crachas SET situacao = 'disponivel', updated_at = now() WHERE id = v_atribuicao.cracha_id;
      INSERT INTO public.auditoria_logs (acao, tabela, registro_id, detalhes)
      VALUES ('DEVOLUCAO_CRACHA', 'crachas', v_atribuicao.cracha_id, jsonb_build_object('movimentacao_id', p_movimentacao_id));
    ELSE
      UPDATE public.atribuicoes_cracha SET observacoes = concat_ws(' | ', observacoes, 'Crachá não devolvido na saída', p_observacoes)
      WHERE id = v_atribuicao.id;
      INSERT INTO public.auditoria_logs (acao, tabela, registro_id, detalhes)
      VALUES ('PENDENCIA_CRACHA', 'crachas', v_atribuicao.cracha_id, jsonb_build_object('movimentacao_id', p_movimentacao_id));
    END IF;
  END IF;

  RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_registrar_entrada_com_cracha(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_registrar_saida_com_cracha(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_registrar_entrada_com_cracha(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_registrar_saida_com_cracha(uuid, boolean, text) TO authenticated;
