alter table public.oura_enhanced
  add column if not exists sleep_phase_5_min text,
  add column if not exists hr_items double precision[],
  add column if not exists hrv_items double precision[],
  add column if not exists movement_items text;
