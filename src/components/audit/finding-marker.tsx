import { cn } from "@/lib/utils";
import type { ImpactLevel } from "@/types/audit";

export function findingMarkerClass(impact: ImpactLevel) {
  if (impact === "HIGH") return "bg-rose-500 text-zinc-950";
  if (impact === "MEDIUM") return "bg-amber-400 text-zinc-950";
  return "bg-sky-400 text-zinc-950";
}

export function FindingMarker({
  id,
  impact,
  className,
  size = "md",
}: {
  id: string;
  impact: ImpactLevel;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold shadow-sm",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]",
        findingMarkerClass(impact),
        className,
      )}
    >
      {id}
    </span>
  );
}
