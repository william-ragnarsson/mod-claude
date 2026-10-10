import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModSkeleton, ModView } from "@/components/ModView";
import { RepoView } from "@/components/RepoView";
import { getMod, getMods, getRepoMods } from "@/lib/data";
import { modHref, repoHref } from "@/lib/hosts";

// GitLab mods and repos. GitLab nests groups ("group/subgroup/project"), so the URL alone can't tell a mod's page
// (/gitlab/group/project/mod) from a repo's in a subgroup (/gitlab/group/subgroup/project). Try the mod first. Both can't
// exist: GitLab doesn't let a project and a subgroup share a path.

type Props = PageProps<"/gitlab/[...path]">;

async function resolve(path: string[]) {
  if (path.length >= 3) {
    const mod = await getMod("gitlab", path.slice(0, -2).join("/"), path[path.length - 2], path[path.length - 1]);
    if (mod) return { kind: "mod", mod } as const;
  }
  if (path.length >= 2) {
    const mods = await getRepoMods("gitlab", path.slice(0, -1).join("/"), path[path.length - 1]);
    if (mods.length > 0) return { kind: "repo", mods } as const;
  }
  return null;
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await resolve((await params).path);
  if (!found) return {};

  if (found.kind === "mod") {
    const { mod } = found;
    const description = mod.description ?? `A Claude Code mod by ${mod.owner}.`;
    const url = modHref(mod);
    return {
      title: `${mod.name} by ${mod.owner}`,
      description,
      alternates: { canonical: url },
      openGraph: { title: mod.name, description, url },
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
    openGraph: { title: repo, description, url },
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
  const found = await resolve((await params).path);
  if (!found) notFound();
  return found.kind === "mod" ? <ModView mod={found.mod} /> : <RepoView mods={found.mods} />;
}
