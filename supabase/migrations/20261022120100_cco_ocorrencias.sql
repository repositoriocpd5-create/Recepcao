-- CCO — Central Controle Operacional
-- Ocorrências do monitoramento das câmeras das unidades escolares.
--
-- Requer a migração 20261022120000_cco_papeis.sql (papéis unidade_escolar e cco).
-- Comparações de papel usam role::text para não depender do novo valor do enum
-- dentro desta transação.
--
-- Isolamento:
--   * unidade_escolar só lê as ocorrências e as fotos da própria unidade (profiles.unidade_id);
--   * equipe CCO (papel cco, ou operador da recepção com profiles.acesso_cco) lê as unidades
--     autorizadas em profiles.cco_unidades (vazio = todas);
--   * admin lê tudo.
-- A data/horários da ocorrência ficam separados do momento do cadastro (created_at).

begin;

-- ─── 1. Vínculo do usuário com a unidade e permissões do CCO ───
alter table public.profiles
  add column if not exists unidade_id uuid references public.ramais_unidades(id) on delete set null,
  add column if not exists acesso_cco boolean not null default false,
  add column if not exists cco_unidades uuid[];

comment on column public.profiles.unidade_id is 'Unidade escolar do usuário (papel unidade_escolar).';
comment on column public.profiles.acesso_cco is 'Operador da recepção que também integra a equipe do CCO.';
comment on column public.profiles.cco_unidades is 'Unidades que a equipe CCO pode acompanhar; vazio ou nulo = todas.';

-- Só o administrador (ou a Edge Function, com a chave de serviço) muda papel, situação,
-- unidade e permissões. Antes, qualquer usuário podia alterar o próprio papel.
create or replace function public.profiles_protege_campos_de_acesso()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.ativo is distinct from old.ativo
     or new.unidade_id is distinct from old.unidade_id
     or new.acesso_cco is distinct from old.acesso_cco
     or new.cco_unidades is distinct from old.cco_unidades then
    raise exception 'Somente administradores alteram papel, unidade e permissões de acesso.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protege_campos_de_acesso on public.profiles;
create trigger trg_profiles_protege_campos_de_acesso
before update on public.profiles
for each row execute function public.profiles_protege_campos_de_acesso();

-- ─── 2. Funções de permissão ───
create or replace function public.cco_perfil()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p.ativo is not true then null
    when p.role::text = 'admin' then 'admin'
    when p.role::text = 'unidade_escolar' then 'unidade'
    when p.role::text = 'cco' or p.acesso_cco then 'equipe'
  end
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.cco_minha_unidade()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.unidade_id
  from public.profiles p
  where p.id = auth.uid() and p.role::text = 'unidade_escolar' and p.ativo;
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
      when p.role::text = 'admin' then true
      when p.role::text = 'unidade_escolar' then p.unidade_id = p_unidade
      when p.role::text = 'cco' or p.acesso_cco then
        coalesce(cardinality(p.cco_unidades), 0) = 0 or p_unidade = any (p.cco_unidades)
      else false
    end
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

/** Usuários dos papéis do CCO não acessam os dados da recepção. */
create or replace function public.acessa_recepcao()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select p.role::text not in ('unidade_escolar', 'cco')
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

/** Converte o nome da pasta do Storage em uuid sem estourar erro. */
create or replace function public.cco_uuid_seguro(p_texto text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_texto::uuid;
exception when others then
  return null;
end;
$$;

-- ─── 3. Ocorrências ───
create sequence if not exists public.cco_protocolo_seq;

create table if not exists public.cco_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  unidade_id uuid not null references public.ramais_unidades(id),
  unidade_nome text not null,
  -- Quando aconteceu (informado pela escola)
  data_ocorrencia date not null,
  hora_inicio time not null,
  hora_fim time,
  em_andamento boolean not null default false,
  termina_dia_seguinte boolean not null default false,
  descricao text not null,
  foto_path text,
  -- Atendimento pelo CCO
  situacao text not null default 'registrada',
  responsavel_id uuid references public.profiles(id) on delete set null,
  responsavel_nome text,
  -- Autoria e momento do cadastro
  criado_por uuid references public.profiles(id) on delete set null,
  criado_por_nome text,
  criado_por_email text,
  -- Identificador gerado no navegador: o mesmo envio repetido não duplica o registro.
  client_request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  atualizado_por uuid references public.profiles(id) on delete set null,
  constraint cco_situacao_valida check (situacao in ('registrada', 'em_analise', 'em_atendimento', 'concluida')),
  constraint cco_descricao_tamanho check (char_length(btrim(descricao)) between 10 and 4000),
  constraint cco_horario_final_obrigatorio check (em_andamento or hora_fim is not null),
  constraint cco_em_andamento_sem_fim check (not em_andamento or (hora_fim is null and not termina_dia_seguinte)),
  constraint cco_dia_seguinte_coerente check (not termina_dia_seguinte or hora_fim < hora_inicio),
  constraint cco_fim_apos_inicio check (em_andamento or termina_dia_seguinte or hora_fim >= hora_inicio)
);

create index if not exists idx_cco_ocorrencias_unidade on public.cco_ocorrencias (unidade_id, created_at desc);
create index if not exists idx_cco_ocorrencias_situacao on public.cco_ocorrencias (situacao, created_at desc);
create index if not exists idx_cco_ocorrencias_data on public.cco_ocorrencias (data_ocorrencia desc);

create table if not exists public.cco_ocorrencia_historico (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.cco_ocorrencias(id) on delete cascade,
  tipo text not null check (tipo in ('registro', 'situacao', 'responsavel', 'observacao', 'termino')),
  situacao_anterior text,
  situacao_nova text,
  descricao text,
  autor_id uuid references public.profiles(id) on delete set null,
  autor_nome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cco_historico_ocorrencia on public.cco_ocorrencia_historico (ocorrencia_id, created_at);

-- Antes de gravar: o banco define protocolo, autoria, unidade e situação inicial
-- (o navegador não consegue forjar esses campos).
create or replace function public.cco_ocorrencia_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_perfil public.profiles%rowtype;
begin
  select * into v_perfil from public.profiles where id = auth.uid();
  if v_perfil.id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  new.protocolo := 'CCO-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-'
    || lpad(nextval('public.cco_protocolo_seq')::text, 6, '0');
  new.unidade_nome := (select nome from public.ramais_unidades where id = new.unidade_id);
  if new.unidade_nome is null then
    raise exception 'Unidade escolar não encontrada.' using errcode = '23503';
  end if;
  new.descricao := btrim(new.descricao);
  new.situacao := 'registrada';
  new.responsavel_id := null;
  new.responsavel_nome := null;
  new.criado_por := v_perfil.id;
  new.criado_por_nome := v_perfil.nome_completo;
  new.criado_por_email := v_perfil.email;
  new.atualizado_por := v_perfil.id;
  new.created_at := now();
  new.updated_at := now();
  if new.foto_path is not null and new.foto_path not like new.unidade_id::text || '/%' then
    raise exception 'A foto precisa estar na pasta da unidade.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cco_ocorrencia_antes_inserir on public.cco_ocorrencias;
create trigger trg_cco_ocorrencia_antes_inserir
before insert on public.cco_ocorrencias
for each row execute function public.cco_ocorrencia_antes_inserir();

create or replace function public.cco_ocorrencia_depois_inserir()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, situacao_nova, descricao, autor_id, autor_nome)
  values (new.id, 'registro', 'registrada', 'Ocorrência registrada pela unidade.', new.criado_por, new.criado_por_nome);

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (new.criado_por, new.criado_por_email, 'CCO_REGISTRO', 'cco_ocorrencias', new.id::text, jsonb_build_object(
    'protocolo', new.protocolo,
    'unidade', new.unidade_nome,
    'data_ocorrencia', new.data_ocorrencia,
    'hora_inicio', to_char(new.hora_inicio, 'HH24:MI'),
    'hora_fim', to_char(new.hora_fim, 'HH24:MI'),
    'em_andamento', new.em_andamento,
    'termina_dia_seguinte', new.termina_dia_seguinte,
    'com_foto', new.foto_path is not null
  ));
  return new;
end;
$$;

drop trigger if exists trg_cco_ocorrencia_depois_inserir on public.cco_ocorrencias;
create trigger trg_cco_ocorrencia_depois_inserir
after insert on public.cco_ocorrencias
for each row execute function public.cco_ocorrencia_depois_inserir();

-- ─── 4. RLS ───
alter table public.cco_ocorrencias enable row level security;
alter table public.cco_ocorrencia_historico enable row level security;

drop policy if exists "CCO: leitura conforme a unidade" on public.cco_ocorrencias;
create policy "CCO: leitura conforme a unidade"
on public.cco_ocorrencias for select to authenticated
using (public.cco_pode_ver_unidade(unidade_id));

drop policy if exists "CCO: unidade registra as próprias ocorrências" on public.cco_ocorrencias;
create policy "CCO: unidade registra as próprias ocorrências"
on public.cco_ocorrencias for insert to authenticated
with check (public.cco_perfil() = 'unidade' and unidade_id = public.cco_minha_unidade());
-- Sem política de UPDATE/DELETE: alterações só pelas funções abaixo, que registram histórico e auditoria.

drop policy if exists "CCO: histórico conforme a unidade" on public.cco_ocorrencia_historico;
create policy "CCO: histórico conforme a unidade"
on public.cco_ocorrencia_historico for select to authenticated
using (exists (
  select 1 from public.cco_ocorrencias o
  where o.id = ocorrencia_id and public.cco_pode_ver_unidade(o.unidade_id)
));

-- ─── 5. Atendimento pela equipe CCO ───
create or replace function public.cco_atualizar_ocorrencia(
  p_id uuid,
  p_situacao text default null,
  p_responsavel_id uuid default null,
  p_remover_responsavel boolean default false,
  p_observacao text default null
)
returns public.cco_ocorrencias
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oc public.cco_ocorrencias%rowtype;
  v_autor public.profiles%rowtype;
  v_resp public.profiles%rowtype;
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_alteracoes jsonb := '{}'::jsonb;
  v_rotulos constant jsonb := '{"registrada":"Registrada","em_analise":"Em análise","em_atendimento":"Em atendimento","concluida":"Concluída"}';
begin
  if public.cco_perfil() not in ('admin', 'equipe') or public.cco_perfil() is null then
    raise exception 'Apenas a equipe do CCO atualiza ocorrências.' using errcode = '42501';
  end if;
  select * into v_autor from public.profiles where id = auth.uid();
  select * into v_oc from public.cco_ocorrencias where id = p_id for update;
  if v_oc.id is null or not public.cco_pode_ver_unidade(v_oc.unidade_id) then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  if v_obs is not null and char_length(v_obs) > 2000 then
    raise exception 'A observação pode ter até 2.000 caracteres.' using errcode = '22001';
  end if;

  if p_situacao is not null and p_situacao <> v_oc.situacao then
    if p_situacao not in ('registrada', 'em_analise', 'em_atendimento', 'concluida') then
      raise exception 'Situação inválida.' using errcode = '22023';
    end if;
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, situacao_anterior, situacao_nova, descricao, autor_id, autor_nome)
    values (v_oc.id, 'situacao', v_oc.situacao, p_situacao,
      'Situação alterada de ' || (v_rotulos ->> v_oc.situacao) || ' para ' || (v_rotulos ->> p_situacao) || '.',
      v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('situacao', jsonb_build_object('de', v_oc.situacao, 'para', p_situacao));
    v_oc.situacao := p_situacao;
  end if;

  if p_remover_responsavel and v_oc.responsavel_id is not null then
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
    values (v_oc.id, 'responsavel', 'Responsável removido (' || coalesce(v_oc.responsavel_nome, '—') || ').', v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('responsavel', jsonb_build_object('de', v_oc.responsavel_nome, 'para', null));
    v_oc.responsavel_id := null;
    v_oc.responsavel_nome := null;
  elsif p_responsavel_id is not null and p_responsavel_id is distinct from v_oc.responsavel_id then
    select * into v_resp from public.profiles
    where id = p_responsavel_id and ativo and (role::text in ('admin', 'cco') or acesso_cco);
    if v_resp.id is null then
      raise exception 'O responsável precisa ser da equipe do CCO.' using errcode = '22023';
    end if;
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
    values (v_oc.id, 'responsavel', 'Responsável definido: ' || v_resp.nome_completo || '.', v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('responsavel', jsonb_build_object('de', v_oc.responsavel_nome, 'para', v_resp.nome_completo));
    v_oc.responsavel_id := v_resp.id;
    v_oc.responsavel_nome := v_resp.nome_completo;
  end if;

  if v_obs is not null then
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
    values (v_oc.id, 'observacao', v_obs, v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('observacao', v_obs);
  end if;

  if v_alteracoes = '{}'::jsonb then
    return v_oc;
  end if;

  update public.cco_ocorrencias
  set situacao = v_oc.situacao,
      responsavel_id = v_oc.responsavel_id,
      responsavel_nome = v_oc.responsavel_nome,
      atualizado_por = v_autor.id,
      updated_at = now()
  where id = v_oc.id
  returning * into v_oc;

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, 'CCO_ATUALIZACAO', 'cco_ocorrencias', v_oc.id::text,
    jsonb_build_object('protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome) || v_alteracoes);

  return v_oc;
end;
$$;

-- A unidade (ou a equipe) informa o horário final de uma ocorrência que estava em andamento.
create or replace function public.cco_informar_termino(
  p_id uuid,
  p_hora_fim time,
  p_dia_seguinte boolean default false
)
returns public.cco_ocorrencias
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oc public.cco_ocorrencias%rowtype;
  v_autor public.profiles%rowtype;
begin
  if public.cco_perfil() is null then
    raise exception 'Sem acesso ao CCO.' using errcode = '42501';
  end if;
  select * into v_autor from public.profiles where id = auth.uid();
  select * into v_oc from public.cco_ocorrencias where id = p_id for update;
  if v_oc.id is null or not public.cco_pode_ver_unidade(v_oc.unidade_id) then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  if not v_oc.em_andamento then
    raise exception 'Esta ocorrência já tem horário final.' using errcode = '22023';
  end if;
  if p_hora_fim is null then
    raise exception 'Informe o horário final.' using errcode = '22023';
  end if;
  if coalesce(p_dia_seguinte, false) <> (p_hora_fim < v_oc.hora_inicio) then
    raise exception 'O horário final é anterior ao inicial: confirme se terminou no dia seguinte.' using errcode = '22023';
  end if;

  update public.cco_ocorrencias
  set em_andamento = false,
      hora_fim = p_hora_fim,
      termina_dia_seguinte = coalesce(p_dia_seguinte, false),
      atualizado_por = v_autor.id,
      updated_at = now()
  where id = v_oc.id
  returning * into v_oc;

  insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
  values (v_oc.id, 'termino',
    'Horário final informado: ' || to_char(p_hora_fim, 'HH24:MI') || case when v_oc.termina_dia_seguinte then ' (dia seguinte).' else '.' end,
    v_autor.id, v_autor.nome_completo);

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, 'CCO_TERMINO', 'cco_ocorrencias', v_oc.id::text, jsonb_build_object(
    'protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome,
    'hora_fim', to_char(p_hora_fim, 'HH24:MI'), 'termina_dia_seguinte', v_oc.termina_dia_seguinte));

  return v_oc;
end;
$$;

revoke execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text) from public, anon;
revoke execute on function public.cco_informar_termino(uuid, time, boolean) from public, anon;
grant execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text) to authenticated;
grant execute on function public.cco_informar_termino(uuid, time, boolean) to authenticated;

-- ─── 6. Fotos: bucket privado, exibidas por URL assinada ───
-- Caminho: <unidade_id>/<client_request_id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cco-fotos', 'cco-fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CCO: ver fotos da unidade" on storage.objects;
create policy "CCO: ver fotos da unidade"
on storage.objects for select to authenticated
using (bucket_id = 'cco-fotos' and public.cco_pode_ver_unidade(public.cco_uuid_seguro((storage.foldername(name))[1])));

drop policy if exists "CCO: unidade envia fotos" on storage.objects;
create policy "CCO: unidade envia fotos"
on storage.objects for insert to authenticated
with check (bucket_id = 'cco-fotos' and (storage.foldername(name))[1] = public.cco_minha_unidade()::text);

drop policy if exists "CCO: unidade reenvia fotos" on storage.objects;
create policy "CCO: unidade reenvia fotos"
on storage.objects for update to authenticated
using (bucket_id = 'cco-fotos' and (storage.foldername(name))[1] = public.cco_minha_unidade()::text)
with check (bucket_id = 'cco-fotos' and (storage.foldername(name))[1] = public.cco_minha_unidade()::text);

drop policy if exists "CCO: admin remove fotos" on storage.objects;
create policy "CCO: admin remove fotos"
on storage.objects for delete to authenticated
using (bucket_id = 'cco-fotos' and public.is_admin());

-- ─── 7. Usuários do CCO não enxergam os dados da recepção ───
-- Políticas RESTRITIVAS: somam-se às existentes sem mudar o acesso dos operadores da recepção.
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'servidores', 'visitantes', 'movimentacoes', 'movimentacao_destinos', 'autorizacoes',
    'agendamentos', 'crachas', 'atribuicoes_cracha', 'credenciais_qr',
    'servidor_setor_vinculos', 'setor_vinculos_importados', 'departamentos', 'setores'
  ] loop
    if to_regclass('public.' || v_tabela) is not null then
      execute format('drop policy if exists "Somente operadores da recepcao" on public.%I', v_tabela);
      execute format(
        'create policy "Somente operadores da recepcao" on public.%I as restrictive for all to authenticated '
        || 'using (public.acessa_recepcao()) with check (public.acessa_recepcao())', v_tabela);
    end if;
  end loop;
end;
$$;

-- Perfis: a unidade vê só o próprio; recepção e equipe CCO continuam vendo todos.
drop policy if exists "Unidade escolar ve apenas o proprio perfil" on public.profiles;
create policy "Unidade escolar ve apenas o proprio perfil"
on public.profiles as restrictive for select to authenticated
using (id = auth.uid() or public.acessa_recepcao() or public.cco_perfil() in ('admin', 'equipe'));

drop policy if exists "Fotos de visitantes so para a recepcao" on storage.objects;
create policy "Fotos de visitantes so para a recepcao"
on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'visitantes-fotos' or public.acessa_recepcao())
with check (bucket_id <> 'visitantes-fotos' or public.acessa_recepcao());

commit;
