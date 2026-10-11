"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  error: string | null;
  /** Set when the project requires email confirmation before first sign-in. */
  pending?: { email: string; username: string } | null;
};

/** Must match the CHECK constraint in supabase/schema.sql, or the trigger
 *  rejects the insert and signup fails with an opaque database error. */
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const MIN_PASSWORD = 8;

export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !email || !password) {
    return { error: "Fill in every field." };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      error:
        "Usernames are 3–20 characters, using letters, numbers and underscores only.",
    };
  }
  if (!email.includes("@")) {
    return { error: "That does not look like an email address." };
  }
  if (password.length < MIN_PASSWORD) {
    return { error: `Use at least ${MIN_PASSWORD} characters for a password.` };
  }

  // Pre-flight check for a friendly message. The unique index is the actual
  // guarantee — two people can submit the same username at the same moment.
  try {
    const admin = createAdminClient();
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (taken) return { error: "That username is already taken." };
  } catch {
    // No secret key configured. The database still enforces uniqueness, and
    // the read-back below reports whatever name the account ended up with.
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by handle_new_user() to name the profile row.
    options: { data: { username } },
  });

  if (error) return { error: error.message };

  // No session means the project has email confirmation switched on, so the
  // account exists but cannot sign in until the link is clicked.
  if (!data.session) {
    return { error: null, pending: { email, username } };
  }

  // Signed in already. Report the stored username, which the collision
  // fallback in the trigger may have altered.
  let finalUsername = username;
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.username) finalUsername = profile.username;
  }

  if (finalUsername.toLowerCase() !== username.toLowerCase()) {
    return {
      error: `That username was claimed a moment before yours. Your account was created as "${finalUsername}" — you can change it in Settings.`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
