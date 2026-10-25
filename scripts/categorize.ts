// Categorizes the listed mods with TypeSafe's Jev now, rather than on each repo's next re-read. Skips mods already
// judged on the same text and questions, unless --all. Run after adding TYPESAFE_API_KEY or editing lib/categories.ts:
//   npx tsx --env-file=.env.local scripts/categorize.ts [--dry] [--all] [owner/repo ...]
// --dry prints each mod's categories, with the closest misses, without writing to the database.
import { categoriesOf, categoryLabel, CATEGORIES, type CategoryScores } from "../lib/categories";
import { categorizeMods } from "../lib/categorize";
import { adminClient } from "../lib/supabase";

type Row = {
  id: string;
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  path: string;
  readme: string | null;
  readme_path: string | null;
  categories_hash: string | null;
};

function describe(scores: CategoryScores): string {
  const listed = categoriesOf(scores);
  const misses = CATEGORIES.map(({ id }) => id)
    .filter((id) => !listed.includes(id))
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
    .slice(0, 2);
  const format = (ids: typeof listed) => ids.map((id) => `${categoryLabel(id)} ${scores[id]}`).join(", ");
  return `${format(listed) || "(none)"}  · next: ${format(misses)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const all = args.includes("--all");
  const named = new Set(args.filter((arg) => !arg.startsWith("--")).map((arg) => arg.toLowerCase()));

  const db = adminClient();
  const { data, error } = await db
    .from("mods")
    .select("id, owner, repo, name, description, path, readme, readme_path, categories_hash")
    .order("stars", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = (data as Row[]).filter((row) => named.size === 0 || named.has(`${row.owner}/${row.repo}`.toLowerCase()));

  const mods = rows.map((row) => ({ ...row, readmePath: row.readme_path }));
  const categorized = await categorizeMods(mods, (mod) => (all ? null : mod.categories_hash));
  for (const mod of mods) {
    const result = categorized.get(mod);
    if (!result) continue;
    console.log(`${mod.owner}/${mod.repo} ${mod.name}: ${describe(result.categories)}`);
    if (dry) continue;
    const { error } = await db.from("mods").update(result).eq("id", mod.id);
    if (error) throw new Error(error.message);
  }
  const skipped = mods.length - categorized.size;
  console.log(
    `\n${dry ? "Judged" : "Categorized"} ${categorized.size} of ${mods.length} mods` +
      (skipped > 0 ? `; ${skipped} unchanged or failed.` : "."),
  );
  if (!dry && categorized.size > 0) console.log("The site picks them up when its cache next refreshes, within the hour.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
