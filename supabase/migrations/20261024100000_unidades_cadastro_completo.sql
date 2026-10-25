-- Cadastro completo das unidades escolares e departamentos (tela "Cadastro de unidades"):
-- direção/responsáveis, contatos e observações. Quem pode editar continua sendo admin e gestor (RLS existente).
begin;

alter table public.ramais_unidades
  add column if not exists diretor text,
  add column if not exists vice_diretor text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists cep text,
  add column if not exists observacoes text;

commit;
