"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function colorFor(score: number) {
  if (score >= 80) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#fb7185";
}

export function ScoreGauge({
  score,
  label = "Overall CRO score",
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const offset = circumference * (1 - progress);
  const color = colorFor(score);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative h-44 w-44">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-secondary"
            strokeWidth="14"
          />
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-semibold tabular-nums"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
