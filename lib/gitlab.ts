import type { RepoInfo } from "./hosts";

// gitlab.com only. A self-hosted GitLab would mean fetching any host a stranger types in.
const API = "https://gitlab.com/api/v4";
// The tree comes 100 entries a page. Past this many pages the repo counts as too large, like GitHub's truncated trees.
const MAX_TREE_PAGES = 100;

export class GitLabError extends Error {}

function apiHeaders(): HeadersInit {
  const headers: Record<string, string> = { "User-Agent": "mod-claude" };
  if (process.env.GITLAB_TOKEN) headers.Authorization = `Bearer ${process.env.GITLAB_TOKEN}`;
  return headers;
}

async function api(url: string): Promise<Response> {
  const res = await fetch(url, { headers: apiHeaders(), cache: "no-store" });
  if (res.status === 429) throw new GitLabError("GitLab rate limit reached. Try again in a few minutes.");
  return res;
}

/** The API names a project by its full path, URL-encoded: group%2Fsubgroup%2Fproject. */
const project = (owner: string, repo: string) => `${API}/projects/${encodeURIComponent(`${owner}/${repo}`)}`;

/** Returns null when the project doesn't exist or isn't public. */
export async function getRepo(owner: string, repo: string): Promise<RepoInfo | null> {
  const res = await api(project(owner, repo));
  if (res.status === 404) return null;
  if (!res.ok) throw new GitLabError(`GitLab returned ${res.status}.`);
  const data = await res.json();
  // "internal" projects are only visible to signed-in GitLab users, so they count as private too.
  if (data.visibility !== "public") return null;
  const path = String(data.path_with_namespace);
  return {
    host: "gitlab",
    owner: path.slice(0, path.lastIndexOf("/")),
    repo: path.slice(path.lastIndexOf("/") + 1),
    description: data.description || null,
    stars: data.star_count ?? 0,
    defaultBranch: data.default_branch ?? "main",
  };
}

/** The `rel="next"` URL from a Link header, if it points back at the API. */
function nextPage(link: string | null): string | null {
  const next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  return next?.startsWith(`${API}/`) ? next : null;
}

/** Every file path in the repo at `branch`. */
export async function getFilePaths(owner: string, repo: string, branch: string): Promise<string[]> {
  const paths: string[] = [];
  let url: string | null =
    `${project(owner, repo)}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=100&pagination=keyset`;
  for (let page = 0; url; page++) {
    // A partial listing would make mods look deleted, so refuse it.
    if (page === MAX_TREE_PAGES) throw new GitLabError("This repo is too large to list.");
    const res = await api(url);
    if (!res.ok) throw new GitLabError(`Couldn't list files (GitLab returned ${res.status}).`);
    const entries: { type: string; path: string }[] = await res.json();
    for (const entry of entries) if (entry.type === "blob") paths.push(entry.path);
    url = nextPage(res.headers.get("link"));
  }
  return paths;
}

/** Raw file contents, or null when the file doesn't exist. */
export async function getRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const res = await api(
    `${project(owner, repo)}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(branch)}`,
  );
  if (res.status === 404) return null;
  // Any other failure throws, so a GitLab hiccup can't make a mod look deleted.
  if (!res.ok) throw new GitLabError(`Couldn't read ${path} (GitLab returned ${res.status}).`);
  return res.text();
}
