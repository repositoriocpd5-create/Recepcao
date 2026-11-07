-- Administrador do CCO — parte 1 de 2: cria o papel cco_admin.
-- Fica sozinho neste arquivo porque o Postgres só deixa usar um valor novo de enum depois que ele
-- foi gravado (commit). No SQL Editor do Supabase, rode este arquivo primeiro e, em seguida,
-- 20261022220000_cco_administrador.sql em outra execução.

alter type public.user_role add value if not exists 'cco_admin';
