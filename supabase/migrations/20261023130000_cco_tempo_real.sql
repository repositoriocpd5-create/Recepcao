-- Tempo real do CCO: o Mapa da Rede recebe pelo websocket (Supabase Realtime) cada ocorrência
-- nova ou alterada, sem recarregar. O Realtime respeita o RLS de cco_ocorrencias: cada perfil
-- só recebe as unidades que pode ver.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cco_ocorrencias'
  ) then
    alter publication supabase_realtime add table public.cco_ocorrencias;
  end if;
end;
$$;
