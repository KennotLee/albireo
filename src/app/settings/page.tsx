import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/avatar-upload";
import { avatarPublicUrl } from "@/lib/avatar-url";
import { createClient } from "@/lib/supabase/server";

import { removeAvatarForm } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const currentUrl = avatarPublicUrl(profile?.avatar_url);
  const initial = (profile?.username ?? user.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-[15px] text-muted">
        Your profile as other people would see it.
      </p>

      <section className="mt-10 rounded-2xl border border-border p-6">
        <h2 className="text-sm font-semibold tracking-tight">
          Profile picture
        </h2>
        <p className="mb-5 mt-1 text-[13px] text-muted">
          Shown on your account button and across the app.
        </p>

        <AvatarUpload
          userId={user.id}
          initial={initial}
          currentUrl={currentUrl}
        />

        {currentUrl && (
          <form action={removeAvatarForm} className="mt-5">
            <button
              type="submit"
              className="text-[13px] font-medium text-muted underline decoration-border underline-offset-4 transition-colors hover:text-red-500"
            >
              Remove picture
            </button>
          </form>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-border p-6">
        <h2 className="text-sm font-semibold tracking-tight">Account</h2>
        <dl className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[13px] text-muted">Username</dt>
            <dd className="font-mono text-[13px]">
              {profile?.username ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[13px] text-muted">Email</dt>
            <dd className="truncate font-mono text-[13px]">{user.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
