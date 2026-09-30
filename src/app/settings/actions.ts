"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Records a freshly uploaded avatar against the profile and removes the file it
 * replaced. Without that cleanup, every change leaves an orphan in the bucket
 * that nothing will ever reference or delete.
 */
export async function saveAvatar(path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You are not signed in." };

  // Never trust a path from the browser: it must live in the caller's folder,
  // or one user could point their profile at somebody else's file.
  if (!path.startsWith(`${user.id}/`)) {
    return { error: "That file does not belong to your account." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  const previous = existing?.avatar_url;
  if (previous && previous !== path) {
    // Best effort. A failure here leaves a stray file, which is untidy but
    // harmless — so it must not fail the update the user actually asked for.
    await supabase.storage.from("avatars").remove([previous]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}

/** Form-friendly wrapper, so a plain <form action> can call it. */
export async function removeAvatarForm() {
  await removeAvatar();
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You are not signed in." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  if (existing?.avatar_url) {
    await supabase.storage.from("avatars").remove([existing.avatar_url]);
  }

  revalidatePath("/", "layout");
  return { error: null };
}
