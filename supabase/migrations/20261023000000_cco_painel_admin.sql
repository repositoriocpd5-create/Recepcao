-- Painel do administrador no CCO: coluna "Direção" de cada unidade.
-- O administrador geral já lê acessos_por_email (is_admin); o administrador do CCO passa a ler
-- só as linhas das unidades escolares (nome e cargo de quem dirige cada escola).
-- Requer 20261022220000_cco_administrador.sql.

begin;

drop policy if exists "Administrador do CCO le a direcao das unidades" on public.acessos_por_email;
create policy "Administrador do CCO le a direcao das unidades"
on public.acessos_por_email for select to authenticated
using (role = 'unidade_escolar' and public.cco_perfil() = 'admin');

commit;
