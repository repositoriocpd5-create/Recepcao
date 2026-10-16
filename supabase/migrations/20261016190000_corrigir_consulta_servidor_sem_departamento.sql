-- Permite localizar servidores importados que ainda não receberam
-- departamento/setor de destino.
-- A importação do quadro funcional registra departamento_id como NULL;
-- portanto, a consulta da Recepção não pode usar JOIN obrigatório.

CREATE OR REPLACE FUNCTION public.rpc_consultar_servidor(
  p_matricula VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_servidor RECORD;
  v_mov_aberta RECORD;
BEGIN
  SELECT
    s.*,
    d.nome AS departamento_nome,
    d.sigla AS departamento_sigla,
    st.nome AS setor_nome,
    st.sigla AS setor_sigla,
    st.ramal AS setor_ramal
  INTO v_servidor
  FROM public.servidores s
  LEFT JOIN public.departamentos d ON d.id = s.departamento_id
  LEFT JOIN public.setores st ON st.id = s.setor_id
  WHERE LOWER(s.matricula) = LOWER(TRIM(p_matricula))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('encontrado', false);
  END IF;

  SELECT * INTO v_mov_aberta
  FROM public.movimentacoes
  WHERE servidor_id = v_servidor.id
    AND status = 'no_predio'
  ORDER BY data_hora_entrada DESC
  LIMIT 1;

  INSERT INTO public.auditoria_logs (
    usuario_id, acao, tabela, registro_id, detalhes
  ) VALUES (
    auth.uid(),
    'CONSULTA_MATRICULA',
    'servidores',
    v_servidor.id,
    jsonb_build_object('matricula', p_matricula)
  );

  RETURN jsonb_build_object(
    'encontrado', true,
    'servidor', to_jsonb(v_servidor),
    'no_predio', (v_mov_aberta.id IS NOT NULL),
    'movimentacao_atual', to_jsonb(v_mov_aberta)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_consultar_servidor(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_consultar_servidor(VARCHAR) TO authenticated;
