// Loads known mod repos into the directory.
// Run with: npx tsx --env-file=.env.local scripts/seed.ts [--dry] [owner/repo ...]
// --dry lists the mods it finds without writing to the database.
import { findMods, ingestRepo } from "../lib/ingest";

const SEED_REPOS = [
  "anthropics/claude-code-playground",
  "davila7/claude-code-templates",
  "OneWave-AI/claude-code-mods",
  "hamzafer/claude-code-mods",
  "hoobnn/hoobnn-agent-mods",
  "Arunjay4213/claude-mods",
  "zenbu-labs/terminal-browser",
  "tomstagl/cctop",
  "scasella/claude-flightdeck",
  "alexgreensh/token-optimizer",
  "cablate/ctx-handoff-mod",
  "NahumLitvin/prismantis",
  "hellosverre/claude-skins",
  "xuanji86/claude-statuspane",
  "Charlie0113-T/claude-agent-flow",
  "sezaakgun/cc-arcade",
  "FazalAAli/pi-agent-for-claude",
  "ruvnet/RuView",
];

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const named = args.filter((arg) => arg !== "--dry");
  const repos = named.length > 0 ? named : SEED_REPOS;
  let total = 0;
  for (const fullName of repos) {
    const [owner, repo] = fullName.split("/");
    try {
      if (dry) {
        const { repo: info, mods, copies, unlisted } = await findMods(owner, repo);
        total += mods.length;
        console.log(`found ${info.owner}/${info.repo} (${info.stars} stars, ${info.defaultBranch})`);
        for (const mod of mods) {
          const install = `install ${mod.installName}@${mod.marketplace}`;
          console.log(`      ${mod.slug} at /${mod.path} | ${install} | readme ${mod.readmePath ?? "none"}`);
        }
        for (const mod of copies) console.log(`      skip ${mod.slug} at /${mod.path}: copy of ${mod.copyOf}`);
        for (const mod of unlisted) console.log(`      skip ${mod.slug} at /${mod.path}: not in the marketplace`);
        continue;
      }
      const { added, existing, removed } = await ingestRepo(owner, repo);
      total += added.length + existing.length;
      const names = [...added, ...existing].map((mod) => mod.name).join(", ");
      const gone = removed.length > 0 ? `, ${removed.length} removed (${removed.map((mod) => mod.name).join(", ")})` : "";
      console.log(`ok    ${fullName}: ${added.length} added, ${existing.length} refreshed${gone} (${names})`);
    } catch (error) {
      console.log(`skip  ${fullName}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`\n${total} mods from ${repos.length} repos.`);
}

main();
