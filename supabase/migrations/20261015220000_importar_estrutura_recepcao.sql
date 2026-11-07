-- Importação manual da estrutura fornecida em recepção1.json/xlsx.
-- Execute no SQL Editor do Supabase após revisar o conteúdo.
begin;

-- Mantém histórico de movimentações e servidores ao arquivar a estrutura anterior.
update public.setores set ativo = false where ativo = true;
update public.departamentos set ativo = false where ativo = true;

insert into public.departamentos (nome, sigla, descricao, localizacao, ativo)
select 'Estrutura Importada', 'IMPORT', 'Estrutura consolidada da base institucional importada.', 'SMEDU', true
where not exists (select 1 from public.departamentos where sigla = 'IMPORT');

update public.departamentos
set nome = 'Estrutura Importada', descricao = 'Estrutura consolidada da base institucional importada.', localizacao = 'SMEDU', ativo = true
where sigla = 'IMPORT';

create table if not exists public.setor_vinculos_importados (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.setores(id) on delete cascade,
  nome_normalizado text not null,
  origem text not null default 'recepcao1',
  created_at timestamptz not null default now(),
  unique (setor_id, nome_normalizado)
);
create index if not exists setor_vinculos_importados_setor_id_idx on public.setor_vinculos_importados(setor_id);
alter table public.setor_vinculos_importados enable row level security;
drop policy if exists "Leitura de vinculos importados" on public.setor_vinculos_importados;
create policy "Leitura de vinculos importados" on public.setor_vinculos_importados for select to authenticated using (true);

with departamento as (
  select id from public.departamentos where sigla = 'IMPORT' limit 1
), dados(nome, sigla) as (
  values
    ('Centro de Processamentos de Dados', 'CPD'),
    ('Departamento de Legislação e Normas', 'DLN'),
    ('Departamento de Marketing Escolar', 'DME'),
    ('Departamento de Programas e Projetos', 'DPP'),
    ('Departamento de Transporte Escolar', 'DTE'),
    ('Departamento Geral de Ensino', 'DGE'),
    ('Departamento Pessoal', 'DP'),
    ('DEPTO DE ENSINO', 'DE'),
    ('DEPTO PATRIMÔNIO E ALMOXARIFADO', 'DPA'),
    ('Direção de Assistência à Rede Escolar', 'DARE'),
    ('Direção de Compras e Licitações em Educação', 'DCLE'),
    ('Direção de Controle de Finanças Educacionais', 'DCFE'),
    ('Direção de Movimentação Estatística Escolar', 'DMEE'),
    ('Direção de Nutrição Escolar', 'DNE'),
    ('Gabinete da Secretaria da Secretaria', 'GSS'),
    ('SALA DOS CONSELHOS', 'SCON'),
    ('Subsecretaria de Educaçao', 'SUBED1'),
    ('SUBSECRETARIA DE EDUCAÇÃO', 'SUBED2'),
    ('SUBSECRETARIA DE INFRAESTRUTURA', 'SUBINF')
)
insert into public.setores (departamento_id, nome, sigla, requer_autorizacao, ativo)
select departamento.id, dados.nome, dados.sigla, false, true
from dados cross join departamento
where not exists (
  select 1 from public.setores existente
  where existente.departamento_id = departamento.id and existente.nome = dados.nome
);

update public.setores
set ativo = true, requer_autorizacao = false
where departamento_id = (select id from public.departamentos where sigla = 'IMPORT' limit 1);

commit;
