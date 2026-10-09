"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ModSummary } from "@/lib/data";

type Tab = "top" | "new";

/** One row on the list: a repo, with every mod of it that matches the search. Stars belong to the repo, so they count once. */
type Entry = { owner: string; repo: string; stars: number; latest: string; mods: ModSummary[] };

// A repo row names this many of its mods, then links to the repo for the rest.
const SHOWN_MODS = 6;

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function ModList({ mods }: { mods: ModSummary[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("top");
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

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const entries = new Map<string, Entry>();
    // getMods sorts by stars, so each repo lands in Top order the first time one of its mods shows up.
    for (const mod of mods) {
      const haystack = `${mod.name} ${mod.owner}/${mod.repo} ${mod.description ?? ""}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) continue;
      const key = `${mod.owner}/${mod.repo}`;
      const entry = entries.get(key);
      if (entry) {
        entry.mods.push(mod);
        if (mod.created_at > entry.latest) entry.latest = mod.created_at;
      } else {
        entries.set(key, { owner: mod.owner, repo: mod.repo, stars: mod.stars, latest: mod.created_at, mods: [mod] });
      }
    }
    const matches = [...entries.values()];
    if (tab === "new") matches.sort((a, b) => b.latest.localeCompare(a.latest));
    return matches;
  }, [mods, query, tab]);

  // How many mods each repo holds, matching the search or not.
  const totals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { owner, repo } of mods) counts.set(`${owner}/${repo}`, (counts.get(`${owner}/${repo}`) ?? 0) + 1);
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
          {(["top", "new"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className="rounded-md px-3.5 text-sm text-muted transition-colors hover:text-fg aria-selected:bg-hover aria-selected:text-fg"
            >
              {value === "top" ? "Top" : "New"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-[2.25rem_1fr_auto] gap-4 border-b border-line px-3 pb-2 font-mono text-[11px] tracking-wider text-faint uppercase">
          <span>#</span>
          <span>Mod</span>
          <span>Stars</span>
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
              <li key={`${entry.owner}/${entry.repo}`}>
                {entry.mods.length === 1 ? (
                  <ModRow mod={entry.mods[0]} rank={index + 1} />
                ) : (
                  <RepoRow entry={entry} total={totals.get(`${entry.owner}/${entry.repo}`) ?? 0} rank={index + 1} />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const ROW = "grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-line px-3 py-3.5 transition-colors hover:bg-subtle";

function ModRow({ mod, rank }: { mod: ModSummary; rank: number }) {
  return (
    <Link href={`/${mod.owner}/${mod.repo}/${mod.slug}`} className={ROW}>
      <span className="font-mono text-sm text-faint tabular-nums">{rank}</span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="truncate font-medium text-fg">{mod.name}</span>
          <span className="truncate font-mono text-xs text-faint">
            {mod.owner}/{mod.repo}
          </span>
        </span>
        {mod.description && <span className="mt-0.5 block truncate text-sm text-muted">{mod.description}</span>}
      </span>
      <span className="font-mono text-sm text-muted tabular-nums">{compact.format(mod.stars)}</span>
    </Link>
  );
}

// The repo name links to the repo's page and covers the row; each mod's chip links to that mod above it.
function RepoRow({ entry, total, rank }: { entry: Entry; total: number; rank: number }) {
  const repoHref = `/${entry.owner}/${entry.repo}`;
  const shown = entry.mods.slice(0, SHOWN_MODS);
  const more = total - shown.length;
  return (
    <div className={`relative ${ROW}`}>
      <span className="font-mono text-sm text-faint tabular-nums">{rank}</span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <Link href={repoHref} className="truncate font-medium text-fg after:absolute after:inset-0">
            {entry.repo}
          </Link>
          <span className="truncate font-mono text-xs text-faint">
            {entry.owner} · {entry.mods.length < total ? `${entry.mods.length} of ${total}` : total} mods
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {shown.map((mod) => (
            <Link
              key={mod.slug}
              href={`/${mod.owner}/${mod.repo}/${mod.slug}`}
              className="relative z-10 max-w-full truncate rounded-md border border-line bg-bg px-2 py-0.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {mod.name}
            </Link>
          ))}
          {more > 0 && (
            <Link
              href={repoHref}
              className="relative z-10 rounded-md px-1.5 py-0.5 text-xs text-faint transition-colors hover:text-fg"
            >
              +{more} more
            </Link>
          )}
        </span>
      </span>
      <span className="font-mono text-sm text-muted tabular-nums">{compact.format(entry.stars)}</span>
    </div>
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
