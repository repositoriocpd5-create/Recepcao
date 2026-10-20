-- Permite mais de um ramal por unidade (ex.: Direção, Secretaria de um departamento).
-- Cada item: {"numero": "2905", "descricao": "Direção"}; a coluna ramal guarda o primeiro, por compatibilidade.

alter table public.ramais_unidades
  add column if not exists ramais jsonb not null default '[]'::jsonb;

alter table public.ramais_unidades
  drop constraint if exists ramais_unidades_ramais_array;
alter table public.ramais_unidades
  add constraint ramais_unidades_ramais_array check (jsonb_typeof(ramais) = 'array');

update public.ramais_unidades
set ramais = jsonb_build_array(jsonb_build_object('numero', ramal))
where ramal is not null and ramais = '[]'::jsonb;
