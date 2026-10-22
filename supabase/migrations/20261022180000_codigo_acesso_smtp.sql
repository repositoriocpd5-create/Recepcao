-- Código de acesso gerado pelo próprio sistema e enviado pelo SMTP configurado na Administração.
-- (Substitui o código do Supabase Auth no primeiro acesso / redefinição de senha.)
--
--   * config_smtp: servidor de e-mail do sistema (uma linha). A senha nunca volta ao navegador;
--     só a Edge Function primeiro-acesso (chave de serviço) lê e grava esta tabela.
--   * codigos_acesso: códigos de 6 dígitos (guardados só como hash), validade de 10 minutos,
--     limite de tentativas e o token curto que libera a troca de senha depois do código certo.
-- As duas tabelas ficam com RLS ligada e sem políticas: nenhum acesso pelo navegador.

begin;

create table if not exists public.config_smtp (
  id smallint primary key default 1 check (id = 1),
  host text not null,
  porta integer not null default 465 check (porta between 1 and 65535),
  seguranca text not null default 'ssl' check (seguranca in ('ssl', 'starttls', 'nenhuma')),
  usuario text,
  senha text,
  remetente_email text not null,
  remetente_nome text not null default 'SMEDU Soluções',
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
alter table public.config_smtp enable row level security;

create table if not exists public.codigos_acesso (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  tentativas smallint not null default 0,
  confirmado_em timestamptz,
  token_hash text,
  token_expira_em timestamptz,
  usado_em timestamptz,
  ip text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_codigos_acesso_email on public.codigos_acesso (email, criado_em desc);
alter table public.codigos_acesso enable row level security;

commit;
