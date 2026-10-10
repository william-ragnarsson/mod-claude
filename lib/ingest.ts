import * as github from "./github";
import * as gitlab from "./gitlab";
import { parseRepoUrl, repoName, storedOwner, type RepoInfo, type RepoRef } from "./hosts";
import { adminClient } from "./supabase";

export type ModRef = RepoRef & { slug: string; name: string };
export type IngestResult = { added: ModRef[]; existing: ModRef[]; removed: ModRef[] };

/** An error whose message is safe to show to the person who submitted the repo. */
export class IngestError extends Error {}

const HOOKS_FILE = /(^|\/)hooks\/hooks\.json$/;
const SKIPPED_DIR = /(^|\/)(node_modules|tests?|__tests__|fixtures?|__fixtures__)\//;
const README_FILE = /^readme(\.md|\.markdown)?$/i;
const MARKETPLACE_FILE = ".claude-plugin/marketplace.json";
// The file types Claude Code loads as a hooks module, and the `register` export it calls.
const MODULE_FILE = /\.(ts|tsx|jsx|js|mjs|cjs|mts|cts)$/;
const EXPORTS_REGISTER = /export\s+(async\s+)?(function\*?|const|let|var)\s+register\b|export\s*\{[^}]*\bregister\b/;
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
  /** The repo's name (lib/hosts.ts repoName) when the manifest says the mod comes from someone else's repo. Copies aren't listed. */
  copyOf: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

// Each host's module reads repos the same way.
const HOST_APIS = { github, gitlab };

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

/** Joins path parts and resolves "", "." and "..", so "./plugins/x/" becomes "plugins/x". */
function joinPath(...parts: string[]): string {
  const segments: string[] = [];
  for (const segment of parts.join("/").split("/")) {
    if (segment === "..") segments.pop();
    else if (segment && segment !== ".") segments.push(segment);
  }
  return segments.join("/");
}

/**
 * The account a repo belongs to: its owner, or on GitLab the top-level group, so sibling subgroups count as one.
 * The host is left out: the same name on GitHub and GitLab is taken to be the same person mirroring their own repo.
 */
const account = ({ owner }: RepoRef) => owner.split("/")[0].toLowerCase();

/** The repo a vendored mod was copied from: the manifest's repository (or homepage) when it belongs to another account. */
function findCopySource(manifest: Json, repo: RepoInfo): string | null {
  const repository = manifest?.repository?.url ?? manifest?.repository;
  const link = typeof repository === "string" ? repository : manifest?.homepage;
  const source = typeof link === "string" ? parseRepoUrl(link) : null;
  if (!source || account(source) === account(repo)) return null;
  return repoName(source);
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
  const raw = (path: string) => HOST_APIS[repo.host].getRawFile(repo.owner, repo.repo, repo.defaultBranch, path);

  // A mod is a plugin whose hooks/hooks.json names a hooks module under "modules", and that module
  // exports register(). Plugins with only command hooks, skills or agents have no such module.
  const hooks = parseJson(await raw(hooksPath));
  const modules: unknown[] = Array.isArray(hooks?.modules) ? hooks.modules : [];
  if (modules.length === 0) return null;
  for (const entry of modules) {
    if (typeof entry !== "string") return null;
    const modulePath = joinPath(hooksPath, "..", entry);
    if (!MODULE_FILE.test(modulePath) || !files.includes(modulePath)) return null;
    if (!EXPORTS_REGISTER.test((await raw(modulePath)) ?? "")) return null;
  }

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
    // Both are needed for `/plugin install <name>@<marketplace>`. Mods without them aren't listed.
    installName: marketplaceName ? installName : null,
    marketplace: installName ? marketplaceName || null : null,
    readme,
    readmePath,
    copyOf: findCopySource(manifest, repo),
  };
}

/**
 * Finds every listable mod in a public GitHub or GitLab repo, without saving anything. Skipped: `copies`, mods
 * vendored from other repos, and `unlisted`, mods the repo's top-level marketplace file doesn't list, so they can't
 * be installed with `/plugin marketplace add <repo>` and `/plugin install`.
 */
export async function findMods(
  ref: RepoRef,
): Promise<{ repo: RepoInfo; mods: FoundMod[]; copies: FoundMod[]; unlisted: FoundMod[] }> {
  const api = HOST_APIS[ref.host];
  const info = await api.getRepo(ref.owner, ref.repo);
  if (!info) throw new IngestError("Repo not found or private.");

  const files = await api.getFilePaths(info.owner, info.repo, info.defaultBranch);
  const hookFiles = files
    .filter((file) => HOOKS_FILE.test(file) && !SKIPPED_DIR.test(file))
    .slice(0, MAX_MODS);
  const marketplace = files.includes(MARKETPLACE_FILE)
    ? parseJson(await api.getRawFile(info.owner, info.repo, info.defaultBranch, MARKETPLACE_FILE))
    : null;

  const found = (await Promise.all(hookFiles.map((path) => readMod(info, files, path, marketplace)))).filter(
    (mod): mod is FoundMod => mod !== null,
  );
  const copies = found.filter((mod) => mod.copyOf);
  const unlisted = found.filter((mod) => !mod.copyOf && !(mod.installName && mod.marketplace));
  const seen = new Set<string>();
  const mods = found.filter(
    (mod) => !mod.copyOf && mod.installName && mod.marketplace && !seen.has(mod.slug) && seen.add(mod.slug),
  );
  if (mods.length === 0 && unlisted.length > 0) {
    throw new IngestError(
      `Found ${unlisted.length === 1 ? "a mod" : `${unlisted.length} mods`}, but they can't be installed with /plugin install. ` +
        `List them in ${MARKETPLACE_FILE} at the top of the repo, then submit again.`,
    );
  }
  if (mods.length === 0 && copies.length > 0) {
    const sources = [...new Set(copies.map((mod) => mod.copyOf))].join(", ");
    throw new IngestError(`The mods here are copies from ${sources}. Submit the original repo instead.`);
  }
  if (mods.length === 0) {
    throw new IngestError(
      'No mod found. A mod needs hooks/hooks.json with a "modules" entry naming a module that exports register().',
    );
  }
  return { repo: info, mods, copies, unlisted };
}

/** Deletes a repo's rows, or only the ones whose slug isn't in `keep`. Returns what it deleted. */
async function removeMods({ host, owner, repo }: RepoRef, keep = new Set<string>()): Promise<ModRef[]> {
  const db = adminClient();
  const { data: rows, error } = await db
    .from("mods")
    .select("id, slug, name")
    .eq("owner", storedOwner({ host, owner }))
    .eq("repo", repo);
  if (error) throw new Error(error.message);
  const gone = rows.filter((row) => !keep.has(row.slug.toLowerCase()));
  if (gone.length > 0) {
    const ids = gone.map((row) => row.id as string);
    const { error } = await db.from("mods").delete().in("id", ids);
    if (error) throw new Error(error.message);
  }
  return gone.map((row) => ({ host, owner, repo, slug: row.slug, name: row.name }));
}

/**
 * Adds or refreshes every mod in a public GitHub or GitLab repo, and removes the repo's rows that are no longer
 * listable (deleted, renamed, copies, or dropped from the marketplace). Used by the submit form, the seed script
 * and the daily refresh.
 */
export async function ingestRepo(ref: RepoRef): Promise<IngestResult> {
  let found: Awaited<ReturnType<typeof findMods>>;
  try {
    found = await findMods(ref);
  } catch (error) {
    // The repo is gone, private, or has no mods left. Network and rate-limit errors aren't IngestErrors.
    if (error instanceof IngestError) await removeMods(ref);
    throw error;
  }
  const { repo: info, mods } = found;

  const db = adminClient();
  const { data: rows, error } = await db
    .from("mods")
    .select("id, slug")
    .eq("owner", storedOwner(info))
    .eq("repo", info.repo);
  if (error) throw new Error(error.message);
  const existingIds = new Map(rows.map((row) => [row.slug.toLowerCase(), row.id as string]));

  const now = new Date().toISOString();
  const toRow = (mod: FoundMod) => ({
    owner: storedOwner(info),
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

  const result: IngestResult = {
    added: [],
    existing: [],
    removed: await removeMods(info, new Set(mods.map((mod) => mod.slug))),
  };
  for (const mod of mods) {
    const ref = { host: info.host, owner: info.owner, repo: info.repo, slug: mod.slug, name: mod.name };
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
