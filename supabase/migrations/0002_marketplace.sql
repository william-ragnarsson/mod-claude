-- The "name" in the repo's .claude-plugin/marketplace.json. Installing is /plugin install <install_name>@<marketplace>.
alter table public.mods add column marketplace text;
