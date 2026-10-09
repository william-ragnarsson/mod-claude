import { createClient } from "@supabase/supabase-js";

const options = { auth: { persistSession: false, autoRefreshToken: false } };

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local, or in Vercel under Settings → Environment Variables.`);
  }
  return value;
}

const url = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Read-only access under RLS: only visible mods. */
export function publicClient() {
  const key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return createClient(url(), key, options);
}

/** Full access. Server-only: SUPABASE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it never ships to the browser. */
export function adminClient() {
  return createClient(url(), required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY), options);
}
