"use client";

import { CopyCommand } from "@/components/CopyCommand";
import { countInstall } from "./actions";

type Props = {
  owner: string;
  repo: string;
  slug: string;
  groups: { label: string; commands: string[] }[];
};

export function InstallCommands({ owner, repo, slug, groups }: Props) {
  // One install per browser per mod, however many of its commands get copied.
  function onCopy() {
    const key = `installed:${owner}/${repo}/${slug}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage can be blocked (private windows). Count the copy anyway.
    }
    countInstall(owner, repo, slug).catch(() => {});
  }

  return (
    <div className="space-y-5">
      {groups.map(({ label, commands }) => (
        <div key={label}>
          <p className="mb-1.5 text-xs text-faint">{label}</p>
          <div className="space-y-2">
            {commands.map((command) => (
              <CopyCommand
                key={command}
                command={command}
                prompt={command.startsWith("/") ? ">" : "$"}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
