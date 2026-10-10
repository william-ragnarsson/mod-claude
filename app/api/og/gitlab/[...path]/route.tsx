import { getGitLabPage } from "@/lib/data";
import { compact, ogImage } from "@/lib/og";

// The preview card for a GitLab mod or repo page (app/gitlab/[...path]), the same as GitHub's opengraph-image files.
export async function GET(_request: Request, { params }: RouteContext<"/api/og/gitlab/[...path]">) {
  const found = await getGitLabPage((await params).path);
  if (!found) return new Response("Not found", { status: 404 });

  if (found.kind === "mod") {
    const { mod } = found;
    // Stars only, like the page: getMod's installs leave out the made-up ones the home list adds (lib/synthetic.ts).
    return ogImage({
      eyebrow: `${mod.owner}/${mod.repo}`,
      title: mod.name,
      description: mod.description,
      footer: `Claude Code mod · ${compact.format(mod.stars)} stars`,
    });
  }

  const { mods } = found;
  const count = `${mods.length} ${mods.length === 1 ? "mod" : "mods"}`;
  return ogImage({
    eyebrow: mods[0].owner,
    title: mods[0].repo,
    description: mods.map((mod) => mod.name).join(", "),
    footer: `${count} for Claude Code · ${compact.format(mods[0].stars)} stars`,
  });
}
