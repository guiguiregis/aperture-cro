import { cn } from "@/lib/utils";

const styles = {
  POOR: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  MEDIUM: "bg-amber-400/15 text-amber-300 border-amber-400/20",
  GOOD: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
} as const;

export function ScoreBadge({
  score,
  category,
  className,
}: {
  score: number;
  category: "POOR" | "MEDIUM" | "GOOD";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
        styles[category],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          category === "POOR" && "bg-rose-400",
          category === "MEDIUM" && "bg-amber-300",
          category === "GOOD" && "bg-emerald-400",
        )}
      />
      {score} · {category}
    </span>
  );
}
