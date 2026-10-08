-- 2026-10-08: votes need a login on the server too. The site asks for it, but the functions took anonymous calls,
-- so anyone could move a record's votes (and its shown trust) without the site.
revoke execute on function public.cast_origin_vote(text, integer, text) from public, anon;
grant execute on function public.cast_origin_vote(text, integer, text) to authenticated;
revoke execute on function public.vote_on_image(uuid, text, text) from public, anon;
grant execute on function public.vote_on_image(uuid, text, text) to authenticated;
