-- ==============================================================================
-- Migration 03: Row Level Security (RLS) & Granular Access Control
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autorizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- 2. Funções auxiliares para verificação de permissões
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(role = 'admin', false) FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Políticas para PROFILES
DROP POLICY IF EXISTS "Perfis visiveis para usuarios autenticados" ON public.profiles;
CREATE POLICY "Perfis visiveis para usuarios autenticados"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Apenas admin ou o proprio usuario pode editar perfil" ON public.profiles;
CREATE POLICY "Apenas admin ou o proprio usuario pode editar perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- 4. Políticas para DEPARTAMENTOS e SETORES (Leitura para todos autenticados, Escrita apenas Admin/Gestor)
DROP POLICY IF EXISTS "Departamentos visiveis para operadores" ON public.departamentos;
CREATE POLICY "Departamentos visiveis para operadores"
ON public.departamentos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Departamentos gerenciados por administradores" ON public.departamentos;
CREATE POLICY "Departamentos gerenciados por administradores"
ON public.departamentos FOR ALL
TO authenticated
USING (public.current_profile_role() IN ('admin', 'gestor'));

DROP POLICY IF EXISTS "Setores visiveis para operadores" ON public.setores;
CREATE POLICY "Setores visiveis para operadores"
ON public.setores FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Setores gerenciados por administradores" ON public.setores;
CREATE POLICY "Setores gerenciados por administradores"
ON public.setores FOR ALL
TO authenticated
USING (public.current_profile_role() IN ('admin', 'gestor'));

-- 5. Políticas para SERVIDORES
DROP POLICY IF EXISTS "Servidores consultaveis por autenticados" ON public.servidores;
CREATE POLICY "Servidores consultaveis por autenticados"
ON public.servidores FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Servidores gerenciados por admin e gestor" ON public.servidores;
CREATE POLICY "Servidores gerenciados por admin e gestor"
ON public.servidores FOR ALL
TO authenticated
USING (public.current_profile_role() IN ('admin', 'gestor'));

-- 6. Políticas para VISITANTES
DROP POLICY IF EXISTS "Visitantes visiveis por autenticados" ON public.visitantes;
CREATE POLICY "Visitantes visiveis por autenticados"
ON public.visitantes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Operadores podem cadastrar e atualizar visitantes" ON public.visitantes;
CREATE POLICY "Operadores podem cadastrar e atualizar visitantes"
ON public.visitantes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Operadores podem atualizar dados de visitantes" ON public.visitantes;
CREATE POLICY "Operadores podem atualizar dados de visitantes"
ON public.visitantes FOR UPDATE
TO authenticated
USING (true);

-- 7. Políticas para MOVIMENTACOES
DROP POLICY IF EXISTS "Movimentacoes visiveis por autenticados" ON public.movimentacoes;
CREATE POLICY "Movimentacoes visiveis por autenticados"
ON public.movimentacoes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Operadores podem registrar movimentacoes" ON public.movimentacoes;
CREATE POLICY "Operadores podem registrar movimentacoes"
ON public.movimentacoes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Operadores podem atualizar status da movimentacao" ON public.movimentacoes;
CREATE POLICY "Operadores podem atualizar status da movimentacao"
ON public.movimentacoes FOR UPDATE
TO authenticated
USING (true);

-- 8. Políticas para AUTORIZACOES
DROP POLICY IF EXISTS "Autorizacoes visiveis por autenticados" ON public.autorizacoes;
CREATE POLICY "Autorizacoes visiveis por autenticados"
ON public.autorizacoes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Operadores podem criar solicitacoes de autorizacao" ON public.autorizacoes;
CREATE POLICY "Operadores podem criar solicitacoes de autorizacao"
ON public.autorizacoes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Operadores podem atualizar autorizacoes" ON public.autorizacoes;
CREATE POLICY "Operadores podem atualizar autorizacoes"
ON public.autorizacoes FOR UPDATE
TO authenticated
USING (true);

-- 9. Políticas para AGENDAMENTOS
DROP POLICY IF EXISTS "Agendamentos visiveis por autenticados" ON public.agendamentos;
CREATE POLICY "Agendamentos visiveis por autenticados"
ON public.agendamentos FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Operadores podem gerenciar agendamentos" ON public.agendamentos;
CREATE POLICY "Operadores podem gerenciar agendamentos"
ON public.agendamentos FOR ALL
TO authenticated
USING (true);

-- 10. Políticas para AUDITORIA_LOGS
-- NUNCA permitir acesso anonimo; Apenas admin e gestores leem auditoria; Nenhum usuario deleta logs.
DROP POLICY IF EXISTS "Logs de auditoria visiveis apenas para admin e gestor" ON public.auditoria_logs;
CREATE POLICY "Logs de auditoria visiveis apenas para admin e gestor"
ON public.auditoria_logs FOR SELECT
TO authenticated
USING (public.current_profile_role() IN ('admin', 'gestor'));

DROP POLICY IF EXISTS "Insercao de logs permitida para o sistema" ON public.auditoria_logs;
CREATE POLICY "Insercao de logs permitida para o sistema"
ON public.auditoria_logs FOR INSERT
TO authenticated
WITH CHECK (true);
