-- CCO: a unidade escolar edita a própria ocorrência enquanto o administrador não a visualizou.
--   * o administrador, ao abrir a ocorrência, grava visualizada_em/visualizada_por (uma única vez);
--   * a edição passa por cco_editar_ocorrencia, que trava a linha e confere, no mesmo instante,
--     que ainda não foi visualizada e continua "registrada" (ninguém do CCO começou o atendimento);
--   * cada edição vira um evento 'edicao' no histórico e uma cópia antes/depois em auditoria_logs.
-- Requer 20261022190000_cco_problema_camera.sql.

begin;

alter table public.cco_ocorrencias
  add column if not exists visualizada_em timestamptz,
  add column if not exists visualizada_por uuid references public.profiles(id) on delete set null,
  add column if not exists visualizada_por_nome text;

alter table public.cco_ocorrencia_historico drop constraint if exists cco_ocorrencia_historico_tipo_check;
alter table public.cco_ocorrencia_historico add constraint cco_ocorrencia_historico_tipo_check
  check (tipo in ('registro', 'situacao', 'responsavel', 'observacao', 'termino', 'andamento', 'solucao', 'reabertura', 'edicao'));

-- O navegador não grava a visualização direto: só pela função abaixo.
create or replace function public.cco_ocorrencia_antes_inserir_visualizacao()
returns trigger
language plpgsql
as $$
begin
  new.visualizada_em := null;
  new.visualizada_por := null;
  new.visualizada_por_nome := null;
  return new;
end;
$$;

drop trigger if exists trg_cco_ocorrencia_antes_inserir_visualizacao on public.cco_ocorrencias;
create trigger trg_cco_ocorrencia_antes_inserir_visualizacao
before insert on public.cco_ocorrencias
for each row execute function public.cco_ocorrencia_antes_inserir_visualizacao();

create or replace function public.cco_marcar_visualizada(p_id uuid)
returns public.cco_ocorrencias
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oc public.cco_ocorrencias%rowtype;
  v_autor public.profiles%rowtype;
begin
  select * into v_oc from public.cco_ocorrencias where id = p_id for update;
  if v_oc.id is null or not public.cco_pode_ver_unidade(v_oc.unidade_id) then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  -- Só o administrador marca; para os demais perfis a chamada não altera nada.
  if public.cco_perfil() is distinct from 'admin' or v_oc.visualizada_em is not null then
    return v_oc;
  end if;

  select * into v_autor from public.profiles where id = auth.uid();
  update public.cco_ocorrencias
  set visualizada_em = now(),
      visualizada_por = v_autor.id,
      visualizada_por_nome = v_autor.nome_completo
  where id = v_oc.id
  returning * into v_oc;
  return v_oc;
end;
$$;

create or replace function public.cco_editar_ocorrencia(
  p_id uuid,
  p_data_ocorrencia date,
  p_hora_inicio time,
  p_hora_fim time,
  p_em_andamento boolean,
  p_termina_dia_seguinte boolean,
  p_descricao text,
  p_tipo_registro text,
  p_cameras text[],
  p_tipo_problema text,
  p_alterar_foto boolean,
  p_foto_path text
)
returns public.cco_ocorrencias
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_antes public.cco_ocorrencias%rowtype;
  v_oc public.cco_ocorrencias%rowtype;
  v_autor public.profiles%rowtype;
begin
  if public.cco_perfil() is distinct from 'unidade' then
    raise exception 'Somente a unidade escolar edita a própria ocorrência.' using errcode = '42501';
  end if;
  select * into v_autor from public.profiles where id = auth.uid();
  select * into v_antes from public.cco_ocorrencias where id = p_id for update;
  if v_antes.id is null or v_antes.unidade_id is distinct from public.cco_minha_unidade() then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  if v_antes.visualizada_em is not null then
    raise exception 'O administrador já visualizou esta ocorrência. Ela não pode mais ser editada.' using errcode = '42501';
  end if;
  if v_antes.situacao <> 'registrada' then
    raise exception 'O CCO já iniciou o atendimento. A ocorrência não pode mais ser editada.' using errcode = '42501';
  end if;
  if p_data_ocorrencia is null or p_data_ocorrencia > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data não pode ser futura.' using errcode = '22023';
  end if;
  if coalesce(p_alterar_foto, false) and p_foto_path is not null
     and p_foto_path not like v_antes.unidade_id::text || '/%' then
    raise exception 'A foto precisa estar na pasta da unidade.' using errcode = '42501';
  end if;

  -- As regras de horário, descrição e câmera são conferidas pelas constraints da tabela.
  update public.cco_ocorrencias
  set data_ocorrencia = p_data_ocorrencia,
      hora_inicio = p_hora_inicio,
      hora_fim = case when coalesce(p_em_andamento, false) then null else p_hora_fim end,
      em_andamento = coalesce(p_em_andamento, false),
      termina_dia_seguinte = not coalesce(p_em_andamento, false) and coalesce(p_termina_dia_seguinte, false),
      descricao = btrim(p_descricao),
      tipo_registro = coalesce(p_tipo_registro, 'ocorrencia'),
      cameras = case when p_tipo_registro = 'camera' then p_cameras else null end,
      tipo_problema = case when p_tipo_registro = 'camera' then nullif(btrim(p_tipo_problema), '') else null end,
      foto_path = case when coalesce(p_alterar_foto, false) then p_foto_path else foto_path end,
      atualizado_por = v_autor.id,
      updated_at = now()
  where id = v_antes.id
  returning * into v_oc;

  insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
  values (v_oc.id, 'edicao', 'Ocorrência editada pela unidade.', v_autor.id, v_autor.nome_completo);

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, 'CCO_EDICAO', 'cco_ocorrencias', v_oc.id, jsonb_build_object(
    'protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome,
    'antes', to_jsonb(v_antes), 'depois', to_jsonb(v_oc)));

  return v_oc;
end;
$$;

revoke execute on function public.cco_marcar_visualizada(uuid) from public, anon;
grant execute on function public.cco_marcar_visualizada(uuid) to authenticated;
revoke execute on function public.cco_editar_ocorrencia(uuid, date, time, time, boolean, boolean, text, text, text[], text, boolean, text) from public, anon;
grant execute on function public.cco_editar_ocorrencia(uuid, date, time, time, boolean, boolean, text, text, text[], text, boolean, text) to authenticated;

commit;
