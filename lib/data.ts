import { cacheLife, cacheTag } from "next/cache";
import { fromStored, marketplaceSource, storedOwner, type Host } from "./hosts";
import { publicClient } from "./supabase";
import { addSyntheticInstalls } from "./synthetic";

export type ModSummary = {
  // Not a column: read off the stored owner (lib/hosts.ts storedOwner).
  host: Host;
  // On GitLab, the project's whole namespace, which can hold slashes.
  owner: string;
  repo: string;
  slug: string;
  name: string;
  description: string | null;
  stars: number;
  // Copies of an install command on this site, once per browser. getMods adds made-up ones on top (lib/synthetic.ts).
  installs: number;
  // Installs decayed to hot_at, the last one: each counts half as much for every 3 days since (count_install, migration 0004).
  hot: number;
  hot_at: string | null;
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

const SUMMARY_COLUMNS = "owner, repo, slug, name, description, stars, installs, hot, hot_at, created_at";

export async function getMods(): Promise<ModSummary[]> {
  "use cache";
  // Counting an install refreshes the "installs" tag, so the home page's counts don't wait out the hour.
  cacheTag("mods", "installs");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(SUMMARY_COLUMNS)
    .order("stars", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return addSyntheticInstalls(data.map(fromStored));
}

export async function getMod(host: Host, owner: string, repo: string, slug: string): Promise<Mod | null> {
  "use cache";
  cacheTag("mods");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(`${SUMMARY_COLUMNS}, path, default_branch, install_name, marketplace, readme, readme_path, updated_at`)
    .eq("owner", storedOwner({ host, owner }))
    .eq("repo", repo)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data && fromStored(data);
}

/** Every mod one repo holds, by name. */
export async function getRepoMods(host: Host, owner: string, repo: string): Promise<ModSummary[]> {
  "use cache";
  cacheTag("mods");
  cacheLife("hours");

  const { data, error } = await publicClient()
    .from("mods")
    .select(SUMMARY_COLUMNS)
    .eq("owner", storedOwner({ host, owner }))
    .eq("repo", repo)
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data.map(fromStored);
}

/**
 * One way to install a mod: commands pasted one at a time, or numbered steps
 * where the app has no command line, each with anything to paste attached.
 */
export type InstallGroup =
  | { label: string; hint: string; commands: string[] }
  | { label: string; steps: { text: string; copy?: string }[] };

/** How to install a mod from each place people run Claude Code. */
export function installCommands(mod: Mod): InstallGroup[] {
  const repo = marketplaceSource(mod);
  const plugin = `${mod.install_name}@${mod.marketplace}`;
  return [
    {
      label: "Claude Code CLI",
      hint: "Paste into a Claude Code session in your terminal, one line at a time.",
      commands: [`/plugin marketplace add ${repo}`, `/plugin install ${plugin}`],
    },
    {
      // The desktop chat box doesn't take /plugin, and the app's Claude Code isn't on PATH as `claude`.
      // Claude's shell in a desktop session points CLAUDE_CODE_EXECPATH at it, so Claude runs the install.
      label: "Desktop app",
      steps: [
        { text: "Open the Code tab in the Claude desktop app and start a session in any folder." },
        {
          text: "Send Claude this message. It installs the mod with the app's built-in Claude Code. Approve the command if Claude asks.",
          copy: `Install the Claude Code mod "${mod.install_name}" by running: "$CLAUDE_CODE_EXECPATH" plugin install ${mod.install_name} --marketplace ${repo}`,
        },
        { text: "Start a new session to load the mod: ⌘N on Mac, Ctrl+N on Windows, or New session in the sidebar." },
        { text: "To turn it off or remove it later, click + next to the prompt box, then Plugins → Manage plugins." },
      ],
    },
    {
      label: "Shell",
      hint: "Run in any terminal where the claude command is installed.",
      commands: [`claude plugin marketplace add ${repo}`, `claude plugin install ${plugin}`],
    },
  ];
}
