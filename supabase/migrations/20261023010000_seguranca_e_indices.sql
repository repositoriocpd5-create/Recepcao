-- Ajustes apontados pelo diagnóstico do banco (23/10/2026):
--   1. Funções SECURITY DEFINER executáveis por "anon" (visitante sem login, só com a chave pública).
--      As migrações revogaram de PUBLIC, mas o Supabase dá EXECUTE direto ao papel anon por padrão.
--      Hoje elas acabam falhando para anon (a auditoria exige login), mas não devem nem ser chamáveis.
--      Gatilhos continuam funcionando: o privilégio EXECUTE não é conferido quando o gatilho dispara.
--   2. Duas funções sem search_path fixo (aviso "function_search_path_mutable").
--   3. Chaves estrangeiras sem índice (aviso de desempenho "unindexed_foreign_keys").
-- Nada aqui altera dados.

begin;

-- 1. Nenhuma função SECURITY DEFINER do schema public fica disponível para quem não fez login.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from anon', f.assinatura);
  end loop;
end;
$$;

-- Funções criadas daqui em diante também não ficam abertas para anon.
alter default privileges in schema public revoke execute on functions from anon;

-- 2. search_path fixo
alter function public.cco_ocorrencia_antes_inserir_visualizacao() set search_path = public, pg_temp;
alter function public.cco_uuid_seguro(text) set search_path = public, pg_temp;

-- 3. Índices das chaves estrangeiras (consultas e exclusões mais rápidas conforme os dados crescem)
create index if not exists idx_servidores_departamento on public.servidores (departamento_id);
create index if not exists idx_servidores_setor on public.servidores (setor_id);
create index if not exists idx_mov_departamento_destino on public.movimentacoes (departamento_destino_id);
create index if not exists idx_mov_setor_destino on public.movimentacoes (setor_destino_id);
create index if not exists idx_mov_servidor_destino on public.movimentacoes (servidor_destino_id);
create index if not exists idx_mov_autorizador on public.movimentacoes (autorizador_id);
create index if not exists idx_mov_recepcionista_entrada on public.movimentacoes (recepcionista_entrada_id);
create index if not exists idx_mov_recepcionista_saida on public.movimentacoes (recepcionista_saida_id);
create index if not exists idx_autorizacoes_movimentacao on public.autorizacoes (movimentacao_id);
create index if not exists idx_autorizacoes_servidor_solicitado on public.autorizacoes (servidor_solicitado_id);
create index if not exists idx_autorizacoes_solicitado_por on public.autorizacoes (solicitado_por);
create index if not exists idx_agendamentos_visitante on public.agendamentos (visitante_id);
create index if not exists idx_agendamentos_servidor_visitante on public.agendamentos (servidor_visitante_id);
create index if not exists idx_agendamentos_departamento on public.agendamentos (departamento_id);
create index if not exists idx_agendamentos_setor on public.agendamentos (setor_id);
create index if not exists idx_agendamentos_servidor_destino on public.agendamentos (servidor_destino_id);
create index if not exists idx_agendamentos_criado_por on public.agendamentos (criado_por);
create index if not exists idx_auditoria_usuario on public.auditoria_logs (usuario_id);
create index if not exists idx_movdest_departamento on public.movimentacao_destinos (departamento_destino_id);
create index if not exists idx_movdest_setor on public.movimentacao_destinos (setor_destino_id);
create index if not exists idx_movdest_servidor on public.movimentacao_destinos (servidor_destino_id);
create index if not exists idx_vinculos_setor on public.servidor_setor_vinculos (setor_id);
create index if not exists idx_profiles_unidade on public.profiles (unidade_id);
create index if not exists idx_acessos_unidade on public.acessos_por_email (unidade_id);
create index if not exists idx_cco_responsavel on public.cco_ocorrencias (responsavel_id);
create index if not exists idx_cco_criado_por on public.cco_ocorrencias (criado_por);
create index if not exists idx_cco_atualizado_por on public.cco_ocorrencias (atualizado_por);
create index if not exists idx_cco_visualizada_por on public.cco_ocorrencias (visualizada_por);
create index if not exists idx_cco_historico_autor on public.cco_ocorrencia_historico (autor_id);

commit;
