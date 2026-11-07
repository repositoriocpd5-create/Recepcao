-- CCO: a unidade pode registrar uma ocorrência ou relatar problema em câmera(s).
-- Colunas novas e opcionais: os registros antigos continuam como 'ocorrencia'.

alter table public.cco_ocorrencias
  add column if not exists tipo_registro text not null default 'ocorrencia',
  add column if not exists cameras text[],
  add column if not exists tipo_problema text;

alter table public.cco_ocorrencias drop constraint if exists cco_tipo_registro_valido;
alter table public.cco_ocorrencias
  add constraint cco_tipo_registro_valido check (tipo_registro in ('ocorrencia', 'camera'));

alter table public.cco_ocorrencias drop constraint if exists cco_camera_coerente;
alter table public.cco_ocorrencias
  add constraint cco_camera_coerente check (
    (tipo_registro = 'ocorrencia' and cameras is null and tipo_problema is null)
    or (
      tipo_registro = 'camera'
      and cameras is not null
      and cardinality(cameras) between 1 and 30
      and tipo_problema is not null
      and char_length(btrim(tipo_problema)) between 1 and 80
    )
  );
