import { getMod } from "@/lib/data";
import { compact, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "A Claude Code mod";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ owner: string; repo: string; mod: string }> }) {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod("github", owner, repo, slug);
  if (!mod) return new Response("Not found", { status: 404 });
  // Stars only, like the page: getMod's installs leave out the made-up ones the home list adds (lib/synthetic.ts).
  return ogImage({
    eyebrow: `${mod.owner}/${mod.repo}`,
    title: mod.name,
    description: mod.description,
    footer: `Claude Code mod · ${compact.format(mod.stars)} stars`,
  });
}
