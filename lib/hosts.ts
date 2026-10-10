// Where a mod's repo lives, and the links that follow from it. No fetching here, so client components can use it too.

export type Host = "github" | "gitlab";

/**
 * A repo on GitHub or GitLab. On GitLab `owner` is the project's whole namespace, which nests ("group/subgroup"),
 * so it can hold slashes. `repo` is always the last path segment.
 */
export type RepoRef = { host: Host; owner: string; repo: string };

export type RepoInfo = RepoRef & {
  description: string | null;
  stars: number;
  defaultBranch: string;
};

export const HOSTS: Record<Host, { name: string; origin: string }> = {
  github: { name: "GitHub", origin: "https://github.com" },
  gitlab: { name: "GitLab", origin: "https://gitlab.com" },
};

export function isHost(value: unknown): value is Host {
  return value === "github" || value === "gitlab";
}

// The database has no host column. A GitLab repo's owner is stored as "gitlab.com/<namespace>", which can't clash with
// a GitHub owner because GitHub names can't contain dots. GitHub owners are stored as they are.
const GITLAB_OWNER = "gitlab.com/";

/** The owner as the database stores it. */
export function storedOwner({ host, owner }: Pick<RepoRef, "host" | "owner">): string {
  return host === "github" ? owner : `${GITLAB_OWNER}${owner}`;
}

/** A database row with its stored owner split back into host and owner. */
export function fromStored<T extends { owner: string }>(row: T): T & { host: Host } {
  return row.owner.startsWith(GITLAB_OWNER)
    ? { ...row, host: "gitlab", owner: row.owner.slice(GITLAB_OWNER.length) }
    : { ...row, host: "github" };
}

const SEGMENT = /^[\w.-]+$/;
const valid = (parts: string[]) => parts.every((part) => SEGMENT.test(part) && part !== "." && part !== "..");

/**
 * Accepts github.com and gitlab.com URLs (any depth), git URLs, or plain "owner/repo", which means GitHub.
 * GitLab URLs keep every namespace segment: gitlab.com/group/subgroup/project is owner "group/subgroup".
 */
export function parseRepoUrl(input: string): RepoRef | null {
  const s = input.trim();

  const gitlab = s.match(/gitlab\.com[/:]([^?#\s]+)/i);
  if (gitlab) {
    // GitLab puts "/-/" between the project and the page: gitlab.com/group/project/-/tree/main
    const parts = gitlab[1].split("/-/")[0].split("/").filter(Boolean);
    if (parts.length > 0) parts.push(parts.pop()!.replace(/\.git$/i, ""));
    if (parts.length < 2 || !valid(parts)) return null;
    return { host: "gitlab", owner: parts.slice(0, -1).join("/"), repo: parts[parts.length - 1] };
  }

  const m =
    s.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i) ?? s.match(/^([\w.-]+)\/([\w.-]+)\/?$/);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/i, "");
  if (!valid([m[1], repo])) return null;
  return { host: "github", owner: m[1], repo };
}

/** How the site names a repo: "owner/repo" on GitHub, "gitlab.com/group/project" on GitLab. */
export function repoName({ host, owner, repo }: RepoRef): string {
  return host === "github" ? `${owner}/${repo}` : `gitlab.com/${owner}/${repo}`;
}

/** The repo's page on this site. GitLab repos live under /gitlab/, since their owner can span several segments. */
export function repoHref({ host, owner, repo }: RepoRef): string {
  return host === "github" ? `/${owner}/${repo}` : `/gitlab/${owner}/${repo}`;
}

export function modHref(mod: RepoRef & { slug: string }): string {
  return `${repoHref(mod)}/${mod.slug}`;
}

/** What `/plugin marketplace add` takes: "owner/repo" for GitHub, the clone URL for anywhere else. */
export function marketplaceSource({ host, owner, repo }: RepoRef): string {
  return host === "github" ? `${owner}/${repo}` : `${HOSTS[host].origin}/${owner}/${repo}.git`;
}

export function ownerUrl(host: Host, owner: string): string {
  return `${HOSTS[host].origin}/${owner}`;
}

export function repoUrl({ host, owner, repo }: RepoRef): string {
  return `${HOSTS[host].origin}/${owner}/${repo}`;
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** The host's page for a folder in the repo. */
export function treeUrl(ref: RepoRef, branch: string, path: string): string {
  if (!path) return repoUrl(ref);
  const tree = ref.host === "github" ? "tree" : "-/tree";
  return `${repoUrl(ref)}/${tree}/${encodeURIComponent(branch)}/${encodePath(path)}`;
}

/** The host's page for a file in the repo. */
export function blobUrl(ref: RepoRef, branch: string, path: string): string {
  const blob = ref.host === "github" ? "blob" : "-/blob";
  return `${repoUrl(ref)}/${blob}/${encodeURIComponent(branch)}/${encodePath(path)}`;
}

/** A file's raw contents, served with its own content type, so README images load from it. */
export function rawUrl(ref: RepoRef, branch: string, path: string): string {
  if (ref.host === "github") {
    return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${encodeURIComponent(branch)}/${encodePath(path)}`;
  }
  return `${repoUrl(ref)}/-/raw/${encodeURIComponent(branch)}/${encodePath(path)}`;
}
