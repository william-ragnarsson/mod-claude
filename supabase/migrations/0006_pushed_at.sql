-- When the repo was last pushed to, from GitHub. The hourly refresh re-reads a repo's files only when this
-- changes (or once a day), and otherwise just updates stars. updated_at is when its files were last read.
alter table public.mods add column pushed_at timestamptz;
