-- Lista de ramais das unidades escolares e dos departamentos da SMEDU.
-- Nomes a partir das lotações do quadro funcional; os ramais são preenchidos pela tela "Ramais".

create table if not exists public.ramais_unidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('unidade_escolar', 'departamento')),
  categoria text not null,
  nome text not null unique,
  lotacao text,
  ramal varchar(20),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ramais_unidades enable row level security;

drop policy if exists "Ramais visiveis para usuarios autenticados" on public.ramais_unidades;
create policy "Ramais visiveis para usuarios autenticados"
on public.ramais_unidades for select to authenticated using (true);

drop policy if exists "Admin e gestor mantem ramais" on public.ramais_unidades;
create policy "Admin e gestor mantem ramais"
on public.ramais_unidades for all to authenticated
using (public.current_profile_role() in ('admin', 'gestor'))
with check (public.current_profile_role() in ('admin', 'gestor'));

insert into public.ramais_unidades (tipo, categoria, nome, lotacao)
values
  ('departamento', 'Departamentos SMEDU', 'Centro de Processamento de Dados (CPD)', 'SMEDU - CPD'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Ensino — CECIERJ', 'SMEDU - DE - CECIERJ'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Compras e Licitações em Educação', 'SMEDU - DEPTO COMPRAS E LICITAÇÕES EM EDUCAÇÃO'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Assistência à Rede Escolar', 'SMEDU - DEPTO DE ASSISTÊNCIA À REDE'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Ensino', 'SMEDU - DEPTO DE ENSINO'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Legislação e Normas', 'SMEDU - DEPTO DE LEGISLAÇÃO E NORMAS'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Marketing Escolar', 'SMEDU - DEPTO DE MARKETING'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Movimentação e Estatística Escolar', 'SMEDU - DEPTO DE MOVIMENTAÇÃO E ESTATÍSTICA'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Nutrição Escolar', 'SMEDU - DEPTO DE NUTRIÇÃO'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Programas e Projetos', 'SMEDU - DEPTO DE PROGRAMAS E PROJETOS'),
  ('departamento', 'Departamentos SMEDU', 'Departamento Financeiro', 'SMEDU - DEPTO FINANCEIRO'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Patrimônio e Almoxarifado', 'SMEDU - DEPTO PATRIMÔNIO E ALMOXARIFADO'),
  ('departamento', 'Departamentos SMEDU', 'Departamento Pessoal', 'SMEDU - DEPTO PESSOAL'),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Transporte Escolar', 'SMEDU - DEPTO TRANSPORTE ESCOLAR'),
  ('departamento', 'Departamentos SMEDU', 'Gabinete da Secretaria', 'SMEDU - GABINETE'),
  ('departamento', 'Departamentos SMEDU', 'Sala dos Conselhos', 'SMEDU - SALA DOS CONSELHOS'),
  ('departamento', 'Departamentos SMEDU', 'Subsecretaria de Educação', 'SMEDU - SUBSECRETARIA DE EDUCAÇÃO'),
  ('departamento', 'Departamentos SMEDU', 'Subsecretaria de Infraestrutura', 'SMEDU - SUBSECRETARIA DE INFRAESTRUTURA'),
  ('unidade_escolar', 'Centros e Colégios', 'C. M. SEN. TEOTÔNIO VILELLA', 'C. M. SEN. TEOTÔNIO VILELLA'),
  ('unidade_escolar', 'Centros e Colégios', 'CEMAEE', 'CEMAEE'),
  ('unidade_escolar', 'Centros e Colégios', 'CENTRO EDUCACIONAL DE ITAGUAI (CESMI)', 'CENTRO EDUCACIONAL DE ITAGUAI (CESMI)'),
  ('unidade_escolar', 'CIEPs', 'CIEP 300 M. PREF. VICENTE CICARINO', 'CIEP 300 M. PREF. VICENTE CICARINO'),
  ('unidade_escolar', 'CIEPs', 'CIEP 496 M. MAESTRO F. MIGNONE', 'CIEP 496 M. MAESTRO F. MIGNONE'),
  ('unidade_escolar', 'CIEPs', 'CIEP 497 M. PROF.SILVIA TUPINAMBÁ', 'CIEP 497 M. PROF.SILVIA TUPINAMBÁ'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. APARECIDA AZEDO', 'CRECHE M. APARECIDA AZEDO'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. DANIELLE BATISTA DA SILVA', 'CRECHE M. DANIELLE BATISTA DA SILVA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. EDSON CRUZ AMADO', 'CRECHE M. EDSON CRUZ AMADO'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. EUCLYDES JOSE BORGES', 'CRECHE M. EUCLYDES JOSE BORGES'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. FLORENTINO ELIAS', 'CRECHE M. FLORENTINO ELIAS'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. FRANCISCO XAVIER DE M. BRITO', 'CRECHE M. FRANCISCO XAVIER DE M. BRITO'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA', 'CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. MARIA ROSA G. DO NASCIMENTO', 'CRECHE M. MARIA ROSA G. DO NASCIMENTO'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. ELIANE LOPES BARBOSA', 'CRECHE M. PROF. ELIANE LOPES BARBOSA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. GOETHE COUTINHO MADRUGA', 'CRECHE M. PROF. GOETHE COUTINHO MADRUGA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. JOAQUIM INOUE', 'CRECHE M. PROF. JOAQUIM INOUE'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA', 'CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA', 'CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. RENATO BARBOSA LADISLAU', 'CRECHE M. PROF. RENATO BARBOSA LADISLAU'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. TANIA MARA M. MENEZES', 'CRECHE M. PROF. TANIA MARA M. MENEZES'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS', 'CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. RITA FERREIRA FEIJÓ', 'CRECHE M. RITA FERREIRA FEIJÓ'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO', 'CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CAMILO CUQUEJO', 'E. E. M. CAMILO CUQUEJO'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CARMEM MENEZES DIREITO', 'E. E. M. CARMEM MENEZES DIREITO'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CHAPERÓ', 'E. E. M. CHAPERÓ'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. DRº JORGE ABRAHÃO', 'E. E. M. DRº JORGE ABRAHÃO'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. FAZENDA SANTA CÂNDIDA', 'E. E. M. FAZENDA SANTA CÂNDIDA'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. SANTA ROSA', 'E. E. M. SANTA ROSA'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. TACIANO BASILIO', 'E. E. M. TACIANO BASILIO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ALEXANDRE IGNÁCIO', 'E. M. ALEXANDRE IGNÁCIO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. AMAURI FERREIRA', 'E. M. AMAURI FERREIRA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ANTÔNIO TUPINAMBÁ', 'E. M. ANTÔNIO TUPINAMBÁ'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ARGENTINA COUTINHO', 'E. M. ARGENTINA COUTINHO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. CORONEL ALZIRO SANTIAGO', 'E. M. CORONEL ALZIRO SANTIAGO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. DAS ACÁCIAS', 'E. M. DAS ACÁCIAS'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. HYPOLITO VIEIRA DE CARVALHO', 'E. M. E. I. HYPOLITO VIEIRA DE CARVALHO'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. MONTEIRO LOBATO', 'E. M. E. I. MONTEIRO LOBATO'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. PREF. ISOLDACKSON C. BRITO', 'E. M. E. I. PREF. ISOLDACKSON C. BRITO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. EIDER RIBEIRO DANTAS', 'E. M. EIDER RIBEIRO DANTAS'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ELMIRA FIGUEIRA', 'E. M. ELMIRA FIGUEIRA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ELMO BAPTISTA COELHO', 'E. M. ELMO BAPTISTA COELHO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. FUSAO FUKAMATI', 'E. M. FUSAO FUKAMATI'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. JOAO VICENTE SOARES', 'E. M. JOAO VICENTE SOARES'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. JORGE FLORES DA SILVA', 'E. M. JORGE FLORES DA SILVA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. OSCAR JOSÉ DE SOUZA', 'E. M. OSCAR JOSÉ DE SOUZA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PADRE RAFAEL SCARFÓ', 'E. M. PADRE RAFAEL SCARFÓ'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. ABEILARD G. SOUZA', 'E. M. PREF. ABEILARD G. SOUZA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. OTONI ROCHA', 'E. M. PREF. OTONI ROCHA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. WILSON PEDRO FRANCISCO', 'E. M. PREF. WILSON PEDRO FRANCISCO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF YOLANDA RANGEL PEREIRA', 'E. M. PROF YOLANDA RANGEL PEREIRA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES', 'E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. Mª GUILHERMINA DE S FREIRE', 'E. M. PROF. Mª GUILHERMINA DE S FREIRE'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. SEVERINA DOS RAMOS DE SOUSA', 'E. M. PROF. SEVERINA DOS RAMOS DE SOUSA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. RENATO GONÇALVES MARTINS', 'E. M. RENATO GONÇALVES MARTINS'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SEVERINO SALUSTIANO DE FARIAS', 'E. M. SEVERINO SALUSTIANO DE FARIAS'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SYLVIA SOUZA SIQUINELI', 'E. M. SYLVIA SOUZA SIQUINELI'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SÃO SEBASTIÃO', 'E. M. SÃO SEBASTIÃO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. TEREZA DE ARAUJO SAGÁRIO', 'E. M. TEREZA DE ARAUJO SAGÁRIO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. AMÉRICO R. AMORIM', 'E. M. VER. AMÉRICO R. AMORIM'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. JOSÉ GALLIAÇO PRATA', 'E. M. VER. JOSÉ GALLIAÇO PRATA'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO', 'E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. TACIANO FERNANDES NUNES', 'E. M. VER. TACIANO FERNANDES NUNES')
on conflict (nome) do nothing;
