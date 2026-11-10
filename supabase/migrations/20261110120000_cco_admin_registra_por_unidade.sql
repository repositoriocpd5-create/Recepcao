-- O administrador (admin e cco_admin) registra ocorrências em nome de qualquer unidade escolar.
begin;

drop policy if exists "CCO: unidade registra as próprias ocorrências" on public.cco_ocorrencias;
create policy "CCO: unidade registra as próprias ocorrências"
on public.cco_ocorrencias for insert to authenticated
with check (
  (public.cco_perfil() = 'unidade' and unidade_id = public.cco_minha_unidade())
  or public.cco_perfil() = 'admin'
);

-- Fotos: o administrador envia para a pasta de qualquer unidade.
drop policy if exists "CCO: admin envia fotos" on storage.objects;
create policy "CCO: admin envia fotos"
on storage.objects for insert to authenticated
with check (bucket_id = 'cco-fotos' and public.cco_perfil() = 'admin');

drop policy if exists "CCO: admin reenvia fotos" on storage.objects;
create policy "CCO: admin reenvia fotos"
on storage.objects for update to authenticated
using (bucket_id = 'cco-fotos' and public.cco_perfil() = 'admin')
with check (bucket_id = 'cco-fotos' and public.cco_perfil() = 'admin');

commit;
