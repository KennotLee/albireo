import Image from "next/image";

/**
 * Profile picture, falling back to the initial on a gold-to-azure gradient.
 * The fallback is permanent for anyone who never uploads a photo, not a
 * placeholder — so it is styled to look deliberate.
 */
export function Avatar({
  url,
  initial,
  size = 36,
  className = "",
}: {
  url: string | null;
  initial: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        url ? "bg-surface-2" : "bg-gradient-to-br from-gold-soft to-azure"
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized
        />
      ) : (
        <span
          className="font-semibold text-white"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
