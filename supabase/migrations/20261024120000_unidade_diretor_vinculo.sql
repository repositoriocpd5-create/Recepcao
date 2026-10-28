-- Vínculo do diretor(a) e do vice com o Quadro de Servidores (cadastro de unidades).
begin;

alter table public.ramais_unidades
  add column if not exists diretor_servidor_id text,
  add column if not exists vice_servidor_id text;

commit;
