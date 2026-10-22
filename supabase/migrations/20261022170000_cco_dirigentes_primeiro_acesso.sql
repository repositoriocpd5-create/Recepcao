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

-- Dirigentes: e-mail pessoal, nome, cargo e o e-mail da unidade (para achar a unidade).
with planilha(email, nome, cargo, email_unidade) as (
  values
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
  ('joe.amado@edu.itaguai.rj.gov.br', 'Joe Nai Amado de Souza', 'Secretário', 'eem.santarosa@edu.itaguai.rj.gov.br')
)
insert into public.acessos_por_email (email, role, unidade_id, responsavel, cargo)
select lower(p.email), 'unidade_escolar', u.unidade_id, p.nome, p.cargo
from planilha p
join public.acessos_por_email u on u.email = lower(p.email_unidade) and u.role = 'unidade_escolar'
on conflict (email) do update
set role = excluded.role, unidade_id = excluded.unidade_id, responsavel = excluded.responsavel, cargo = excluded.cargo;

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
  elsif v_acesso.role = 'admin' and (new.cargo is null or new.cargo = 'Recepcionista') then
    new.cargo := 'Administrador';
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

-- Aplica nome/cargo aos perfis de dirigentes que já existam.
update public.profiles p
set role = 'unidade_escolar'::public.user_role,
    unidade_id = a.unidade_id,
    cargo = coalesce(a.cargo, p.cargo),
    nome_completo = case when p.nome_completo = split_part(p.email, '@', 1) then a.responsavel else p.nome_completo end,
    updated_at = now()
from public.acessos_por_email a
where lower(btrim(p.email)) = a.email and a.cargo is not null;

commit;

-- Conferência (opcional):
-- select a.email, a.responsavel, a.cargo, u.nome as unidade
-- from public.acessos_por_email a join public.ramais_unidades u on u.id = a.unidade_id
-- where a.cargo is not null order by u.nome;
