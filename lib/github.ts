const API = "https://api.github.com";

export type RepoInfo = {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  defaultBranch: string;
};

export class GitHubError extends Error {}

/** Accepts github.com URLs (any depth), git URLs, or plain "owner/repo". */
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const s = input.trim();
  const m =
    s.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i) ?? s.match(/^([\w.-]+)\/([\w.-]+)\/?$/);
  if (!m) return null;
  const repo = m[2].replace(/\.git$/i, "");
  if ([m[1], repo].some((part) => part === "." || part === "..")) return null;
  return { owner: m[1], repo };
}

function apiHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "mod-claude",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function api(path: string): Promise<Response> {
  const res = await fetch(`${API}${path}`, { headers: apiHeaders(), cache: "no-store" });
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError("GitHub rate limit reached. Try again in a few minutes.");
  }
  return res;
}

/** Returns null when the repo doesn't exist or is private. */
export async function getRepo(owner: string, repo: string): Promise<RepoInfo | null> {
  const res = await api(`/repos/${owner}/${repo}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(`GitHub returned ${res.status}.`);
  const data = await res.json();
  if (data.private) return null;
  const [canonicalOwner, canonicalRepo] = String(data.full_name).split("/");
  return {
    owner: canonicalOwner,
    repo: canonicalRepo,
    description: data.description ?? null,
    stars: data.stargazers_count ?? 0,
    defaultBranch: data.default_branch ?? "main",
  };
}

/** Every file path in the repo at `branch`. */
export async function getFilePaths(owner: string, repo: string, branch: string): Promise<string[]> {
  const res = await api(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (!res.ok) throw new GitHubError(`Couldn't list files (GitHub returned ${res.status}).`);
  const data = await res.json();
  return (data.tree ?? [])
    .filter((entry: { type: string }) => entry.type === "blob")
    .map((entry: { path: string }) => entry.path);
}

export function rawUrl(owner: string, repo: string, branch: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encoded}`;
}

/** Raw file contents. Doesn't count against the API rate limit. */
export async function getRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const res = await fetch(rawUrl(owner, repo, branch, path), { cache: "no-store" });
  return res.ok ? res.text() : null;
}
