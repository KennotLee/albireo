"use client";

import { useEffect, useState } from "react";

import {
  listGrants,
  revokeGrant,
  shareNode,
  type Grant,
} from "@/app/photos/actions";

export function ShareDialog({
  nodeId,
  nodeName,
  onClose,
}: {
  nodeId: string;
  nodeName: string;
  onClose: () => void;
}) {
  const [grants, setGrants] = useState<Grant[] | null>(null);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setGrants(await listGrants(nodeId));
  }

  // Load the access list. State is set from the promise callback rather than
  // the effect body, which is what keeps this out of a cascading render.
  useEffect(() => {
    let cancelled = false;
    listGrants(nodeId).then((loaded) => {
      if (!cancelled) setGrants(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await shareNode(nodeId, username, role);

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setUsername("");
    await refresh();
  }

  async function remove(grantId: string) {
    setBusy(true);
    await revokeGrant(grantId);
    setBusy(false);
    await refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${nodeName}`}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold tracking-tight">
          Share “{nodeName}”
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Everything inside this folder is shared too.
        </p>

        <form onSubmit={add} className="mt-5 flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-[14px] focus:border-gold focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
            className="h-10 rounded-xl border border-border bg-bg px-2 text-[13px] focus:border-gold focus:outline-none"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button
            type="submit"
            disabled={busy || !username.trim()}
            className="h-10 rounded-full bg-fg px-4 text-[13px] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            Share
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-[13px] text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mt-5">
          <div className="hairline mb-3" />
          {grants === null ? (
            <p className="text-[13px] text-muted">Loading…</p>
          ) : grants.length === 0 ? (
            <p className="text-[13px] text-muted">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {grants.map((grant) => (
                <li
                  key={grant.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-[13px]">
                    {grant.username ?? (
                      <span className="font-mono text-muted">
                        {grant.grantee.slice(0, 8)}…
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[12px] capitalize text-muted">
                      {grant.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(grant.id)}
                      disabled={busy}
                      className="text-[12px] text-muted underline decoration-border underline-offset-4 transition-colors hover:text-red-500 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-10 w-full rounded-full border border-border text-[13px] font-medium transition-colors hover:border-gold"
        >
          Done
        </button>
      </div>
    </div>
  );
}
