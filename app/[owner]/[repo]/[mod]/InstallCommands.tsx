"use client";

import { InstallTabs } from "@/components/InstallTabs";
import type { InstallGroup } from "@/lib/data";
import { countInstall } from "./actions";

type Props = {
  owner: string;
  repo: string;
  slug: string;
  groups: InstallGroup[];
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

  return <InstallTabs groups={groups} onCopy={onCopy} />;
}
