"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

/**
 * Deliberately vague. A message like "no such username" would let anyone test
 * which accounts exist on this site.
 */
const INVALID = "Incorrect login details. Check your details and try again.";

/** Resolves a username to the email address that owns it. */
async function emailForUsername(username: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error || !data) return null;

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(data.id);

  if (userError) return null;

  return userData.user?.email ?? null;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your email or username, and your password." };
  }

  // Supabase Auth only accepts an email or phone number, so a username has to
  // be translated into its email first.
  let email = identifier;

  if (!identifier.includes("@")) {
    try {
      const resolved = await emailForUsername(identifier);
      if (!resolved) return { error: INVALID };
      email = resolved;
    } catch (cause) {
      console.error("Username lookup failed:", cause);
      return {
        error:
          "Username login is not configured yet. Sign in with your email address instead.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: INVALID };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
