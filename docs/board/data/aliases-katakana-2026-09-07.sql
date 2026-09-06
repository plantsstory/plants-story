begin;
-- Board 2026-09-07 (content A): katakana aliases so a name typed the way Japanese growers write it still finds the entry.
-- Merged into aliases (existing values kept, duplicates removed).
create or replace function pg_temp.add_aliases(p_id bigint, p_new text[]) returns void language sql as $$
  update public.cultivars set aliases = (select array_agg(distinct x order by x) from unnest(coalesce(aliases, '{}'::text[]) || p_new) as x), updated_at = now() where id = p_id;
$$;
select pg_temp.add_aliases(1,   array['カルラブラッキアエ','カーラブラッキアエ']);
select pg_temp.add_aliases(3,   array['クリスタリナム','クリスタリヌム']);
select pg_temp.add_aliases(4,   array['ワロクアナム','ワロッケアナム','ワロキアナム']);
select pg_temp.add_aliases(6,   array['ベイチー','ヴェイチー','ベイチイ']);
select pg_temp.add_aliases(9,   array['クラリネルビウム','クラリネルヴィウム']);
select pg_temp.add_aliases(10,  array['マグニフィカム','マグニフィクム']);
select pg_temp.add_aliases(11,  array['フォルゲティ','フォルゲッティ','フォルゲッティー']);
select pg_temp.add_aliases(31,  array['ドレスレリ']);
select pg_temp.add_aliases(32,  array['パピリラミナム','パピリラミヌム']);
select pg_temp.add_aliases(33,  array['ヌティバレンセ']);
select pg_temp.add_aliases(34,  array['デビレ','デビリス']);
select pg_temp.add_aliases(35,  array['スプレンディダム','スプレンディドゥム']);
select pg_temp.add_aliases(38,  array['クナヤレンセ']);
select pg_temp.add_aliases(57,  array['ルクスリアンス','ルクスリアンズ']);
select pg_temp.add_aliases(77,  array['ウェンドリンゲリ','ヴェンドリンゲリ']);
select pg_temp.add_aliases(82,  array['サギッタタム']);
select pg_temp.add_aliases(83,  array['レガーレ','レガレ']);
select pg_temp.add_aliases(120, array['モロネンセ']);
select pg_temp.add_aliases(59,  array['アントラキー','アントラキイ','ブラックベルベット イースタンパナマ']);
select pg_temp.add_aliases(108, array['ベッセアエ','アフィニス ベッセアエ']);
select pg_temp.add_aliases(2,   array['キングオブスペード','キング・オブ・スペード']);
select pg_temp.add_aliases(7,   array['エースオブスペード','エース・オブ・スペード']);
select pg_temp.add_aliases(8,   array['クイーンオブハーツ','クイーン・オブ・ハーツ']);
select pg_temp.add_aliases(5,   array['ダークママ']);
select pg_temp.add_aliases(52,  array['レッドクリスタリナム']);
select pg_temp.add_aliases(109, array['ミスティーク','ミスティークA88']);
select pg_temp.add_aliases(110, array['ギャラクシー']);
commit;
