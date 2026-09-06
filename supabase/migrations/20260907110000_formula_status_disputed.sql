-- Board 2026-09-07: formula_status gains 'disputed' (parentage contested; alt_claims come with P5)
ALTER TABLE public.cultivars DROP CONSTRAINT IF EXISTS cultivars_formula_status_check;
ALTER TABLE public.cultivars ADD CONSTRAINT cultivars_formula_status_check CHECK (formula_status IS NULL OR formula_status IN ('known', 'unknown', 'complex', 'disputed', 'partial'));
