-- Papéis das chaves externas — parte 2 de 2. Requer a parte 1 já executada.
alter table public.acessos_por_email drop constraint if exists acessos_por_email_role_check;
alter table public.acessos_por_email add constraint acessos_por_email_role_check
  check (role in ('admin', 'gestor', 'recepcionista', 'atendente', 'unidade_escolar', 'cco', 'cco_admin', 'cpd_os', 'agenda_mkt'));
