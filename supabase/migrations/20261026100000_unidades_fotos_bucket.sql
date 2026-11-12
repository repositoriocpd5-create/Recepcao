-- Fotos de fachada enviadas pelo administrador (PNG/JPG). Bucket público para leitura (a foto aparece em Ramais/CCO);
-- somente admin grava, substitui e remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('unidades-fotos', 'unidades-fotos', true, 3145728, array['image/jpeg', 'image/png'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin envia fotos de unidades" on storage.objects;
create policy "Admin envia fotos de unidades"
on storage.objects for insert to authenticated
with check (bucket_id = 'unidades-fotos' and public.is_admin());

drop policy if exists "Admin substitui fotos de unidades" on storage.objects;
create policy "Admin substitui fotos de unidades"
on storage.objects for update to authenticated
using (bucket_id = 'unidades-fotos' and public.is_admin())
with check (bucket_id = 'unidades-fotos' and public.is_admin());

drop policy if exists "Admin remove fotos de unidades" on storage.objects;
create policy "Admin remove fotos de unidades"
on storage.objects for delete to authenticated
using (bucket_id = 'unidades-fotos' and public.is_admin());
