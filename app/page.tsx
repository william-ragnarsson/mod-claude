import type { Metadata } from "next";
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
    </div>
  );
}
