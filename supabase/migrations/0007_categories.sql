-- Which categories each mod fits, as TypeSafe's Jev model judged them: the probability for each category id in
-- lib/categories.ts, such as {"usage": 0.94, "fun": 0.03}. The site picks the ones above its threshold, so changing
-- that needs no re-judging. categories_hash covers everything Jev was asked, so a re-read asks again only when the
-- mod's name, description or README, or the questions, changed.
alter table public.mods add column categories jsonb, add column categories_hash text;
