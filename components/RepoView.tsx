import Link from "next/link";
import type { ModSummary } from "@/lib/data";
import { HOSTS, modHref, ownerUrl, repoUrl } from "@/lib/hosts";

/** A repo's page: every mod it holds. The routes look up the mods and pass them in, at least one. */
export function RepoView({ mods }: { mods: ModSummary[] }) {
  const { host, owner, repo, stars } = mods[0];

  return (
    <div className="pt-10 pb-24 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-sm text-faint">
        <a href={ownerUrl(host, owner)} className="transition-colors hover:text-fg">
          {owner}
        </a>
        <span>/</span>
        <span className="text-muted">{repo}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tighter break-words text-fg sm:text-4xl">{repo}</h1>
      <p className="mt-3 text-lg text-muted">
        {mods.length} {mods.length === 1 ? "mod" : "mods"} · {stars.toLocaleString("en")} stars ·{" "}
        <a href={repoUrl(mods[0])} className="text-fg underline-offset-4 hover:underline">
          View on {HOSTS[host].name}
        </a>
      </p>

      <ul className="mt-10 border-t border-line">
        {mods.map((mod) => (
          <li key={mod.slug}>
            <Link href={modHref(mod)} className="block border-b border-line px-3 py-3.5 transition-colors hover:bg-subtle">
              <span className="block truncate font-medium text-fg">{mod.name}</span>
              {mod.description && <span className="mt-0.5 block truncate text-sm text-muted">{mod.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RepoSkeleton() {
  return (
    <div aria-hidden className="animate-pulse pt-10 pb-24 sm:pt-14">
      <div className="h-5 w-40 rounded bg-subtle" />
      <div className="mt-4 h-10 w-64 rounded bg-subtle" />
      <div className="mt-12 h-64 w-full rounded-lg bg-subtle" />
    </div>
  );
}
