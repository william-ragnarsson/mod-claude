import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModSkeleton, ModView } from "@/components/ModView";
import { RepoView } from "@/components/RepoView";
import { getGitLabPage, getMods } from "@/lib/data";
import { modHref, repoHref } from "@/lib/hosts";
import { OG_SIZE } from "@/lib/og";
import { SITE } from "@/lib/site";

// GitLab mods and repos, at /gitlab/<namespace...>/<repo>[/<mod>]. lib/data.ts getGitLabPage reads the path.

type Props = PageProps<"/gitlab/[...path]">;

// Prerender every listed GitLab repo and mod at build time. New ones render on first visit and are then cached.
export async function generateStaticParams() {
  const mods = (await getMods()).filter((mod) => mod.host === "gitlab");
  const paths = new Map<string, string[]>();
  for (const mod of mods) {
    const repo = [...mod.owner.split("/"), mod.repo];
    paths.set(repo.join("/"), repo);
    paths.set(`${repo.join("/")}/${mod.slug}`, [...repo, mod.slug]);
  }
  // Cache Components needs at least one sample; the placeholder renders as a 404.
  return paths.size > 0 ? [...paths.values()].map((path) => ({ path })) : [{ path: ["_", "_"] }];
}

// Next can't put an opengraph-image file under a catch-all segment, so the preview card comes from a route handler.
const previewImage = (url: string, alt: string) => ({ url: `/api/og${url}`, ...OG_SIZE, alt });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getGitLabPage((await params).path);
  if (!found) return {};

  if (found.kind === "mod") {
    const { mod } = found;
    const description = mod.description ?? `A Claude Code mod by ${mod.owner}.`;
    const url = modHref(mod);
    return {
      title: `${mod.name} by ${mod.owner}`,
      description,
      alternates: { canonical: url },
      openGraph: {
        siteName: SITE.name,
        title: mod.name,
        description,
        url,
        images: [previewImage(url, "A Claude Code mod")],
      },
    };
  }

  const { owner, repo } = found.mods[0];
  const url = repoHref(found.mods[0]);
  const count = found.mods.length;
  const description = `${count} Claude Code ${count === 1 ? "mod" : "mods"} from gitlab.com/${owner}/${repo}.`;
  return {
    title: `${repo} by ${owner}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE.name,
      title: repo,
      description,
      url,
      images: [previewImage(url, "Claude Code mods from one GitLab repo")],
    },
  };
}

// Most links here are to mods, so the shell shows a mod's skeleton until the page streams in.
export default function GitLabPage({ params }: Props) {
  return (
    <Suspense fallback={<ModSkeleton />}>
      <GitLabDetails params={params} />
    </Suspense>
  );
}

async function GitLabDetails({ params }: Pick<Props, "params">) {
  const found = await getGitLabPage((await params).path);
  if (!found) notFound();
  return found.kind === "mod" ? <ModView mod={found.mod} /> : <RepoView mods={found.mods} />;
}
