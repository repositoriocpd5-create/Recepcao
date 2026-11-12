-- Endereço e localização do prédio da SMEDU para todos os departamentos.
begin;

update public.ramais_unidades
  set endereco = 'Rua Ary Parreiras, nº 1242',
      bairro = 'Engenho',
      cep = '23820-380',
      latitude = -22.8686368970542,
      longitude = -43.78889502338,
      mapa_url = 'https://maps.app.goo.gl/Pk8wnD23ZyUeiHwBA',
      foto_url = 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=jwBbo0RjJlhZnKB-LabdJg&cb_client=search.gws-prod.grass&w=408&h=240&yaw=321.9729&pitch=1.3461014&thumbfov=100'
  where tipo = 'departamento';

commit;
