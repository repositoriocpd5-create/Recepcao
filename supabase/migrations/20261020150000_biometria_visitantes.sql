-- Foto do rosto e digital (opcionais) no cadastro de visitantes.
-- Dado biométrico é dado pessoal sensível (LGPD, art. 11): exige consentimento específico,
-- registrado em biometria_consentida_em. A foto fica em bucket PRIVADO e é exibida por URL assinada.
-- O template da digital nunca passa pelo navegador nem é gravado aqui: fica com o agente biométrico local.

alter table public.visitantes
  add column if not exists foto_path text,
  add column if not exists digital_cadastrada_em timestamptz,
  add column if not exists biometria_consentida_em timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitantes-fotos', 'visitantes-fotos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Operadores veem fotos de visitantes" on storage.objects;
create policy "Operadores veem fotos de visitantes"
on storage.objects for select to authenticated
using (bucket_id = 'visitantes-fotos');

drop policy if exists "Operadores enviam fotos de visitantes" on storage.objects;
create policy "Operadores enviam fotos de visitantes"
on storage.objects for insert to authenticated
with check (bucket_id = 'visitantes-fotos');

drop policy if exists "Operadores substituem fotos de visitantes" on storage.objects;
create policy "Operadores substituem fotos de visitantes"
on storage.objects for update to authenticated
using (bucket_id = 'visitantes-fotos')
with check (bucket_id = 'visitantes-fotos');

drop policy if exists "Admin remove fotos de visitantes" on storage.objects;
create policy "Admin remove fotos de visitantes"
on storage.objects for delete to authenticated
using (bucket_id = 'visitantes-fotos' and public.is_admin());
