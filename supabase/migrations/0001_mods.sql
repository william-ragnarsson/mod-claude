create table public.mods (
  id uuid primary key default gen_random_uuid(),
  owner text not null,                -- canonical casing from GitHub full_name
  repo text not null,
  slug text not null,                 -- URL-safe form of name
  name text not null,                 -- plugin.json name, or folder name
  path text not null default '',      -- mod folder in the repo ('' = root)
  description text,
  stars int not null default 0,       -- repo stars
  default_branch text not null default 'main',
  install_name text,                  -- plugin name in the repo's marketplace.json, if any
  readme text,
  readme_path text,                   -- where the README lives, to resolve relative links
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index mods_identity on public.mods (lower(owner), lower(repo), lower(slug));
create index mods_stars on public.mods (stars desc);

alter table public.mods enable row level security;

-- Anyone can read visible mods. There are no write policies: only the server (secret key) writes.
create policy "public read" on public.mods
  for select to anon, authenticated
  using (not hidden);
