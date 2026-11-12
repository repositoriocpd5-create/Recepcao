-- Acesso por sistema (Recepção, CCO, CPD_OS, AgendaMKT) por usuário.
--   * profiles e acessos_por_email ganham acesso_cpd_os e acesso_agenda_mkt (o administrador acessa todas as chaves);
--   * o gatilho passa a aplicar essas chaves pelo e-mail, assim que o usuário cria o login.
-- A carga dos e-mails da planilha fica fora do repositório (dados pessoais): arquivo local carga_acessos_planilha.sql.
-- Requer 20261026110000 e 20261026110100 (papéis cpd_os e agenda_mkt) já executadas.

begin;

alter table public.profiles
  add column if not exists acesso_cpd_os boolean not null default false,
  add column if not exists acesso_agenda_mkt boolean not null default false;
alter table public.acessos_por_email
  add column if not exists acesso_cpd_os boolean not null default false,
  add column if not exists acesso_agenda_mkt boolean not null default false;

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
  new.acesso_cpd_os := v_acesso.acesso_cpd_os;
  new.acesso_agenda_mkt := v_acesso.acesso_agenda_mkt;
  if v_acesso.role = 'unidade_escolar' then
    new.acesso_cco := false;
    new.cco_unidades := null;
    if new.cargo is null or new.cargo in ('Recepcionista', 'Operador', '') then
      new.cargo := 'Responsável pela unidade';
    end if;
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'admin' and (new.cargo is null or new.cargo = 'Recepcionista') then
    new.cargo := 'Administrador';
  end if;
  return new;
end;
$$;

commit;
