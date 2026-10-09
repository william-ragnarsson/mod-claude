import { createClient } from "@supabase/supabase-js";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// The project URL and publishable key are public by design (row-level security guards the data), so the site
// builds and lists mods with no configuration. The env vars override them, to point at another project.
const PROJECT_URL = "https://urqmlfbnoejbbrhysjts.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_m948fdvNh9ufqtDyN6LJmA_aCyHWVUU";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL || PROJECT_URL;

/** Read-only access under RLS: only visible mods. */
export function publicClient() {
  return createClient(url(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE_KEY, options);
}

/** Full access. Server-only: SUPABASE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it never ships to the browser. */
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not set. Add it to .env.local, or in Vercel under Settings → Environment Variables.");
  }
  return createClient(url(), key, options);
}
