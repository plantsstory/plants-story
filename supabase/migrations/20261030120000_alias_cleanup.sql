-- Board 14 T175 (2026-10-30): two aliases that sent searches to the wrong place.
--   109 'Mystique A88': 'ミスティーク' is only part of the name (the search still finds it through 'ミスティークA88').
--   59 antolakii: 'Darkest Panamá' was decided for removal on 10-03 and was still there.
-- Before (for undo):
--   59  {Black Velvet Eastern Panama,BVEP,アントラキー,アントラキイ,ブラックベルベット イースタンパナマ,Darkest Panamá}
--   109 {Mystique a88,ミスティークA88,ミスティーク}
-- 'クイーンアンスリウム' / 'キングアンスリウム' were not added: no Japanese-market source was found on 10-30 (the board's condition).
update cultivars set aliases = array_remove(aliases, 'ミスティーク') where id = 109;
update cultivars set aliases = array_remove(aliases, 'Darkest Panamá') where id = 59;
