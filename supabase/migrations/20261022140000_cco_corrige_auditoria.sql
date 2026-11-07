-- Corrige o registro de auditoria do CCO: auditoria_logs.registro_id é uuid (antes recebia texto e o
-- cadastro da ocorrência falhava com "column registro_id is of type uuid but expression is of type text").
-- Recria só as três funções afetadas, iguais às de 20261022120100_cco_ocorrencias.sql.

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
  values (new.criado_por, new.criado_por_email, 'CCO_REGISTRO', 'cco_ocorrencias', new.id, jsonb_build_object(
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
  values (v_autor.id, v_autor.email, 'CCO_ATUALIZACAO', 'cco_ocorrencias', v_oc.id,
    jsonb_build_object('protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome) || v_alteracoes);

  return v_oc;
end;
$$;
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
  values (v_autor.id, v_autor.email, 'CCO_TERMINO', 'cco_ocorrencias', v_oc.id, jsonb_build_object(
    'protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome,
    'hora_fim', to_char(p_hora_fim, 'HH24:MI'), 'termina_dia_seguinte', v_oc.termina_dia_seguinte));

  return v_oc;
end;
$$;
