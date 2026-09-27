/**
 * Label + input travelling together, so styling lives in one place instead of
 * being duplicated across every form field.
 */
export function Field({
  label,
  name,
  hint,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
} & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="text-[13px] font-medium">
          {label}
        </label>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      <input
        id={name}
        name={name}
        className="h-11 rounded-xl border border-border bg-surface px-3.5 text-[15px] transition-colors placeholder:text-muted/60 hover:border-muted/50 focus:border-gold focus:outline-none"
        {...props}
      />
    </div>
  );
}
