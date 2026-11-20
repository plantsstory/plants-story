-- 11-21 owner: the tools the AI research added (source = 'rakuten') are taken off the page for now; the seven the
-- owner entered by hand (source = 'manual') stay. Nothing is deleted.
-- Published before this ran (to put them back: update ... set is_published = true where id in (...)):
--   8,9,10,11,12,14,15,16,17,18,19,20,21,22,25,26,27,28,30,32,33,34,35,36,38,39,40
update public.affiliates set is_published = false where source = 'rakuten' and is_published;
select source, is_published, count(*) from public.affiliates group by 1, 2 order by 1, 2;
