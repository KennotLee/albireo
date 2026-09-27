/**
 * The Albireo pair: amber primary, azure companion, on a shared axis.
 * Uses currentColor nowhere on purpose — the two star colors are the identity.
 */
export function StarMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <line
        x1="9"
        y1="21"
        x2="23"
        y2="11"
        stroke="var(--border)"
        strokeWidth="1"
      />
      <circle cx="23" cy="11" r="3.5" fill="var(--azure)" opacity="0.9" />
      <circle cx="23" cy="11" r="7" fill="var(--azure)" opacity="0.12" />
      <circle cx="9" cy="21" r="5" fill="var(--gold-soft)" />
      <circle cx="9" cy="21" r="9.5" fill="var(--gold-soft)" opacity="0.14" />
    </svg>
  );
}
