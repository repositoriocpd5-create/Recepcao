-- Importação da estrutura institucional de recepção2.json.
--
-- O script é idempotente: pode ser executado mais de uma vez sem duplicar
-- departamentos ou setores. Não desativa nem remove cadastros existentes.
--
-- Fonte: E:\Recepção\recepção2.json (206 registros válidos, em 16/10/2026).

begin;

-- Os quatro departamentos distintos informados no arquivo de origem.
insert into public.departamentos (nome, sigla, descricao, localizacao, ativo)
values
  ('CME', 'CME', 'Estrutura importada da recepção institucional.', 'SMEDU', true),
  ('Gabinete da Educação', 'GABED', 'Estrutura importada da recepção institucional.', 'SMEDU', true),
  ('Sub Educação', 'SUBED', 'Estrutura importada da recepção institucional.', 'SMEDU', true),
  ('Sub Infraestrutura', 'SUBINF', 'Estrutura importada da recepção institucional.', 'SMEDU', true)
on conflict (nome) do update
set sigla = excluded.sigla,
    descricao = excluded.descricao,
    localizacao = excluded.localizacao,
    ativo = true,
    updated_at = now();

-- Atualiza os setores que já existam com o mesmo departamento e nome.
with dados (departamento, nome, sigla, sala, ramal, requer_autorizacao) as (
  values
    ('CME', 'SALA DOS CONSELHOS', 'CME', 'Sala 03', null::text, false),
    ('Gabinete da Educação', 'Departamento de Marketing Escolar', 'DME', 'Sala 02', null::text, false),
    ('Gabinete da Educação', 'Departamento Pessoal', 'DP', 'Sala 12', '3027', true),
    -- A origem possui GAB.EXP e GABINTE para este mesmo setor; foi adotada uma sigla única compatível com o banco.
    ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'GABSEC', 'Sala 06', null::text, true),
    ('Sub Educação', 'Departamento de Legislação e Normas', 'DLN', 'Sala 07', null::text, true),
    ('Sub Educação', 'Departamento de Marketing Escolar', 'DME', 'Sala 02', null::text, true),
    ('Sub Educação', 'Departamento de Programas e Projetos', 'DPP', 'Sala 07', null::text, true),
    ('Sub Educação', 'Departamento de Transporte Escolar', 'DTE', 'Sala 11', null::text, false),
    ('Sub Educação', 'Departamento Geral de Ensino', 'DGE', 'Sala 07 / Sala 09', null::text, true),
    ('Sub Educação', 'Subsecretaria de Educaçao', 'SUBEDU', 'Sala 06', null::text, true),
    ('Sub Infraestrutura', 'Centro de Processamentos de Dados', 'CPD', 'Sala 11', '2905', true),
    ('Sub Infraestrutura', 'Departamento de Transporte Escolar', 'DTE', 'Sala 11', null::text, true),
    ('Sub Infraestrutura', 'Direção de Assistência à Rede Escolar', 'DARE', 'Sala 13', null::text, true),
    ('Sub Infraestrutura', 'Direção de Compras e Licitações em Educação', 'DCLE', 'Sala 01', null::text, true),
    ('Sub Infraestrutura', 'Direção de Controle de Finanças Educacionais', 'DCFE', 'Sala', null::text, true),
    ('Sub Infraestrutura', 'Direção de Movimentação Estatística Escolar', 'DME', 'Sala 04', null::text, true),
    ('Sub Infraestrutura', 'Direção de Nutrição Escolar', 'DNE', 'Sala 10', null::text, true),
    -- A fonte atribui DME a dois setores do mesmo departamento. INFPROC evita violar a chave única (departamento_id, sigla).
    ('Sub Infraestrutura', 'Infreaestrutura Processos', 'INFPROC', 'Sala 02', null::text, true)
)
update public.setores setor
set sigla = dados.sigla,
    sala = dados.sala,
    ramal = dados.ramal,
    requer_autorizacao = dados.requer_autorizacao,
    ativo = true,
    updated_at = now()
from dados
join public.departamentos departamento on departamento.nome = dados.departamento
where setor.departamento_id = departamento.id
  and setor.nome = dados.nome;

-- Cria somente os setores ainda ausentes.
with dados (departamento, nome, sigla, sala, ramal, requer_autorizacao) as (
  values
    ('CME', 'SALA DOS CONSELHOS', 'CME', 'Sala 03', null::text, false),
    ('Gabinete da Educação', 'Departamento de Marketing Escolar', 'DME', 'Sala 02', null::text, false),
    ('Gabinete da Educação', 'Departamento Pessoal', 'DP', 'Sala 12', '3027', true),
    ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'GABSEC', 'Sala 06', null::text, true),
    ('Sub Educação', 'Departamento de Legislação e Normas', 'DLN', 'Sala 07', null::text, true),
    ('Sub Educação', 'Departamento de Marketing Escolar', 'DME', 'Sala 02', null::text, true),
    ('Sub Educação', 'Departamento de Programas e Projetos', 'DPP', 'Sala 07', null::text, true),
    ('Sub Educação', 'Departamento de Transporte Escolar', 'DTE', 'Sala 11', null::text, false),
    ('Sub Educação', 'Departamento Geral de Ensino', 'DGE', 'Sala 07 / Sala 09', null::text, true),
    ('Sub Educação', 'Subsecretaria de Educaçao', 'SUBEDU', 'Sala 06', null::text, true),
    ('Sub Infraestrutura', 'Centro de Processamentos de Dados', 'CPD', 'Sala 11', '2905', true),
    ('Sub Infraestrutura', 'Departamento de Transporte Escolar', 'DTE', 'Sala 11', null::text, true),
    ('Sub Infraestrutura', 'Direção de Assistência à Rede Escolar', 'DARE', 'Sala 13', null::text, true),
    ('Sub Infraestrutura', 'Direção de Compras e Licitações em Educação', 'DCLE', 'Sala 01', null::text, true),
    ('Sub Infraestrutura', 'Direção de Controle de Finanças Educacionais', 'DCFE', 'Sala', null::text, true),
    ('Sub Infraestrutura', 'Direção de Movimentação Estatística Escolar', 'DME', 'Sala 04', null::text, true),
    ('Sub Infraestrutura', 'Direção de Nutrição Escolar', 'DNE', 'Sala 10', null::text, true),
    ('Sub Infraestrutura', 'Infreaestrutura Processos', 'INFPROC', 'Sala 02', null::text, true)
)
insert into public.setores (
  departamento_id, nome, sigla, sala, ramal, requer_autorizacao, ativo
)
select departamento.id, dados.nome, dados.sigla, dados.sala, dados.ramal,
       dados.requer_autorizacao, true
from dados
join public.departamentos departamento on departamento.nome = dados.departamento
where not exists (
  select 1
  from public.setores setor
  where setor.departamento_id = departamento.id
    and setor.nome = dados.nome
);

commit;
