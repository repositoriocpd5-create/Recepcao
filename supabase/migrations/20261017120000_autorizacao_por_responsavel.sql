-- Autorização prévia da portaria definida por responsável (coluna "Exigir Autorização Prévia
-- da Portaria" de recepção2.json/xlsx), e não mais pelo setor inteiro.
-- Execute no SQL Editor do Supabase. O script é idempotente.

begin;

alter table public.servidor_setor_vinculos
  add column if not exists requer_autorizacao boolean not null default false;

update public.servidor_setor_vinculos set requer_autorizacao = false;

with exigem(departamento_nome, setor_nome, servidor_nome) as (
  values
  ('Gabinete da Educação', 'Departamento Pessoal', 'ADRIANE FREITAS DOS REIS RODRIGUES'),
  ('Gabinete da Educação', 'Departamento Pessoal', 'FERNANDA TAVARES DE SANT ANNA EVARISTO'),
  ('Gabinete da Educação', 'Departamento Pessoal', 'PAOLA SALLES DA SILVA TRANI'),
  ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'AGATHA CAMILA GUEDES BARBOSA COMIANO DE CARVALHO'),
  ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'ALINE DA SILVA BARBOSA'),
  ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'DANIELLE SIQUEIRA GONÇALVES ANTONIOL DE MOURA'),
  ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'JULIANA ROSA CORREA'),
  ('Gabinete da Educação', 'Gabinete da Secretaria da Secretaria', 'MILTON VALVIESSE GAMA'),
  ('Sub Educação', 'Departamento Geral de Ensino', 'SILVIA LETICIA MELLO DA SILVA'),
  ('Sub Educação', 'Departamento Geral de Ensino', 'VALQUIRIA JOSE DOS SANTOS'),
  ('Sub Educação', 'Departamento de Legislação e Normas', 'THALLES SILVA AGUILAR DE SOUZA'),
  ('Sub Educação', 'Departamento de Marketing Escolar', 'MAYARA DE OLIVEIRA DIAS'),
  ('Sub Educação', 'Departamento de Programas e Projetos', 'ALESSANDRA MARIA COSTA RODRIGUES FONSECA'),
  ('Sub Educação', 'Subsecretaria de Educaçao', 'MARILENE GONCALVES DO COUTO'),
  ('Sub Educação', 'Subsecretaria de Educaçao', 'ROBERTA GONÇALVES RAMALHO'),
  ('Sub Infraestrutura', 'Centro de Processamentos de Dados', 'JOE NAI AMADO DE SOUZA'),
  ('Sub Infraestrutura', 'Centro de Processamentos de Dados', 'RODRIGO SLEIMAN'),
  ('Sub Infraestrutura', 'Departamento de Transporte Escolar', 'BRUNO BALTHAZAR'),
  ('Sub Infraestrutura', 'Departamento de Transporte Escolar', 'CRISTIANE'),
  ('Sub Infraestrutura', 'Departamento de Transporte Escolar', 'PALOMA LESSA'),
  ('Sub Infraestrutura', 'Direção de Assistência à Rede Escolar', 'MARCELO BARBOZA DA SILVA'),
  ('Sub Infraestrutura', 'Direção de Compras e Licitações em Educação', 'FERNANDA MARQUES'),
  ('Sub Infraestrutura', 'Direção de Controle de Finanças Educacionais', 'ADRIANA CARLA NEPOMUCENO FERREIRA BASTOS'),
  ('Sub Infraestrutura', 'Direção de Controle de Finanças Educacionais', 'MARA LUCIA DE FIGUEIREDO BARBOSA'),
  ('Sub Infraestrutura', 'Direção de Movimentação Estatística Escolar', 'SIMONE DANTAS COSTA E SILVA'),
  ('Sub Infraestrutura', 'Direção de Nutrição Escolar', 'ROSANGELA MARIA DO ROZARIO'),
  ('Sub Infraestrutura', 'Direção de Nutrição Escolar', 'ROSANGELA MARTINS DA SILVA'),
  ('Sub Infraestrutura', 'Infreaestrutura Processos', 'MAYARA DE OLIVEIRA DIAS')
)
update public.servidor_setor_vinculos vinculo
set requer_autorizacao = true
from exigem
join public.departamentos departamento on departamento.nome = exigem.departamento_nome
join public.setores setor on setor.departamento_id = departamento.id and setor.nome = exigem.setor_nome
join public.servidores servidor on upper(trim(servidor.nome)) = upper(trim(exigem.servidor_nome))
where vinculo.setor_id = setor.id
  and vinculo.servidor_id = servidor.id;

commit;

-- Conferência: deve listar 29 vínculos (menos os responsáveis ainda não cadastrados em servidores).
-- select servidor.nome, setor.nome from public.servidor_setor_vinculos vinculo
-- join public.servidores servidor on servidor.id = vinculo.servidor_id
-- join public.setores setor on setor.id = vinculo.setor_id
-- where vinculo.requer_autorizacao order by setor.nome, servidor.nome;
