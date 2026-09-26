import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "risk" | "warn" | "ok" | "info" | "accent";
}) {
  const tones = {
    neutral: "text-muted bg-elevated",
    risk: "text-risk bg-risk/10",
    warn: "text-warn bg-warn/10",
    ok: "text-ok bg-ok/10",
    info: "text-info bg-info/10",
    accent: "text-accent-fg bg-accent",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
