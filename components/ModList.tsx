"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ModSummary } from "@/lib/data";
import { modHref, repoHref, repoName, type Host } from "@/lib/hosts";

const TABS = {
  popular: { label: "Popular", hint: "Most stars and installs" },
  hot: { label: "Hot", hint: "Most installs lately: each counts half as much every 3 days" },
  recent: { label: "Recent", hint: "Newest on the site" },
};
type Tab = keyof typeof TABS;
// The Installs and Stars column headings sort by their column.
type Sort = Tab | "installs" | "stars";

/**
 * One row on the list: a repo, with every mod of it that matches the search. Stars belong to the repo, so they count once.
 * Installs and heat add up over the row's mods.
 */
type Entry = { host: Host; owner: string; repo: string; stars: number; installs: number; heat: number; latest: string; mods: ModSummary[] };

const popularity = (entry: Entry) => entry.stars + entry.installs;

// Ties keep getMods order: most stars, then first listed.
const SORTS: Record<Sort, (a: Entry, b: Entry) => number> = {
  popular: (a, b) => popularity(b) - popularity(a),
  hot: (a, b) => b.heat - a.heat || popularity(b) - popularity(a),
  recent: (a, b) => b.latest.localeCompare(a.latest),
  installs: (a, b) => b.installs - a.installs || b.stars - a.stars,
  stars: (a, b) => b.stars - a.stars || b.installs - a.installs,
};

// Matches the half-life in count_install (migration 0004).
const HOT_HALF_LIFE_MS = 3 * 24 * 60 * 60 * 1000;

// A repo row names this many of its mods, then links to the repo for the rest.
const SHOWN_MODS = 6;

// 2.1k and 12.3k, but 357k rather than 357.1k, so counts fit the phone column.
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
  maximumSignificantDigits: 3,
  roundingPriority: "lessPrecision",
});

export function ModList({ mods }: { mods: ModSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const search = useRef<HTMLInputElement>(null);

  // "/" jumps to search, like most developer sites.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      event.preventDefault();
      search.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Each mod's `hot` is as of its own last install. Decaying them all to the latest install anywhere compares them at one moment.
  const heats = useMemo(() => {
    const at = (mod: ModSummary) => (mod.hot_at ? Date.parse(mod.hot_at) : 0);
    const latest = Math.max(0, ...mods.map(at));
    return new Map(mods.map((mod) => [mod, mod.hot_at ? mod.hot * 0.5 ** ((latest - at(mod)) / HOT_HALF_LIFE_MS) : 0]));
  }, [mods]);

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const entries = new Map<string, Entry>();
    // getMods sorts by stars, so each repo lands in star order the first time one of its mods shows up.
    for (const mod of mods) {
      const haystack = `${mod.name} ${repoName(mod)} ${mod.description ?? ""}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) continue;
      const key = repoName(mod);
      const heat = heats.get(mod) ?? 0;
      const entry = entries.get(key);
      if (entry) {
        entry.mods.push(mod);
        entry.installs += mod.installs;
        entry.heat += heat;
        if (mod.created_at > entry.latest) entry.latest = mod.created_at;
      } else {
        entries.set(key, {
          host: mod.host,
          owner: mod.owner,
          repo: mod.repo,
          stars: mod.stars,
          installs: mod.installs,
          heat,
          latest: mod.created_at,
          mods: [mod],
        });
      }
    }
    return [...entries.values()].sort(SORTS[sort]);
  }, [mods, heats, query, sort]);

  // How many mods each repo holds, matching the search or not.
  const totals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mod of mods) counts.set(repoName(mod), (counts.get(repoName(mod)) ?? 0) + 1);
    return counts;
  }, [mods]);

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search mods</span>
          <SearchIcon />
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search mods"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-lg border border-line bg-bg pr-10 pl-9 text-sm text-fg outline-none placeholder:text-faint focus:border-line-strong"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-faint sm:block">
            /
          </kbd>
        </label>
        <div role="tablist" aria-label="Sort" className="flex h-10 shrink-0 rounded-lg border border-line p-1">
          {(Object.keys(TABS) as Tab[]).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              title={TABS[value].hint}
              aria-selected={sort === value}
              onClick={() => setSort(value)}
              className="flex-1 rounded-md px-3.5 text-sm text-muted transition-colors hover:text-fg aria-selected:bg-hover aria-selected:text-fg"
            >
              {TABS[value].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className={`${COLUMNS} border-b border-line px-3 pb-2 font-mono text-[11px] tracking-wider text-faint uppercase`}>
          <span>#</span>
          <span>Mod</span>
          <Heading
            icon={<InstallIcon />}
            label="Installs"
            hint="Sort by installs: install commands copied on this site, once per browser"
            active={sort === "installs"}
            onClick={() => setSort("installs")}
          />
          <Heading
            icon={<StarIcon />}
            label="Stars"
            hint="Sort by stars on the repo"
            active={sort === "stars"}
            onClick={() => setSort("stars")}
          />
        </div>
        {visible.length === 0 ? (
          <p className="px-3 py-10 text-sm text-muted">
            {mods.length === 0 ? "No mods listed yet. " : "No mods match your search. "}
            <Link href="/submit" className="text-fg underline underline-offset-4 hover:no-underline">
              {mods.length === 0 ? "Submit the first one" : "Know one that's missing?"}
            </Link>
          </p>
        ) : (
          <ol>
            {visible.map((entry, index) => (
              <li key={repoName(entry)}>
                {entry.mods.length === 1 ? (
                  <ModRow mod={entry.mods[0]} rank={index + 1} />
                ) : (
                  <RepoRow entry={entry} total={totals.get(repoName(entry)) ?? 0} rank={index + 1} />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// Fixed number columns, so counts line up from row to row.
const COLUMNS = "grid grid-cols-[1.75rem_1fr_2.75rem_2.75rem] gap-3 sm:grid-cols-[2.25rem_1fr_5.5rem_4.5rem] sm:gap-4";
const ROW = `${COLUMNS} items-center border-b border-line px-3 py-3.5 transition-colors hover:bg-subtle`;

type HeadingProps = { icon: ReactNode; label: string; hint: string; active: boolean; onClick: () => void };

// On phones the column headings are just icons. The sort arrow hangs off the left, so it doesn't push the label.
function Heading({ icon, label, hint, active, onClick }: HeadingProps) {
  return (
    <button
      type="button"
      title={hint}
      aria-pressed={active}
      onClick={onClick}
      className="group relative flex items-center justify-end gap-1.5 uppercase transition-colors hover:text-muted aria-pressed:text-fg"
    >
      <SortIcon />
      {icon}
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="text-right font-mono text-sm text-muted tabular-nums">{compact.format(value).toLowerCase()}</span>
  );
}

function ModRow({ mod, rank }: { mod: ModSummary; rank: number }) {
  return (
    <Link href={modHref(mod)} className={ROW}>
      <span className="font-mono text-sm text-faint tabular-nums">{rank}</span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="max-w-full shrink-0 truncate font-medium text-fg">{mod.name}</span>
          <span className="truncate font-mono text-xs text-faint">{repoName(mod)}</span>
        </span>
        {mod.description && <span className="mt-0.5 block truncate text-sm text-muted">{mod.description}</span>}
      </span>
      <Count value={mod.installs} />
      <Count value={mod.stars} />
    </Link>
  );
}

// The repo name links to the repo's page and covers the row; each mod's chip links to that mod above it.
function RepoRow({ entry, total, rank }: { entry: Entry; total: number; rank: number }) {
  const href = repoHref(entry);
  const shown = entry.mods.slice(0, SHOWN_MODS);
  const more = total - shown.length;
  return (
    <div className={`relative ${ROW}`}>
      <span className="font-mono text-sm text-faint tabular-nums">{rank}</span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <Link href={href} className="max-w-full shrink-0 truncate font-medium text-fg after:absolute after:inset-0">
            {entry.repo}
          </Link>
          <span className="truncate font-mono text-xs text-faint">
            {entry.host === "github" ? entry.owner : `gitlab.com/${entry.owner}`} ·{" "}
            {entry.mods.length < total ? `${entry.mods.length} of ${total}` : total} mods
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {shown.map((mod) => (
            <Link
              key={mod.slug}
              href={modHref(mod)}
              className="relative z-10 max-w-full truncate rounded-md border border-line bg-bg px-2 py-0.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {mod.name}
            </Link>
          ))}
          {more > 0 && (
            <Link
              href={href}
              className="relative z-10 rounded-md px-1.5 py-0.5 text-xs text-faint transition-colors hover:text-fg"
            >
              +{more} more
            </Link>
          )}
        </span>
      </span>
      <Count value={entry.installs} />
      <Count value={entry.stars} />
    </div>
  );
}

function InstallIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg
      aria-hidden
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="absolute right-full mr-1 opacity-0 transition-opacity group-hover:opacity-60 group-aria-pressed:opacity-100"
    >
      <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M8 1.75l1.93 3.91 4.32.63-3.13 3.05.74 4.3L8 11.61l-3.86 2.03.74-4.3L1.75 6.29l4.32-.63L8 1.75z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
    >
      <circle cx="7" cy="7" r="4.75" />
      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
    </svg>
  );
}
