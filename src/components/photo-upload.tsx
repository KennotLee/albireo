"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { saveFile } from "@/app/photos/actions";
import { encodeWebp } from "@/lib/image";
import { PHOTO_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

const MAX_EDGE = 1600;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export function PhotoUpload({
  userId,
  parentId,
}: {
  userId: string;
  parentId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const busy = progress.total > 0;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setErrors([]);
    setProgress({ done: 0, total: files.length });

    const failures: string[] = [];
    const supabase = createClient();

    // Sequential, not parallel: a dozen simultaneous uploads from a phone
    // connection is slower overall and impossible to report progress on.
    for (const file of files) {
      try {
        if (!file.type.startsWith("image/")) throw new Error("not an image");
        if (file.size > MAX_INPUT_BYTES) throw new Error("larger than 15MB");

        const blob = await encodeWebp(file, { maxEdge: MAX_EDGE });

        // Storage keys stay flat and owned by the uploader; the folder a file
        // appears in is recorded in the database, not in this path.
        const storagePath = `${userId}/${crypto.randomUUID()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(storagePath, blob, { contentType: "image/webp" });

        if (uploadError) throw uploadError;

        const result = await saveFile(
          parentId,
          file.name.replace(/\.[^.]+$/, ""),
          storagePath,
          blob.size,
        );
        if (result.error) throw new Error(result.error);
      } catch (cause) {
        failures.push(
          `${file.name}: ${
            cause instanceof Error ? cause.message : "upload failed"
          }`,
        );
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    setErrors(failures);
    setProgress({ done: 0, total: 0 });
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex h-10 items-center gap-2 rounded-full bg-fg px-5 text-[13px] font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M12 16V5m0 0L8 9m4-4 4 4M5 17v2h14v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        {busy
          ? `Uploading ${progress.done + 1} of ${progress.total}…`
          : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {errors.length > 0 && (
        <ul
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400"
        >
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
