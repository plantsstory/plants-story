begin;
-- 7 Ace of Spades: the contributor's text; notes keep only what the text does not say
update cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb(text $t$Anthurium 'Ace of Spades' は、フロリダのナーセリーである The Orchid Jungle にて管理されていた、南米採集の未同定株に由来する選抜個体である。

この母株は当初 Anthurium hoffmannii としてラベルされていたが、形態的特徴からその同定には疑問があり、正確な種同定はされていない。

採集地では単独で存在していたとされ、自家受粉、もしくは自然交雑により得られた種子から実生が育成された。その後、Denis Rotolante によって播種され、得られた実生群の中から特に優れた形質を持つ個体が選抜され 'Ace of Spades' と命名された。

そのため本個体は明確な交配式を持つ人工交配種ではなく、自然由来の遺伝背景を持つ実生選抜クローンと考えられている。$t$)), '{0,structured,notes}', to_jsonb(text $t$所属: Silver Krome Gardens (SKG)。$t$)), updated_at = now() where id = 7;
-- 8 Queen of Hearts: the record and its selected-from link back, with the contributor's text
update cultivars set origins = $j$[{"author":{"date":"2026-04-07","isAI":false,"name":"User"},"body":"Anthurium 'Queen of Hearts'は'Ace of Spades'組織培養(TC)の由来のソマクローナル変異から生まれた品種である可能性が高い。","source_type":"manual","sources":[],"structured":{"collector":null,"notes":null,"origin_type":"clone"},"trust":25,"trustClass":"trust--low","votes":{"agree":0,"disagree":0}}]$j$::jsonb, selected_from_id = 7, tags = '{tc_origin}', updated_at = now() where id = 8 and jsonb_array_length(origins) = 0;
-- 52 Red Crystallinum
update cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb(text $t$Anthurium 'Red Crystallinum' は、一般的な Anthurium crystallinum とは異なる園芸系統で、Tim Anderson が保有していた個体群に由来するとされる。

これらの個体は交配由来と考えられているが、親種は不明であり、'Wonderboy' と呼ばれる系統の関与が指摘されているものの、確証はない。

その後、この系統に属する複数の個体が分けられ、NSE Tropicals、Tezula Plants、および Docblock にそれぞれ別個体として渡ったとされる。

各所でこれらの個体の実生化が行われたため、現在 "Red crystallinum" の名称は単一のクローンではなく、共通した特徴を持つ複数の系統（クローンおよびその実生群）を含む総称として用いられている。$t$)), updated_at = now() where id = 52;
-- 53 Angels dream
update cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb(text $t$kunzoさんが2000年にフィリピンの有名な園芸家より迎えた個体に名付けた。
元はアメリカの有名なmagnificum種の交配種$t$)), updated_at = now() where id = 53;
-- 2 King of Spades: Japanese and English as the contributor wrote them
update cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb(text $t$インドネシア・ボゴールの Haji Ulih（ハジ・ウリ）氏が作出し、命名したオリジナル個体（クローン）の名前。オリジナルから代々実生をして改良が続けられており、流通している株はオリジナルの実生（F個体）であって本クローンそのものではない。$t$)), '{0,body_en}', to_jsonb(text $t$Anthurium cultivar created by Haji Ulih in Bogor, Indonesia, and improved over generations.$t$)), updated_at = now() where id = 2;
select json_agg(json_build_object('id',id,'body',left(origins->0->>'body',60),'n',jsonb_array_length(origins),'sf',selected_from_id)) from cultivars where id in (2,7,8,52,53);
commit;
