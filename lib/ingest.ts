import { getFilePaths, getRawFile, getRepo, type RepoInfo } from "./github";
import { adminClient } from "./supabase";

export type ModRef = { owner: string; repo: string; slug: string; name: string };
export type IngestResult = { added: ModRef[]; existing: ModRef[] };

/** An error whose message is safe to show to the person who submitted the repo. */
export class IngestError extends Error {}

const HOOKS_FILE = /(^|\/)hooks\/hooks\.json$/;
const SKIPPED_DIR = /(^|\/)(node_modules|tests?|__tests__|fixtures?|__fixtures__)\//;
const README_FILE = /^readme(\.md|\.markdown)?$/i;
const MARKETPLACE_FILE = ".claude-plugin/marketplace.json";
const MAX_MODS = 100;
const MAX_README_CHARS = 200_000;

export type FoundMod = {
  name: string;
  slug: string;
  path: string;
  description: string | null;
  installName: string | null;
  marketplace: string | null;
  readme: string | null;
  readmePath: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function parseJson(text: string | null): Json {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "mod"
  );
}

/** Joins path parts and drops "", "." and leading "./", so "./plugins/x/" becomes "plugins/x". */
function joinPath(...parts: string[]): string {
  return parts
    .join("/")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

function findReadme(files: string[], dir: string): string | null {
  const prefix = dir ? `${dir}/` : "";
  return (
    files.find((file) => {
      if (!file.startsWith(prefix)) return false;
      const rest = file.slice(prefix.length);
      return !rest.includes("/") && README_FILE.test(rest);
    }) ?? null
  );
}

/** The plugin name to pass to `/plugin install <name>@<marketplace>`, if the repo's marketplace lists this mod. */
function findInstallName(marketplace: Json, dir: string, name: string): string | null {
  const plugins: Json[] = Array.isArray(marketplace?.plugins) ? marketplace.plugins : [];
  const root = typeof marketplace?.metadata?.pluginRoot === "string" ? marketplace.metadata.pluginRoot : "";
  for (const plugin of plugins) {
    if (typeof plugin?.name !== "string" || typeof plugin.source !== "string") continue;
    if (joinPath(plugin.source) === dir || joinPath(root, plugin.source) === dir) return plugin.name;
  }
  return plugins.find((plugin) => plugin?.name === name)?.name ?? null;
}

async function readMod(
  repo: RepoInfo,
  files: string[],
  hooksPath: string,
  marketplace: Json,
): Promise<FoundMod | null> {
  const raw = (path: string) => getRawFile(repo.owner, repo.repo, repo.defaultBranch, path);

  // Having a "modules" entry in hooks/hooks.json is what makes a plugin a mod.
  const hooks = parseJson(await raw(hooksPath));
  if (!Array.isArray(hooks?.modules) || hooks.modules.length === 0) return null;

  const dir = hooksPath.replace(HOOKS_FILE, "");
  const manifestPath = joinPath(dir, ".claude-plugin/plugin.json");
  const manifest = files.includes(manifestPath) ? parseJson(await raw(manifestPath)) : null;

  const name =
    (typeof manifest?.name === "string" && manifest.name.trim()) || dir.split("/").pop() || repo.repo;
  const description =
    (typeof manifest?.description === "string" && manifest.description.trim()) || repo.description;
  const readmePath = findReadme(files, dir) ?? findReadme(files, "");
  const readme = readmePath ? ((await raw(readmePath))?.slice(0, MAX_README_CHARS) ?? null) : null;
  const installName = findInstallName(marketplace, dir, name);
  const marketplaceName = typeof marketplace?.name === "string" ? marketplace.name.trim() : "";

  return {
    name,
    slug: slugify(name),
    path: dir,
    description,
    // Both are needed to install from the marketplace; without them the page shows the clone fallback.
    installName: marketplaceName ? installName : null,
    marketplace: installName ? marketplaceName || null : null,
    readme,
    readmePath,
  };
}

/** Finds every mod in a public GitHub repo, without saving anything. */
export async function findMods(owner: string, repo: string): Promise<{ repo: RepoInfo; mods: FoundMod[] }> {
  const info = await getRepo(owner, repo);
  if (!info) throw new IngestError("Repo not found or private.");

  const files = await getFilePaths(info.owner, info.repo, info.defaultBranch);
  const hookFiles = files
    .filter((file) => HOOKS_FILE.test(file) && !SKIPPED_DIR.test(file))
    .slice(0, MAX_MODS);
  const marketplace = files.includes(MARKETPLACE_FILE)
    ? parseJson(await getRawFile(info.owner, info.repo, info.defaultBranch, MARKETPLACE_FILE))
    : null;

  const found = (await Promise.all(hookFiles.map((path) => readMod(info, files, path, marketplace)))).filter(
    (mod): mod is FoundMod => mod !== null,
  );
  const seen = new Set<string>();
  const mods = found.filter((mod) => !seen.has(mod.slug) && seen.add(mod.slug));
  if (mods.length === 0) {
    throw new IngestError('No mod found. A mod needs hooks/hooks.json with a "modules" entry.');
  }
  return { repo: info, mods };
}

/**
 * Adds or refreshes every mod in a public GitHub repo.
 * Used by the submit form, the seed script and the daily refresh.
 */
export async function ingestRepo(owner: string, repo: string): Promise<IngestResult> {
  const { repo: info, mods } = await findMods(owner, repo);

  const db = adminClient();
  const { data: rows, error } = await db
    .from("mods")
    .select("id, slug")
    .eq("owner", info.owner)
    .eq("repo", info.repo);
  if (error) throw new Error(error.message);
  const existingIds = new Map(rows.map((row) => [row.slug.toLowerCase(), row.id as string]));

  const now = new Date().toISOString();
  const toRow = (mod: FoundMod) => ({
    owner: info.owner,
    repo: info.repo,
    slug: mod.slug,
    name: mod.name,
    path: mod.path,
    description: mod.description,
    stars: info.stars,
    default_branch: info.defaultBranch,
    install_name: mod.installName,
    marketplace: mod.marketplace,
    readme: mod.readme,
    readme_path: mod.readmePath,
    updated_at: now,
  });

  const result: IngestResult = { added: [], existing: [] };
  for (const mod of mods) {
    const ref = { owner: info.owner, repo: info.repo, slug: mod.slug, name: mod.name };
    const id = existingIds.get(mod.slug);
    if (id) {
      const { error } = await db.from("mods").update(toRow(mod)).eq("id", id);
      if (error) throw new Error(error.message);
      result.existing.push(ref);
    } else {
      result.added.push(ref);
    }
  }

  const newRows = mods.filter((mod) => !existingIds.has(mod.slug)).map(toRow);
  if (newRows.length > 0) {
    const { error } = await db.from("mods").insert(newRows);
    if (error) throw new Error(error.message);
  }
  return result;
}
