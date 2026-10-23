-- Local da ocorrência e visita presencial à unidade.
--   * locais: onde aconteceu (lista de sugestões ou texto livre), informado pela unidade no registro
--     e na edição;
--   * visita_data / visita_hora: visita presencial agendada pela equipe do CCO quando não for possível
--     verificar as imagens remotamente. Cada agendamento, alteração ou cancelamento entra no
--     histórico (visível para a unidade) e na auditoria.
-- Requer 20261022150000_cco_andamentos_finalizacao.sql e 20261022200000_cco_edicao_pela_unidade.sql.

begin;

alter table public.cco_ocorrencias
  add column if not exists locais text[],
  add column if not exists visita_data date,
  add column if not exists visita_hora time;

alter table public.cco_ocorrencias drop constraint if exists cco_ocorrencias_locais_check;
alter table public.cco_ocorrencias add constraint cco_ocorrencias_locais_check
  check (locais is null or (cardinality(locais) between 1 and 10 and char_length(array_to_string(locais, '')) <= 600));

-- A unidade não agenda visita ao registrar: só a equipe do CCO, pela função de atualização.
create or replace function public.cco_ocorrencia_antes_inserir_local_visita()
returns trigger
language plpgsql
as $$
begin
  new.visita_data := null;
  new.visita_hora := null;
  if new.tipo_registro = 'camera' or cardinality(new.locais) = 0 then
    new.locais := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cco_ocorrencia_antes_inserir_local_visita on public.cco_ocorrencias;
create trigger trg_cco_ocorrencia_antes_inserir_local_visita
before insert on public.cco_ocorrencias
for each row execute function public.cco_ocorrencia_antes_inserir_local_visita();

-- ─── Atualização pela equipe: + visita presencial ───
drop function if exists public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text);

create or replace function public.cco_atualizar_ocorrencia(
  p_id uuid,
  p_situacao text default null,
  p_responsavel_id uuid default null,
  p_remover_responsavel boolean default false,
  p_observacao text default null,
  p_visita_data date default null,
  p_visita_hora time default null,
  p_remover_visita boolean default false
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
  v_perfil text := public.cco_perfil();
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_alteracoes jsonb := '{}'::jsonb;
  v_acao text := 'CCO_ATUALIZACAO';
  v_tipo_texto text := 'andamento';
  v_finalizando boolean;
  v_reabrindo boolean;
  v_mudou_visita boolean;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_rotulos constant jsonb := '{"registrada":"Registrada","em_analise":"Em análise","em_atendimento":"Em atendimento","concluida":"Solucionada"}';
begin
  if v_perfil is null or v_perfil not in ('admin', 'equipe') then
    raise exception 'Apenas a equipe do CCO atualiza ocorrências.' using errcode = '42501';
  end if;
  select * into v_autor from public.profiles where id = auth.uid();
  select * into v_oc from public.cco_ocorrencias where id = p_id for update;
  if v_oc.id is null or not public.cco_pode_ver_unidade(v_oc.unidade_id) then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  if v_obs is not null and char_length(v_obs) > 2000 then
    raise exception 'O texto pode ter até 2.000 caracteres.' using errcode = '22001';
  end if;
  if p_situacao is not null and p_situacao not in ('registrada', 'em_analise', 'em_atendimento', 'concluida') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;

  v_finalizando := p_situacao = 'concluida' and v_oc.situacao <> 'concluida';
  v_reabrindo := v_oc.situacao = 'concluida' and p_situacao is not null and p_situacao <> 'concluida';
  v_mudou_visita := (coalesce(p_remover_visita, false) and v_oc.visita_data is not null)
    or (p_visita_data is not null and (p_visita_data is distinct from v_oc.visita_data or p_visita_hora is distinct from v_oc.visita_hora));

  if v_oc.situacao = 'concluida' and not v_reabrindo
     and (v_obs is not null or p_remover_responsavel or p_responsavel_id is distinct from null or v_mudou_visita) then
    raise exception 'Ocorrência finalizada: reabra para registrar novos andamentos.' using errcode = '22023';
  end if;
  if v_reabrindo and v_perfil <> 'admin' then
    raise exception 'Somente o administrador reabre uma ocorrência finalizada.' using errcode = '42501';
  end if;
  if v_finalizando and (v_obs is null or char_length(v_obs) < 5) then
    raise exception 'Descreva a solução para finalizar a ocorrência.' using errcode = '22023';
  end if;
  if v_reabrindo and (v_obs is null or char_length(v_obs) < 5) then
    raise exception 'Informe o motivo da reabertura.' using errcode = '22023';
  end if;
  if p_visita_data is not null and v_mudou_visita and p_visita_data < v_hoje then
    raise exception 'A data da visita não pode estar no passado.' using errcode = '22023';
  end if;
  if p_visita_data is not null and p_visita_data > v_hoje + 180 then
    raise exception 'Agende a visita para os próximos 6 meses.' using errcode = '22023';
  end if;

  if p_situacao is not null and p_situacao <> v_oc.situacao then
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, situacao_anterior, situacao_nova, descricao, autor_id, autor_nome)
    values (v_oc.id, 'situacao', v_oc.situacao, p_situacao,
      case
        when v_finalizando then 'Ocorrência finalizada como Solucionada.'
        when v_reabrindo then 'Ocorrência reaberta: situação ' || (v_rotulos ->> p_situacao) || '.'
        else 'Situação alterada de ' || (v_rotulos ->> v_oc.situacao) || ' para ' || (v_rotulos ->> p_situacao) || '.'
      end,
      v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('situacao', jsonb_build_object('de', v_oc.situacao, 'para', p_situacao));
    v_oc.situacao := p_situacao;
    if v_finalizando then v_acao := 'CCO_FINALIZACAO'; v_tipo_texto := 'solucao'; end if;
    if v_reabrindo then v_acao := 'CCO_REABERTURA'; v_tipo_texto := 'reabertura'; end if;
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

  -- Visita presencial (agendar, reagendar ou cancelar)
  if v_mudou_visita then
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
    values (v_oc.id, 'andamento',
      case
        when coalesce(p_remover_visita, false) then
          'Visita presencial à unidade cancelada (estava agendada para ' || to_char(v_oc.visita_data, 'DD/MM/YYYY')
          || coalesce(' às ' || to_char(v_oc.visita_hora, 'HH24:MI'), '') || ').'
        else
          case when v_oc.visita_data is null then 'Visita presencial à unidade agendada para ' else 'Visita presencial à unidade reagendada para ' end
          || to_char(p_visita_data, 'DD/MM/YYYY') || coalesce(' às ' || to_char(p_visita_hora, 'HH24:MI'), '')
          || '. A equipe do CCO irá à unidade verificar as imagens no local.'
      end,
      v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object('visita', jsonb_build_object(
      'de', case when v_oc.visita_data is null then null else to_char(v_oc.visita_data, 'YYYY-MM-DD') || coalesce(' ' || to_char(v_oc.visita_hora, 'HH24:MI'), '') end,
      'para', case when coalesce(p_remover_visita, false) then null else to_char(p_visita_data, 'YYYY-MM-DD') || coalesce(' ' || to_char(p_visita_hora, 'HH24:MI'), '') end));
    if coalesce(p_remover_visita, false) then
      v_oc.visita_data := null;
      v_oc.visita_hora := null;
    else
      v_oc.visita_data := p_visita_data;
      v_oc.visita_hora := p_visita_hora;
    end if;
  end if;

  if v_obs is not null then
    insert into public.cco_ocorrencia_historico (ocorrencia_id, tipo, descricao, autor_id, autor_nome)
    values (v_oc.id, v_tipo_texto, v_obs, v_autor.id, v_autor.nome_completo);
    v_alteracoes := v_alteracoes || jsonb_build_object(v_tipo_texto, v_obs);
  end if;

  if v_alteracoes = '{}'::jsonb then
    return v_oc;
  end if;

  update public.cco_ocorrencias
  set situacao = v_oc.situacao,
      responsavel_id = v_oc.responsavel_id,
      responsavel_nome = v_oc.responsavel_nome,
      visita_data = v_oc.visita_data,
      visita_hora = v_oc.visita_hora,
      atualizado_por = v_autor.id,
      updated_at = now()
  where id = v_oc.id
  returning * into v_oc;

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, v_acao, 'cco_ocorrencias', v_oc.id,
    jsonb_build_object('protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome) || v_alteracoes);

  return v_oc;
end;
$$;

revoke execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text, date, time, boolean) from public, anon;
grant execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text, date, time, boolean) to authenticated;

-- ─── Edição pela unidade: + local da ocorrência ───
drop function if exists public.cco_editar_ocorrencia(uuid, date, time, time, boolean, boolean, text, text, text[], text, boolean, text);

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
  p_foto_path text,
  p_locais text[] default null
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

  -- As regras de horário, descrição, câmera e locais são conferidas pelas constraints da tabela.
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
      -- Sem p_locais (versão antiga do app em cache) mantém o que já estava gravado.
      locais = case
        when p_tipo_registro = 'camera' then null
        when p_locais is null then locais
        when cardinality(p_locais) = 0 then null
        else p_locais
      end,
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

revoke execute on function public.cco_editar_ocorrencia(uuid, date, time, time, boolean, boolean, text, text, text[], text, boolean, text, text[]) from public, anon;
grant execute on function public.cco_editar_ocorrencia(uuid, date, time, time, boolean, boolean, text, text, text[], text, boolean, text, text[]) to authenticated;

commit;
