import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateFolder } from "@/components/create-folder";
import { DriveGrid, type DriveItem } from "@/components/drive-grid";
import { PhotoUpload } from "@/components/photo-upload";
import { PHOTO_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Photos" };

/** Long enough to browse, short enough that a leaked link dies quickly. */
const SIGNED_URL_TTL = 60 * 60;

type Row = {
  id: string;
  kind: "folder" | "file";
  name: string;
  storage_path: string | null;
  user_id: string;
};

export default async function PhotosPage({
  searchParams,
}: PageProps<"/photos">) {
  const { folder } = await searchParams;
  const folderId = typeof folder === "string" && folder ? folder : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Children of the current folder. RLS decides what is visible, so a folder
  // shared with this user shows up without any extra filtering here.
  const query = supabase
    .from("nodes")
    .select("id, kind, name, storage_path, user_id")
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  const { data: rows, error } = await (
    folderId ? query.eq("parent_id", folderId) : query.is("parent_id", null)
  ).returns<Row[]>();

  // Breadcrumbs, root first.
  let trail: { node_id: string; node_name: string }[] = [];
  if (folderId) {
    const { data: chain } = await supabase.rpc("node_chain", {
      target: folderId,
    });
    trail = chain ?? [];
  }

  // The bucket is private, so each file needs a freshly signed URL. One batched
  // call rather than one request per image.
  const files = (rows ?? []).filter((r) => r.kind === "file" && r.storage_path);
  const urls = new Map<string, string>();

  if (files.length) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(
        files.map((f) => f.storage_path as string),
        SIGNED_URL_TTL,
      );

    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
    }
  }

  const items: DriveItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    url: row.storage_path ? (urls.get(row.storage_path) ?? null) : null,
    owned: row.user_id === user.id,
  }));

  const here = trail.length ? trail[trail.length - 1].node_name : "Drive";

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-[13px]"
      >
        <Link
          href="/photos"
          className={
            folderId
              ? "text-muted transition-colors hover:text-fg"
              : "font-medium"
          }
        >
          Drive
        </Link>
        {trail.map((crumb, i) => (
          <span key={crumb.node_id} className="flex items-center gap-1">
            <span className="text-muted">/</span>
            {i === trail.length - 1 ? (
              <span className="font-medium">{crumb.node_name}</span>
            ) : (
              <Link
                href={`/photos?folder=${crumb.node_id}`}
                className="text-muted transition-colors hover:text-fg"
              >
                {crumb.node_name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{here}</h1>
      <p className="mt-2 text-[15px] text-muted">
        Private unless you share a folder. Sharing passes down to everything
        inside it.
      </p>

      <div className="mt-8 flex flex-wrap items-start gap-3">
        <PhotoUpload userId={user.id} parentId={folderId} />
        <CreateFolder parentId={folderId} />
      </div>

      {error && (
        <p className="mt-8 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400">
          Could not load this folder: {error.message}. Has supabase/files.sql
          been run?
        </p>
      )}

      {!error && items.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-[15px] font-medium">Nothing here yet</p>
          <p className="mt-1 text-[13px] text-muted">
            Upload photos, or make a folder to put them in.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8">
          <DriveGrid items={items} />
        </div>
      )}
    </div>
  );
}
