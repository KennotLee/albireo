"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createFolder } from "@/app/photos/actions";

export function CreateFolder({ parentId }: { parentId: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await createFolder(parentId, name);

    setBusy(false);
    if (result.error) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }

    setName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[13px] font-medium transition-colors hover:border-gold hover:text-gold"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM12 11v5M9.5 13.5h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        New folder
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setError(null);
            }
          }}
          placeholder="DroneDay1Shoots"
          autoFocus
          maxLength={255}
          className="h-10 w-56 rounded-xl border border-border bg-surface px-3 text-[14px] focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="h-10 rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-10 rounded-full px-3 text-[13px] text-muted transition-colors hover:text-fg"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
