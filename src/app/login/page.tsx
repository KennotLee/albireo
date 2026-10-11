import Link from "next/link";

import { StarMark } from "@/components/star-mark";
import { createClient } from "@/lib/supabase/server";

import { logout } from "./actions";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface/70 p-7 shadow-sm backdrop-blur-sm sm:p-8">
          {user ? (
            <div className="flex flex-col items-center gap-5 text-center">
              <StarMark className="h-9 w-9" />
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl font-semibold tracking-tight">
                  Already signed in
                </h1>
                <p className="font-mono text-[13px] text-muted">{user.email}</p>
              </div>
              <div className="flex w-full flex-col gap-2.5">
                <Link
                  href="/dashboard"
                  className="flex h-11 items-center justify-center rounded-full bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-85"
                >
                  Continue
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-full border border-border text-sm font-medium text-muted transition-colors hover:border-gold hover:text-fg"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-7 flex flex-col gap-2">
                <StarMark className="h-8 w-8" />
                <h1 className="mt-1 text-xl font-semibold tracking-tight">
                  Sign in to Albireo
                </h1>
                <p className="text-[13px] leading-relaxed text-muted">
                  Use your email address or your username.
                </p>
              </div>
              <LoginForm />
            </>
          )}
        </div>

        {!user && (
          <p className="mt-5 text-center text-[13px] text-muted">
            No account yet?{" "}
            <Link
              href="/signup"
              className="font-medium text-fg underline decoration-border underline-offset-4 transition-colors hover:decoration-gold"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
