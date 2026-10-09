import { ImageResponse } from "next/og";

// The size social sites and chat apps expect for a large link preview.
export const OG_SIZE = { width: 1200, height: 630 };

export const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Cuts text to at most `max` characters, at a word break. Runs of whitespace, like a README's line breaks, become one space. */
function clip(raw: string, max: number) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,.:;]+$/, "")}…`;
}

/**
 * The image a link to the site shows when it's shared: the site's mark, then a title with a line above it,
 * a description and a footer line. Uses the site's palette and next/og's built-in Geist.
 */
export function ogImage({
  eyebrow,
  title,
  description,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  footer: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 72,
          background: "#0a0a0a",
          color: "#ededed",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, letterSpacing: "-0.02em" }}>
          <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
            <rect x="0.75" y="0.75" width="16.5" height="16.5" rx="4" stroke="#ededed" strokeWidth="1.5" />
            <path d="M5 12.5V5.5l4 4 4-4v7" stroke="#ededed" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          mod-claude
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {eyebrow && <div style={{ fontSize: 30, color: "#6b6b6b", marginBottom: 16 }}>{eyebrow}</div>}
          <div
            style={{
              fontSize: title.length > 24 ? 60 : 80,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              wordBreak: "break-word",
            }}
          >
            {clip(title, 60)}
          </div>
          {description && (
            <div style={{ marginTop: 24, fontSize: 32, lineHeight: 1.4, color: "#a1a1a1" }}>{clip(description, 140)}</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 48,
            paddingTop: 28,
            borderTop: "1px solid #1f1f1f",
            fontSize: 26,
            color: "#6b6b6b",
          }}
        >
          {footer}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
