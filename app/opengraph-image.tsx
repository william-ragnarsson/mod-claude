import { getMods } from "@/lib/data";
import { OG_SIZE, ogImage } from "@/lib/og";
import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const mods = await getMods();
  return ogImage({
    title: "Mods for Claude Code",
    description: SITE.tagline,
    footer: `${mods.length} mods · ${new URL(SITE.url).host}`,
  });
}
