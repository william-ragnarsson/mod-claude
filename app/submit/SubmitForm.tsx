"use client";

import Link from "next/link";
import { useActionState } from "react";
import { modHref, repoName } from "@/lib/hosts";
import type { ModRef } from "@/lib/ingest";
import { submitRepo, type SubmitState } from "./actions";

const initialState: SubmitState = { status: "idle" };

export function SubmitForm() {
  const [state, action, pending] = useActionState(submitRepo, initialState);

  return (
    <div>
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">GitHub or GitLab repository</span>
          <input
            name="repo"
            required
            maxLength={300}
            defaultValue={state.status === "error" ? state.input : ""}
            placeholder="github.com/owner/repo or gitlab.com/group/project"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={state.status === "error"}
            aria-describedby="submit-result"
            className="h-11 w-full rounded-lg border border-line bg-bg px-3.5 font-mono text-sm text-fg outline-none placeholder:text-faint focus:border-line-strong"
          />
        </label>
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-lg bg-fg px-5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Submit"}
        </button>
      </form>

      <div id="submit-result" aria-live="polite" className="mt-5 text-sm">
        {state.status === "error" && <p className="text-error">{state.message}</p>}
        {state.status === "done" && (
          <div className="space-y-5">
            <ModLinks title="Added" mods={state.added} />
            <ModLinks title="Already listed, now refreshed" mods={state.existing} />
          </div>
        )}
      </div>
    </div>
  );
}

function ModLinks({ title, mods }: { title: string; mods: ModRef[] }) {
  if (mods.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-muted">{title}</p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {mods.map((mod) => (
          <li key={`${repoName(mod)}/${mod.slug}`}>
            <Link
              href={modHref(mod)}
              className="flex items-baseline justify-between gap-4 px-3.5 py-3 transition-colors hover:bg-subtle"
            >
              <span className="truncate font-medium text-fg">{mod.name}</span>
              <span className="truncate font-mono text-xs text-faint">{repoName(mod)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
