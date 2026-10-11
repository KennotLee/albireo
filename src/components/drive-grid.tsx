"use client";

import Link from "next/link";
import { useState } from "react";

import { deleteNode } from "@/app/photos/actions";
import { ShareDialog } from "@/components/share-dialog";

export type DriveItem = {
  id: string;
  kind: "folder" | "file";
  name: string;
  /** Signed URL, files only. Null when it could not be signed. */
  url: string | null;
  /** Whether the viewer owns this node, and so may manage sharing. */
  owned: boolean;
};

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-gold-soft" aria-hidden="true">
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"
    >
      {children}
    </button>
  );
}

export function DriveGrid({ items }: { items: DriveItem[] }) {
  const [sharing, setSharing] = useState<DriveItem | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface"
          >
            {item.kind === "folder" ? (
              <Link
                href={`/photos?folder=${item.id}`}
                className="flex h-full flex-col gap-3 p-4"
              >
                <FolderIcon />
                <span className="line-clamp-2 break-words text-[13px] font-medium">
                  {item.name}
                </span>
              </Link>
            ) : (
              <div className="flex h-full flex-col">
                <div className="aspect-square bg-surface-2">
                  {item.url ? (
                    // Signed URLs expire hourly, so Next's optimizer would
                    // cache a dead URL and serve a broken image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[11px] text-muted">
                      unavailable
                    </div>
                  )}
                </div>
                <span className="line-clamp-1 break-words px-3 py-2 text-[12px] text-muted">
                  {item.name}
                </span>
              </div>
            )}

            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              {item.kind === "folder" && item.owned && (
                <IconButton
                  label={`Share ${item.name}`}
                  onClick={() => setSharing(item)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c-2.5 0-4.5 1.6-4.5 3.5V18h9v-2.5C13.5 13.6 11.5 12 9 12Zm7-6h5m-2.5-2.5v5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </IconButton>
              )}

              <form action={deleteNode}>
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  aria-label={`Delete ${item.name}`}
                  title={
                    item.kind === "folder"
                      ? "Delete folder and everything in it"
                      : "Delete"
                  }
                  className="flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 7h12M9 7V5h6v2M10 11v6M14 11v6M7 7l1 12h8l1-12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {sharing && (
        <ShareDialog
          nodeId={sharing.id}
          nodeName={sharing.name}
          onClose={() => setSharing(null)}
        />
      )}
    </>
  );
}
