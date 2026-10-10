"use server";

import { revalidateTag } from "next/cache";
import { isHost, storedOwner, type Host } from "@/lib/hosts";
import { adminClient } from "@/lib/supabase";

/** Counts one install: someone copied one of the mod's install commands. The browser sends it once per mod. */
export async function countInstall(host: Host, owner: string, repo: string, slug: string): Promise<void> {
  const valid =
    isHost(host) && [owner, repo, slug].every((part) => typeof part === "string" && part.length > 0 && part.length <= 200);
  if (!valid) return;
  const { error } = await adminClient().rpc("count_install", {
    mod_owner: storedOwner({ host, owner }),
    mod_repo: repo,
    mod_slug: slug,
  });
  if (error) {
    console.error("count install failed", { host, owner, repo, slug }, error.message);
    return;
  }
  // The home page list picks up the new count on its next visit.
  revalidateTag("installs", "max");
}
