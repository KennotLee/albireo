"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";
import { StarMark } from "@/components/star-mark";

/** Add a route here and it appears in both the sidebar and the drawer. */
const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/settings", label: "Settings" },
  { href: "/", label: "About Albireo" },
];

type User = {
  email: string;
  username: string | null;
  avatarUrl: string | null;
} | null;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors ${
              active
                ? "bg-gold/12 text-gold"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Escape closes it, matching the profile menu.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md">
        <div className="flex h-16 items-center gap-1 px-4 sm:px-6">
          {user && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg md:hidden"
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          <Link href="/" className="group flex items-center gap-2.5 px-2">
            <StarMark className="h-7 w-7 transition-transform duration-500 group-hover:rotate-12" />
            <span className="text-[15px] font-semibold tracking-tight">
              Albireo
            </span>
          </Link>

          <div className="flex-1" />

          {user ? (
            <ProfileMenu
              email={user.email}
              username={user.username}
              avatarUrl={user.avatarUrl}
            />
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

      <div className="flex flex-1">
        {/* Persistent rail on wide screens. */}
        {user && (
          <aside className="hidden w-60 shrink-0 md:block">
            <div className="sticky top-16">
              <NavLinks />
            </div>
          </aside>
        )}

        {/* Drawer below the breakpoint. */}
        {user && drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface shadow-2xl">
              <div className="flex h-16 items-center gap-2.5 px-5">
                <StarMark className="h-7 w-7" />
                <span className="text-[15px] font-semibold tracking-tight">
                  Albireo
                </span>
              </div>
              <div className="hairline" />
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </>
  );
}
