-- Melhoria da trilha de auditoria: preservar ip_origem do terminal (portaria).
-- Operadores fixos (ex: 192.168.10.25 - Portaria) têm o IP registrado pelo front-end.

BEGIN;

CREATE OR REPLACE FUNCTION public.auditoria_forcar_operador()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria para auditoria';
  END IF;
  NEW.usuario_id    := auth.uid();
  NEW.usuario_email := COALESCE(
    (SELECT email FROM public.profiles WHERE id = auth.uid()),
    NEW.usuario_email
  );
  -- Preserva o ip_origem enviado pelo cliente; nao forca NULL.
  NEW.ip_origem := COALESCE(NEW.ip_origem, NULL);
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Logs de auditoria visiveis apenas para admin e gestor" ON public.auditoria_logs;
CREATE POLICY "Logs de auditoria visiveis apenas para admin e gestor"
ON public.auditoria_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','gestor','recepcionista'))
);

COMMIT;
