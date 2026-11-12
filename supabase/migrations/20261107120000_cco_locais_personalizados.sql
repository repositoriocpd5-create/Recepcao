-- Locais da ocorrência incluídos pelas unidades.
-- Quando uma unidade inclui um local novo ("Incluir" no campo Local da ocorrência), ele passa a fazer
-- parte da lista de sugestões de todas as unidades. A lista padrão (Portão principal, Pátio…) fica no app.
-- Requer 20261022120100_cco_ocorrencias.sql (funções cco_perfil). Seguro rodar de novo.

begin;

create table if not exists public.cco_locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 60),
  -- Chave para não repetir o mesmo local com maiúsculas/minúsculas diferentes.
  nome_chave text generated always as (lower(btrim(nome))) stored,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cco_locais_nome_chave_unico unique (nome_chave)
);

create index if not exists idx_cco_locais_criado_por on public.cco_locais (criado_por);

alter table public.cco_locais enable row level security;

drop policy if exists "CCO: todos leem os locais" on public.cco_locais;
create policy "CCO: todos leem os locais"
on public.cco_locais for select to authenticated
using (public.cco_perfil() is not null);

drop policy if exists "CCO: incluir local" on public.cco_locais;
create policy "CCO: incluir local"
on public.cco_locais for insert to authenticated
with check (public.cco_perfil() is not null and criado_por = auth.uid());
-- Sem UPDATE/DELETE: a limpeza de locais é feita pelo administrador direto no banco.

-- Quem não tem login não enxerga nem inclui.
revoke all on public.cco_locais from anon;

commit;
