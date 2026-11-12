-- CCO: andamentos, finalização e reabertura de ocorrências.
--   * cada texto registrado pela equipe/admin vira um "andamento" no histórico;
--   * finalizar (situação 'concluida', exibida como "Solucionada") exige o texto da solução;
--   * ocorrência finalizada não recebe andamentos nem troca de responsável;
--   * só o administrador reabre, informando o motivo.
-- Requer 20261022140000_cco_corrige_auditoria.sql.

begin;

alter table public.cco_ocorrencia_historico drop constraint if exists cco_ocorrencia_historico_tipo_check;
alter table public.cco_ocorrencia_historico add constraint cco_ocorrencia_historico_tipo_check
  check (tipo in ('registro', 'situacao', 'responsavel', 'observacao', 'termino', 'andamento', 'solucao', 'reabertura'));

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
  v_perfil text := public.cco_perfil();
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
  v_alteracoes jsonb := '{}'::jsonb;
  v_acao text := 'CCO_ATUALIZACAO';
  v_tipo_texto text := 'andamento';
  v_finalizando boolean;
  v_reabrindo boolean;
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

  if v_oc.situacao = 'concluida' and not v_reabrindo
     and (v_obs is not null or p_remover_responsavel or p_responsavel_id is distinct from null) then
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

revoke execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text) from public, anon;
grant execute on function public.cco_atualizar_ocorrencia(uuid, text, uuid, boolean, text) to authenticated;

commit;
