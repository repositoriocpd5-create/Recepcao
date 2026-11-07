-- Somente administradores podem gerir pessoas vinculadas aos setores e sua regra individual de autorização.
DROP POLICY IF EXISTS "Administradores gerenciam vinculos de servidores" ON public.servidor_setor_vinculos;
CREATE POLICY "Administradores gerenciam vinculos de servidores"
ON public.servidor_setor_vinculos FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
