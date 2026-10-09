-- How many times someone copied one of a mod's install commands on the site (once per browser).
-- The daily refresh never writes this column, so it survives re-ingesting.
alter table public.mods add column installs int not null default 0;

create function public.count_install(mod_owner text, mod_repo text, mod_slug text)
returns void
language sql
set search_path = ''
as $$
  update public.mods
  set installs = installs + 1
  where lower(owner) = lower(mod_owner)
    and lower(repo) = lower(mod_repo)
    and lower(slug) = lower(mod_slug)
    and not hidden;
$$;

-- Only the server (secret key) counts installs.
revoke execute on function public.count_install(text, text, text) from public, anon, authenticated;
grant execute on function public.count_install(text, text, text) to service_role;
