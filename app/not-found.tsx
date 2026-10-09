import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pt-24 pb-32">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tighter text-fg">Mod not found</h1>
      <p className="mt-3 text-muted">It may have been renamed, removed, or never listed.</p>
      <Link href="/" className="mt-8 inline-block text-sm text-fg underline underline-offset-4">
        Browse all mods
      </Link>
    </div>
  );
}
