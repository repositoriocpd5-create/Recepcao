-- Corrige rpc_registrar_entrada_multidestino_com_cracha: a posição do destino vem de
-- destino_json.ordem (WITH ORDINALITY), não de destino.ordem, que não existe no registro.
-- Execute no SQL Editor do Supabase.

CREATE OR REPLACE FUNCTION public.rpc_registrar_entrada_multidestino_com_cracha(
  p_tipo_pessoa pessoa_tipo,
  p_pessoa_id UUID,
  p_departamento_destino_id UUID,
  p_setor_destino_id UUID,
  p_servidor_destino_id UUID DEFAULT NULL,
  p_cracha_numero VARCHAR DEFAULT NULL,
  p_motivo TEXT DEFAULT 'Atendimento',
  p_requer_autorizacao BOOLEAN DEFAULT false,
  p_observacoes TEXT DEFAULT NULL,
  p_destinos JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_resultado JSONB;
  v_movimentacao_id UUID;
  v_destinos JSONB := COALESCE(p_destinos, '[]'::jsonb);
  v_total INTEGER;
BEGIN
  IF jsonb_typeof(v_destinos) <> 'array' THEN RAISE EXCEPTION 'Destinos inválidos'; END IF;
  v_total := jsonb_array_length(v_destinos);
  IF v_total > 10 THEN RAISE EXCEPTION 'A visita pode ter no máximo 10 destinos'; END IF;

  v_resultado := public.rpc_registrar_entrada_com_cracha(
    p_tipo_pessoa, p_pessoa_id, p_departamento_destino_id, p_setor_destino_id,
    p_servidor_destino_id, p_cracha_numero, p_motivo, p_requer_autorizacao, p_observacoes
  );
  v_movimentacao_id := (v_resultado ->> 'id')::uuid;

  INSERT INTO public.movimentacao_destinos (movimentacao_id, departamento_destino_id, setor_destino_id, servidor_destino_id, ordem)
  SELECT v_movimentacao_id, destino.departamento_destino_id, destino.setor_destino_id, destino.servidor_destino_id, destino_json.ordem
  FROM jsonb_array_elements(v_destinos) WITH ORDINALITY AS destino_json(value, ordem)
  CROSS JOIN LATERAL jsonb_to_record(destino_json.value) AS destino(departamento_destino_id UUID, setor_destino_id UUID, servidor_destino_id UUID);

  IF v_total = 0 THEN
    INSERT INTO public.movimentacao_destinos (movimentacao_id, departamento_destino_id, setor_destino_id, servidor_destino_id, ordem)
    VALUES (v_movimentacao_id, p_departamento_destino_id, p_setor_destino_id, p_servidor_destino_id, 1);
  END IF;

  RETURN v_resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_registrar_entrada_multidestino_com_cracha(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_registrar_entrada_multidestino_com_cracha(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, text, jsonb) TO authenticated;
