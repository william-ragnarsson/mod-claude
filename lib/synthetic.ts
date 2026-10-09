import type { ModSummary } from "./data";

/**
 * Made-up install counts, so the list doesn't open on a column of zeros while real counting gets going. A repo gets
 * its stars times about 2.5 (never under 1.5, now and then 6), split unevenly across its mods, plus 1 to 5 per mod.
 * Real installs add on top. The noise comes from hashing names, so a count only moves when stars or real installs do.
 * To drop it, stop calling this in getMods.
 */
export function addSyntheticInstalls(mods: ModSummary[]): ModSummary[] {
  const repos = new Map<string, ModSummary[]>();
  for (const mod of mods) {
    const key = `${mod.owner}/${mod.repo}`.toLowerCase();
    repos.set(key, [...(repos.get(key) ?? []), mod]);
  }

  const synthetic = new Map<ModSummary, number>();
  for (const [repo, repoMods] of repos) {
    const total = repoMods[0].stars * (1.2 + Math.exp(0.3 + 0.55 * normal(repo)));
    // In a repo of many mods, a few take most of the installs.
    const weights = repoMods.map((mod) => Math.exp(0.9 * normal(`${repo}/${mod.slug}`)));
    const sum = weights.reduce((a, b) => a + b, 0);
    repoMods.forEach((mod, i) => {
      const base = 1 + Math.floor(5 * unit(`${repo}/${mod.slug}`));
      synthetic.set(mod, Math.round((total * weights[i]) / sum) + base);
    });
  }
  return mods.map((mod) => ({ ...mod, installs: mod.installs + (synthetic.get(mod) ?? 0) }));
}

/** A number in [0, 1) that's always the same for the same text. */
function unit(text: string): number {
  // FNV-1a, then murmur3's finalizer so names that differ by a letter land far apart.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
}

/** A standard normal draw that's always the same for the same text (Box–Muller), kept within ±2.5. */
function normal(text: string): number {
  const z = Math.sqrt(-2 * Math.log(1 - unit(`${text}#a`))) * Math.cos(2 * Math.PI * unit(`${text}#b`));
  return Math.max(-2.5, Math.min(2.5, z));
}
