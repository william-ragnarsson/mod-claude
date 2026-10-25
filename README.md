# mod-claude

A directory of [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/reference), live at https://www.mod-claude.com.

Anyone can submit a public GitHub repo, with no account. The site finds every mod in it (any folder whose `hooks/hooks.json` has a `modules` entry) and lists it right away. The home page sorts mods by Popular (GitHub stars plus installs), Hot (recent installs, each counting half as much every 3 days) or Recent, and by installs or stars when you click those column headings. An install is someone copying a mod's install command on the site, counted once per browser. For now the counts shown also include made-up installs, about 2.5 times each repo's stars with noise, to get the site started (`lib/synthetic.ts`; Hot only counts real ones). An hourly job updates stars, and re-reads the descriptions and READMEs of repos pushed to since they were last read (and of every repo once a day). Each mod is sorted into categories such as Usage & cost, Safety or Fun & games by TypeSafe's Jev model, and the home page filters by them.

Built with Next.js 16 (Cache Components) and Supabase.

## How it works

- `lib/ingest.ts` has `ingestRepo(owner, repo)`, the one function that finds and saves mods. The submit form, the seed script and the hourly refresh all call it.
- `lib/refresh.ts` checks every listed repo with one GitHub request and re-reads only those that were pushed to, renamed or deleted, plus each repo once a day. It stops early to keep 1,000 of the token's hourly requests for submissions, and the next run picks up what it skipped.
- `lib/data.ts` reads mods with the public key, cached under the `mods` tag. Submissions call `updateTag("mods")`, so new mods show up immediately.
- The `mods` table has row-level security: the public key can only read rows that aren't hidden. Only the server writes, using `SUPABASE_SECRET_KEY`.
- To take a mod down, set `hidden = true` on its row in the Supabase table editor.
- `lib/categorize.ts` asks [TypeSafe's Jev](https://docs.typesafe.ai) one yes/no question per category in `lib/categories.ts`, from a mod's name, description and README, whenever ingest saves it. The `categories` column keeps each category's probability, and the site lists a mod under those of 0.7 or more. `categories_hash` records what Jev was asked, so a mod is only judged again when its text, a category's wording or the model changes. If Jev fails or `TYPESAFE_API_KEY` isn't set, the mod is saved with the categories it had.

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

After changing `lib/categories.ts`, judge the listed mods again now rather than on their next re-read:

```bash
npx tsx --env-file=.env.local scripts/categorize.ts --dry   # print each mod's categories, write nothing
npx tsx --env-file=.env.local scripts/categorize.ts         # save them (only mods whose question or text changed)
```

## Environment variables

| Name | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional: defaults to the site's own project in `lib/supabase.ts`. Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional, with the same default. Supabase → Project Settings → API Keys (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret keys. Server only. |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Fine-grained token with public repo read-only access. Raises the limit from 60 to 5,000 requests per hour. |
| `CRON_SECRET` | Any long random string, for example `openssl rand -hex 32` |
| `TYPESAFE_API_KEY` | Optional: [TypeSafe](https://typesafe.ai) dashboard → API keys. Without it, mods are listed without categories. |

## Deploy

1. Push this repo to GitHub and import it in Vercel.
2. Add `SUPABASE_SECRET_KEY`, `GITHUB_TOKEN`, `CRON_SECRET` and `TYPESAFE_API_KEY` to the Vercel project. Without the first three the site still builds and lists mods, but submitting and the refresh fail; without the last, new mods get no categories.
3. Add the domain `mod-claude.com` (and `www.mod-claude.com`) under Project → Domains.
4. `.github/workflows/refresh.yml` calls `/api/cron/refresh` hourly. Add the same `CRON_SECRET` as a GitHub Actions secret: `gh secret set CRON_SECRET`.
5. `vercel.json` also schedules it daily at 06:00 UTC, as a fallback (Vercel's Hobby plan only allows daily crons). Vercel sends `CRON_SECRET` automatically.
