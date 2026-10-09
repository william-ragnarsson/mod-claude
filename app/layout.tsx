import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
  openGraph: { type: "website", siteName: SITE.name, title: SITE.title, description: SITE.tagline, url: "/" },
  // No title or description here: X falls back to each page's og: tags, so a shared mod shows its own name.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-240 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-fg">
              <Mark />
              {SITE.name}
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <a
                href={SITE.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-1.5 text-muted transition-colors hover:text-fg"
              >
                Docs
              </a>
              <a
                href={SITE.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
              >
                <GitHubIcon />
              </a>
              <Link
                href="/submit"
                className="ml-2 flex h-8 items-center gap-1.5 rounded-md bg-fg px-3 font-medium text-bg transition-opacity hover:opacity-90"
              >
                <PlusIcon />
                <span>
                  Submit<span className="hidden sm:inline"> a mod</span>
                </span>
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-240 flex-1 px-4 sm:px-6">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-240 flex-col gap-1 px-4 py-8 text-sm text-faint sm:flex-row sm:justify-between sm:px-6">
            <p>Independent community directory. Not affiliated with Anthropic.</p>
            <Link href="/submit" className="transition-colors hover:text-fg">
              Submit a mod
            </Link>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}

function Mark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="0.75" y="0.75" width="16.5" height="16.5" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 12.5V5.5l4 4 4-4v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 1.5v9M1.5 6h9" strokeLinecap="round" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
