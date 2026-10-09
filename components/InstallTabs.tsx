"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CopyButton } from "@/components/CopyCommand";
import type { InstallGroup } from "@/lib/data";

// One card, one tab per way to install. Each line copies on its own, since Claude Code takes one slash command at a time.
export function InstallTabs({ groups, onCopy }: { groups: InstallGroup[]; onCopy?: () => void }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + groups.length) % groups.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-subtle">
      <div role="tablist" aria-label="Install with" className="flex border-b border-line px-1.5">
        {groups.map(({ label }, index) => (
          <button
            key={label}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${id}-panel`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="relative px-2.5 py-2.5 text-[13px] text-faint transition-colors after:absolute after:inset-x-2.5 after:-bottom-px after:h-px after:bg-fg after:opacity-0 hover:text-muted aria-selected:text-fg aria-selected:after:opacity-100"
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`}>
        <Panel group={groups[active]} onCopy={onCopy} />
      </div>
    </div>
  );
}

function Panel({ group, onCopy }: { group: InstallGroup; onCopy?: () => void }) {
  if ("steps" in group) {
    return (
      <ol className="space-y-3 px-3.5 py-3.5 text-[13px] leading-6 text-muted">
        {group.steps.map(({ text, copy }, index) => (
          <li key={text} className="flex gap-3">
            <span aria-hidden className="w-3 shrink-0 select-none font-mono text-faint">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p>{text}</p>
              {copy && (
                <div className="mt-2 flex items-start gap-3 rounded-md border border-line bg-bg py-0.5 pr-0.5 pl-3 font-mono leading-7">
                  <code className="min-w-0 flex-1 text-fg [overflow-wrap:anywhere]">{copy}</code>
                  <CopyButton text={copy} onCopy={onCopy} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="pt-3 pb-2">
      <p className="px-3.5 pb-1 text-[13px] leading-6 text-faint">{group.hint}</p>
      <div className="font-mono text-[13px] leading-7">
        {group.commands.map((command) => (
          <div key={command} className="flex min-w-0 items-start gap-3 pr-1.5 pl-3.5">
            <span aria-hidden className="select-none text-faint">
              {command.startsWith("/") ? ">" : "$"}
            </span>
            <code className="min-w-0 flex-1 text-fg [overflow-wrap:anywhere]">{command}</code>
            <CopyButton text={command} onCopy={onCopy} />
          </div>
        ))}
      </div>
    </div>
  );
}
