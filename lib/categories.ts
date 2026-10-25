/**
 * The categories mods are sorted into. For each mod, TypeSafe's Jev model judges how likely each one fits
 * (lib/categorize.ts), and the site lists a mod under the ones above THRESHOLD. Changing a category's `means`
 * changes the question Jev is asked, so every mod is judged again on its repo's next re-read.
 */
export const CATEGORIES = [
  {
    id: "usage",
    label: "Usage & cost",
    means: "show or track token usage, the context window, plan limits, spend or API credit",
  },
  {
    id: "agents",
    label: "Agents",
    means: "watch, route or coordinate subagents, agent teams or several sessions, or pick the model they run on",
  },
  {
    id: "context",
    label: "Context & memory",
    means:
      "change or show what the model sees: compact the conversation, recall memories or notes, trim tool output, or choose or list which rules and instructions are loaded",
  },
  {
    id: "safety",
    label: "Safety",
    means: "block, hold or ask before risky commands or actions, hide secrets or personal data, or enforce rules",
  },
  {
    id: "git",
    label: "Git & review",
    means: "work with diffs, code review, commits, branches, pull requests or CI results",
  },
  {
    id: "planning",
    label: "Planning & tasks",
    means:
      "help plan or track the work: plans, task lists, progress, goals, handoffs, or a development method to follow",
  },
  {
    id: "prompts",
    label: "Prompts",
    means: "help write prompts: suggest the next prompt, rewrite or check a prompt, or keep prompts to reuse",
  },
  {
    id: "appearance",
    label: "Appearance",
    means: "change how Claude Code looks: themes, skins, or how replies, tool calls or diagrams are drawn",
  },
  {
    id: "alerts",
    label: "Sounds & alerts",
    means: "play sounds, speak aloud, or alert the user with toasts or notifications",
  },
  {
    id: "integrations",
    label: "Integrations",
    means:
      "connect Claude Code to an outside product or service, such as a cloud data platform, email, chat, calendar, reminders or another AI provider",
  },
  {
    id: "feeds",
    label: "News & feeds",
    means: "show information from outside the coding session, such as news, quotes, stock prices, music or prayer times",
  },
  {
    id: "tools",
    label: "Dev tools",
    means:
      "give the developer a small standalone utility, such as a viewer, preview, formatter, converter, generator, file browser, timer, calculator, or a shelf of snippets or links",
  },
  {
    id: "fun",
    label: "Fun & games",
    means: "entertain: games, virtual pets, animations, commentary or other playful extras",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/** Jev's probability that each category fits a mod, by category id. Null until the mod is first judged. */
export type CategoryScores = Partial<Record<CategoryId, number>>;

// Jev's suggested starting point for a yes. The scores are stored as they are, so changing this needs no re-judging.
const THRESHOLD = 0.7;

const LABELS = new Map<string, string>(CATEGORIES.map((category) => [category.id, category.label]));

export function isCategory(id: string | null): id is CategoryId {
  return id !== null && LABELS.has(id);
}

export function categoryLabel(id: CategoryId): string {
  return LABELS.get(id) ?? id;
}

/** The categories a mod is listed under, most likely first. */
export function categoriesOf(scores: CategoryScores | null): CategoryId[] {
  if (!scores) return [];
  return CATEGORIES.map((category) => category.id)
    .filter((id) => (scores[id] ?? 0) >= THRESHOLD)
    .sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
}
