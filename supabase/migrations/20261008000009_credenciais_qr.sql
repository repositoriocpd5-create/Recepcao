-- Credenciais QR opacas: o token bruto é devolvido somente na emissão e nunca armazena CPF.
CREATE TABLE IF NOT EXISTS public.credenciais_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  visitante_id UUID REFERENCES public.visitantes(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  expira_em TIMESTAMPTZ NOT NULL,
  revogado_em TIMESTAMPTZ,
  utilizado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_credencial_qr_origem CHECK (visitante_id IS NOT NULL OR agendamento_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_credenciais_qr_expiracao ON public.credenciais_qr(expira_em) WHERE revogado_em IS NULL;
ALTER TABLE public.credenciais_qr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credenciais QR gerenciadas por administradores"
ON public.credenciais_qr FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.rpc_emitir_credencial_qr(
  p_visitante_id UUID DEFAULT NULL,
  p_agendamento_id UUID DEFAULT NULL,
  p_expira_em TIMESTAMPTZ DEFAULT now() + interval '24 hours'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token TEXT := encode(gen_random_bytes(32), 'hex');
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem emitir credenciais QR';
  END IF;
  IF p_expira_em <= now() THEN RAISE EXCEPTION 'A validade deve estar no futuro'; END IF;
  IF p_visitante_id IS NULL AND p_agendamento_id IS NULL THEN RAISE EXCEPTION 'Informe visitante ou agendamento'; END IF;

  INSERT INTO public.credenciais_qr (token_hash, visitante_id, agendamento_id, expira_em, criado_por)
  VALUES (encode(digest(v_token, 'sha256'), 'hex'), p_visitante_id, p_agendamento_id, p_expira_em, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.auditoria_logs (acao, tabela, registro_id, detalhes)
  VALUES ('EMISSAO_QR', 'credenciais_qr', v_id, jsonb_build_object('expira_em', p_expira_em));
  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'expira_em', p_expira_em);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_validar_credencial_qr(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_credencial public.credenciais_qr%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  SELECT * INTO v_credencial FROM public.credenciais_qr
  WHERE token_hash = encode(digest(btrim(p_token), 'sha256'), 'hex');
  IF NOT FOUND THEN RETURN jsonb_build_object('valida', false, 'motivo', 'Credencial não encontrada'); END IF;
  IF v_credencial.revogado_em IS NOT NULL THEN RETURN jsonb_build_object('valida', false, 'motivo', 'Credencial revogada'); END IF;
  IF v_credencial.expira_em <= now() THEN RETURN jsonb_build_object('valida', false, 'motivo', 'Credencial expirada'); END IF;

  INSERT INTO public.auditoria_logs (acao, tabela, registro_id, detalhes)
  VALUES ('VALIDACAO_QR', 'credenciais_qr', v_credencial.id, '{}'::jsonb);
  RETURN jsonb_build_object('valida', true, 'credencial_id', v_credencial.id, 'visitante_id', v_credencial.visitante_id, 'agendamento_id', v_credencial.agendamento_id, 'expira_em', v_credencial.expira_em);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rpc_emitir_credencial_qr(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_validar_credencial_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_emitir_credencial_qr(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_validar_credencial_qr(text) TO authenticated;
