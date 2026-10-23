-- CCO: exclusão de ocorrência, somente pelo administrador.
--   * guarda em auditoria_logs (CCO_EXCLUSAO) uma cópia da ocorrência e do histórico, com o motivo;
--   * apaga a ocorrência (o histórico sai em cascata);
--   * devolve o caminho da foto para o sistema apagá-la do Storage
--     (a política "CCO: admin remove fotos" já permite isso só ao admin).
-- Nenhum perfil tem DELETE direto em cco_ocorrencias.
-- Requer 20261022150000_cco_andamentos_finalizacao.sql.

begin;

create or replace function public.cco_excluir_ocorrencia(p_id uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oc public.cco_ocorrencias%rowtype;
  v_autor public.profiles%rowtype;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_historico jsonb;
begin
  if public.cco_perfil() is distinct from 'admin' then
    raise exception 'Somente o administrador pode excluir ocorrências.' using errcode = '42501';
  end if;
  if v_motivo is null or char_length(v_motivo) < 5 then
    raise exception 'Informe o motivo da exclusão.' using errcode = '22023';
  end if;
  if char_length(v_motivo) > 1000 then
    raise exception 'O motivo pode ter até 1.000 caracteres.' using errcode = '22001';
  end if;

  select * into v_autor from public.profiles where id = auth.uid();
  select * into v_oc from public.cco_ocorrencias where id = p_id for update;
  if v_oc.id is null then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) - 'ocorrencia_id' order by h.created_at), '[]'::jsonb)
  into v_historico
  from public.cco_ocorrencia_historico h
  where h.ocorrencia_id = v_oc.id;

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, 'CCO_EXCLUSAO', 'cco_ocorrencias', v_oc.id, jsonb_build_object(
    'protocolo', v_oc.protocolo,
    'unidade', v_oc.unidade_nome,
    'motivo', v_motivo,
    'ocorrencia', to_jsonb(v_oc),
    'historico', v_historico
  ));

  delete from public.cco_ocorrencias where id = v_oc.id;
  return v_oc.foto_path;
end;
$$;

revoke execute on function public.cco_excluir_ocorrencia(uuid, text) from public, anon;
grant execute on function public.cco_excluir_ocorrencia(uuid, text) to authenticated;

-- Garantia: nenhuma política de DELETE direto nas tabelas do CCO.
drop policy if exists "CCO: excluir ocorrencias" on public.cco_ocorrencias;

commit;
