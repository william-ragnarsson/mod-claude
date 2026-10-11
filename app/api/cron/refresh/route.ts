import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { refreshRepos } from "@/lib/refresh";

export const maxDuration = 300;

/**
 * Refreshes stars, descriptions and READMEs, re-reading only repos that changed (lib/refresh.ts). Called with the
 * CRON_SECRET bearer token, hourly by .github/workflows/refresh.yml and daily by Vercel Cron as a fallback.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshRepos();
    if (result.reread.length > 0 || result.removed.length > 0 || result.stars > 0) revalidateTag("mods", "max");
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
