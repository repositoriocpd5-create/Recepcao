-- Administrador do CCO: administra somente a Central Controle Operacional.
--   * papel novo cco_admin: no CCO tem os poderes do administrador (painel de todas as unidades,
--     visualização, exclusão, reabertura, alerta da IA, sininho e log do CCO);
--   * NÃO acessa a Recepção nem a gestão de usuários (is_admin() continua só para 'admin');
--   * Paulo Sergio Souza Santos (paulo.sergio@edu.itaguai.rj.gov.br) recebe esse papel pelo e-mail.
-- Parte 2 de 2. Requer 20261022215900_cco_administrador_papel.sql já executado (em outra execução)
-- e 20261022210000_cco_alerta_ia.sql.

begin;

alter table public.acessos_por_email drop constraint if exists acessos_por_email_role_check;
alter table public.acessos_por_email add constraint acessos_por_email_role_check
  check (role in ('admin', 'gestor', 'recepcionista', 'atendente', 'unidade_escolar', 'cco', 'cco_admin'));

create or replace function public.cco_perfil()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p.ativo is not true then null
    when p.role::text in ('admin', 'cco_admin') then 'admin'
    when p.role::text = 'unidade_escolar' then 'unidade'
    when p.role::text = 'cco' or p.acesso_cco then 'equipe'
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.cco_pode_ver_unidade(p_unidade uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select case
      when p.ativo is not true or p_unidade is null then false
      when p.role::text in ('admin', 'cco_admin') then true
      when p.role::text = 'unidade_escolar' then p.unidade_id = p_unidade
      when p.role::text = 'cco' or p.acesso_cco then
        coalesce(cardinality(p.cco_unidades), 0) = 0 or p_unidade = any (p.cco_unidades)
      else false
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

-- Fora da Recepção (as políticas restritivas das tabelas da recepção usam esta função).
create or replace function public.acessa_recepcao()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.role::text not in ('unidade_escolar', 'cco', 'cco_admin')
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

-- Fotos do CCO: o administrador do CCO também apaga (ao excluir uma ocorrência).
drop policy if exists "CCO: admin remove fotos" on storage.objects;
create policy "CCO: admin remove fotos"
on storage.objects for delete to authenticated
using (bucket_id = 'cco-fotos' and (public.is_admin() or public.cco_perfil() = 'admin'));

-- Log do CCO: o administrador do CCO lê só os eventos do CCO.
drop policy if exists "Administrador do CCO le o log do CCO" on public.auditoria_logs;
create policy "Administrador do CCO le o log do CCO"
on public.auditoria_logs for select to authenticated
using (
  acao like 'CCO\_%'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.ativo and p.role::text = 'cco_admin')
);

-- Gatilho de perfis: cargo do administrador do CCO; sem unidade e sem acesso de equipe.
create or replace function public.profiles_aplicar_acesso_por_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_acesso public.acessos_por_email%rowtype;
begin
  select * into v_acesso from public.acessos_por_email where email = lower(btrim(new.email));
  if v_acesso.email is null then
    return new;
  end if;
  new.role := v_acesso.role::public.user_role;
  new.unidade_id := case when v_acesso.role = 'unidade_escolar' then v_acesso.unidade_id end;
  if v_acesso.role = 'unidade_escolar' then
    new.acesso_cco := false;
    new.cco_unidades := null;
    new.cargo := coalesce(v_acesso.cargo, case when new.cargo is null or new.cargo in ('Recepcionista', 'Operador', '') then 'Responsável pela unidade' else new.cargo end);
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'cco_admin' then
    new.acesso_cco := false;
    new.cco_unidades := null;
    new.cargo := coalesce(v_acesso.cargo, 'Administrador do CCO');
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'admin' then
    new.cargo := coalesce(v_acesso.cargo, case when new.cargo is null or new.cargo = 'Recepcionista' then 'Administrador' else new.cargo end);
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  end if;
  return new;
end;
$$;

insert into public.acessos_por_email (email, role, unidade_id, responsavel, cargo) values
  ('paulo.sergio@edu.itaguai.rj.gov.br', 'cco_admin', null, 'Paulo Sergio Souza Santos', 'Administrador do CCO')
on conflict (email) do update
set role = excluded.role, unidade_id = null, responsavel = excluded.responsavel, cargo = excluded.cargo;

-- Se a conta dele já existir, aplica agora.
update public.profiles
set role = 'cco_admin'::public.user_role,
    unidade_id = null,
    acesso_cco = false,
    cco_unidades = null,
    cargo = 'Administrador do CCO',
    nome_completo = case when nome_completo is null or nome_completo = split_part(email, '@', 1) then 'Paulo Sergio Souza Santos' else nome_completo end,
    updated_at = now()
where lower(btrim(email)) = 'paulo.sergio@edu.itaguai.rj.gov.br';

commit;
