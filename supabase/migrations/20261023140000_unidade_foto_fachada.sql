-- Foto da fachada das unidades escolares (Google Street View) para o CCO.
begin;

alter table public.ramais_unidades
  add column if not exists foto_url text;

update public.ramais_unidades
  set foto_url = 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=VBfc6YtI6Cbm7UFnELOjKg&cb_client=maps_sv.tactile&w=800&h=480&yaw=18.43039&pitch=-0.4266729&thumbfov=100'
  where nome ilike '%SANTA ROSA%';

commit;
