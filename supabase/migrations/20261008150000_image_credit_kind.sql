-- 2026-10-08 board 9 (T112/T123): who took a photo (credit, the uploader's profile name after they confirm it is
-- their own photo) and which plant it shows for a Clone/Hybrid (the original or its divisions/TC, a seedling (F),
-- or not known — the default, which shows nothing).
alter table public.cultivar_images add column if not exists credit text;
alter table public.cultivar_images add column if not exists specimen_kind text;
alter table public.cultivar_images drop constraint if exists cultivar_images_specimen_kind_check;
alter table public.cultivar_images add constraint cultivar_images_specimen_kind_check
  check (specimen_kind is null or specimen_kind in ('original', 'f_seedling', 'unknown'));
alter table public.cultivar_images drop constraint if exists cultivar_images_credit_len;
alter table public.cultivar_images add constraint cultivar_images_credit_len check (credit is null or length(credit) <= 80);
