-- Lista de ramais das unidades escolares e dos departamentos da SMEDU.
-- Nomes a partir das lotações do quadro funcional; ramais das escolas conforme ramal.xlsx.
-- Os demais ramais são preenchidos pela tela "Ramais".

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

insert into public.ramais_unidades (tipo, categoria, nome, lotacao, ramal)
values
  ('departamento', 'Departamentos SMEDU', 'Centro de Processamento de Dados (CPD)', 'SMEDU - CPD', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Ensino — CECIERJ', 'SMEDU - DE - CECIERJ', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Compras e Licitações em Educação', 'SMEDU - DEPTO COMPRAS E LICITAÇÕES EM EDUCAÇÃO', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Assistência à Rede Escolar', 'SMEDU - DEPTO DE ASSISTÊNCIA À REDE', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Ensino', 'SMEDU - DEPTO DE ENSINO', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Legislação e Normas', 'SMEDU - DEPTO DE LEGISLAÇÃO E NORMAS', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Marketing Escolar', 'SMEDU - DEPTO DE MARKETING', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Movimentação e Estatística Escolar', 'SMEDU - DEPTO DE MOVIMENTAÇÃO E ESTATÍSTICA', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Nutrição Escolar', 'SMEDU - DEPTO DE NUTRIÇÃO', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Programas e Projetos', 'SMEDU - DEPTO DE PROGRAMAS E PROJETOS', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento Financeiro', 'SMEDU - DEPTO FINANCEIRO', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Patrimônio e Almoxarifado', 'SMEDU - DEPTO PATRIMÔNIO E ALMOXARIFADO', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento Pessoal', 'SMEDU - DEPTO PESSOAL', null),
  ('departamento', 'Departamentos SMEDU', 'Departamento de Transporte Escolar', 'SMEDU - DEPTO TRANSPORTE ESCOLAR', null),
  ('departamento', 'Departamentos SMEDU', 'Gabinete da Secretaria', 'SMEDU - GABINETE', null),
  ('departamento', 'Departamentos SMEDU', 'Sala dos Conselhos', 'SMEDU - SALA DOS CONSELHOS', null),
  ('departamento', 'Departamentos SMEDU', 'Subsecretaria de Educação', 'SMEDU - SUBSECRETARIA DE EDUCAÇÃO', null),
  ('departamento', 'Departamentos SMEDU', 'Subsecretaria de Infraestrutura', 'SMEDU - SUBSECRETARIA DE INFRAESTRUTURA', null),
  ('unidade_escolar', 'Centros e Colégios', 'C. M. SEN. TEOTÔNIO VILELLA', 'C. M. SEN. TEOTÔNIO VILELLA', '3075'),
  ('unidade_escolar', 'Centros e Colégios', 'CEMAEE', 'CEMAEE', '3070'),
  ('unidade_escolar', 'Centros e Colégios', 'CENTRO EDUCACIONAL DE ITAGUAI (CESMI)', 'CENTRO EDUCACIONAL DE ITAGUAI (CESMI)', '3074'),
  ('unidade_escolar', 'CIEPs', 'CIEP 300 M. PREF. VICENTE CICARINO', 'CIEP 300 M. PREF. VICENTE CICARINO', '3046'),
  ('unidade_escolar', 'CIEPs', 'CIEP 496 M. MAESTRO F. MIGNONE', 'CIEP 496 M. MAESTRO F. MIGNONE', '3071'),
  ('unidade_escolar', 'CIEPs', 'CIEP 497 M. PROF.SILVIA TUPINAMBÁ', 'CIEP 497 M. PROF.SILVIA TUPINAMBÁ', '3067'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. APARECIDA AZEDO', 'CRECHE M. APARECIDA AZEDO', '3093'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. DANIELLE BATISTA DA SILVA', 'CRECHE M. DANIELLE BATISTA DA SILVA', '3055'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. EDSON CRUZ AMADO', 'CRECHE M. EDSON CRUZ AMADO', '3083'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. EUCLYDES JOSE BORGES', 'CRECHE M. EUCLYDES JOSE BORGES', '3092'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. FLORENTINO ELIAS', 'CRECHE M. FLORENTINO ELIAS', '3040'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. FRANCISCO XAVIER DE M. BRITO', 'CRECHE M. FRANCISCO XAVIER DE M. BRITO', '3072'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA', 'CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA', '3042'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. MARIA ROSA G. DO NASCIMENTO', 'CRECHE M. MARIA ROSA G. DO NASCIMENTO', '3107'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. ELIANE LOPES BARBOSA', 'CRECHE M. PROF. ELIANE LOPES BARBOSA', '3087'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. GOETHE COUTINHO MADRUGA', 'CRECHE M. PROF. GOETHE COUTINHO MADRUGA', '3039'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. JOAQUIM INOUE', 'CRECHE M. PROF. JOAQUIM INOUE', '3043'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA', 'CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA', '3066'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA', 'CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA', '3078'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. RENATO BARBOSA LADISLAU', 'CRECHE M. PROF. RENATO BARBOSA LADISLAU', '3076'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. TANIA MARA M. MENEZES', 'CRECHE M. PROF. TANIA MARA M. MENEZES', '3053'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS', 'CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS', null),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. RITA FERREIRA FEIJÓ', 'CRECHE M. RITA FERREIRA FEIJÓ', '3050'),
  ('unidade_escolar', 'Creches Municipais', 'CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO', 'CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO', '3081'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CAMILO CUQUEJO', 'E. E. M. CAMILO CUQUEJO', '3036'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CARMEM MENEZES DIREITO', 'E. E. M. CARMEM MENEZES DIREITO', '3063'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. CHAPERÓ', 'E. E. M. CHAPERÓ', '3098'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. DRº JORGE ABRAHÃO', 'E. E. M. DRº JORGE ABRAHÃO', '3097'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. FAZENDA SANTA CÂNDIDA', 'E. E. M. FAZENDA SANTA CÂNDIDA', '3084'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. SANTA ROSA', 'E. E. M. SANTA ROSA', '3045'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. TACIANO BASILIO', 'E. E. M. TACIANO BASILIO', '3048'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ALEXANDRE IGNÁCIO', 'E. M. ALEXANDRE IGNÁCIO', '3052'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. AMAURI FERREIRA', 'E. M. AMAURI FERREIRA', '3057'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ANTÔNIO TUPINAMBÁ', 'E. M. ANTÔNIO TUPINAMBÁ', '3068'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ARGENTINA COUTINHO', 'E. M. ARGENTINA COUTINHO', '3054'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. CORONEL ALZIRO SANTIAGO', 'E. M. CORONEL ALZIRO SANTIAGO', '3096'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. DAS ACÁCIAS', 'E. M. DAS ACÁCIAS', '3082'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. HYPOLITO VIEIRA DE CARVALHO', 'E. M. E. I. HYPOLITO VIEIRA DE CARVALHO', '3044'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. MONTEIRO LOBATO', 'E. M. E. I. MONTEIRO LOBATO', '3069'),
  ('unidade_escolar', 'Educação Infantil', 'E. M. E. I. PREF. ISOLDACKSON C. BRITO', 'E. M. E. I. PREF. ISOLDACKSON C. BRITO', '3099'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. EIDER RIBEIRO DANTAS', 'E. M. EIDER RIBEIRO DANTAS', '3091'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ELMIRA FIGUEIRA', 'E. M. ELMIRA FIGUEIRA', '3090'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. ELMO BAPTISTA COELHO', 'E. M. ELMO BAPTISTA COELHO', '3095'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. FUSAO FUKAMATI', 'E. M. FUSAO FUKAMATI', '3049'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. JOAO VICENTE SOARES', 'E. M. JOAO VICENTE SOARES', '3065'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. JORGE FLORES DA SILVA', 'E. M. JORGE FLORES DA SILVA', '3037'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. OSCAR JOSÉ DE SOUZA', 'E. M. OSCAR JOSÉ DE SOUZA', '3085'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PADRE RAFAEL SCARFÓ', 'E. M. PADRE RAFAEL SCARFÓ', '3073'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. ABEILARD G. SOUZA', 'E. M. PREF. ABEILARD G. SOUZA', '3086'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. OTONI ROCHA', 'E. M. PREF. OTONI ROCHA', '3041'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PREF. WILSON PEDRO FRANCISCO', 'E. M. PREF. WILSON PEDRO FRANCISCO', '3062'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF YOLANDA RANGEL PEREIRA', 'E. M. PROF YOLANDA RANGEL PEREIRA', '3089'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES', 'E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES', '3038'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. Mª GUILHERMINA DE S FREIRE', 'E. M. PROF. Mª GUILHERMINA DE S FREIRE', '3077'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. PROF. SEVERINA DOS RAMOS DE SOUSA', 'E. M. PROF. SEVERINA DOS RAMOS DE SOUSA', '3088'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. RENATO GONÇALVES MARTINS', 'E. M. RENATO GONÇALVES MARTINS', '3034'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SEVERINO SALUSTIANO DE FARIAS', 'E. M. SEVERINO SALUSTIANO DE FARIAS', '3094'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SYLVIA SOUZA SIQUINELI', 'E. M. SYLVIA SOUZA SIQUINELI', '3059'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. SÃO SEBASTIÃO', 'E. M. SÃO SEBASTIÃO', '3051'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. TEREZA DE ARAUJO SAGÁRIO', 'E. M. TEREZA DE ARAUJO SAGÁRIO', '3056'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. AMÉRICO R. AMORIM', 'E. M. VER. AMÉRICO R. AMORIM', '3064'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. JOSÉ GALLIAÇO PRATA', 'E. M. VER. JOSÉ GALLIAÇO PRATA', '3080'),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO', 'E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO', null),
  ('unidade_escolar', 'Escolas Municipais', 'E. M. VER. TACIANO FERNANDES NUNES', 'E. M. VER. TACIANO FERNANDES NUNES', '3101'),
  ('unidade_escolar', 'Escolas Estadualizadas', 'E. E. M. VALINHA - PEDRO ANTÔNIO DE AGUIAR', null, '3130')
on conflict (nome) do update set
  ramal = coalesce(public.ramais_unidades.ramal, excluded.ramal),
  updated_at = now();
