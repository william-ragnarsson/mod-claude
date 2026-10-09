# mod-claude

A directory of [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/reference), live at https://www.mod-claude.com.

Anyone can submit a public GitHub repo, with no account. The site finds every mod in it (any folder whose `hooks/hooks.json` has a `modules` entry) and lists it right away. The home page sorts mods by Popular (GitHub stars plus installs), Hot (recent installs, each counting half as much every 3 days) or Recent. An install is someone copying a mod's install command on the site, counted once per browser. A daily job refreshes stars, descriptions and READMEs.

Built with Next.js 16 (Cache Components) and Supabase.

## How it works

- `lib/ingest.ts` has `ingestRepo(owner, repo)`, the one function that finds and saves mods. The submit form, the seed script and the daily cron all call it.
- `lib/data.ts` reads mods with the public key, cached under the `mods` tag. Submissions call `updateTag("mods")`, so new mods show up immediately.
- The `mods` table has row-level security: the public key can only read rows that aren't hidden. Only the server writes, using `SUPABASE_SECRET_KEY`.
- To take a mod down, set `hidden = true` on its row in the Supabase table editor.

## Local setup

```bash
cp .env.example .env.local   # then fill it in
npm install
npx tsx --env-file=.env.local scripts/seed.ts   # load the known mod repos
npm run dev
```

The database schema is in `supabase/migrations/` (apply the files in order).

Seed script options:

```bash
npx tsx --env-file=.env.local scripts/seed.ts --dry                    # list what it would add, write nothing
npx tsx --env-file=.env.local scripts/seed.ts owner/repo other/repo    # add specific repos
```

## Environment variables

| Name | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional: defaults to the site's own project in `lib/supabase.ts`. Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional, with the same default. Supabase → Project Settings → API Keys (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys. Server only. |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Fine-grained token with public repo read-only access. Raises the limit from 60 to 5,000 requests per hour. |
| `CRON_SECRET` | Any long random string, for example `openssl rand -hex 32` |

## Deploy

1. Push this repo to GitHub and import it in Vercel.
2. Add `SUPABASE_SECRET_KEY`, `GITHUB_TOKEN` and `CRON_SECRET` to the Vercel project. Without them the site still builds and lists mods, but submitting and the daily refresh fail.
3. Add the domain `mod-claude.com` (and `www.mod-claude.com`) under Project → Domains.
4. `vercel.json` schedules `/api/cron/refresh` daily at 06:00 UTC. Vercel sends `CRON_SECRET` automatically.
