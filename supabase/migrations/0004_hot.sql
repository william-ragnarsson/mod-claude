-- What the home page's Hot sort ranks by: installs, each counting half as much for every 3 days since it happened.
-- `hot` is that decayed count as of `hot_at`, the mod's last install, so it only changes when someone installs.
alter table public.mods
  add column hot float8 not null default 0,
  add column hot_at timestamptz;

-- Replacing the function keeps its grants: still only the server (secret key) counts installs.
create or replace function public.count_install(mod_owner text, mod_repo text, mod_slug text)
returns void
language sql
set search_path = ''
as $$
  update public.mods
  set installs = installs + 1,
      -- 259200 seconds is the 3-day half-life. Capping at 1000 half-lives keeps an install from years ago from underflowing.
      hot = 1 + coalesce(hot * power(0.5, least(extract(epoch from now() - hot_at) / 259200, 1000)), 0),
      hot_at = now()
  where lower(owner) = lower(mod_owner)
    and lower(repo) = lower(mod_repo)
    and lower(slug) = lower(mod_slug)
    and not hidden;
$$;
