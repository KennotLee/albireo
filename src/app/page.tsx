import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const wired = [
  {
    title: "Email or username",
    body: "Sign in with either. Usernames resolve to their account server-side, so the form can never be used to harvest addresses.",
  },
  {
    title: "Postgres with RLS",
    body: "Supabase behind row-level security. The browser key reaches only the rows its policies allow.",
  },
  {
    title: "Sessions that survive",
    body: "Tokens refresh on every request through proxy.ts, with cache headers that keep a CDN from serving one session to somebody else.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6">
      <section className="flex flex-col items-start gap-7 py-20 sm:py-28">
        <span className="flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] tracking-wide text-muted">
          <span className="size-1.5 rounded-full bg-gold-soft" />
          β Cygni
        </span>

        <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Two stars,{" "}
          <span className="text-gold-soft">one</span>{" "}
          <span className="text-azure">point</span>{" "}
          of light.
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-muted">
          To the eye it is a single star. Through a telescope it splits into a
          gold giant and its blue companion — the finest colour contrast in the
          northern sky.
        </p>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="flex h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-bg transition-opacity hover:opacity-85"
            >
              Go to your home page
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-bg transition-opacity hover:opacity-85"
            >
              Sign in
            </Link>
          )}
          {!user && (
            <Link
              href="/signup"
              className="flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:border-gold hover:text-gold"
            >
              Create an account
            </Link>
          )}
          <a
            href="https://en.wikipedia.org/wiki/Albireo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-muted transition-colors hover:border-gold hover:text-fg"
          >
            About the star
          </a>
        </div>
      </section>

      <div className="hairline" />

      <section className="grid gap-px py-16 sm:grid-cols-3">
        {wired.map(({ title, body }) => (
          <div key={title} className="flex flex-col gap-2 pr-6">
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            <p className="text-[13px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
