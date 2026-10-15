-- Endurecimento incremental: funções SECURITY DEFINER, execução e auditoria.
-- Não aplica mudanças destrutivas e preserva as RPCs existentes.

ALTER FUNCTION public.current_profile_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_registrar_entrada(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_registrar_saida(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_consultar_servidor(varchar) SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_consultar_visitante(varchar) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.rpc_registrar_entrada(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_registrar_saida(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_consultar_servidor(varchar) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_consultar_visitante(varchar) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_registrar_entrada(pessoa_tipo, uuid, uuid, uuid, uuid, varchar, text, boolean, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_registrar_saida(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_consultar_servidor(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_consultar_visitante(varchar) TO authenticated;

CREATE OR REPLACE FUNCTION public.auditoria_forcar_operador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para auditoria';
  END IF;

  NEW.usuario_id := auth.uid();
  NEW.usuario_email := COALESCE(
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    NEW.usuario_email
  );
  NEW.ip_origem := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_forcar_operador ON public.auditoria_logs;
CREATE TRIGGER trg_auditoria_forcar_operador
BEFORE INSERT ON public.auditoria_logs
FOR EACH ROW EXECUTE FUNCTION public.auditoria_forcar_operador();

DROP POLICY IF EXISTS "Insercao de logs permitida para o sistema" ON public.auditoria_logs;
CREATE POLICY "Usuarios autenticados registram auditoria imutavel"
ON public.auditoria_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
