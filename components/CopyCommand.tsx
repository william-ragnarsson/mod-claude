"use client";

import { useEffect, useState } from "react";

type Props = { command: string; prompt?: string; onCopy?: () => void };

export function CopyCommand({ command, prompt = "$", onCopy }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      onCopy?.();
    } catch {
      // Clipboard can be blocked (insecure origin, permissions). The command is still selectable.
    }
  }

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-line bg-subtle py-1.5 pr-1.5 pl-3.5 font-mono text-[13px] leading-7">
      <span aria-hidden className="select-none text-faint">
        {prompt}
      </span>
      <code className="min-w-0 flex-1 text-fg [overflow-wrap:anywhere]">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
