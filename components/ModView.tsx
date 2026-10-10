import Link from "next/link";
import type { ReactNode } from "react";
import { InstallCommands } from "@/components/InstallCommands";
import { Markdown } from "@/components/Markdown";
import { installCommands, type Mod } from "@/lib/data";
import { HOSTS, ownerUrl, repoHref, repoName, treeUrl } from "@/lib/hosts";

/** A mod's page, the same for every host. The routes find the mod and pass it in. */
export function ModView({ mod }: { mod: Mod }) {
  const host = HOSTS[mod.host].name;
  const sourceUrl = treeUrl(mod, mod.default_branch, mod.path);
  const firstSeen = new Date(mod.created_at).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="pt-10 pb-24 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-sm text-faint">
        <a href={ownerUrl(mod.host, mod.owner)} className="transition-colors hover:text-fg">
          {mod.owner}
        </a>
        <span>/</span>
        <Link href={repoHref(mod)} className="transition-colors hover:text-fg">
          {mod.repo}
        </Link>
        <span>/</span>
        <span className="text-muted">{mod.slug}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tighter break-words text-fg sm:text-4xl">{mod.name}</h1>
      {mod.description && <p className="mt-3 max-w-2xl text-lg text-muted">{mod.description}</p>}

      <section aria-labelledby="install" className="mt-8 max-w-2xl">
        <h2 id="install" className="mb-3 text-sm font-medium text-fg">
          Install
        </h2>
        <InstallCommands
          // Only what counting needs, so the README doesn't ship to the browser twice.
          mod={{ host: mod.host, owner: mod.owner, repo: mod.repo, slug: mod.slug }}
          groups={installCommands(mod)}
        />
      </section>

      <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <aside className="lg:order-last">
          <div className="space-y-8 lg:sticky lg:top-24">
            <dl className="divide-y divide-line border-y border-line text-sm">
              <Detail label="Stars">{mod.stars.toLocaleString("en")}</Detail>
              <Detail label="Repository">
                <a href={sourceUrl} className="font-mono text-fg underline-offset-4 hover:underline">
                  {repoName(mod)}
                </a>
              </Detail>
              <Detail label="First seen">{firstSeen}</Detail>
            </dl>

            <p className="text-xs leading-5 text-faint">
              Mods run code inside Claude Code. Review the source before installing.
            </p>
          </div>
        </aside>

        <article className="min-w-0">
          {mod.readme ? (
            <div className="readme prose max-w-none prose-headings:tracking-tight prose-a:underline-offset-4">
              <Markdown
                markdown={mod.readme}
                source={{
                  host: mod.host,
                  owner: mod.owner,
                  repo: mod.repo,
                  branch: mod.default_branch,
                  path: mod.readme_path,
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              No README. <a href={sourceUrl} className="text-fg underline underline-offset-4">View the source on {host}</a>.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}

export function ModSkeleton() {
  return (
    <div aria-hidden className="animate-pulse pt-10 pb-24 sm:pt-14">
      <div className="h-5 w-56 rounded bg-subtle" />
      <div className="mt-4 h-10 w-48 rounded bg-subtle" />
      <div className="mt-4 h-6 w-full max-w-xl rounded bg-subtle" />
      <div className="mt-8 h-36 w-full max-w-2xl rounded-lg bg-subtle" />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-faint">{label}</dt>
      <dd className="min-w-0 truncate text-right text-muted">{children}</dd>
    </div>
  );
}
