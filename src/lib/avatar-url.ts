/**
 * Turns a stored avatar path into a public URL.
 *
 * The database keeps the path, not the URL, so the bucket or host can change
 * without rewriting rows. The trailing-slash trim matters: NEXT_PUBLIC_SUPABASE_URL
 * may end in one, which would otherwise produce a double slash.
 */
export function avatarPublicUrl(path: string | null | undefined) {
  if (!path) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/avatars/${path}`;
}
