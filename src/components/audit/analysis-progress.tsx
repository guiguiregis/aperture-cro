"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { WebsiteStatus } from "@/types/audit";

const steps: { status: WebsiteStatus; label: string }[] = [
  { status: "SCRAPING", label: "Scraping DOM..." },
  { status: "ANALYZING", label: "Analyzing CRO & SEO heuristics..." },
  { status: "GENERATING", label: "Generating Report..." },
];

export function AnalysisProgress({
  status,
  message,
}: {
  status: WebsiteStatus;
  message?: string | null;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === status),
  );

  return (
    <div className="rounded-xl border bg-secondary/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {message || steps[activeIndex]?.label || "Working..."}
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <div key={step.status} className="flex items-center gap-3 text-sm">
              <span
                className={
                  current
                    ? "h-2 w-2 rounded-full bg-primary"
                    : done
                      ? "h-2 w-2 rounded-full bg-emerald-400"
                      : "h-2 w-2 rounded-full bg-border"
                }
              />
              <span className={current ? "text-foreground" : "text-muted-foreground"}>
                {step.label}
              </span>
              {current ? (
                <motion.span
                  className="ml-auto h-1 w-16 overflow-hidden rounded-full bg-secondary"
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.span
                    className="block h-full w-1/2 bg-primary"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                  />
                </motion.span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
