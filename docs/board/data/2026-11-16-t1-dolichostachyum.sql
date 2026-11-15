-- board 16 T1 (11-16): Anthurium angamarcanum is a synonym of A. dolichostachyum Sodiro (WCVP/POWO, CATE Araceae,
-- Catalogue of Life, GBIF). The accepted name is recorded as its own entry (unverified until the owner checks IPNI);
-- angamarcanum gets the tag 'synonym' and 'synonym_of:<id>' (linked by id, never by name). Its record is not changed.
with ins as (
  insert into public.cultivars (genus, cultivar_name, type, origins, ai_status, tags)
  select 'Anthurium', 'Anthurium dolichostachyum', 'species', jsonb_build_array(jsonb_build_object(
    'body', 'Anthurium dolichostachyum は Sodiro が Anales de la Universidad Central del Ecuador で記載した（IPNI は 16: 198、1902 年、WCVP は 15: 12、1901 年とする）。WCVP はこの名前を受理名とし、A. angamarcanum Sodiro・A. wolfii Sodiro・A. hickenii Sodiro・A. erythrocarpum Sodiro を異名に含める。分布はコロンビア南部からエクアドル。',
    'body_en', 'Described by Sodiro in Anales de la Universidad Central del Ecuador (IPNI: 16: 198, 1902; WCVP: 15: 12, 1901). WCVP accepts the name and treats A. angamarcanum Sodiro, A. wolfii Sodiro, A. hickenii Sodiro and A. erythrocarpum Sodiro as its synonyms. Native range: southern Colombia to Ecuador.',
    'trust', 95,
    'votes', jsonb_build_object('agree', 0, 'disagree', 0),
    'author', jsonb_build_object('date', '2026-11-16', 'isAI', true, 'name', 'GBIF / Kew'),
    'sources', jsonb_build_array(
      jsonb_build_object('url', 'https://www.ipni.org/n/15244-2', 'label', 'IPNI'),
      jsonb_build_object('url', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:15244-2', 'label', 'POWO (Kew)')),
    'verified', false,
    'parentage', null,
    'provenance', 'database',
    'source_url', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:15244-2',
    'structured', jsonb_build_object(
      'notes', null, 'collector', null, 'author_name', 'Sodiro', 'origin_type', 'species', 'type_locality', null,
      'citation_links', jsonb_build_array(
        jsonb_build_object('url', 'https://www.ipni.org/n/15244-2', 'label', 'IPNI'),
        jsonb_build_object('url', 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:15244-2', 'label', 'POWO (Kew)')),
      'known_habitats', 'Colombia, Ecuador', 'collection_year', null, 'publication_year', 1902),
    'trustClass', 'trust--high',
    'source_name', 'GBIF / Kew Backbone Taxonomy',
    'source_tier', 'S',
    'source_type', 'ipni_powo',
    'native_region', 'Colombia, Ecuador',
    'discovery_year', 1902,
    'source_language', 'en',
    'first_description', 'Sodiro, Anales Univ. Centr. Ecuador 16: 198 (1902)',
    'source_tier_label_en', 'IPNI / POWO (Kew)',
    'source_tier_label_jp', 'IPNI / POWO（キュー王立植物園）',
    'discoverer_or_breeder', 'Sodiro')),
    'completed', null
  where not exists (select 1 from public.cultivars where cultivar_name = 'Anthurium dolichostachyum')
  returning id
)
update public.cultivars c set tags = array['synonym', 'synonym_of:' || ins.id]
from ins where c.id = 134;

select id, cultivar_name, type, tags, verified_at from public.cultivars where id = 134 or cultivar_name = 'Anthurium dolichostachyum';
