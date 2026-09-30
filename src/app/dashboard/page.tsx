import { redirect } from "next/navigation";

import { StarMark } from "@/components/star-mark";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Home" };

function formatDate(value: string | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The gate. Everything below this line only renders for a signed-in user.
  if (!user) redirect("/login");

  // Readable under RLS because the policy allows auth.uid() = id.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const rows = [
    { label: "Username", value: profile?.username ?? "—" },
    { label: "Email", value: user.email ?? "—" },
    { label: "Last signed in", value: formatDate(user.last_sign_in_at) },
    { label: "Account created", value: formatDate(user.created_at) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-20">
      <div className="flex items-center gap-3">
        <StarMark className="h-8 w-8" />
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back
          {profile?.username ? (
            <>
              , <span className="text-gold-soft">{profile.username}</span>
            </>
          ) : null}
        </h1>
      </div>

      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
        You are signed in. This page is only reachable with a session — signing
        out sends you straight back to the login screen.
      </p>

      <div className="mt-10 overflow-hidden rounded-2xl border border-border">
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="text-[13px] text-muted">{label}</span>
            <span className="truncate font-mono text-[13px]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
