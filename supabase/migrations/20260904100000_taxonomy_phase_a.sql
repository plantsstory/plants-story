-- Taxonomy schema Phase A (BOARD.md §3, 2026-09-04)
-- Nullable columns only; no behaviour change until the UI reads them.
alter table public.cultivars
  add column if not exists species_qualifier text
    check (species_qualifier is null or species_qualifier in ('sp','aff','cf','ssp','var','f')),
  add column if not exists aliases text[],
  add column if not exists tags text[],
  add column if not exists name_status text
    check (name_status is null or name_status in ('accepted','informal','trade','disputed')),
  add column if not exists locality text,
  add column if not exists parent_a_id bigint references public.cultivars(id) on delete set null,
  add column if not exists parent_b_id bigint references public.cultivars(id) on delete set null,
  add column if not exists parent_a_text text,
  add column if not exists parent_b_text text,
  add column if not exists formula_status text
    check (formula_status is null or formula_status in ('known','partial','unknown','complex')),
  add column if not exists selected_from_id bigint references public.cultivars(id) on delete set null;

comment on column public.cultivars.species_qualifier is 'sp/aff/cf/ssp/var/f for species entries (badge source)';
comment on column public.cultivars.aliases is 'Former spellings and synonyms, e.g. {debilis}';
comment on column public.cultivars.tags is 'variegata, locality_form, tc_origin, line, selfed, disputed_parentage';
comment on column public.cultivars.name_status is 'accepted / informal / trade / disputed';
comment on column public.cultivars.locality is 'Locality form or collection locality for informal names';
comment on column public.cultivars.selected_from_id is 'Seedling record this clone was selected from';

create index if not exists cultivars_parent_a_idx on public.cultivars(parent_a_id);
create index if not exists cultivars_parent_b_idx on public.cultivars(parent_b_id);
