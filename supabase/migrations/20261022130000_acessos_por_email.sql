-- Acesso por e-mail: ao entrar, cada usuário cai no módulo certo.
--   * e-mails institucionais das unidades escolares (planilha "2026 nomes RECEPÇÃO.xlsx", aba Página5)
--     → papel unidade_escolar, vinculado à unidade: abre o CCO para registrar ocorrências;
--   * marina.recepcao e claudia.recepcao → recepcionista: abre a Recepção;
--   * cpdinfra → admin: acessa Recepção e CCO.
-- Requer 20261022120000_cco_papeis.sql e 20261022120100_cco_ocorrencias.sql.
--
-- A regra vale para quem já existe (atualizado aqui) e para quem for criado depois no
-- Supabase Auth ou na tela Administração: o gatilho aplica papel e unidade pelo e-mail.

begin;

create table if not exists public.acessos_por_email (
  email text primary key check (email = lower(btrim(email))),
  role text not null check (role in ('admin', 'gestor', 'recepcionista', 'atendente', 'unidade_escolar', 'cco')),
  unidade_id uuid references public.ramais_unidades(id) on delete set null,
  responsavel text,
  constraint acessos_unidade_obrigatoria check (role <> 'unidade_escolar' or unidade_id is not null)
);

comment on table public.acessos_por_email is 'Papel e unidade definidos pelo e-mail de login (aplicados em public.profiles).';

alter table public.acessos_por_email enable row level security;
drop policy if exists "Admin gerencia acessos por e-mail" on public.acessos_por_email;
create policy "Admin gerencia acessos por e-mail"
on public.acessos_por_email for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Unidades escolares (e-mail, responsável, nome da unidade em ramais_unidades)
with planilha(email, responsavel, unidade) as (
  values
  ('cm.aparecidaazedo@edu.itaguai.rj.gov.br', 'Luciana Lisboa', 'CRECHE M. APARECIDA AZEDO'),
  ('cm.daniellebatistadasilva@edu.itaguai.rj.gov.br', 'Ninah de Freitas Ribeiro', 'CRECHE M. DANIELLE BATISTA DA SILVA'),
  ('cm.edsoncruzamado@edu.itaguai.rj.gov.br', 'Bianca Gonçalves da Silva', 'CRECHE M. EDSON CRUZ AMADO'),
  ('cm.euclydesjoseborges@edu.itaguai.rj.gov.br', 'Denise Spoliante Salutti', 'CRECHE M. EUCLYDES JOSE BORGES'),
  ('cm.florentinoelias@edu.itaguai.rj.gov.br', 'Maria Rozinete Moreira de Oliveira', 'CRECHE M. FLORENTINO ELIAS'),
  ('cm.franciscoxavierdemourabrito@edu.itaguai.rj.gov.br', 'Veronice Felix de Oliveira de Lima', 'CRECHE M. FRANCISCO XAVIER DE M. BRITO'),
  ('cm.mariaeduvigesdorosariosilva@edu.itaguai.rj.gov.br', 'Adriana Chaves Pires', 'CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA'),
  ('cm.mariarosagomesdonascimento@edu.itaguai.rj.gov.br', 'Janilza Maria Bispo', 'CRECHE M. MARIA ROSA G. DO NASCIMENTO'),
  ('cm.elianelopesbarbosa@edu.itaguai.rj.gov.br', 'Ingrid Carvalho Costa', 'CRECHE M. PROF. ELIANE LOPES BARBOSA'),
  ('cm.mariacristinapadelacabraldasilva@edu.itaguai.rj.gov.br', 'Renata Mendes Valverde de Oliveira Goncalves', 'CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA'),
  ('cm.mariadelurdessgarcia@edu.itaguai.rj.gov.br', 'Elisabete Alves de Oliveira Ramos', 'CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA'),
  ('cm.taniamaramottademenezes@edu.itaguai.rj.gov.br', 'Erica Cristina Oliveira da Silva', 'CRECHE M. PROF. TANIA MARA M. MENEZES'),
  ('cm.goethecoutinhomadruga@edu.itaguai.rj.gov.br', 'Andreza Azevedo dos Santos', 'CRECHE M. PROF. GOETHE COUTINHO MADRUGA'),
  ('cm.joaquiminoue@edu.itaguai.rj.gov.br', 'Rosangela Nascimento da Silva', 'CRECHE M. PROF. JOAQUIM INOUE'),
  ('cm.renatobarbosaladislau@edu.itaguai.rj.gov.br', 'Caroline Pedrazzi de Almeida Vieira', 'CRECHE M. PROF. RENATO BARBOSA LADISLAU'),
  ('cm.teresinhadejesuscamposdefarias@edu.itaguai.rj.gov.br', 'Lucia Sayuri Yokoyama Sagava', 'CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS'),
  ('cm.ritaferreirafeijo@edu.itaguai.rj.gov.br', 'Carolina Monteiro do Nascimento Pedro', 'CRECHE M. RITA FERREIRA FEIJÓ'),
  ('cm.verjoseantoniocarrasco@edu.itaguai.rj.gov.br', 'Ana Cristina Belmonte Lima Pinha', 'CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO'),
  ('cemaee@edu.itaguai.rj.gov.br', 'Cristiano Vitor Souza', 'CEMAEE'),
  ('cesmi@edu.itaguai.rj.gov.br', 'Leniedja da Silva Brandão Barbosa', 'CENTRO EDUCACIONAL DE ITAGUAI (CESMI)'),
  ('ciep300@edu.itaguai.rj.gov.br', 'Cleiton Magalhães Pereira dos Santos', 'CIEP 300 M. PREF. VICENTE CICARINO'),
  ('ciep496@edu.itaguai.rj.gov.br', 'Rafael Ribeiro Menezes', 'CIEP 496 M. MAESTRO F. MIGNONE'),
  ('ciep497@edu.itaguai.rj.gov.br', 'Flavia Motta da Silveira Salgado', 'CIEP 497 M. PROF.SILVIA TUPINAMBÁ'),
  ('cm.senadorteotoniovilella@edu.itaguai.rj.gov.br', 'Cássia Regina R. da Silva', 'C. M. SEN. TEOTÔNIO VILELLA'),
  ('eem.camilocuquejo@edu.itaguai.rj.gov.br', 'Natalina Alves Batista', 'E. E. M. CAMILO CUQUEJO'),
  ('eem.carmemmenezesdireito@edu.itaguai.rj.gov.br', 'Claudia Regina de Lima Santiago', 'E. E. M. CARMEM MENEZES DIREITO'),
  ('eem.chapero@edu.itaguai.rj.gov.br', 'Thais Silva de Souza', 'E. E. M. CHAPERÓ'),
  ('eem.fazsantacandida@edu.itaguai.rj.gov.br', 'Ana Cristina Borges de Santana', 'E. E. M. FAZENDA SANTA CÂNDIDA'),
  ('eem.drjorgeabrahao@edu.itaguai.rj.gov.br', 'Fernanda Lima Feliciano Pinto', 'E. E. M. DRº JORGE ABRAHÃO'),
  ('eem.santarosa@edu.itaguai.rj.gov.br', 'Marli dos Santos Fernandes', 'E. E. M. SANTA ROSA'),
  ('eem.tacianobasilio@edu.itaguai.rj.gov.br', 'Dayse Adriana Sodre Goncalves', 'E. E. M. TACIANO BASILIO'),
  ('em.alexandreignacio@edu.itaguai.rj.gov.br', 'Sandra Dias Pimenta da Silva', 'E. M. ALEXANDRE IGNÁCIO'),
  ('em.amauriferreira@edu.itaguai.rj.gov.br', 'Ilonia Marcia de Miranda Paulo', 'E. M. AMAURI FERREIRA'),
  ('em.antoniotupinamba@edu.itaguai.rj.gov.br', 'Monica de Lima Drumond', 'E. M. ANTÔNIO TUPINAMBÁ'),
  ('em.argentinacoutinho@edu.itaguai.rj.gov.br', 'Juliana Lima de Jesus Avilez', 'E. M. ARGENTINA COUTINHO'),
  ('em.celalzirosantiago@edu.itaguai.rj.gov.br', 'Roberta Oliveira da Silva Galdino', 'E. M. CORONEL ALZIRO SANTIAGO'),
  ('em.acacias@edu.itaguai.rj.gov.br', 'Camila Lopes Sabino Fonseca', 'E. M. DAS ACÁCIAS'),
  ('emei.hypolitovieradecarvalho@edu.itaguai.rj.gov.br', 'Sonia Isabel Valentim Costa Machado', 'E. M. E. I. HYPOLITO VIEIRA DE CARVALHO'),
  ('emei.monteirolobato@edu.itaguai.rj.gov.br', 'Débora Domingos Carneiro', 'E. M. E. I. MONTEIRO LOBATO'),
  ('emei.prefisoldacksoncruzdebrito@edu.itaguai.rj.gov.br', 'Marinalda de Lima Lemes', 'E. M. E. I. PREF. ISOLDACKSON C. BRITO'),
  ('em.eiderribeirodantas@edu.itaguai.rj.gov.br', 'Joseni de Souza Barreto Barbosa', 'E. M. EIDER RIBEIRO DANTAS'),
  ('em.elmirafigueira@edu.itaguai.rj.gov.br', 'Sonia Regina Silva de Oliveira Barbosa', 'E. M. ELMIRA FIGUEIRA'),
  ('em.elmobaptistacoelho@edu.itaguai.rj.gov.br', 'Dannubia', 'E. M. ELMO BAPTISTA COELHO'),
  ('em.fusaofukmati@edu.itaguai.gov.br', 'Kilsa Cristina Arantes Goncalves Silva', 'E. M. FUSAO FUKAMATI'),
  ('em.joaovicentesoares@edu.itaguai.rj.gov.br', 'Luciana Karla de Oliveira Cicarino', 'E. M. JOAO VICENTE SOARES'),
  ('em.jorgefloresdasilva@edu.itaguai.rj.gov.br', 'Leandro Ferreira Fonseca', 'E. M. JORGE FLORES DA SILVA'),
  ('em.oscarjosedesouza@edu.itaguai.rj.gov.br', 'Erika Francisca Ferreira Silva de Matos', 'E. M. OSCAR JOSÉ DE SOUZA'),
  ('em.padrerafaelscarfo@edu.itaguai.rj.gov.br', 'Lilian Kelly Amaral de Souza Eugenio', 'E. M. PADRE RAFAEL SCARFÓ'),
  ('em.prefalbeilardgoulartdesouza@edu.itaguai.rj.gov.br', 'Dayane Lima Feliciano Pinto', 'E. M. PREF. ABEILARD G. SOUZA'),
  ('em.prefotonirocha@edu.itaguai.rj.gov.br', 'Tania Maria da Silva Medeiros', 'E. M. PREF. OTONI ROCHA'),
  ('em.prefwilsonpedrofrancisco@edu.itaguai.rj.gov.br', 'Ivanete Ferreira de Siqueira', 'E. M. PREF. WILSON PEDRO FRANCISCO'),
  ('em.mariaguilherminadesouzafreire@edu.itaguai.rj.gov.br', 'Thais Ribeiro Correa Pinto', 'E. M. PROF. Mª GUILHERMINA DE S FREIRE'),
  ('em.severinadosramosdesousa@edu.itaguai.rj.gov.br', 'Flavio Cosme Rocha de Lima', 'E. M. PROF. SEVERINA DOS RAMOS DE SOUSA'),
  ('em.yolandarangelpereira@edu.itaguai.rj.gov.br', 'Margareth Ferreira', 'E. M. PROF YOLANDA RANGEL PEREIRA'),
  ('em.marianildesiqueiragoncalves@edu.itaguai.rj.gov.br', 'Sandro Corrêa', 'E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES'),
  ('em.renatogoncalvesmartins@edu.itaguai.rj.gov.br', 'Lusmar Moraes Barbosa', 'E. M. RENATO GONÇALVES MARTINS'),
  ('em.saosebastiao@edu.itaguai.rj.gov.br', 'Marinalva dos Santos Conde', 'E. M. SÃO SEBASTIÃO'),
  ('em.severinosalustianodefreitas@edu.itaguai.rj.gov.br', 'Ina Daniela de Oliveira Tamaki', 'E. M. SEVERINO SALUSTIANO DE FARIAS'),
  ('em.sylviasouzasiquineli@edu.itaguai.rj.gov.br', 'Rogeria Tavares Moreira Impronta', 'E. M. SYLVIA SOUZA SIQUINELI'),
  ('em.terezadearaujosagario@edu.itaguai.rj.gov.br', 'Dayane Rodrigues da Conceição Moura', 'E. M. TEREZA DE ARAUJO SAGÁRIO'),
  ('em.veramericorodriguesdeamorim@edu.itaguai.rj.gov.br', 'Luciane Leal do Valle', 'E. M. VER. AMÉRICO R. AMORIM'),
  ('em.vereadorgalliacoprata@edu.itaguai.rj.gov.br', 'Marcelo Donizete de Barros', 'E. M. VER. JOSÉ GALLIAÇO PRATA'),
  ('em.vertaianofernandesnunes@edu.itaguai.rj.gov.br', 'Rosineia Alves Batista', 'E. M. VER. TACIANO FERNANDES NUNES'),
  ('em.verprofessorarthurbritodecastro@edu.itaguai.rj.gov.br', 'Maria Jose de Andrade Mariano', 'E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO')
)
insert into public.acessos_por_email (email, role, unidade_id, responsavel)
select lower(p.email), 'unidade_escolar', u.id, p.responsavel
from planilha p
join public.ramais_unidades u on u.nome = p.unidade
on conflict (email) do update
set role = excluded.role, unidade_id = excluded.unidade_id, responsavel = excluded.responsavel;

-- Avisa (sem interromper) se alguma unidade da planilha não existir em ramais_unidades.
do $$
declare v_faltando int;
begin
  select 64 - count(*) into v_faltando from public.acessos_por_email where role = 'unidade_escolar';
  if v_faltando > 0 then
    raise notice '% unidade(s) da planilha não encontrada(s) em ramais_unidades.', v_faltando;
  end if;
end;
$$;

-- Recepção e administrador
insert into public.acessos_por_email (email, role, responsavel) values
  ('marina.recepcao@edu.itaguai.rj.gov.br', 'recepcionista', 'Marina'),
  ('claudia.recepcao@edu.itaguai.rj.gov.br', 'recepcionista', 'Cláudia'),
  ('cpdinfra@edu.itaguai.rj.gov.br', 'admin', null)
on conflict (email) do update
set role = excluded.role, unidade_id = null, responsavel = coalesce(excluded.responsavel, public.acessos_por_email.responsavel);

-- Ao criar o perfil (ou trocar o e-mail), aplica papel e unidade previstos para o e-mail.
create or replace function public.profiles_aplicar_acesso_por_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_acesso public.acessos_por_email%rowtype;
begin
  select * into v_acesso from public.acessos_por_email where email = lower(btrim(new.email));
  if v_acesso.email is null then
    return new;
  end if;
  new.role := v_acesso.role::public.user_role;
  new.unidade_id := case when v_acesso.role = 'unidade_escolar' then v_acesso.unidade_id end;
  if v_acesso.role = 'unidade_escolar' then
    new.acesso_cco := false;
    new.cco_unidades := null;
    if new.cargo is null or new.cargo in ('Recepcionista', 'Operador', '') then
      new.cargo := 'Responsável pela unidade';
    end if;
    -- Perfil criado só com o início do e-mail como nome: usa o responsável da planilha.
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'admin' and (new.cargo is null or new.cargo = 'Recepcionista') then
    new.cargo := 'Administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_aplicar_acesso_por_email on public.profiles;
create trigger trg_profiles_aplicar_acesso_por_email
before insert or update of email on public.profiles
for each row execute function public.profiles_aplicar_acesso_por_email();

-- Aplica agora aos usuários que já existem.
update public.profiles p
set role = a.role::public.user_role,
    unidade_id = case when a.role = 'unidade_escolar' then a.unidade_id end,
    acesso_cco = case when a.role = 'unidade_escolar' then false else p.acesso_cco end,
    cco_unidades = case when a.role = 'unidade_escolar' then null else p.cco_unidades end,
    cargo = case
      when a.role = 'unidade_escolar' and (p.cargo is null or p.cargo in ('Recepcionista', 'Operador', '')) then 'Responsável pela unidade'
      when a.role = 'admin' and (p.cargo is null or p.cargo = 'Recepcionista') then 'Administrador'
      else p.cargo
    end,
    nome_completo = case
      when a.role = 'unidade_escolar' and a.responsavel is not null and p.nome_completo = split_part(p.email, '@', 1) then a.responsavel
      else p.nome_completo
    end,
    updated_at = now()
from public.acessos_por_email a
where lower(btrim(p.email)) = a.email;

commit;

-- Conferência (opcional):
-- select a.email, a.role, u.nome as unidade, p.id is not null as ja_tem_login
-- from public.acessos_por_email a
-- left join public.ramais_unidades u on u.id = a.unidade_id
-- left join public.profiles p on lower(p.email) = a.email
-- order by a.role, u.nome;
