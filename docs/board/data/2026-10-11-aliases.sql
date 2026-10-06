-- Board 8 T83: katakana aliases (the reading of the Latin name or the spelling used in Japanese trade/search).
-- No katakana for abbreviations ('BVIT') or uncertain readings (villenaorum). aff. besseae loses the plain
-- 「ベッセアエ」, which belongs to besseae itself.
begin;
update cultivars set updated_at = now(),
  aliases = (select array_agg(x order by x) from (select distinct unnest(coalesce(aliases, '{}') || v.add) x) u)
from (values
  (128, array['ベッセアエ']),
  (129, array['パリディフロラム']),
  (130, array['メタリカム']),
  (132, array['ビッタリフォリウム']),
  (133, array['マルモラタム']),
  (134, array['アンガマルカナム']),
  (136, array['ラディカンス']),
  (137, array['ファウストミランダエ']),
  (139, array['フッケリ']),
  (127, array['ケレマレンセ']),
  (140, array['フォートシャーマン']),
  (4,   array['ワロクアーナム'])
) as v(id, add)
where cultivars.id = v.id;
update cultivars set updated_at = now(), aliases = array_remove(aliases, 'ベッセアエ') where id = 108 and 'ベッセアエ' = any(aliases);
commit;
