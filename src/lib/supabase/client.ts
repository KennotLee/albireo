import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Carries the signed-in user's session
 * from cookies, so storage and table policies apply to whoever is browsing.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
