-- 11-25 owner: the kind in two parts — what the plant comes from (原種 / Hybrid / 不明) and Clone as a tick.
-- Stored as the row's type (unchanged) plus a tag parentage:species|hybrid|unknown on every Hybrid and Clone row.
-- The assignment below was shown to the owner on 11-25 and approved (「すすめて」 / 「そのまま」).
-- Grounds (each row's own record): unknown where no source says wild species or cross; never guessed as Hybrid.
with v(id, p) as (values
  -- Anthurium (public)
  (140, 'species'),  -- papillilaminum 'Fort Sherman': one wild plant from the Panama Canal area
  (142, 'species'),  -- papillilaminum 'Ree garden's': one wild-origin plant from Panama
  (53,  'hybrid'),   -- 'Angels dream': 「元は magnificum の交配種」, one plant named by kunzo
  (144, 'hybrid'),   -- 'Michelle': owner (magnificum-based hybrid)
  (109, 'hybrid'),   -- 'Mystique A88': 'Dorayaki' × 'Red Crystallinum', one selected plant
  (7,   'unknown'),  -- 'Ace of Spades': a seedling of an unidentified plant, selfed or crossed — not recorded
  (2,   'unknown'),  -- 'King of Spades': made by Haji Ulih, no parents recorded
  (8,   'unknown'),  -- 'Queen of Hearts': only "probably a somaclonal variant of 'Ace of Spades'"
  (5,   'hybrid'),   -- 'Dark Mama': warocqueanum × papillilaminum, the plants of one cross
  (145, 'hybrid'),   -- 'Zara': magnificum × a red crystallinum cultivar, generations of seedlings
  (110, 'hybrid'),   -- 'Galaxy': 'X-One' × 'Dark Phoenix', several selected plants (10-08)
  (131, 'hybrid'),   -- 'BVIT': trade label for Indonesian-made plants of differing parents
  (52,  'unknown'),  -- 'Red Crystallinum': "thought to be of hybrid origin", parents unknown, unconfirmed
  -- Monstera / Philodendron (not shown on the site now; set so the data is whole)
  (15,  'species'),  -- Monstera deliciosa 'Thai Constellation'
  (16,  'species'),  -- Monstera deliciosa 'Albo Variegata'
  (21,  'species'),  -- Monstera deliciosa 'Aurea'
  (74,  'unknown'),  -- Monstera sp. 'Burle Marx's Flame': the species is not settled
  (29,  'species'),  -- Philodendron erubescens 'Pink Princess' (the record: a variegated erubescens)
  (24,  'hybrid'),   -- Philodendron 'Glorious': gloriosum × melanochrysum
  (30,  'hybrid'),   -- Philodendron 'Majestic': verrucosum × sodiroi
  (27,  'hybrid')    -- Philodendron 'Splendid': verrucosum × melanochrysum
)
update public.cultivars c
set tags = coalesce((select array_agg(t) from unnest(coalesce(c.tags, '{}')) t where t not like 'parentage:%'), '{}') || array['parentage:' || v.p]
from v
where c.id = v.id and c.type in ('clone', 'hybrid');

select c.id, c.cultivar_name, c.type, array_to_string(c.tags, ',') tags
from public.cultivars c where c.type in ('clone', 'hybrid') order by c.genus, c.type, c.cultivar_name;
