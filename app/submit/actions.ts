"use server";

import { updateTag } from "next/cache";
import { GitHubError, parseRepoUrl } from "@/lib/github";
import { IngestError, ingestRepo, type ModRef } from "@/lib/ingest";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; input: string }
  | { status: "done"; added: ModRef[]; existing: ModRef[] };

export async function submitRepo(_previous: SubmitState, formData: FormData): Promise<SubmitState> {
  const input = String(formData.get("repo") ?? "").slice(0, 300);

  // Hidden field that only bots fill in. Pretend it worked.
  if (formData.get("website")) return { status: "done", added: [], existing: [] };

  const parsed = parseRepoUrl(input);
  if (!parsed) {
    return { status: "error", message: "Enter a GitHub repo, like github.com/owner/repo.", input };
  }

  try {
    const result = await ingestRepo(parsed.owner, parsed.repo);
    updateTag("mods");
    return { status: "done", ...result };
  } catch (error) {
    // An IngestError also removes the repo's old rows, so the list needs refreshing.
    if (error instanceof IngestError) updateTag("mods");
    if (error instanceof IngestError || error instanceof GitHubError) {
      return { status: "error", message: error.message, input };
    }
    console.error("submit failed", parsed, error);
    return { status: "error", message: "Something went wrong. Try again in a minute.", input };
  }
}
