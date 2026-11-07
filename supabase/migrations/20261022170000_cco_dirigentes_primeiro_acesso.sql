-- Primeiro acesso dos dirigentes escolares ao CCO.
-- Cada dirigente (planilha "2026 email.xlsx") entra com o próprio e-mail: recebe um código
-- por e-mail, confirma e cria a senha. Ao entrar, cai no CCO vinculado à sua unidade.
--
--   * acessos_por_email ganha o cargo; os dirigentes herdam a unidade do e-mail institucional
--     da escola (já cadastrado em 20261022130000);
--   * o gatilho de perfis passa a aplicar nome e cargo do dirigente;
--   * primeiro_acesso_tentativas limita pedidos de código (usada só pela Edge Function).
-- Requer 20261022130000_acessos_por_email.sql.

begin;

alter table public.acessos_por_email add column if not exists cargo text;

-- Dirigentes e equipe: e-mail pessoal, nome, cargo e o e-mail da conta vinculada.
-- Cada pessoa herda o papel dessa conta: e-mail de escola → dirigente da unidade;
-- cpdinfra (admin) → administrador (Recepção e CCO).
create temp table _planilha (email text, nome text, cargo text, email_unidade text) on commit drop;
insert into _planilha (email, nome, cargo, email_unidade) values
  ('luciana.silva@professor.itaguai.rj.gov.br', 'Luciana Lisboa Rosa Pereira da Silva', 'Dirigente Escolar', 'cm.aparecidaazedo@edu.itaguai.rj.gov.br'),
  ('ninahribeiro@professor.itaguai.rj.gov.br', 'Ninah de Freitas Ribeiro', 'Dirigente Escolar', 'cm.daniellebatistadasilva@edu.itaguai.rj.gov.br'),
  ('bianca.silva@professor.itaguai.rj.gov.br', 'Bianca Gonçalves da Silva', 'Dirigente Escolar', 'cm.edsoncruzamado@edu.itaguai.rj.gov.br'),
  ('denise.salutti@professor.itaguai.rj.gov.br', 'Denise Spoliante Salutti', 'Dirigente Escolar', 'cm.euclydesjoseborges@edu.itaguai.rj.gov.br'),
  ('maria.oliveira@professor.itaguai.rj.gov.br', 'Maria Rozinete Moreira de Oliveira', 'Dirigente Escolar', 'cm.florentinoelias@edu.itaguai.rj.gov.br'),
  ('veronice.lima@professor.itaguai.rj.gov.br', 'Veronice Felix de Oliveira de Lima', 'Dirigente Escolar', 'cm.franciscoxavierdemourabrito@edu.itaguai.rj.gov.br'),
  ('adriana.pires@professor.itaguai.rj.gov.br', 'Adriana Chaves Pires', 'Dirigente Escolar', 'cm.mariaeduvigesdorosariosilva@edu.itaguai.rj.gov.br'),
  ('janilza.bispo@professor.itaguai.rj.gov.br', 'Janilza Maria Bispo', 'Dirigente Escolar', 'cm.mariarosagomesdonascimento@edu.itaguai.rj.gov.br'),
  ('ingrid.costa@professor.itaguai.rj.gov.br', 'Ingrid Carvalho Costa Lima', 'Dirigente Escolar', 'cm.elianelopesbarbosa@edu.itaguai.rj.gov.br'),
  ('renata.valverde@edu.itaguai.rj.gov.br', 'Renata Mendes Valverde de Oliveira Gonçalves', 'Dirigente Escolar', 'cm.mariacristinapadelacabraldasilva@edu.itaguai.rj.gov.br'),
  ('elisabete.oliveira@professor.itaguai.rj.gov.br', 'Elisabete Alves de Oliveira Ramos', 'Dirigente Escolar', 'cm.mariadelurdessgarcia@edu.itaguai.rj.gov.br'),
  ('ericasilva@edu.itaguai.rj.gov.br', 'Erica Cristina Oliveira da Silva', 'Dirigente Escolar', 'cm.taniamaramottademenezes@edu.itaguai.rj.gov.br'),
  ('andreza.santos@professor.itaguai.rj.gov.br', 'Andreza Azevedo dos Santos', 'Dirigente Escolar', 'cm.goethecoutinhomadruga@edu.itaguai.rj.gov.br'),
  ('rosangela.silva@professor.itaguai.rj.gov.br', 'Rosangela Nascimento da Silva', 'Dirigente Escolar', 'cm.joaquiminoue@edu.itaguai.rj.gov.br'),
  ('lucia.sagava@professor.itaguai.rj.gov.br', 'Lúcia Sayuri Yokoyama Sagava', 'Dirigente Escolar', 'cm.teresinhadejesuscamposdefarias@edu.itaguai.rj.gov.br'),
  ('carolinapedro@professor.itaguai.rj.gov.br', 'Carolina Monteiro do Nascimento Pedro', 'Dirigente Escolar', 'cm.ritaferreirafeijo@edu.itaguai.rj.gov.br'),
  ('ana.pinha@edu.itaguai.rj.gov.br', 'Ana Cristina Belmonte Lima Pinha', 'Dirigente Escolar', 'cm.verjoseantoniocarrasco@edu.itaguai.rj.gov.br'),
  ('cristiano.souza@professor.itaguai.rj.gov.br', 'Cristiano Vitor Souza', 'Dirigente Escolar', 'cemaee@edu.itaguai.rj.gov.br'),
  ('leniedja.brandao@edu.itaguai.rj.gov.br', 'Leniedja da Silva Brandão Barbosa', 'Dirigente Escolar', 'cesmi@edu.itaguai.rj.gov.br'),
  ('cleiton.santos@professor.itaguai.rj.gov.br', 'Cleiton Magalhães Pereira dos Santos', 'Dirigente Escolar', 'ciep300@edu.itaguai.rj.gov.br'),
  ('rafael.menezes@professor.itaguai.rj.gov.br', 'Rafael Ribeiro Menezes', 'Dirigente Escolar', 'ciep496@edu.itaguai.rj.gov.br'),
  ('cassia.silva@professor.itaguai.rj.gov.br', 'Cássia Regina Ramos da Silva', 'Dirigente Escolar', 'cm.senadorteotoniovilella@edu.itaguai.rj.gov.br'),
  ('natalina.batista@professor.itaguai.rj.gov.br', 'Natalina Alves Batista', 'Dirigente Escolar', 'eem.camilocuquejo@edu.itaguai.rj.gov.br'),
  ('claudiasantiago@edu.itaguai.rj.gov.br', 'Claudia Regina de Lima Santiago', 'Dirigente Escolar', 'eem.carmemmenezesdireito@edu.itaguai.rj.gov.br'),
  ('thaissilva@professor.itaguai.rj.gov.br', 'Thais Silva de Souza', 'Dirigente Escolar', 'eem.chapero@edu.itaguai.rj.gov.br'),
  ('ana.borges@professor.itaguai.rj.gov.br', 'Ana Cristina Borges de Santana', 'Dirigente Escolar', 'eem.fazsantacandida@edu.itaguai.rj.gov.br'),
  ('fernanda.pinto@professor.itaguai.rj.gov.br', 'Fernanda Lima Feliciano Pinto', 'Dirigente Escolar', 'eem.drjorgeabrahao@edu.itaguai.rj.gov.br'),
  ('marli.fernandes@professor.itaguai.rj.gov.br', 'Marli dos Santos Fernandes', 'Dirigente Escolar', 'eem.santarosa@edu.itaguai.rj.gov.br'),
  ('dayse.goncalves@professor.itaguai.rj.gov.br', 'Dayse Adriana Sodré Gonçalves', 'Dirigente Escolar', 'eem.tacianobasilio@edu.itaguai.rj.gov.br'),
  ('sandra.silva@professor.itaguai.rj.gov.br', 'Sandra Dias Pimenta da Silva', 'Dirigente Escolar', 'em.alexandreignacio@edu.itaguai.rj.gov.br'),
  ('iloniapaulo@edu.itaguai.rj.gov.br', 'Ilonia Márcia de Miranda Paulo', 'Dirigente Escolar', 'em.amauriferreira@edu.itaguai.rj.gov.br'),
  ('monica.drumond@professor.itaguai.rj.gov.br', 'Monica de Lima Drumond', 'Dirigente Escolar', 'em.antoniotupinamba@edu.itaguai.rj.gov.br'),
  ('julianaavilez@edu.itaguai.rj.gov.br', 'Juliana Lima de Jesus Avilez', 'Dirigente Escolar', 'em.argentinacoutinho@edu.itaguai.rj.gov.br'),
  ('roberta.galdino@professor.itaguai.rj.gov.br', 'Roberta Oliveira da Silva Galdino', 'Dirigente Escolar', 'em.celalzirosantiago@edu.itaguai.rj.gov.br'),
  ('camila.fonseca@professor.itaguai.rj.gov.br', 'Camila Lopes Sabino Fonseca', 'Dirigente Escolar', 'em.acacias@edu.itaguai.rj.gov.br'),
  ('sonia.costa@professor.itaguai.rj.gov.br', 'Sonia Isabel Valentim Costa Machado', 'Dirigente Escolar', 'emei.hypolitovieradecarvalho@edu.itaguai.rj.gov.br'),
  ('debora.carneiro@edu.itaguai.rj.gov.br', 'Débora Domingos Carneiro', 'Dirigente Escolar', 'emei.monteirolobato@edu.itaguai.rj.gov.br'),
  ('marinalda.lemes@professor.itaguai.rj.gov.br', 'Marinalda de Lima Lemes', 'Dirigente Escolar', 'emei.prefisoldacksoncruzdebrito@edu.itaguai.rj.gov.br'),
  ('joseni.barbosa@professor.itaguai.rj.gov.br', 'Joseni de Souza Barreto Barbosa', 'Dirigente Escolar', 'em.eiderribeirodantas@edu.itaguai.rj.gov.br'),
  ('sonia.barbosa@professor.itaguai.rj.gov.br', 'Sonia Regina Silva de Oliveira Barbosa', 'Dirigente Escolar', 'em.elmirafigueira@edu.itaguai.rj.gov.br'),
  ('dannubiapereira@professor.itaguai.rj.gov.br', 'Dannúbia da Silva Pereira', 'Dirigente Escolar', 'em.elmobaptistacoelho@edu.itaguai.rj.gov.br'),
  ('kilsa.silva@professor.itaguai.rj.gov.br', 'Kilsa Cristina Arantes Gonçalves Silva', 'Dirigente Escolar', 'em.fusaofukmati@edu.itaguai.gov.br'),
  ('luciana.cicarino@professor.itaguai.rj.gov.br', 'Luciana Karla de Oliveira Cicarino', 'Dirigente Escolar', 'em.joaovicentesoares@edu.itaguai.rj.gov.br'),
  ('leandro.fonseca@professor.itaguai.rj.gov.br', 'Leandro Ferreira Fonseca', 'Dirigente Escolar', 'em.jorgefloresdasilva@edu.itaguai.rj.gov.br'),
  ('erika.matos@professor.itaguai.rj.gov.br', 'Erika Francisca Ferreira Silva de Matos', 'Dirigente Escolar', 'em.oscarjosedesouza@edu.itaguai.rj.gov.br'),
  ('lilian.eugenio@professor.itaguai.rj.gov.br', 'Lilian Kelly Amaral ce Souza Eugênio', 'Dirigente Escolar', 'em.padrerafaelscarfo@edu.itaguai.rj.gov.br'),
  ('dayanelima@edu.itaguai.rj.gov.br', 'Dayane Lima Feliciano Pinto', 'Dirigente Escolar', 'em.prefalbeilardgoulartdesouza@edu.itaguai.rj.gov.br'),
  ('tania.medeiros@professor.itaguai.rj.gov.br', 'Tania Maria da Silva Medeiros', 'Dirigente Escolar', 'em.prefotonirocha@edu.itaguai.rj.gov.br'),
  ('ivanetesiqueira@edu.itaguai.rj.gov.br', 'Ivanete Ferreira de Siqueira', 'Dirigente Escolar', 'em.prefwilsonpedrofrancisco@edu.itaguai.rj.gov.br'),
  ('thais.pinto@professor.itaguai.rj.gov.br', 'Thais Ribeiro Correa Pinto', 'Dirigente Escolar', 'em.mariaguilherminadesouzafreire@edu.itaguai.rj.gov.br'),
  ('flavio.lima@professor.itaguai.rj.gov.br', 'Flavio Cosme Rocha de Lima', 'Dirigente Escolar', 'em.severinadosramosdesousa@edu.itaguai.rj.gov.br'),
  ('margareth.ferreira@professor.itaguai.rj.gov.br', 'Margareth Ferreira', 'Dirigente Escolar', 'em.yolandarangelpereira@edu.itaguai.rj.gov.br'),
  ('sandro.correa@professor.itaguai.rj.gov.br', 'Sandro Caetano Corrêa', 'Dirigente Escolar', 'em.marianildesiqueiragoncalves@edu.itaguai.rj.gov.br'),
  ('lusmar.barboza@edu.itaguai.rj.gov.br', 'Lusmar Moraes Barboza', 'Dirigente Escolar', 'em.renatogoncalvesmartins@edu.itaguai.rj.gov.br'),
  ('marinalva.conde@professor.itaguai.rj.gov.br', 'Marinalva dos Santos Conde', 'Dirigente Escolar', 'em.saosebastiao@edu.itaguai.rj.gov.br'),
  ('ina.tamaki@professor.itaguai.rj.gov.br', 'Ina Daniela de Oliveira Tamaki', 'Dirigente Escolar', 'em.severinosalustianodefreitas@edu.itaguai.rj.gov.br'),
  ('rogeria.impronta@professor.itaguai.rj.gov.br', 'Rogeria Tavares Moreira Impronta', 'Dirigente Escolar', 'em.sylviasouzasiquineli@edu.itaguai.rj.gov.br'),
  ('dayane.moura@professor.itaguai.rj.gov.br', 'Dayane Rodrigues da Conceição Moura', 'Dirigente Escolar', 'em.terezadearaujosagario@edu.itaguai.rj.gov.br'),
  ('luciane.valle@professor.itaguai.rj.gov.br', 'Luciane Leal do Valle', 'Dirigente Escolar', 'em.veramericorodriguesdeamorim@edu.itaguai.rj.gov.br'),
  ('marcelo.barros@professor.itaguai.rj.gov.br', 'Marcelo Donizete de Barros', 'Dirigente Escolar', 'em.vereadorgalliacoprata@edu.itaguai.rj.gov.br'),
  ('rosineia.ferreira@professor.itaguai.rj.gov.br', 'Rosineia Alves Batista Saad Ferreira', 'Dirigente Escolar', 'em.vertaianofernandesnunes@edu.itaguai.rj.gov.br'),
  ('maria.mariano@edu.itaguai.rj.gov.br', 'Maria José de Andrade Mariano', 'Dirigente Escolar', 'em.verprofessorarthurbritodecastro@edu.itaguai.rj.gov.br'),
  -- Assessores de TI: herdam o acesso da conta cpdinfra (admin: Recepção e CCO).
  ('joe.amado@edu.itaguai.rj.gov.br', 'Joe Nai Amado de Souza', 'Assessor TI', 'cpdinfra@edu.itaguai.rj.gov.br'),
  ('rodrigo.sleiman@edu.itaguai.rj.gov.br', 'Rodrigo Sleiman', 'Assessor TI', 'cpdinfra@edu.itaguai.rj.gov.br'),
  ('luiz.gustavo@edu.itaguai.rj.gov.br', 'Luiz Gustavo Martins Braga', 'Assessor TI', 'cpdinfra@edu.itaguai.rj.gov.br'),
  ('wesley.silva@edu.itaguai.rj.gov.br', 'Wesley Pinheiro Cardoso da Silva', 'Assessor TI', 'cpdinfra@edu.itaguai.rj.gov.br'),
  ('viviane.chagas@edu.itaguai.rj.gov.br', 'Viviane da Conceição Chagas', 'Assessor TI', 'cpdinfra@edu.itaguai.rj.gov.br')
;

insert into public.acessos_por_email (email, role, unidade_id, responsavel, cargo)
select lower(btrim(p.email)), u.role, case when u.role = 'unidade_escolar' then u.unidade_id end, p.nome, p.cargo
from _planilha p
join public.acessos_por_email u on u.email = lower(btrim(p.email_unidade)) and u.role in ('unidade_escolar', 'admin')
on conflict (email) do update
set role = excluded.role, unidade_id = excluded.unidade_id, responsavel = excluded.responsavel, cargo = excluded.cargo;

-- Avisa quem ficou de fora porque o e-mail da unidade/conta vinculada não foi encontrado.
do $$
declare
  v_fora text;
begin
  select string_agg(p.email || ' → ' || p.email_unidade, E'\n') into v_fora
  from _planilha p
  where not exists (
    select 1 from public.acessos_por_email u
    where u.email = lower(btrim(p.email_unidade)) and u.role in ('unidade_escolar', 'admin')
  );
  if v_fora is not null then
    raise warning E'Sem unidade/conta vinculada (não cadastrados):\n%', v_fora;
  end if;
end;
$$;

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
    new.cargo := coalesce(v_acesso.cargo, case when new.cargo is null or new.cargo in ('Recepcionista', 'Operador', '') then 'Responsável pela unidade' else new.cargo end);
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'cco_admin' then
    new.acesso_cco := false;
    new.cco_unidades := null;
    new.cargo := coalesce(v_acesso.cargo, 'Administrador do CCO');
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  elsif v_acesso.role = 'admin' then
    new.cargo := coalesce(v_acesso.cargo, case when new.cargo is null or new.cargo = 'Recepcionista' then 'Administrador' else new.cargo end);
    if v_acesso.responsavel is not null and (new.nome_completo is null or new.nome_completo = split_part(new.email, '@', 1)) then
      new.nome_completo := v_acesso.responsavel;
    end if;
  end if;
  return new;
end;
$$;

-- Controle de pedidos de código (sem acesso pelo navegador: RLS ligada e nenhuma política).
create table if not exists public.primeiro_acesso_tentativas (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_primeiro_acesso_email on public.primeiro_acesso_tentativas (email, created_at desc);
create index if not exists idx_primeiro_acesso_ip on public.primeiro_acesso_tentativas (ip, created_at desc);
alter table public.primeiro_acesso_tentativas enable row level security;

-- Aplica papel, unidade, nome e cargo aos perfis que já existam.
update public.profiles p
set role = a.role::public.user_role,
    unidade_id = case when a.role = 'unidade_escolar' then a.unidade_id end,
    acesso_cco = case when a.role = 'unidade_escolar' then false else p.acesso_cco end,
    cco_unidades = case when a.role = 'unidade_escolar' then null else p.cco_unidades end,
    cargo = coalesce(a.cargo, p.cargo),
    nome_completo = case
      when a.responsavel is not null and (p.nome_completo is null or p.nome_completo = split_part(p.email, '@', 1)) then a.responsavel
      else p.nome_completo
    end,
    updated_at = now()
from public.acessos_por_email a
where lower(btrim(p.email)) = a.email and a.cargo is not null and a.role in ('unidade_escolar', 'admin');

commit;

-- Conferência (opcional):
-- select a.email, a.role, a.responsavel, a.cargo, u.nome as unidade
-- from public.acessos_por_email a left join public.ramais_unidades u on u.id = a.unidade_id
-- where a.cargo is not null order by a.role, u.nome nulls first;
