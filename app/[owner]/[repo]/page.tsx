import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMods, getRepoMods } from "@/lib/data";
import { SITE } from "@/lib/site";

// Prerender every listed repo at build time. New ones render on first visit and are then cached.
export async function generateStaticParams() {
  const mods = await getMods();
  const repos = new Map(mods.map(({ owner, repo }) => [`${owner}/${repo}`, { owner, repo }]));
  // Cache Components needs at least one sample; the placeholder renders as a 404.
  return repos.size > 0 ? [...repos.values()] : [{ owner: "_", repo: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[owner]/[repo]">): Promise<Metadata> {
  const { owner, repo } = await params;
  const mods = await getRepoMods(owner, repo);
  if (mods.length === 0) return {};
  const url = `/${owner}/${repo}`;
  const description = `${mods.length} Claude Code ${mods.length === 1 ? "mod" : "mods"} from ${owner}/${repo}.`;
  return {
    title: `${repo} by ${owner}`,
    description,
    alternates: { canonical: url },
    openGraph: { siteName: SITE.name, title: repo, description, url },
  };
}

export default function RepoPage({ params }: PageProps<"/[owner]/[repo]">) {
  return (
    <Suspense fallback={<RepoSkeleton />}>
      <RepoDetails params={params} />
    </Suspense>
  );
}

function RepoSkeleton() {
  return (
    <div aria-hidden className="animate-pulse pt-10 pb-24 sm:pt-14">
      <div className="h-5 w-40 rounded bg-subtle" />
      <div className="mt-4 h-10 w-64 rounded bg-subtle" />
      <div className="mt-12 h-64 w-full rounded-lg bg-subtle" />
    </div>
  );
}

async function RepoDetails({ params }: Pick<PageProps<"/[owner]/[repo]">, "params">) {
  const { owner, repo } = await params;
  const mods = await getRepoMods(owner, repo);
  if (mods.length === 0) notFound();

  const repoUrl = `https://github.com/${owner}/${repo}`;

  return (
    <div className="pt-10 pb-24 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-mono text-sm text-faint">
        <a href={`https://github.com/${owner}`} className="transition-colors hover:text-fg">
          {owner}
        </a>
        <span>/</span>
        <span className="text-muted">{repo}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tighter break-words text-fg sm:text-4xl">{repo}</h1>
      <p className="mt-3 text-lg text-muted">
        {mods.length} {mods.length === 1 ? "mod" : "mods"} · {mods[0].stars.toLocaleString("en")} stars ·{" "}
        <a href={repoUrl} className="text-fg underline-offset-4 hover:underline">
          View on GitHub
        </a>
      </p>

      <ul className="mt-10 border-t border-line">
        {mods.map((mod) => (
          <li key={mod.slug}>
            <Link
              href={`/${mod.owner}/${mod.repo}/${mod.slug}`}
              className="block border-b border-line px-3 py-3.5 transition-colors hover:bg-subtle"
            >
              <span className="block truncate font-medium text-fg">{mod.name}</span>
              {mod.description && <span className="mt-0.5 block truncate text-sm text-muted">{mod.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
