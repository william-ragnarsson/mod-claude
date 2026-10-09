import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { ingestRepo } from "@/lib/ingest";
import { adminClient } from "@/lib/supabase";

export const maxDuration = 300;

/** Daily refresh of stars, descriptions and READMEs. Vercel Cron calls this with the CRON_SECRET bearer token. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminClient().from("mods").select("owner, repo");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const repos = [...new Map(data.map((row) => [`${row.owner}/${row.repo}`.toLowerCase(), row])).values()];
  const failed: { repo: string; error: string }[] = [];
  for (const { owner, repo } of repos) {
    try {
      await ingestRepo(owner, repo);
    } catch (error) {
      failed.push({ repo: `${owner}/${repo}`, error: error instanceof Error ? error.message : String(error) });
    }
  }

  revalidateTag("mods", "max");
  return Response.json({ repos: repos.length, refreshed: repos.length - failed.length, failed });
}
