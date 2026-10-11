import { apiRequestsLeft, getRepo, type RepoInfo } from "./github";
import { IngestError, ingestRepo } from "./ingest";
import { adminClient } from "./supabase";

// Every repo's files are re-read at least this often, even without a push, so one run a day still reads them all.
const REREAD_AFTER_MS = 20 * 60 * 60 * 1000;
// raw.githubusercontent.com caches files for up to 5 minutes, so files read this soon after a push may predate it.
const RAW_CACHE_MS = 10 * 60 * 1000;
// Kept for submissions: the run stops early rather than take the token's hourly requests below this.
const RESERVED_REQUESTS = 1000;
// Vercel stops the function at 300 seconds. Nothing new starts after this, so what's in flight can finish.
const TIME_BUDGET_MS = 200 * 1000;
// Checks are one small request each. A re-read fetches many files at once, so fewer of those run together.
const CHECKS_AT_ONCE = 6;
const REREADS_AT_ONCE = 2;

type Synced = {
  owner: string;
  repo: string;
  stars: number;
  default_branch: string;
  pushed_at: string | null;
  // When the repo's files were last read.
  updated_at: string;
};

export type RefreshResult = {
  repos: number;
  /** Repos whose files were read again, and why. */
  reread: { repo: string; reason: string }[];
  /** Repos taken off the site: deleted, private, or with no listable mods left. */
  removed: { repo: string; reason: string }[];
  /** Repos where only the star count changed. */
  stars: number;
  /** Repos left for the next run, which ran out of time or GitHub requests. */
  deferred: number;
  failed: { repo: string; error: string }[];
};

async function inParallel<T>(items: T[], limit: number, run: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) await run(items[next++]);
    }),
  );
}

/** Why a repo's files need reading again, or null when only its star count can have changed. */
function rereadReason(synced: Synced, info: RepoInfo | null, now: number): string | null {
  if (!info) return "gone";
  if (info.owner !== synced.owner || info.repo !== synced.repo) return "renamed";
  if (!synced.pushed_at || Date.parse(info.pushedAt ?? "") !== Date.parse(synced.pushed_at)) return "pushed";
  if (Date.parse(synced.updated_at) - Date.parse(synced.pushed_at) < RAW_CACHE_MS) return "pushed";
  if (info.defaultBranch !== synced.default_branch) return "branch";
  if (now - Date.parse(synced.updated_at) > REREAD_AFTER_MS) return "daily";
  return null;
}

/**
 * Checks every listed repo with one GitHub request each, then re-reads the files of those pushed to since they
 * were last read, renamed or deleted, then of the rest that are due their daily re-read. The others only get their
 * stars updated. Safe to run hourly: what a run has no time or requests left for goes first in the next one.
 */
export async function refreshRepos(): Promise<RefreshResult> {
  const started = Date.now();
  const db = adminClient();
  const { data, error } = await db
    .from("mods")
    .select("owner, repo, stars, default_branch, pushed_at, updated_at")
    .order("updated_at", { ascending: true });
  if (error) throw new Error(error.message);

  // One entry per repo, from its least recently read row, least recently read repos first.
  const byRepo = new Map<string, Synced>();
  for (const row of data) {
    const key = `${row.owner}/${row.repo}`.toLowerCase();
    if (!byRepo.has(key)) byRepo.set(key, row);
  }
  const repos = [...byRepo.values()];

  const result: RefreshResult = { repos: repos.length, reread: [], removed: [], stars: 0, deferred: 0, failed: [] };
  const outOfBudget = () =>
    Date.now() - started > TIME_BUDGET_MS || (apiRequestsLeft() ?? Infinity) < RESERVED_REQUESTS;

  const fail = (name: string, error: unknown) => {
    // ingestRepo removes the repo's rows before throwing an IngestError.
    if (error instanceof IngestError) result.removed.push({ repo: name, reason: error.message });
    else result.failed.push({ repo: name, error: error instanceof Error ? error.message : String(error) });
  };

  const due: { synced: Synced; info: RepoInfo | null; reason: string }[] = [];
  await inParallel(repos, CHECKS_AT_ONCE, async (synced) => {
    if (outOfBudget()) {
      result.deferred++;
      return;
    }
    try {
      const info = await getRepo(synced.owner, synced.repo);
      const reason = rereadReason(synced, info, started);
      if (reason) {
        due.push({ synced, info, reason });
      } else if (info && info.stars !== synced.stars) {
        const { error } = await db
          .from("mods")
          .update({ stars: info.stars })
          .eq("owner", synced.owner)
          .eq("repo", synced.repo);
        if (error) throw new Error(error.message);
        result.stars++;
      }
    } catch (error) {
      fail(`${synced.owner}/${synced.repo}`, error);
    }
  });

  // Repos that changed go before the daily re-reads, each group least recently read first.
  due.sort(
    (a, b) =>
      Number(a.reason === "daily") - Number(b.reason === "daily") ||
      Date.parse(a.synced.updated_at) - Date.parse(b.synced.updated_at),
  );
  await inParallel(due, REREADS_AT_ONCE, async ({ synced, info, reason }) => {
    if (outOfBudget()) {
      result.deferred++;
      return;
    }
    try {
      await ingestRepo(synced.owner, synced.repo, info ?? undefined);
      result.reread.push({ repo: `${synced.owner}/${synced.repo}`, reason });
    } catch (error) {
      fail(`${synced.owner}/${synced.repo}`, error);
    }
  });
  return result;
}
