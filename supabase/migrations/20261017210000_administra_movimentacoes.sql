-- Restringe a alteração e a exclusão direta de movimentações ao perfil administrativo.
DROP POLICY IF EXISTS "Operadores podem atualizar status da movimentacao" ON public.movimentacoes;
DROP POLICY IF EXISTS "Administradores podem atualizar movimentacoes" ON public.movimentacoes;
CREATE POLICY "Administradores podem atualizar movimentacoes"
ON public.movimentacoes FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Administradores podem excluir movimentacoes" ON public.movimentacoes;
CREATE POLICY "Administradores podem excluir movimentacoes"
ON public.movimentacoes FOR DELETE
TO authenticated
USING (public.is_admin());
