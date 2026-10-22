-- CCO — Central Controle Operacional: novos papéis de acesso.
-- Fica em arquivo próprio porque um valor novo de enum só pode ser usado
-- depois que a transação que o criou é confirmada.
--   unidade_escolar: usuário da escola; registra e acompanha as ocorrências da própria unidade.
--   cco:             equipe da Central; acompanha e atende as ocorrências das unidades autorizadas.

alter type public.user_role add value if not exists 'unidade_escolar';
alter type public.user_role add value if not exists 'cco';
