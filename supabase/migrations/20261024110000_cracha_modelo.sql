-- Modelo visual dos crachás (logo, cores, textos e numeração), editado pelo administrador na tela Crachás.
-- Linha única (id = 1); a logo fica dentro do JSON como imagem em base64.
begin;

create table if not exists public.cracha_modelo (
  id integer primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cracha_modelo enable row level security;

drop policy if exists "Modelo de cracha visivel para autenticados" on public.cracha_modelo;
create policy "Modelo de cracha visivel para autenticados"
on public.cracha_modelo for select to authenticated using (true);

drop policy if exists "Modelo de cracha gerenciado por administradores" on public.cracha_modelo;
create policy "Modelo de cracha gerenciado por administradores"
on public.cracha_modelo for all to authenticated
using (public.is_admin()) with check (public.is_admin());

commit;
