"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/login/actions";
import { Avatar } from "@/components/avatar";

export function ProfileMenu({
  email,
  username,
  avatarUrl,
}: {
  email: string;
  username: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initial = (username ?? email).charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full transition-shadow hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
      >
        <Avatar url={avatarUrl} initial={initial} size={36} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-border bg-surface p-4 shadow-xl"
        >
          <div className="flex flex-col items-center gap-2.5 pb-4 text-center">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="group relative"
              aria-label="Edit profile picture"
            >
              <Avatar url={avatarUrl} initial={initial} size={56} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Edit
              </span>
            </Link>

            {username && (
              <p className="text-sm font-medium tracking-tight">{username}</p>
            )}
            <p className="max-w-full truncate font-mono text-[12px] text-muted">
              {email}
            </p>
          </div>

          <div className="hairline" />

          <div className="flex flex-col gap-2 pt-3">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center rounded-full border border-border text-[13px] font-medium transition-colors hover:border-gold hover:text-gold"
            >
              Edit profile picture
            </Link>

            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className="h-10 w-full rounded-full text-[13px] font-medium text-muted transition-colors hover:text-fg"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
