import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Privileged client that bypasses Row Level Security. Used only to resolve a
 * username to its email address at login.
 *
 * The `server-only` import above makes the build fail if this file is ever
 * imported from a Client Component. The key it reads has no NEXT_PUBLIC_
 * prefix, so it is never sent to the browser.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing from .env.local. Username login needs it; " +
        "email login works without it.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
