"use client";

import { useRef, useState, useTransition } from "react";

import { Avatar } from "@/components/avatar";
import { saveAvatar } from "@/app/settings/actions";
import { createClient } from "@/lib/supabase/client";

const SIZE = 256;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Center-crops to a square and re-encodes at 256px before upload. A phone photo
 * is several megabytes and gets displayed at 36 pixels; this turns it into
 * roughly 30KB, which matters more for perceived speed than anything else here.
 */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const edge = Math.min(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");

  ctx.drawImage(
    bitmap,
    (bitmap.width - edge) / 2,
    (bitmap.height - edge) / 2,
    edge,
    edge,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Could not process that image.");
  return blob;
}

export function AvatarUpload({
  userId,
  initial,
  currentUrl,
}: {
  userId: string;
  initial: string;
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is larger than 8MB. Pick a smaller one.");
      return;
    }

    setBusy(true);
    try {
      const blob = await toSquareWebp(file);

      // A unique name per upload, because a CDN will happily serve the old
      // image for hours if the path stays the same.
      const path = `${userId}/${Date.now()}.webp`;

      // Uploaded straight from the browser: the user's own session enforces the
      // storage policies, and the file never passes through our server.
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp" });

      if (uploadError) throw uploadError;

      setPreview(URL.createObjectURL(blob));

      const result = await saveAvatar(path);
      if (result?.error) throw new Error(result.error);

      startTransition(() => {});
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <Avatar url={preview ?? currentUrl} initial={initial} size={80} />

        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-10 rounded-full border border-border px-4 text-[13px] font-medium transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
          >
            {busy
              ? "Uploading…"
              : currentUrl
                ? "Change picture"
                : "Upload a picture"}
          </button>
          <p className="text-[11px] text-muted">
            JPG, PNG or WebP. Cropped to a square and resized to 256px.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
