-- Unidade de teste "ESCOLA SUL" e seu dirigente (Joe Amado Teste).
--   * cria a unidade em ramais_unidades (se ainda não existir);
--   * joeamado52@gmail.com → conta da unidade (como os e-mails institucionais das escolas);
--   * joe.amadodesouza@gmail.com → Dirigente Escolar da unidade (primeiro acesso pelo próprio e-mail).
-- Requer 20261022170000_cco_dirigentes_primeiro_acesso.sql (coluna acessos_por_email.cargo).
-- Seguro rodar de novo no SQL Editor.

begin;

insert into public.ramais_unidades (tipo, categoria, nome, lotacao)
values ('unidade_escolar', 'Escolas Municipais', 'ESCOLA SUL', 'TESTE')
on conflict (nome) do nothing;

insert into public.acessos_por_email (email, role, unidade_id, responsavel, cargo)
select v.email, 'unidade_escolar', u.id, v.responsavel, v.cargo
from (values
  ('joeamado52@gmail.com', 'Joe Amado Teste', null),
  ('joe.amadodesouza@gmail.com', 'Joe Amado Teste', 'Dirigente Escolar')
) as v(email, responsavel, cargo)
join public.ramais_unidades u on u.nome = 'ESCOLA SUL'
on conflict (email) do update
set role = excluded.role, unidade_id = excluded.unidade_id, responsavel = excluded.responsavel, cargo = excluded.cargo;

-- Se as contas já existirem, aplica agora (para as novas, o gatilho de perfis faz isso).
update public.profiles p
set role = 'unidade_escolar'::public.user_role,
    unidade_id = a.unidade_id,
    acesso_cco = false,
    cco_unidades = null,
    cargo = coalesce(a.cargo, case when p.cargo is null or p.cargo in ('Recepcionista', 'Operador', '') then 'Responsável pela unidade' else p.cargo end),
    nome_completo = case when p.nome_completo is null or p.nome_completo = split_part(p.email, '@', 1) then a.responsavel else p.nome_completo end,
    updated_at = now()
from public.acessos_por_email a
where lower(btrim(p.email)) = a.email
  and a.email in ('joeamado52@gmail.com', 'joe.amadodesouza@gmail.com');

commit;

-- Conferência (opcional):
-- select a.email, a.role, a.responsavel, a.cargo, u.nome as unidade
-- from public.acessos_por_email a join public.ramais_unidades u on u.id = a.unidade_id
-- where u.nome = 'ESCOLA SUL';

-- Para remover o teste depois (opcional):
-- delete from public.acessos_por_email where email in ('joeamado52@gmail.com', 'joe.amadodesouza@gmail.com');
-- delete from public.ramais_unidades where nome = 'ESCOLA SUL';
