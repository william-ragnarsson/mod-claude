import type { MetadataRoute } from "next";
import { getMods } from "@/lib/data";
import { SITE } from "@/lib/site";

// Every page search engines should index: home, submit, and each listed repo and mod.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mods = await getMods();
  const repos = new Set(mods.map(({ owner, repo }) => `${owner}/${repo}`));
  return [
    { url: SITE.url, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/submit`, changeFrequency: "monthly", priority: 0.5 },
    ...[...repos].map((repo) => ({ url: `${SITE.url}/${repo}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...mods.map(({ owner, repo, slug }) => ({
      url: `${SITE.url}/${owner}/${repo}/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
