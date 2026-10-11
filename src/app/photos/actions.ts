"use server";

import { revalidatePath } from "next/cache";

import { PHOTO_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

const NAME_MAX = 255;

/** Shared guard: a signed-in user, or an error to hand back to the form. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createFolder(
  parentId: string | null,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();

  if (!trimmed) return { error: "Give the folder a name." };
  if (trimmed.length > NAME_MAX) return { error: "That name is too long." };
  if (trimmed.includes("/")) {
    return { error: "Folder names cannot contain a slash." };
  }
  if (trimmed === "." || trimmed === "..") {
    return { error: "That name is reserved." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You are not signed in." };

  const { error } = await supabase.from("nodes").insert({
    user_id: user.id,
    parent_id: parentId,
    kind: "folder",
    name: trimmed,
  });

  if (error) {
    // 23505 is the unique violation from nodes_sibling_name_key.
    if (error.code === "23505") {
      return { error: "Something here already has that name." };
    }
    return { error: error.message };
  }

  revalidatePath("/photos");
  return { error: null };
}

/** Records a file the browser has already pushed into Storage. */
export async function saveFile(
  parentId: string | null,
  name: string,
  storagePath: string,
  byteSize: number,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You are not signed in." };

  // The browser supplies this path, so it is checked here too: without it one
  // account could index a file sitting in someone else's storage folder.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { error: "That file does not belong to your account." };
  }

  const { error } = await supabase.from("nodes").insert({
    user_id: user.id,
    parent_id: parentId,
    kind: "file",
    name: name.slice(0, NAME_MAX).replace(/\//g, "-"),
    storage_path: storagePath,
    mime_type: "image/webp",
    byte_size: byteSize,
  });

  if (error) return { error: error.message };

  revalidatePath("/photos");
  return { error: null };
}

export async function deleteNode(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, user } = await requireUser();
  if (!user) return;

  // Collect the storage keys beneath this node first. Deleting the row
  // cascades the tree away, and after that nothing knows which objects to
  // remove from the bucket.
  const { data: files } = await supabase.rpc("descendant_files", { root: id });

  const { error } = await supabase.from("nodes").delete().eq("id", id);
  if (error) return;

  const paths = (files ?? [])
    .map((f: { file_path: string | null }) => f.file_path)
    .filter((p: string | null): p is string => Boolean(p));

  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  }

  revalidatePath("/photos");
}

export async function renameNode(
  id: string,
  name: string,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give it a name." };
  if (trimmed.includes("/")) return { error: "Names cannot contain a slash." };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You are not signed in." };

  const { error } = await supabase
    .from("nodes")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Something here already has that name." };
    }
    return { error: error.message };
  }

  revalidatePath("/photos");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

export type Grant = {
  id: string;
  grantee: string;
  role: "viewer" | "editor";
  username: string | null;
};

/**
 * Resolves a username to an account id. Runs with the secret key for the same
 * reason login does: an endpoint the browser could call to turn usernames into
 * account ids is a user-enumeration tool.
 */
async function userIdForUsername(username: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  return data?.id ?? null;
}

export async function shareNode(
  nodeId: string,
  username: string,
  role: "viewer" | "editor",
): Promise<ActionResult> {
  const trimmed = username.trim();
  if (!trimmed) return { error: "Enter a username." };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You are not signed in." };

  let granteeId: string | null;
  try {
    granteeId = await userIdForUsername(trimmed);
  } catch {
    return { error: "Sharing is not configured: SUPABASE_SECRET_KEY missing." };
  }

  if (!granteeId) return { error: `No account named "${trimmed}".` };
  if (granteeId === user.id) {
    return { error: "You already own this." };
  }

  // Upsert, so re-sharing with a different role changes it instead of failing
  // on the (node_id, grantee) unique constraint.
  const { error } = await supabase
    .from("node_grants")
    .upsert(
      { node_id: nodeId, grantee: granteeId, role },
      { onConflict: "node_id,grantee" },
    );

  if (error) return { error: error.message };

  revalidatePath("/photos");
  return { error: null };
}

export async function revokeGrant(grantId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You are not signed in." };

  const { error } = await supabase
    .from("node_grants")
    .delete()
    .eq("id", grantId);

  if (error) return { error: error.message };

  revalidatePath("/photos");
  return { error: null };
}

/** Grants on a node, with usernames resolved for display. */
export async function listGrants(nodeId: string): Promise<Grant[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];

  const { data: grants } = await supabase
    .from("node_grants")
    .select("id, grantee, role")
    .eq("node_id", nodeId);

  if (!grants?.length) return [];

  // profiles is readable only for your own row under RLS, so names come from
  // the privileged client. Only the owner can reach this far: the select policy
  // on node_grants already refused anyone else.
  let names = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, username")
      .in(
        "id",
        grants.map((g) => g.grantee),
      );
    names = new Map((profiles ?? []).map((p) => [p.id, p.username]));
  } catch {
    // No secret key: fall back to showing ids rather than failing the dialog.
  }

  return grants.map((g) => ({
    id: g.id,
    grantee: g.grantee,
    role: g.role as "viewer" | "editor",
    username: names.get(g.grantee) ?? null,
  }));
}
