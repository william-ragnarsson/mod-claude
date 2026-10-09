import { cacheLife, cacheTag } from "next/cache";
import { publicClient } from "./supabase";

export type ModSummary = {
  owner: string;
  repo: string;
  slug: string;
  name: string;
  description: string | null;
  stars: number;
  created_at: string;
};

export type Mod = ModSummary & {
  path: string;
  default_branch: string;
  // Ingest only stores mods its repo's marketplace lists, so both are set.
  install_name: string;
  marketplace: string;
  readme: string | null;
  readme_path: string | null;
  updated_at: string;
};

const SUMMARY_COLUMNS = "owner, repo, slug, name, description, stars, created_at";

export async function getMods(): Promise<ModSummary[]> {
  "use cache";
  cacheTag("mods");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(SUMMARY_COLUMNS)
    .order("stars", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return data;
}

export async function getMod(owner: string, repo: string, slug: string): Promise<Mod | null> {
  "use cache";
  cacheTag("mods");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(`${SUMMARY_COLUMNS}, path, default_branch, install_name, marketplace, readme, readme_path, updated_at`)
    .eq("owner", owner)
    .eq("repo", repo)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Every mod one repo holds, by name. */
export async function getRepoMods(owner: string, repo: string): Promise<ModSummary[]> {
  "use cache";
  cacheTag("mods");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(SUMMARY_COLUMNS)
    .eq("owner", owner)
    .eq("repo", repo)
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data;
}

/** What to paste to install a mod, as labeled groups of commands run in order. */
export function installCommands(mod: Mod): { label: string; commands: string[] }[] {
  const repo = `${mod.owner}/${mod.repo}`;
  const plugin = `${mod.install_name}@${mod.marketplace}`;
  return [
    { label: "In Claude Code", commands: [`/plugin marketplace add ${repo}`, `/plugin install ${plugin}`] },
    {
      label: "Or from your shell",
      commands: [`claude plugin marketplace add ${repo} && claude plugin install ${plugin}`],
    },
  ];
}
