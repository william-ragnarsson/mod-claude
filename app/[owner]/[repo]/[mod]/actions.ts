"use server";

import { adminClient } from "@/lib/supabase";

/** Counts one install: someone copied one of the mod's install commands. The browser sends it once per mod. */
export async function countInstall(owner: string, repo: string, slug: string): Promise<void> {
  const valid = [owner, repo, slug].every((part) => typeof part === "string" && part.length > 0 && part.length <= 200);
  if (!valid) return;
  const { error } = await adminClient().rpc("count_install", { mod_owner: owner, mod_repo: repo, mod_slug: slug });
  if (error) console.error("count install failed", { owner, repo, slug }, error.message);
}
