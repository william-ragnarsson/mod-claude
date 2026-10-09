import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Read-only access under RLS: only visible mods. */
export function publicClient() {
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
}

/** Full access. Server-only: SUPABASE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it never ships to the browser. */
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  return createClient(url, key, options);
}
