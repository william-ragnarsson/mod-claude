import type { Metadata } from "next";
import Link from "next/link";
import { CopyCommand } from "@/components/CopyCommand";
import { ModList } from "@/components/ModList";
import { getMods } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const mods = await getMods();

  return (
    <div className="pt-16 pb-24 sm:pt-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tighter text-fg sm:text-5xl">Mods for Claude Code</h1>
        <p className="mt-4 text-lg text-balance text-muted">{SITE.tagline}</p>
        <div className="mt-8 max-w-xl">
          <CopyCommand prompt=">" command="/plugin install <mod>@<marketplace>" />
        </div>
      </section>

      <div className="mt-16">
        <ModList mods={mods} />
      </div>

      <section className="mt-12 flex flex-col gap-5 rounded-xl border border-line bg-subtle p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Built a mod?</h2>
          <p className="mt-1 text-sm text-muted">
            Paste its GitHub repo and it&apos;s listed right away. No account needed.
          </p>
        </div>
        <Link
          href="/submit"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
        >
          Submit a mod
          <ArrowIcon />
        </Link>
      </section>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
