/**
 * Browser-side image downscaling, shared by the avatar and photo uploaders.
 *
 * Shrinking before upload is the single biggest win available here: a phone
 * photo is several megabytes, and nothing in this app displays one at more than
 * a fraction of that. Re-encoding as WebP typically cuts it by 95%.
 */
export async function encodeWebp(
  file: File,
  { maxEdge, square = false }: { maxEdge: number; square?: boolean },
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (square) {
    // Center crop to the largest square the image contains.
    const edge = Math.min(bitmap.width, bitmap.height);
    sx = (bitmap.width - edge) / 2;
    sy = (bitmap.height - edge) / 2;
    sw = edge;
    sh = edge;
  }

  // Never upscale: a small source stays its own size.
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is unavailable in this browser.");
  }

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}
