import Link from "next/link";
import { redirect } from "next/navigation";

import { StarMark } from "@/components/star-mark";
import { createClient } from "@/lib/supabase/server";

import { SignupForm } from "./signup-form";

export const metadata = { title: "Create an account" };

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nothing to create if they already have an account in hand.
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface/70 p-7 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="mb-7 flex flex-col gap-2">
            <StarMark className="h-8 w-8" />
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-[13px] leading-relaxed text-muted">
              Pick a username — you can sign in with it or your email.
            </p>
          </div>

          <SignupForm />
        </div>

        <p className="mt-5 text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-fg underline decoration-border underline-offset-4 transition-colors hover:decoration-gold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
