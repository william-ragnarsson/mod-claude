import { getRepoMods } from "@/lib/data";
import { compact, OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Claude Code mods from one GitHub repo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  const mods = await getRepoMods(owner, repo);
  if (mods.length === 0) return new Response("Not found", { status: 404 });
  const count = `${mods.length} ${mods.length === 1 ? "mod" : "mods"}`;
  return ogImage({
    eyebrow: owner,
    title: repo,
    description: mods.map((mod) => mod.name).join(", "),
    footer: `${count} for Claude Code · ${compact.format(mods[0].stars)} stars`,
  });
}
