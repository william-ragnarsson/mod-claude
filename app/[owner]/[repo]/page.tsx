import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RepoSkeleton, RepoView } from "@/components/RepoView";
import { getMods, getRepoMods } from "@/lib/data";
import { SITE } from "@/lib/site";

// GitHub repos. GitLab repos live under /gitlab/ (app/gitlab/[...path]).

// Prerender every listed repo at build time. New ones render on first visit and are then cached.
export async function generateStaticParams() {
  const mods = await getMods();
  const repos = new Map(
    mods.filter((mod) => mod.host === "github").map(({ owner, repo }) => [`${owner}/${repo}`, { owner, repo }]),
  );
  // Cache Components needs at least one sample; the placeholder renders as a 404.
  return repos.size > 0 ? [...repos.values()] : [{ owner: "_", repo: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[owner]/[repo]">): Promise<Metadata> {
  const { owner, repo } = await params;
  const mods = await getRepoMods("github", owner, repo);
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

async function RepoDetails({ params }: Pick<PageProps<"/[owner]/[repo]">, "params">) {
  const { owner, repo } = await params;
  const mods = await getRepoMods("github", owner, repo);
  if (mods.length === 0) notFound();
  return <RepoView mods={mods} />;
}
