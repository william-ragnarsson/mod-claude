import { OG_SIZE, ogImage } from "@/lib/og";
import { SITE } from "@/lib/site";

// The page sets its own openGraph, which drops the image it would inherit, so it needs its own.
export const alt = "Submit a Claude Code mod";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({
    title: "Submit a mod",
    description: "Paste a public GitHub repo. Every mod in it is listed right away, no account needed.",
    footer: new URL(SITE.url).host,
  });
}
