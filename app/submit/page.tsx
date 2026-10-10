import type { Metadata } from "next";
import { SubmitForm } from "./SubmitForm";

export const metadata: Metadata = {
  title: "Submit a mod",
  description: "Add a Claude Code mod to the directory. Paste a public GitHub or GitLab repo, no account needed.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="max-w-2xl pt-16 pb-24 sm:pt-24">
      <h1 className="text-3xl font-semibold tracking-tighter text-fg sm:text-4xl">Submit a mod</h1>
      <p className="mt-3 text-muted">
        Paste a public GitHub or GitLab repo. Every mod in it is listed right away, no account needed. Stars and READMEs
        refresh daily.
      </p>

      <div className="mt-10">
        <SubmitForm />
      </div>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="text-sm font-medium text-fg">What counts as a mod</h2>
        <p className="mt-2 text-sm text-muted">
          A Claude Code plugin whose <code className="font-mono text-fg">hooks/hooks.json</code> lists{" "}
          <code className="font-mono text-fg">modules</code>. To be listed it must install with{" "}
          <code className="font-mono text-fg">/plugin install</code>, so the repo needs a marketplace file at its top
          level that lists it. A repo can hold any number of mods.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-lg border border-line bg-subtle p-4 font-mono text-[13px] leading-6 text-muted">
          {`my-mod/
├── .claude-plugin/
│   ├── marketplace.json   `}
          <span className="text-faint">{`{ "name": "my-mods", "plugins": [`}</span>
          {`
│   │                      `}
          <span className="text-faint">{`  { "name": "my-mod", "source": "./" } ] }`}</span>
          {`
│   └── plugin.json        `}
          <span className="text-faint">{`{ "name": "my-mod", "description": "…" }`}</span>
          {`
└── hooks/hooks.json       `}
          <span className="text-faint">{`{ "modules": ["./register.js"] }`}</span>
        </pre>
      </section>
    </div>
  );
}
