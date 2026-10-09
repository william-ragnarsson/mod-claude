import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CopyCommand } from "@/components/CopyCommand";
import { Markdown } from "@/components/Markdown";
import { getMod, getMods, installCommands } from "@/lib/data";

// Prerender the most popular mods at build time. The rest render on first visit and are then cached.
export async function generateStaticParams() {
  const mods = await getMods();
  const params = mods.slice(0, 200).map(({ owner, repo, slug }) => ({ owner, repo, mod: slug }));
  // Cache Components needs at least one sample; the placeholder renders as a 404.
  return params.length > 0 ? params : [{ owner: "_", repo: "_", mod: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[owner]/[repo]/[mod]">): Promise<Metadata> {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod(owner, repo, slug);
  if (!mod) return {};
  const description = mod.description ?? `A Claude Code mod by ${mod.owner}.`;
  const url = `/${mod.owner}/${mod.repo}/${mod.slug}`;
  return {
    title: `${mod.name} by ${mod.owner}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: mod.name, description, url },
  };
}

// The page shell is shared by every mod, so links to it navigate instantly. The mod itself streams in.
export default function ModPage({ params }: PageProps<"/[owner]/[repo]/[mod]">) {
  return (
    <Suspense fallback={<ModSkeleton />}>
      <ModDetails params={params} />
    </Suspense>
  );
}

function ModSkeleton() {
  return (
    <div aria-hidden className="animate-pulse pt-10 pb-24 sm:pt-14">
      <div className="h-5 w-56 rounded bg-subtle" />
      <div className="mt-4 h-10 w-48 rounded bg-subtle" />
      <div className="mt-4 h-6 w-full max-w-xl rounded bg-subtle" />
      <div className="mt-12 h-28 w-full max-w-2xl rounded-lg bg-subtle" />
    </div>
  );
}

async function ModDetails({ params }: Pick<PageProps<"/[owner]/[repo]/[mod]">, "params">) {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod(owner, repo, slug);
  if (!mod) notFound();

  const repoUrl = `https://github.com/${mod.owner}/${mod.repo}`;
  const sourceUrl = mod.path ? `${repoUrl}/tree/${mod.default_branch}/${mod.path}` : repoUrl;
  const firstSeen = new Date(mod.created_at).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="pt-10 pb-24 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-sm text-faint">
        <a href={`https://github.com/${mod.owner}`} className="transition-colors hover:text-fg">
          {mod.owner}
        </a>
        <span>/</span>
        <a href={repoUrl} className="transition-colors hover:text-fg">
          {mod.repo}
        </a>
        <span>/</span>
        <span className="text-muted">{mod.slug}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tighter break-words text-fg sm:text-4xl">{mod.name}</h1>
      {mod.description && <p className="mt-3 max-w-2xl text-lg text-muted">{mod.description}</p>}

      <section aria-labelledby="install" className="mt-10 max-w-2xl">
        <h2 id="install" className="mb-3 text-sm font-medium text-fg">
          Install
        </h2>
        <div className="space-y-5">
          {installCommands(mod).map(({ label, commands }) => (
            <div key={label}>
              <p className="mb-1.5 text-xs text-faint">{label}</p>
              <div className="space-y-2">
                {commands.map((command) => (
                  <CopyCommand key={command} command={command} prompt={command.startsWith("/") ? ">" : "$"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <aside className="lg:order-last">
          <div className="space-y-8 lg:sticky lg:top-24">
            <dl className="divide-y divide-line border-y border-line text-sm">
              <Detail label="Stars">{mod.stars.toLocaleString("en")}</Detail>
              <Detail label="Repository">
                <a href={sourceUrl} className="font-mono text-fg underline-offset-4 hover:underline">
                  {mod.owner}/{mod.repo}
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
                source={{ owner: mod.owner, repo: mod.repo, branch: mod.default_branch, path: mod.readme_path }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              No README. <a href={sourceUrl} className="text-fg underline underline-offset-4">View the source on GitHub</a>.
            </p>
          )}
        </article>
      </div>
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
