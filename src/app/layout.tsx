import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { StarMark } from "@/components/star-mark";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";
import { logout } from "./login/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Albireo",
    template: "%s · Albireo",
  },
  description: "A double star in Cygnus.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="sky flex min-h-full flex-col">
        <header className="sticky top-0 z-10 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <StarMark className="h-7 w-7 transition-transform duration-500 group-hover:rotate-12" />
              <span className="text-[15px] font-semibold tracking-tight">
                Albireo
              </span>
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden max-w-[22ch] truncate font-mono text-xs text-muted sm:block">
                  {user.email}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="h-9 rounded-full border border-border px-4 text-[13px] font-medium text-muted transition-colors hover:border-gold hover:text-fg"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex h-9 items-center rounded-full border border-border px-4 text-[13px] font-medium transition-colors hover:border-gold hover:text-gold"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="hairline" />
        </header>

        <main className="flex flex-1 flex-col">{children}</main>

        <footer className="mx-auto w-full max-w-5xl px-6 py-8">
          <div className="hairline mb-6" />
          <p className="text-xs text-muted">
            Albireo — β Cygni. Gold and blue, 430 light years out.
          </p>
        </footer>
      </body>
    </html>
  );
}
