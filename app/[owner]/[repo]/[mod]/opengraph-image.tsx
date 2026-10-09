import { getMod } from "@/lib/data";
import { compact, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "A Claude Code mod";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ owner: string; repo: string; mod: string }> }) {
  const { owner, repo, mod: slug } = await params;
  const mod = await getMod(owner, repo, slug);
  if (!mod) return new Response("Not found", { status: 404 });
  const stats = [`${compact.format(mod.stars)} stars`, mod.installs > 0 && `${compact.format(mod.installs)} installs`];
  return ogImage({
    eyebrow: `${mod.owner}/${mod.repo}`,
    title: mod.name,
    description: mod.description,
    footer: ["Claude Code mod", ...stats].filter(Boolean).join(" · "),
  });
}
