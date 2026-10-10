import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModSkeleton, ModView } from "@/components/ModView";
import { getMod, getMods } from "@/lib/data";
import { modHref } from "@/lib/hosts";
import { SITE } from "@/lib/site";

// GitHub mods. GitLab mods live under /gitlab/ (app/gitlab/[...path]).

// Prerender the most popular mods at build time. The rest render on first visit and are then cached.
export async function generateStaticParams() {
  const mods = await getMods();
  const params = mods
    .filter((mod) => mod.host === "github")
    .slice(0, 200)
    .map(({ owner, repo, slug }) => ({ owner, repo, mod: slug }));
  // Cache Components needs at least one sample; the placeholder renders as a 404.
  return params.length > 0 ? params : [{ owner: "_", repo: "_", mod: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/[owner]/[repo]/[mod]">): Promise<Metadata> {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod("github", owner, repo, slug);
  if (!mod) return {};
  const description = mod.description ?? `A Claude Code mod by ${mod.owner}.`;
  const url = modHref(mod);
  return {
    title: `${mod.name} by ${mod.owner}`,
    description,
    alternates: { canonical: url },
    openGraph: { siteName: SITE.name, title: mod.name, description, url },
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

async function ModDetails({ params }: Pick<PageProps<"/[owner]/[repo]/[mod]">, "params">) {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod("github", owner, repo, slug);
  if (!mod) notFound();
  return <ModView mod={mod} />;
}
