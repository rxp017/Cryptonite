import { CircleHelp, ShieldCheck } from "lucide-react";
import type { Confidence } from "@/lib/scanner/types";
import { cn } from "@/lib/utils";

export function ConfidenceMark({
  confidence,
  compact = false,
  className,
}: {
  confidence: Confidence;
  compact?: boolean;
  className?: string;
}) {
  const confirmed = confidence === "confirmed";
  const Icon = confirmed ? ShieldCheck : CircleHelp;

  return (
    <span
      className={cn(
      "inline-flex shrink-0 self-start items-center gap-1.5 rounded-md border font-medium",
        compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs",
        confirmed ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" strokeWidth={2} />
      <span className="capitalize">{confidence}</span>
    </span>
  );
}
