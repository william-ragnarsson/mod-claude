"use client";

import { InstallTabs } from "@/components/InstallTabs";
import type { InstallGroup } from "@/lib/data";
import { repoName, type RepoRef } from "@/lib/hosts";
import { countInstall } from "@/lib/installs";

type Props = {
  mod: RepoRef & { slug: string };
  groups: InstallGroup[];
};

export function InstallCommands({ mod, groups }: Props) {
  // One install per browser per mod, however many of its commands get copied.
  function onCopy() {
    // GitHub mods keep the "owner/repo" key they always had, so browsers that already counted don't count again.
    const key = `installed:${repoName(mod)}/${mod.slug}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage can be blocked (private windows). Count the copy anyway.
    }
    countInstall(mod.host, mod.owner, mod.repo, mod.slug).catch(() => {});
  }

  return <InstallTabs groups={groups} onCopy={onCopy} />;
}
