-- A gestão estrutural da SMEDU é exclusiva do perfil administrador.
DROP POLICY IF EXISTS "Departamentos gerenciados por administradores" ON public.departamentos;
CREATE POLICY "Departamentos gerenciados por administradores"
ON public.departamentos FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Setores gerenciados por administradores" ON public.setores;
CREATE POLICY "Setores gerenciados por administradores"
ON public.setores FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
