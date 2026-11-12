-- CCO: análise de gravidade por IA (Edge Function cco-analisar-ocorrencia, Google Gemini).
--   * ia_grave/ia_categoria/ia_motivo: resultado mostrado ao administrador e à equipe do CCO
--     (caso grave → sugestão de extrair as imagens das câmeras e guardar na nuvem);
--   * ia_hash: hash do texto analisado — o mesmo texto não é enviado de novo à IA;
--   * só a Edge Function (chave secreta) grava esses campos; no cadastro eles sempre começam vazios.
-- Requer 20261022200000_cco_edicao_pela_unidade.sql.

begin;

alter table public.cco_ocorrencias
  add column if not exists ia_grave boolean,
  add column if not exists ia_categoria text,
  add column if not exists ia_motivo text,
  add column if not exists ia_origem text,
  add column if not exists ia_hash text,
  add column if not exists ia_analisada_em timestamptz;

alter table public.cco_ocorrencias drop constraint if exists cco_ia_origem_valida;
alter table public.cco_ocorrencias
  add constraint cco_ia_origem_valida check (ia_origem is null or ia_origem in ('ia', 'palavras'));

-- Mesmo trigger que já zera a visualização no cadastro: agora zera também a análise.
create or replace function public.cco_ocorrencia_antes_inserir_visualizacao()
returns trigger
language plpgsql
as $$
begin
  new.visualizada_em := null;
  new.visualizada_por := null;
  new.visualizada_por_nome := null;
  new.ia_grave := null;
  new.ia_categoria := null;
  new.ia_motivo := null;
  new.ia_origem := null;
  new.ia_hash := null;
  new.ia_analisada_em := null;
  return new;
end;
$$;

commit;

-- Log do sistema: a visualização pelo administrador também fica registrada em auditoria_logs.
begin;

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

  insert into public.auditoria_logs (usuario_id, usuario_email, acao, tabela, registro_id, detalhes)
  values (v_autor.id, v_autor.email, 'CCO_VISUALIZACAO', 'cco_ocorrencias', v_oc.id, jsonb_build_object(
    'protocolo', v_oc.protocolo, 'unidade', v_oc.unidade_nome));
  return v_oc;
end;
$$;

commit;
