-- Papéis das chaves externas — parte 1 de 2 (rode sozinho; o Postgres só usa o valor novo do enum após o commit).
alter type public.user_role add value if not exists 'cpd_os';
alter type public.user_role add value if not exists 'agenda_mkt';
