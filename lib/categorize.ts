import { createHash } from "node:crypto";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { CATEGORIES, type CategoryScores } from "./categories";
import { inParallel } from "./parallel";

// Pinned, so a new Jev release doesn't change categories unnoticed. Changing it judges every mod again.
const MODEL = "jev-1.14.0";
// Where a README says what the mod does. Jev is also more accurate on a shorter state.
const README_CHARS = 6000;
const JUDGED_AT_ONCE = 8;

/** What Jev reads about a mod. A FoundMod from ingest fits, and so does a row's matching columns. */
export type CategoryInput = {
  name: string;
  description: string | null;
  path: string;
  readme: string | null;
  readmePath: string | null;
};

export type Categorized = { categories: CategoryScores; categories_hash: string };

// One yes/no question per category, as a mod can fit several. Question ids aren't sent to Jev.
const CRITERIA = {
  true: "This is one of the main things the mod is for, going by its name, description or README",
  false: "The mod doesn't do this, or does it only in passing next to what it's mainly for",
};
const QUESTIONS = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, noul(`Does the Claude Code mod \`mod\` ${category.means}?`, CRITERIA)]),
);

// Badges, images and markup say nothing about what a mod does.
function excerpt(markdown: string): string {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[\]\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, README_CHARS);
}

function stateFor(mod: CategoryInput) {
  const about: Record<string, string> = { name: mod.name };
  if (mod.description) about.description = mod.description;
  if (mod.readme) {
    // A mod without a README of its own gets the repo's, which can describe other mods too. Its name says so.
    const own = mod.path === "" || mod.readmePath?.startsWith(`${mod.path}/`);
    about[own ? "readme" : "repository_readme"] = excerpt(mod.readme);
  }
  return { mod: about };
}

/** Changes when anything Jev would be asked changes: the model, the questions, or what it reads about the mod. */
function hashOf(state: object): string {
  return createHash("sha256").update(JSON.stringify({ MODEL, QUESTIONS, state })).digest("hex");
}

let client: TypeSafeClient | undefined;

/**
 * Asks Jev which categories each mod fits, by mod, skipping mods whose `previous` hash shows nothing changed since
 * they were last judged. Never throws: a mod that can't be judged now (no TYPESAFE_API_KEY, or Jev failed) is left out
 * of the result, so it keeps its old categories and is tried again on its next re-read.
 */
export async function categorizeMods<T extends CategoryInput>(
  mods: T[],
  previous: (mod: T) => string | null,
): Promise<Map<T, Categorized>> {
  const result = new Map<T, Categorized>();
  const due = mods
    .map((mod) => ({ mod, state: stateFor(mod) }))
    .map((item) => ({ ...item, hash: hashOf(item.state) }))
    .filter(({ mod, hash }) => previous(mod) !== hash);
  if (due.length === 0) return result;
  if (!process.env.TYPESAFE_API_KEY) {
    console.warn(`TYPESAFE_API_KEY isn't set, so ${due.length} mods weren't categorized.`);
    return result;
  }

  const jev = (client ??= new TypeSafeClient({ defaultModel: MODEL }));
  await inParallel(due, JUDGED_AT_ONCE, async ({ mod, state, hash }) => {
    try {
      const { answers } = await jev.systemOne({ state, questions: QUESTIONS });
      const categories = Object.fromEntries(
        CATEGORIES.map(({ id }) => [id, Math.round(answers[id].noul * 1000) / 1000]),
      ) as CategoryScores;
      result.set(mod, { categories, categories_hash: hash });
    } catch (error) {
      console.error(`Couldn't categorize ${mod.name}:`, error instanceof Error ? error.message : error);
    }
  });
  return result;
}
