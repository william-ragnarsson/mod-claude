"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ModSummary } from "@/lib/data";

type Tab = "top" | "new";

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
    const matches = mods.filter((mod) => {
      const haystack = `${mod.name} ${mod.owner}/${mod.repo} ${mod.description ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    if (tab === "new") matches.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return matches;
  }, [mods, query, tab]);

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
            {mods.length === 0 ? "No mods listed yet." : "No mods match your search."}
          </p>
        ) : (
          <ol>
            {visible.map((mod, index) => (
              <li key={`${mod.owner}/${mod.repo}/${mod.slug}`}>
                <Link
                  href={`/${mod.owner}/${mod.repo}/${mod.slug}`}
                  className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-4 border-b border-line px-3 py-3.5 transition-colors hover:bg-subtle"
                >
                  <span className="font-mono text-sm text-faint tabular-nums">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-baseline gap-2.5">
                      <span className="truncate font-medium text-fg">{mod.name}</span>
                      <span className="truncate font-mono text-xs text-faint">
                        {mod.owner}/{mod.repo}
                      </span>
                    </span>
                    {mod.description && (
                      <span className="mt-0.5 block truncate text-sm text-muted">{mod.description}</span>
                    )}
                  </span>
                  <span className="font-mono text-sm text-muted tabular-nums">{compact.format(mod.stars)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
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
